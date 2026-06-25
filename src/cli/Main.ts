import process from 'node:process'
import * as NodeServices from '@effect/platform-node/NodeServices'
import * as Effect from 'effect/Effect'
import * as Path from 'effect/Path'
import * as Command from 'effect/unstable/cli/Command'
import * as Flag from 'effect/unstable/cli/Flag'
import { generateProject } from '../partita/generator.ts'
import { installCodexPlugin, installCodexSkill } from '../partita/install.ts'
import { packageProject } from '../partita/packager.ts'
import { verifyProject } from '../partita/verifier.ts'

export interface CliConfig {
  readonly root: string
  readonly version: string
}

const resolveFromCwd = Effect.fnUntraced(function* (value: string) {
  const path = yield* Path.Path
  return path.resolve(process.cwd(), value)
})

function rootFlag(defaultRoot: string) {
  return Flag.path('root').pipe(
    Flag.withDescription('Partita repository root'),
    Flag.withDefault(defaultRoot),
    Flag.mapEffect(resolveFromCwd),
  )
}

const checkFlag = Flag.boolean('check').pipe(
  Flag.withDescription('Check generated files without writing'),
)

const outFlag = Flag.path('out').pipe(
  Flag.withDescription('Output zip path'),
  Flag.withDefault('dist/partita.zip'),
)

function makeCli(config: CliConfig) {
  const root = rootFlag(config.root)

  const generate = Command.make('generate', {
    check: checkFlag,
    root,
  }, Effect.fnUntraced(function* ({ check, root }) {
    yield* generateProject({ check, root })
  })).pipe(
    Command.withDescription('Generate Partita plugin metadata and dispatcher files'),
  )

  const verify = Command.make('verify', {
    root,
  }, Effect.fnUntraced(function* ({ root }) {
    yield* verifyProject({ root })
  })).pipe(
    Command.withDescription('Verify Partita skill framework and generated metadata'),
  )

  const pack = Command.make('package', {
    out: outFlag,
    root,
  }, Effect.fnUntraced(function* ({ out, root }) {
    yield* packageProject({ out, root })
  })).pipe(
    Command.withDescription('Build the Codex plugin zip package'),
  )

  const installSkill = Command.make('codex-skill', {
    root,
  }, Effect.fnUntraced(function* ({ root }) {
    yield* installCodexSkill({ root })
  })).pipe(
    Command.withDescription('Install Partita skills into global Codex skill runtime'),
  )

  const installPlugin = Command.make('codex-plugin', {
    root,
  }, Effect.fnUntraced(function* ({ root }) {
    yield* installCodexPlugin({ root })
  })).pipe(
    Command.withDescription('Map this repository into the personal Codex plugin marketplace'),
  )

  const install = Command.make('install').pipe(
    Command.withDescription('Install Partita into local agent runtimes'),
    Command.withSubcommands([installPlugin, installSkill]),
  )

  return Command.make('partita').pipe(
    Command.withDescription('Partita plugin harness CLI'),
    Command.withSubcommands([generate, verify, pack, install]),
  )
}

export function runCli(config: CliConfig) {
  return makeCli(config).pipe(
    Command.run({ version: config.version }),
    Effect.provide(NodeServices.layer),
  )
}

export function runCliWithArgs(config: CliConfig, args: ReadonlyArray<string>) {
  return Command.runWith(makeCli(config), { version: config.version })(args).pipe(
    Effect.provide(NodeServices.layer),
  )
}
