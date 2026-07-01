import process from 'node:process'
import * as NodeServices from '@effect/platform-node/NodeServices'
import * as Effect from 'effect/Effect'
import * as Path from 'effect/Path'
import * as Command from 'effect/unstable/cli/Command'
import * as Flag from 'effect/unstable/cli/Flag'
import { generateProject } from '../partita/generator.ts'
import { installCodexPlugin, installCodexSkill } from '../partita/install.ts'
import {
  printPinPlan,
  printPinStatus,
  verifyPins,
} from '../partita/pin.ts'
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

const pinContractFlag = Flag.path('contract').pipe(
  Flag.withDescription('GitHub subtree pin contract path; defaults to repos/<name>.subtree.json from --name/--prefix'),
  Flag.withDefault(''),
)

const pinNameFlag = Flag.string('name').pipe(
  Flag.withDescription('Pin name'),
  Flag.withDefault(''),
)

const pinOwnershipModeFlag = Flag.choice('ownership-mode', ['direct', 'provider', 'prelude-maintain'] as const).pipe(
  Flag.withDescription('Pin ownership mode'),
  Flag.withDefault('direct' as const),
)

function pinPolicyDecisionFlag(name: string, description: string) {
  return Flag.choice(name, ['enabled', 'recommended', 'disabled'] as const).pipe(
    Flag.withDescription(description),
    Flag.withDefault('recommended' as const),
  )
}

const pinFilesExcludeFlag = Flag.choice('files-exclude', ['enabled', 'disabled'] as const).pipe(
  Flag.withDescription('Whether editor file trees should hide the source prefix'),
  Flag.withDefault('disabled' as const),
)

const pinPlanFlags = {
  agentRoute: Flag.string('agent-route').pipe(Flag.withDescription('Agent route file path'), Flag.withDefault('')),
  anchor: Flag.string('anchor').pipe(Flag.withDescription('Anchor or LLM document path'), Flag.withDefault('')),
  branch: Flag.string('branch').pipe(Flag.withDescription('Upstream branch'), Flag.withDefault('main')),
  contractPath: pinContractFlag,
  filesExclude: pinFilesExcludeFlag,
  name: pinNameFlag,
  ownershipMode: pinOwnershipModeFlag,
  prefix: Flag.string('prefix').pipe(Flag.withDescription('Local source prefix'), Flag.withDefault('')),
  ref: Flag.string('ref').pipe(Flag.withDescription('Pinned upstream ref or subtree split'), Flag.withDefault('')),
  repository: Flag.string('repository').pipe(Flag.withDescription('Upstream repository URL'), Flag.withDefault('')),
  searchExclude: pinPolicyDecisionFlag('search-exclude', 'Whether editor search should exclude the source prefix'),
  updateCommand: Flag.string('update-command').pipe(Flag.withDescription('Source update command'), Flag.withDefault('')),
  verifyCommand: Flag.string('verify-command').pipe(Flag.withDescription('Source verify command'), Flag.withDefault('')),
  watcherExclude: pinPolicyDecisionFlag('watcher-exclude', 'Whether editor file watching should exclude the source prefix'),
}

function makeCli(config: CliConfig) {
  const root = rootFlag(config.root)
  const pinReadFlags = {
    contractPath: pinContractFlag,
    name: pinNameFlag,
    prefix: Flag.string('prefix').pipe(Flag.withDescription('Local source prefix used to derive the default contract path'), Flag.withDefault('')),
    root,
  }

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

  const pinPlan = Command.make('plan', {
    ...pinPlanFlags,
    root,
  }, Effect.fnUntraced(function* (options) {
    yield* printPinPlan(options)
  })).pipe(
    Command.withDescription('Plan a GitHub git-subtree pin contract without writing files'),
  )

  const pinStatus = Command.make('status', pinReadFlags, Effect.fnUntraced(function* (options) {
    yield* printPinStatus(options)
  })).pipe(
    Command.withDescription('Show GitHub git-subtree pin status and verification issues'),
  )

  const pinVerify = Command.make('verify', pinReadFlags, Effect.fnUntraced(function* (options) {
    yield* verifyPins(options)
  })).pipe(
    Command.withDescription('Hard-verify GitHub git-subtree pin contracts'),
  )

  const pinAdd = Command.make('add', {
    ...pinPlanFlags,
    dryRun: Flag.boolean('dry-run').pipe(
      Flag.withDescription('Only print the add plan; direct git subtree writes are intentionally not implemented'),
      Flag.withDefault(true),
    ),
    root,
  }, Effect.fnUntraced(function* ({ dryRun, ...options }) {
    if (!dryRun) {
      return yield* Effect.fail(new Error('partita pin add only supports --dry-run in this implementation'))
    }
    yield* printPinPlan(options)
  })).pipe(
    Command.withDescription('Dry-run a GitHub git-subtree pin add plan'),
  )

  const pinUpdate = Command.make('update', {
    contractPath: pinContractFlag,
    dryRun: Flag.boolean('dry-run').pipe(
      Flag.withDescription('Only print update status; direct git subtree update is intentionally not implemented'),
      Flag.withDefault(true),
    ),
    name: pinNameFlag,
    prefix: Flag.string('prefix').pipe(Flag.withDescription('Local source prefix used to derive the default contract path'), Flag.withDefault('')),
    root,
  }, Effect.fnUntraced(function* ({ dryRun, ...options }) {
    if (!dryRun) {
      return yield* Effect.fail(new Error('partita pin update only supports --dry-run in this implementation'))
    }
    yield* printPinStatus(options)
  })).pipe(
    Command.withDescription('Dry-run GitHub git-subtree update checks before a domain wrapper mutates the tree'),
  )

  const pin = Command.make('pin').pipe(
    Command.withDescription('Manage GitHub repository pins materialized with git subtree'),
    Command.withSubcommands([pinPlan, pinStatus, pinVerify, pinAdd, pinUpdate]),
  )

  return Command.make('partita').pipe(
    Command.withDescription('Partita skill harness CLI'),
    Command.withSubcommands([generate, verify, install, pin]),
  )
}

export function runCli(config: CliConfig) {
  return makeCli(config).pipe(
    Command.run({ version: config.version }),
    Effect.provide(NodeServices.layer),
  )
}
