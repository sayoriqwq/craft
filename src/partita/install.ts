import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { NodeServices } from '@effect/platform-node'
import { Effect, Schema, Stream } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

const marketplaceName = 'personal'
const pluginName = 'partita'
const legacyPluginNames = ['mini-waza', 'craft'] as const

export interface InstallCodexPluginOptions {
  readonly root?: string
  readonly marketplaceRoot?: string
}

export interface InstallCodexPluginResult {
  readonly pluginLink: string
  readonly marketplaceJson: string
  readonly removedLegacyLinks: ReadonlyArray<string>
}

export interface InstallCommand {
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly cwd: string
}

interface InstallCommandResult {
  readonly exitCode: number
  readonly output: string
}

type InstallCommandRunner = (
  command: InstallCommand,
) => Effect.Effect<InstallCommandResult, PartitaInstallError>

export interface InstallCodexSkillOptions {
  readonly root?: string
  readonly runCommand?: InstallCommandRunner
}

export interface InstallCodexSkillResult {
  readonly commands: ReadonlyArray<InstallCommand>
  readonly removeExitCode: number
  readonly addExitCode: number
}

export class PartitaInstallError extends Schema.TaggedErrorClass<PartitaInstallError>()('PartitaInstallError', {
  message: Schema.String,
}) {}

export const partitaMarketplaceEntry = {
  name: pluginName,
  source: { source: 'local', path: `./plugins/${pluginName}` },
  policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
  category: 'Developer Tools',
} as const

function formatUnknown(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message
  }
  return String(cause)
}

const installError = (message: string): PartitaInstallError => new PartitaInstallError({ message })

