import process from 'node:process'
import * as NodeServices from '@effect/platform-node/NodeServices'
import * as Effect from 'effect/Effect'
import * as Path from 'effect/Path'
import * as Command from 'effect/unstable/cli/Command'
import * as Flag from 'effect/unstable/cli/Flag'
import { generateProject } from '../partita/generator.ts'
import {
  printChezmoiHomeApply,
  printChezmoiHomeDiff,
  printChezmoiHomeStatus,
} from '../partita/home.ts'
import { installCodexSkill } from '../partita/install.ts'
import {
  printSourcePlan,
  printSourceStatus,
  verifySourceEntries,
} from '../partita/source-entry.ts'
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

const sourceContractFlag = Flag.path('contract').pipe(
  Flag.withDescription('GitHub subtree pin contract path; defaults to repos/<name>.subtree.json from --name/--prefix'),
  Flag.withDefault(''),
)

const sourceNameFlag = Flag.string('name').pipe(
  Flag.withDescription('Source entry name'),
  Flag.withDefault(''),
)

const sourceOwnershipModeFlag = Flag.choice('ownership-mode', ['direct', 'provider', 'prelude-maintain'] as const).pipe(
  Flag.withDescription('Source entry ownership mode'),
  Flag.withDefault('direct' as const),
)

function sourcePolicyDecisionFlag(name: string, description: string) {
  return Flag.choice(name, ['enabled', 'recommended', 'disabled'] as const).pipe(
    Flag.withDescription(description),
    Flag.withDefault('recommended' as const),
  )
}

const sourceFilesExcludeFlag = Flag.choice('files-exclude', ['enabled', 'disabled'] as const).pipe(
  Flag.withDescription('Whether editor file trees should hide the source prefix'),
  Flag.withDefault('disabled' as const),
)

const sourcePlanFlags = {
  agentRoute: Flag.string('agent-route').pipe(Flag.withDescription('Agent route file path'), Flag.withDefault('')),
  anchor: Flag.string('anchor').pipe(Flag.withDescription('Anchor or LLM document path'), Flag.withDefault('')),
  branch: Flag.string('branch').pipe(Flag.withDescription('Upstream branch'), Flag.withDefault('main')),
  contractPath: sourceContractFlag,
  filesExclude: sourceFilesExcludeFlag,
  name: sourceNameFlag,
  ownershipMode: sourceOwnershipModeFlag,
  prefix: Flag.string('prefix').pipe(Flag.withDescription('Local source prefix'), Flag.withDefault('')),
  ref: Flag.string('ref').pipe(Flag.withDescription('Pinned upstream ref or subtree split'), Flag.withDefault('')),
  repository: Flag.string('repository').pipe(Flag.withDescription('Upstream repository URL'), Flag.withDefault('')),
  searchExclude: sourcePolicyDecisionFlag('search-exclude', 'Whether editor search should exclude the source prefix'),
  updateCommand: Flag.string('update-command').pipe(Flag.withDescription('Source update command'), Flag.withDefault('')),
  verifyCommand: Flag.string('verify-command').pipe(Flag.withDescription('Source verify command'), Flag.withDefault('')),
  watcherExclude: sourcePolicyDecisionFlag('watcher-exclude', 'Whether editor file watching should exclude the source prefix'),
}

