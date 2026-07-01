import type { HomeCommand } from '../src/partita/home.ts'
import { assert, describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import {
  applyChezmoiHome,
  checkChezmoiHomeStatus,
  diffChezmoiHome,
} from '../src/partita/home.ts'

describe('Partita home', () => {
  it.effect('runs chezmoi status', () =>
    Effect.gen(function* () {
      const calls: Array<HomeCommand> = []
      const root = '/tmp/partita-test-root'
      const result = yield* checkChezmoiHomeStatus({
        root,
        runCommand: (command: HomeCommand) => {
          calls.push(command)
          return Effect.succeed({
            exitCode: 0,
            output: '',
          })
        },
      })

      assert.strictEqual(result.exitCode, 0)
      assert.deepStrictEqual(calls, [
        {
          command: 'chezmoi',
          args: ['status'],
          cwd: root,
        },
      ])
    }))

  it.effect('runs chezmoi diff for a non-mutating check', () =>
    Effect.gen(function* () {
      const calls: Array<HomeCommand> = []
      const root = '/tmp/partita-test-root'
      const result = yield* diffChezmoiHome({
        root,
        runCommand: (command: HomeCommand) => {
          calls.push(command)
          return Effect.succeed({
            exitCode: 0,
            output: '',
          })
        },
      })

      assert.strictEqual(result.exitCode, 0)
      assert.deepStrictEqual(calls, [
        {
          command: 'chezmoi',
          args: ['diff'],
          cwd: root,
        },
      ])
    }))

  it.effect('blocks chezmoi apply unless write is explicit', () =>
    Effect.gen(function* () {
      const exit = yield* applyChezmoiHome({
        root: '/tmp/partita-test-root',
        runCommand: () =>
          Effect.succeed({
            exitCode: 0,
            output: '',
          }),
      }).pipe(
        Effect.match({
          onFailure: error => error.message,
          onSuccess: () => '',
        }),
      )

      assert.include(exit, 'requires --write')
    }))

  it.effect('runs chezmoi apply when write is explicit', () =>
    Effect.gen(function* () {
      const calls: Array<HomeCommand> = []
      const root = '/tmp/partita-test-root'
      const result = yield* applyChezmoiHome({
        root,
        runCommand: (command: HomeCommand) => {
          calls.push(command)
          return Effect.succeed({
            exitCode: 0,
            output: '',
          })
        },
        write: true,
      })

      assert.strictEqual(result.exitCode, 0)
      assert.deepStrictEqual(calls, [
        {
          command: 'chezmoi',
          args: ['apply'],
          cwd: root,
        },
      ])
    }))
})