function tryInstallPromise<A>(action: string, evaluate: () => Promise<A>): Effect.Effect<A, PartitaInstallError> {
  return Effect.tryPromise({
    try: evaluate,
    catch: cause => installError(`${action}: ${formatUnknown(cause)}`),
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function expandHome(value: string, home: string): string {
  if (value === '~') {
    return home
  }
  if (value.startsWith('~/')) {
    return path.join(home, value.slice(2))
  }
  return value
}

function resolveLinkTarget(link: string, target: string, home: string): string {
  return path.resolve(path.dirname(link), expandHome(target, home))
}

function realPathOrResolved(target: string): Effect.Effect<string, PartitaInstallError> {
  return tryInstallPromise(`resolve path ${target}`, async () => {
    try {
      return await fs.realpath(target)
    }
    catch {
      return path.resolve(target)
    }
  })
}

function lstatOrNull(target: string): Effect.Effect<import('node:fs').Stats | null, PartitaInstallError> {
  return tryInstallPromise(`stat path ${target}`, async () => {
    try {
      return await fs.lstat(target)
    }
    catch (cause) {
      if (cause instanceof Error && 'code' in cause && cause.code === 'ENOENT') {
        return null
      }
      throw cause
    }
  })
}

const symlinkPointsTo = Effect.fn('symlinkPointsTo')(
  function* (link: string, target: string, home: string): Effect.fn.Return<boolean, PartitaInstallError> {
    const rawTarget = yield* tryInstallPromise(`read link ${link}`, () => fs.readlink(link))
    const resolvedTarget = yield* realPathOrResolved(resolveLinkTarget(link, rawTarget, home))
    return resolvedTarget === target
  },
)

const ensureSymlink = Effect.fn('ensureSymlink')(
  function* (link: string, target: string, home: string): Effect.fn.Return<void, PartitaInstallError> {
    yield* tryInstallPromise(`create symlink parent ${path.dirname(link)}`, () =>
      fs.mkdir(path.dirname(link), { recursive: true }))

    const stat = yield* lstatOrNull(link)
    if (stat !== null) {
      if (stat.isSymbolicLink() && (yield* symlinkPointsTo(link, target, home))) {
        return
      }
      return yield* installError(`${link} already exists and does not point to ${target}`)
    }

    yield* tryInstallPromise(`create symlink ${link}`, () => fs.symlink(target, link, 'dir'))
  },
)

const removeLegacySymlinks = Effect.fn('removeLegacySymlinks')(
  function* (
    marketplaceRoot: string,
    target: string,
    home: string,
  ): Effect.fn.Return<ReadonlyArray<string>, PartitaInstallError> {
    const removed: Array<string> = []

    for (const name of legacyPluginNames) {
      const link = path.join(marketplaceRoot, 'plugins', name)
      const stat = yield* lstatOrNull(link)
      if (stat === null || !stat.isSymbolicLink()) {
        continue
      }
      if (!(yield* symlinkPointsTo(link, target, home))) {
        continue
      }

      yield* tryInstallPromise(`remove legacy symlink ${link}`, () => fs.unlink(link))
      removed.push(link)
    }

    return removed
  },
)

function defaultMarketplace(): Record<string, unknown> {
  return {
    name: marketplaceName,
    interface: { displayName: 'Personal' },
    plugins: [],
  }
}

const loadMarketplaceJson = Effect.fn('loadMarketplaceJson')(
  function* (marketplaceJson: string): Effect.fn.Return<Record<string, unknown>, PartitaInstallError> {
    const stat = yield* lstatOrNull(marketplaceJson)
    if (stat === null) {
      return defaultMarketplace()
    }

    const text = yield* tryInstallPromise(`read marketplace ${marketplaceJson}`, () => fs.readFile(marketplaceJson, 'utf8'))
    const parsed = yield* Effect.try({
      try: () => JSON.parse(text) as unknown,
      catch: cause => installError(`parse marketplace ${marketplaceJson}: ${formatUnknown(cause)}`),
    })

    if (!isRecord(parsed)) {
      return yield* installError(`${marketplaceJson} must contain a JSON object`)
    }

    return parsed
  },
)

function hasLegacyLocalMarketplaceSource(item: unknown): boolean {
  if (!isRecord(item) || typeof item.name !== 'string' || !legacyPluginNames.includes(item.name as typeof legacyPluginNames[number])) {
    return false
  }
  if (!isRecord(item.source)) {
    return false
  }
  return item.source.path === `./plugins/${item.name}`
}

const ensureMarketplace = Effect.fn('ensureMarketplace')(
  function* (marketplaceJson: string): Effect.fn.Return<void, PartitaInstallError> {
    const payload = yield* loadMarketplaceJson(marketplaceJson)
    payload.name ??= marketplaceName
    payload.interface ??= { displayName: 'Personal' }
    payload.plugins ??= []

    if (!Array.isArray(payload.plugins)) {
      return yield* installError(`${marketplaceJson} field 'plugins' must be an array`)
    }

    const plugins = payload.plugins.filter(item => !hasLegacyLocalMarketplaceSource(item))
    const existingIndex = plugins.findIndex(item => isRecord(item) && item.name === pluginName)
    if (existingIndex >= 0) {
      plugins[existingIndex] = partitaMarketplaceEntry
    }
    else {
      plugins.push(partitaMarketplaceEntry)
    }
    payload.plugins = plugins

    yield* tryInstallPromise(`write marketplace ${marketplaceJson}`, async () => {
      await fs.mkdir(path.dirname(marketplaceJson), { recursive: true })
      await fs.writeFile(marketplaceJson, `${JSON.stringify(payload, null, 2)}\n`)
    })
  },
)

export const installCodexPlugin = Effect.fn('installCodexPlugin')(
  function* (options: InstallCodexPluginOptions = {}): Effect.fn.Return<InstallCodexPluginResult, PartitaInstallError> {
    const root = yield* realPathOrResolved(options.root ?? process.cwd())
    const marketplaceRoot = path.resolve(options.marketplaceRoot ?? os.homedir())
    const marketplaceJson = path.join(marketplaceRoot, '.agents', 'plugins', 'marketplace.json')
    const pluginLink = path.join(marketplaceRoot, 'plugins', pluginName)
    const home = os.homedir()

    const removedLegacyLinks = yield* removeLegacySymlinks(marketplaceRoot, root, home)
    yield* ensureSymlink(pluginLink, root, home)
    yield* ensureMarketplace(marketplaceJson)

    return {
      pluginLink,
      marketplaceJson,
      removedLegacyLinks,
    }
  },
)

const runInstallCommandEffect = Effect.fn('runInstallCommand')(
  function* (command: InstallCommand) {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const handle = yield* spawner.spawn(
      ChildProcess.make(command.command, command.args, {
        cwd: command.cwd,
        extendEnv: true,
      }),
    ).pipe(
      Effect.mapError(cause =>
        installError(`spawn ${command.command}: ${formatUnknown(cause)}`),
      ),
    )
    const output = yield* handle.all.pipe(
      Stream.decodeText(),
      Stream.mkString,
      Effect.mapError(cause =>
        installError(`collect ${command.command} output: ${formatUnknown(cause)}`),
      ),
    )
    const exitCode = Number(yield* handle.exitCode.pipe(
      Effect.mapError(cause =>
        installError(`wait for ${command.command}: ${formatUnknown(cause)}`),
      ),
    ))

    return {
      exitCode,
      output,
    }
  },
)

const runInstallCommand: InstallCommandRunner = command =>
  runInstallCommandEffect(command).pipe(
    Effect.scoped,
    Effect.provide(NodeServices.layer),
  )

export const installCodexSkill = Effect.fn('installCodexSkill')(
  function* (options: InstallCodexSkillOptions = {}): Effect.fn.Return<InstallCodexSkillResult, PartitaInstallError> {
    const root = path.resolve(options.root ?? process.cwd())
    const runCommand = options.runCommand ?? runInstallCommand
    const removeCommand: InstallCommand = {
      command: 'npx',
      args: ['skills', 'remove', 'author', 'patch', '-g', '-a', 'codex', 'opencode', '-y'],
      cwd: root,
    }
    const addCommand: InstallCommand = {
      command: 'npx',
      args: ['skills', 'add', '.', '-a', 'codex', '-g', '--skill', '*', '-y', '--full-depth'],
      cwd: root,
    }

    const removeResult = yield* runCommand(removeCommand).pipe(
      Effect.orElseSucceed(() => ({
        exitCode: 1,
        output: '',
      })),
    )
    const addResult = yield* runCommand(addCommand)
    if (addResult.exitCode !== 0) {
      return yield* installError(`npx skills add failed with exit code ${addResult.exitCode}: ${addResult.output.trim()}`)
    }

    return {
      commands: [removeCommand, addCommand],
      removeExitCode: removeResult.exitCode,
      addExitCode: addResult.exitCode,
    }
  },
)