function makeCli(config: CliConfig) {
  const root = rootFlag(config.root)
  const sourceReadFlags = {
    contractPath: sourceContractFlag,
    name: sourceNameFlag,
    prefix: Flag.string('prefix').pipe(Flag.withDescription('Local source prefix used to derive the default contract path'), Flag.withDefault('')),
    root,
  }

  const generate = Command.make('generate', {
    check: checkFlag,
    root,
  }, Effect.fnUntraced(function* ({ check, root }) {
    yield* generateProject({ check, root })
  })).pipe(
    Command.withDescription('Generate Partita package metadata and dispatcher audit files'),
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

  const install = Command.make('install').pipe(
    Command.withDescription('Install Partita skills into local agent runtimes'),
    Command.withSubcommands([installSkill]),
  )

  const homeStatus = Command.make('status', {
    root,
  }, Effect.fnUntraced(function* ({ root }) {
    yield* printChezmoiHomeStatus({ root })
  })).pipe(
    Command.withDescription('Show chezmoi home materialization status'),
  )

  const homeApply = Command.make('apply', {
    root,
    write: Flag.boolean('write').pipe(
      Flag.withDescription('Confirm that chezmoi should write user-home materialization'),
      Flag.withDefault(false),
    ),
  }, Effect.fnUntraced(function* ({ root, write }) {
    yield* printChezmoiHomeApply({ root, write })
  })).pipe(
    Command.withDescription('Delegate user-home materialization writes to chezmoi'),
  )

  const homeDiff = Command.make('diff', {
    root,
  }, Effect.fnUntraced(function* ({ root }) {
    yield* printChezmoiHomeDiff({ root })
  })).pipe(
    Command.withDescription('Show non-mutating chezmoi diff for user-home materialization'),
  )

  const home = Command.make('home').pipe(
    Command.withDescription('Inspect or run chezmoi-owned user-home materialization'),
    Command.withSubcommands([homeStatus, homeDiff, homeApply]),
  )

  const sourcePlan = Command.make('plan', {
    ...sourcePlanFlags,
    root,
  }, Effect.fnUntraced(function* (options) {
    yield* printSourcePlan(options)
  })).pipe(
    Command.withDescription('Plan a GitHub git-subtree pin contract without writing files'),
  )

  const sourceStatus = Command.make('status', sourceReadFlags, Effect.fnUntraced(function* (options) {
    yield* printSourceStatus(options)
  })).pipe(
    Command.withDescription('Show GitHub git-subtree pin status and verification issues'),
  )

  const sourceVerify = Command.make('verify', sourceReadFlags, Effect.fnUntraced(function* (options) {
    yield* verifySourceEntries(options)
  })).pipe(
    Command.withDescription('Hard-verify GitHub git-subtree pin contracts'),
  )

  const sourceAdd = Command.make('add', {
    ...sourcePlanFlags,
    dryRun: Flag.boolean('dry-run').pipe(
      Flag.withDescription('Only print the add plan; direct git subtree writes are intentionally not implemented'),
      Flag.withDefault(true),
    ),
    root,
  }, Effect.fnUntraced(function* ({ dryRun, ...options }) {
    if (!dryRun) {
      return yield* Effect.fail(new Error('partita source add only supports --dry-run in this implementation'))
    }
    yield* printSourcePlan(options)
  })).pipe(
    Command.withDescription('Dry-run a GitHub git-subtree pin add plan'),
  )

  const sourceUpdate = Command.make('update', {
    contractPath: sourceContractFlag,
    dryRun: Flag.boolean('dry-run').pipe(
      Flag.withDescription('Only print update status; direct git subtree update is intentionally not implemented'),
      Flag.withDefault(true),
    ),
    name: sourceNameFlag,
    prefix: Flag.string('prefix').pipe(Flag.withDescription('Local source prefix used to derive the default contract path'), Flag.withDefault('')),
    root,
  }, Effect.fnUntraced(function* ({ dryRun, ...options }) {
    if (!dryRun) {
      return yield* Effect.fail(new Error('partita source update only supports --dry-run in this implementation'))
    }
    yield* printSourceStatus(options)
  })).pipe(
    Command.withDescription('Dry-run GitHub git-subtree update checks before a domain wrapper mutates the tree'),
  )

  const source = Command.make('source').pipe(
    Command.withDescription('Manage GitHub repository pins materialized with git subtree'),
    Command.withSubcommands([sourcePlan, sourceStatus, sourceVerify, sourceAdd, sourceUpdate]),
  )

  return Command.make('partita').pipe(
    Command.withDescription('Partita skill harness CLI'),
    Command.withSubcommands([generate, verify, install, home, source]),
  )
}

export function runCli(config: CliConfig) {
  return makeCli(config).pipe(
    Command.run({ version: config.version }),
    Effect.provide(NodeServices.layer),
  )
}
