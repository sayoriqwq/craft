import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { NodeServices } from '@effect/platform-node'
import { Effect, Schema, Stream } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

export interface PackagePartitaOptions {
  readonly root?: string
  readonly output?: string
  readonly allowlistPath?: string
}

export interface PackageProjectOptions {
  readonly root?: string
  readonly out?: string
  readonly allowlistPath?: string
}

export interface PackageStageValidation {
  readonly skillCount: number
  readonly skills: ReadonlyArray<string>
}

export interface PackagePartitaResult {
  readonly output: string
  readonly size: number
  readonly files: ReadonlyArray<string>
  readonly validation: PackageStageValidation
}

interface CommandResult {
  readonly output: string
  readonly exitCode: number
}

export class PartitaPackageError extends Schema.TaggedErrorClass<PartitaPackageError>()('PartitaPackageError', {
  message: Schema.String,
}) {}

const excludedPathSegments = new Set(['__pycache__', '.DS_Store'])

function formatUnknown(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message
  }
  return String(cause)
}

const packageError = (message: string): PartitaPackageError => new PartitaPackageError({ message })

function tryPackagePromise<A>(action: string, evaluate: () => Promise<A>): Effect.Effect<A, PartitaPackageError> {
  return Effect.tryPromise({
    try: evaluate,
    catch: cause => packageError(`${action}: ${formatUnknown(cause)}`),
  })
}

function resolveFromRoot(root: string, requestedPath: string): string {
  return path.isAbsolute(requestedPath) ? requestedPath : path.join(root, requestedPath)
}

const normalizePackagePath = (filePath: string): string => filePath.split(path.sep).join('/')

function isSafeRelativePath(filePath: string): boolean {
  return filePath.length > 0
    && !path.isAbsolute(filePath)
    && !filePath.split('/').includes('..')
}

const escapeRegExp = (value: string): string => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')

function fnmatch(filePath: string, pattern: string): boolean {
  const source = `^${escapeRegExp(pattern).replaceAll('\\*', '.*').replaceAll('\\?', '.')}$`
  return new RegExp(source).test(filePath)
}

function isExcludedPackagePath(filePath: string): boolean {
  const normalized = normalizePackagePath(filePath)
  const segments = normalized.split('/')
  return normalized.endsWith('.pyc') || segments.some(segment => excludedPathSegments.has(segment))
}

function isAllowedPackagePath(filePath: string, patterns: ReadonlyArray<string>): boolean {
  const normalized = normalizePackagePath(filePath)
  if (!isSafeRelativePath(normalized) || isExcludedPackagePath(normalized)) {
    return false
  }

  return patterns.some((pattern) => {
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3)
      return normalized === prefix || normalized.startsWith(`${prefix}/`)
    }
    return fnmatch(normalized, pattern)
  })
}

export function filterPackagePaths(filePaths: Iterable<string>, patterns: ReadonlyArray<string>): ReadonlyArray<string> {
  return Array.from(filePaths).filter(filePath => isAllowedPackagePath(filePath, patterns))
}

const loadPackageAllowlist = Effect.fn('loadPackageAllowlist')(
  function* (allowlistPath: string): Effect.fn.Return<ReadonlyArray<string>, PartitaPackageError> {
    const text = yield* tryPackagePromise(
      `read allowlist ${allowlistPath}`,
      () => fs.readFile(allowlistPath, 'utf8'),
    )

    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
  },
)

function runPackageCommand(cwd: string, command: string, args: ReadonlyArray<string>): Effect.Effect<CommandResult, PartitaPackageError> {
  return Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const handle = yield* spawner.spawn(
      ChildProcess.make(command, args, { cwd, extendEnv: true }),
    ).pipe(
      Effect.mapError(cause =>
        packageError(`spawn ${command}: ${formatUnknown(cause)}`),
      ),
    )
    const output = yield* handle.all.pipe(
      Stream.decodeText(),
      Stream.mkString,
      Effect.mapError(cause =>
        packageError(`collect ${command} output: ${formatUnknown(cause)}`),
      ),
    )
    const exitCode = Number(yield* handle.exitCode.pipe(
      Effect.mapError(cause =>
        packageError(`wait for ${command}: ${formatUnknown(cause)}`),
      ),
    ))

    if (exitCode !== 0) {
      return yield* packageError(`${command} ${args.join(' ')} failed with exit code ${exitCode}: ${output.trim()}`)
    }

    return { output, exitCode }
  }).pipe(
    Effect.scoped,
    Effect.provide(NodeServices.layer),
  )
}

