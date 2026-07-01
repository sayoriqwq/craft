import * as path from 'node:path'
import process from 'node:process'
import { NodeServices } from '@effect/platform-node'
import { Effect, Schema, Stream } from 'effect'
import * as Console from 'effect/Console'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

export interface HomeCommand {
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly cwd: string
}

interface HomeCommandResult {
  readonly exitCode: number
  readonly output: string
}

type HomeCommandRunner = (
  command: HomeCommand,
) => Effect.Effect<HomeCommandResult, PartitaHomeError>

export interface ChezmoiHomeOptions {
  readonly root?: string
  readonly runCommand?: HomeCommandRunner
}

export interface ChezmoiHomeApplyOptions extends ChezmoiHomeOptions {
  readonly write?: boolean
}

export class PartitaHomeError extends Schema.TaggedErrorClass<PartitaHomeError>()('PartitaHomeError', {
  message: Schema.String,
}) {}

function formatUnknown(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message
  }
  return String(cause)
}

const homeError = (message: string): PartitaHomeError => new PartitaHomeError({ message })

const runHomeCommandEffect = Effect.fn('runHomeCommand')(
  function* (command: HomeCommand) {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const handle = yield* spawner.spawn(
      ChildProcess.make(command.command, command.args, {
        cwd: command.cwd,
        extendEnv: true,
      }),
    ).pipe(
      Effect.mapError(cause =>
        homeError(`spawn ${command.command}: ${formatUnknown(cause)}`),
      ),
    )
    const output = yield* handle.all.pipe(
      Stream.decodeText(),
      Stream.mkString,
      Effect.mapError(cause =>
        homeError(`collect ${command.command} output: ${formatUnknown(cause)}`),
      ),
    )
    const exitCode = Number(yield* handle.exitCode.pipe(
      Effect.mapError(cause =>
        homeError(`wait for ${command.command}: ${formatUnknown(cause)}`),
      ),
    ))

    return {
      exitCode,
      output,
    }
  },
)

const runHomeCommand: HomeCommandRunner = command =>
  runHomeCommandEffect(command).pipe(
    Effect.scoped,
    Effect.provide(NodeServices.layer),
  )

export const checkChezmoiHomeStatus = Effect.fn('checkChezmoiHomeStatus')(
  function* (options: ChezmoiHomeOptions = {}) {
    const root = path.resolve(options.root ?? process.cwd())
    const runCommand = options.runCommand ?? runHomeCommand
    const statusCommand: HomeCommand = {
      command: 'chezmoi',
      args: ['status'],
      cwd: root,
    }

    const statusResult = yield* runCommand(statusCommand)
    if (statusResult.exitCode !== 0) {
      return yield* homeError(`chezmoi status failed with exit code ${statusResult.exitCode}: ${statusResult.output.trim()}`)
    }

    return {
      commands: [statusCommand],
      exitCode: statusResult.exitCode,
      output: statusResult.output,
    }
  },
)

export const applyChezmoiHome = Effect.fn('applyChezmoiHome')(
  function* (options: ChezmoiHomeApplyOptions = {}) {
    if (options.write !== true) {
      return yield* homeError('partita home apply requires --write; use partita home diff for a non-mutating check')
    }

    const root = path.resolve(options.root ?? process.cwd())
    const runCommand = options.runCommand ?? runHomeCommand
    const applyCommand: HomeCommand = {
      command: 'chezmoi',
      args: ['apply'],
      cwd: root,
    }

    const applyResult = yield* runCommand(applyCommand)
    if (applyResult.exitCode !== 0) {
      return yield* homeError(`chezmoi apply failed with exit code ${applyResult.exitCode}: ${applyResult.output.trim()}`)
    }

    return {
      commands: [applyCommand],
      exitCode: applyResult.exitCode,
      output: applyResult.output,
    }
  },
)

export const diffChezmoiHome = Effect.fn('diffChezmoiHome')(
  function* (options: ChezmoiHomeOptions = {}) {
    const root = path.resolve(options.root ?? process.cwd())
    const runCommand = options.runCommand ?? runHomeCommand
    const diffCommand: HomeCommand = {
      command: 'chezmoi',
      args: ['diff'],
      cwd: root,
    }

    const diffResult = yield* runCommand(diffCommand)
    if (diffResult.exitCode !== 0) {
      return yield* homeError(`chezmoi diff failed with exit code ${diffResult.exitCode}: ${diffResult.output.trim()}`)
    }

    return {
      commands: [diffCommand],
      exitCode: diffResult.exitCode,
      output: diffResult.output,
    }
  },
)

export const printChezmoiHomeStatus = Effect.fn('printChezmoiHomeStatus')(
  function* (options: ChezmoiHomeOptions = {}) {
    const result = yield* checkChezmoiHomeStatus(options)
    yield* printOutputOrDefault(result.output, 'chezmoi status: clean')
  },
)

export const printChezmoiHomeDiff = Effect.fn('printChezmoiHomeDiff')(
  function* (options: ChezmoiHomeOptions = {}) {
    const result = yield* diffChezmoiHome(options)
    yield* printOutputOrDefault(result.output, 'chezmoi diff: clean')
  },
)

export const printChezmoiHomeApply = Effect.fn('printChezmoiHomeApply')(
  function* (options: ChezmoiHomeApplyOptions = {}) {
    const result = yield* applyChezmoiHome(options)
    yield* printOutputOrDefault(
      result.output,
      'chezmoi apply: complete',
    )
  },
)

function printOutputOrDefault(output: string, defaultMessage: string) {
  const trimmed = output.trim()
  return Console.log(trimmed || defaultMessage)
}