const existingGitFiles = Effect.fn('existingGitFiles')(
  function* (root: string): Effect.fn.Return<ReadonlyArray<string>, PartitaPackageError> {
    const result = yield* runPackageCommand(root, 'git', [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
    ])

    const candidates = result.output
      .split(/\r?\n/)
      .map(normalizePackagePath)
      .filter(candidate => candidate.length > 0)

    const existing: Array<string> = []
    for (const candidate of candidates) {
      const exists = yield* tryPackagePromise(
        `check package candidate ${candidate}`,
        () => fs.access(path.join(root, candidate)).then(() => true, () => false),
      )
      if (exists) {
        existing.push(candidate)
      }
    }

    return existing
  },
)

function copyPackageFiles(root: string, stage: string, files: ReadonlyArray<string>): Effect.Effect<void, PartitaPackageError> {
  return tryPackagePromise('copy package files', async () => {
    for (const file of files) {
      if (!isSafeRelativePath(file)) {
        throw new Error(`unsafe package path ${file}`)
      }

      const source = path.join(root, file)
      const destination = path.join(stage, file)
      const stat = await fs.lstat(source)
      if (!stat.isFile()) {
        continue
      }

      await fs.mkdir(path.dirname(destination), { recursive: true })
      await fs.copyFile(source, destination)
      await fs.chmod(destination, stat.mode)
    }
  })
}

function listFiles(root: string): Effect.Effect<ReadonlyArray<string>, PartitaPackageError> {
  return tryPackagePromise(`list files in ${root}`, async () => {
    const results: Array<string> = []

    const visit = async (directory: string): Promise<void> => {
      const entries = await fs.readdir(directory, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name)
        const relativePath = normalizePackagePath(path.relative(root, fullPath))
        if (entry.isDirectory()) {
          await visit(fullPath)
        }
        else if (entry.isFile()) {
          results.push(relativePath)
        }
      }
    }

    await visit(root)
    return results.sort()
  })
}

function pathExists(target: string): Effect.Effect<boolean, PartitaPackageError> {
  return tryPackagePromise(`check path ${target}`, () => fs.access(target).then(() => true, () => false))
}

const readJsonObject = Effect.fn('readJsonObject')(
  function* (jsonPath: string): Effect.fn.Return<Record<string, unknown>, PartitaPackageError> {
    const content = yield* tryPackagePromise(`read JSON ${jsonPath}`, () => fs.readFile(jsonPath, 'utf8'))
    const parsed = yield* Effect.try({
      try: () => JSON.parse(content) as unknown,
      catch: cause => packageError(`parse JSON ${jsonPath}: ${formatUnknown(cause)}`),
    })

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return yield* packageError(`${jsonPath} must contain a JSON object`)
    }

    return parsed as Record<string, unknown>
  },
)

function directSkillNames(stageRoot: string): Effect.Effect<ReadonlyArray<string>, PartitaPackageError> {
  return tryPackagePromise('read packaged skills', async () => {
    const skillsRoot = path.join(stageRoot, 'skills')
    let entries: Array<import('node:fs').Dirent>
    try {
      entries = await fs.readdir(skillsRoot, { withFileTypes: true })
    }
    catch (cause) {
      if (cause instanceof Error && 'code' in cause && cause.code === 'ENOENT') {
        return []
      }
      throw cause
    }

    const skillNames: Array<string> = []
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }
      const skillPath = path.join(skillsRoot, entry.name, 'SKILL.md')
      try {
        await fs.access(skillPath)
        skillNames.push(entry.name)
      }
      catch {
        // Only direct */SKILL.md entries count as packaged skills.
      }
    }

    return skillNames.sort()
  })
}

export const validatePackageStage = Effect.fn('validatePackageStage')(
  function* (stageRoot: string): Effect.fn.Return<PackageStageValidation, PartitaPackageError> {
    const pluginJson = path.join(stageRoot, '.codex-plugin', 'plugin.json')
    if (!(yield* pathExists(pluginJson))) {
      return yield* packageError('POST-PACKAGE ERROR: .codex-plugin/plugin.json missing')
    }

    const plugin = yield* readJsonObject(pluginJson)
    if (plugin.name !== 'partita') {
      return yield* packageError('POST-PACKAGE ERROR: plugin name is not partita')
    }
    if (plugin.skills !== './skills/') {
      return yield* packageError('POST-PACKAGE ERROR: plugin skills path must be ./skills/')
    }
    if (yield* pathExists(path.join(stageRoot, 'SKILL.md'))) {
      return yield* packageError('POST-PACKAGE ERROR: root SKILL.md is not part of the Codex plugin')
    }
    if (yield* pathExists(path.join(stageRoot, '.claude-plugin'))) {
      return yield* packageError('POST-PACKAGE ERROR: .claude-plugin must not be packaged')
    }

    const skills = yield* directSkillNames(stageRoot)
    return {
      skillCount: skills.length,
      skills,
    }
  },
)

export const packagePartita = Effect.fn('packagePartita')(
  function* (options: PackagePartitaOptions = {}): Effect.fn.Return<PackagePartitaResult, PartitaPackageError> {
    const root = path.resolve(options.root ?? process.cwd())
    const output = resolveFromRoot(root, options.output ?? 'dist/partita.zip')
    const allowlistPath = resolveFromRoot(root, options.allowlistPath ?? 'packaging.allowlist')

    const patterns = yield* loadPackageAllowlist(allowlistPath)
    const candidates = yield* existingGitFiles(root)
    const files = filterPackagePaths(candidates, patterns).toSorted()
    const stage = yield* tryPackagePromise(
      'create package stage',
      () => fs.mkdtemp(path.join(os.tmpdir(), 'partita-package-')),
    )

    return yield* Effect.gen(function* () {
      const sourcePluginJson = path.join(root, '.codex-plugin', 'plugin.json')
      if (!(yield* pathExists(sourcePluginJson))) {
        return yield* packageError('ERROR: .codex-plugin/plugin.json missing; run pnpm generate')
      }

      yield* tryPackagePromise('prepare package output', async () => {
        await fs.mkdir(path.dirname(output), { recursive: true })
        await fs.rm(output, { force: true })
      })

      yield* copyPackageFiles(root, stage, files)
      const validation = yield* validatePackageStage(stage)
      const stagedFiles = yield* listFiles(stage)

      if (stagedFiles.length === 0) {
        return yield* packageError('package stage is empty')
      }

      yield* runPackageCommand(stage, 'zip', ['-q', output, ...stagedFiles])
      const size = yield* tryPackagePromise('read package size', async () => {
        const stat = await fs.stat(output)
        return stat.size
      })

      return {
        output,
        size,
        files,
        validation,
      }
    }).pipe(
      Effect.ensuring(
        tryPackagePromise('remove package stage', () => fs.rm(stage, { recursive: true, force: true })).pipe(
          Effect.catch(() => Effect.void),
        ),
      ),
    )
  },
)

export const packageProject = Effect.fn('packageProject')(
  function* (options: PackageProjectOptions = {}): Effect.fn.Return<PackagePartitaResult, PartitaPackageError> {
    const packageOptions: {
      allowlistPath?: string
      output?: string
      root?: string
    } = {}
    if (options.root !== undefined) {
      packageOptions.root = options.root
    }
    if (options.out !== undefined) {
      packageOptions.output = options.out
    }
    if (options.allowlistPath !== undefined) {
      packageOptions.allowlistPath = options.allowlistPath
    }
    return yield* packagePartita(packageOptions)
  },
)
