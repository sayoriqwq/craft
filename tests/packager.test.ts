import type { InstallCommand } from '../src/partita/install.ts'
import { execFile } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { runCliWithArgs } from '../src/cli/Main.ts'
import { installCodexPlugin, installCodexSkill, partitaMarketplaceEntry } from '../src/partita/install.ts'
import { filterPackagePaths, packagePartita, validatePackageStage } from '../src/partita/packager.ts'

const execFileAsync = promisify(execFile)

class TestError extends Schema.TaggedErrorClass<TestError>()('TestError', {
  cause: Schema.Defect(),
}) {}

function effectPromise<A>(action: () => Promise<A>): Effect.Effect<A, TestError, never> {
  return Effect.tryPromise({
    try: action,
    catch: cause => new TestError({ cause }),
  })
}

function tempDirectoryScoped(prefix: string) {
  return Effect.acquireRelease(
    effectPromise(() => fs.mkdtemp(path.join(os.tmpdir(), prefix))),
    directory =>
      effectPromise(() => fs.rm(directory, { recursive: true, force: true })).pipe(Effect.orElseSucceed(() => undefined)),
  )
}

function writeText(filePath: string, content: string): Effect.Effect<void, TestError, never> {
  return effectPromise(async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content)
  })
}

function readText(filePath: string): Effect.Effect<string, TestError, never> {
  return effectPromise(() => fs.readFile(filePath, 'utf8'))
}

function pathExists(filePath: string): Effect.Effect<boolean, TestError, never> {
  return effectPromise(() => fs.access(filePath).then(() => true, () => false))
}

function run(command: string, args: ReadonlyArray<string>, cwd: string): Effect.Effect<string, TestError, never> {
  return effectPromise(async () => {
    const { stdout } = await execFileAsync(command, [...args], { cwd })
    return stdout
  })
}

function cwdScoped(directory: string) {
  return Effect.acquireRelease(
    Effect.sync(() => {
      const previous = process.cwd()
      process.chdir(directory)
      return previous
    }),
    previous => Effect.sync(() => {
      process.chdir(previous)
    }),
  )
}

const seedPackageRepo = Effect.fn('seedPackageRepo')(
  function* (root: string): Effect.fn.Return<void, TestError> {
    yield* run('git', ['init'], root)
    yield* writeText(path.join(root, 'packaging.allowlist'), [
      'README.md',
      'LICENSE',
      '.codex-plugin/**',
      'rules/**',
      'skills/**',
      '',
    ].join('\n'))
    yield* writeText(path.join(root, '.gitignore'), 'rules/ignored.md\n')
    yield* writeText(path.join(root, '.codex-plugin', 'plugin.json'), JSON.stringify({
      name: 'partita',
      skills: './skills/',
    }))
    yield* writeText(path.join(root, 'README.md'), 'readme')
    yield* writeText(path.join(root, 'LICENSE'), 'license')
    yield* writeText(path.join(root, 'skills', 'foo', 'SKILL.md'), '# Foo\n')
    yield* writeText(path.join(root, 'rules', 'tracked.md'), 'tracked')
    yield* writeText(path.join(root, 'rules', 'untracked.md'), 'untracked')
    yield* writeText(path.join(root, 'rules', 'ignored.md'), 'ignored')
    yield* writeText(path.join(root, 'notes', 'excluded.txt'), 'excluded\n')
    yield* writeText(path.join(root, 'skills', 'foo', '__pycache__', 'bad.pyc'), 'bad')
    yield* writeText(path.join(root, 'skills', 'foo', '.DS_Store'), 'bad')
    yield* run('git', [
      'add',
      '.gitignore',
      '.codex-plugin/plugin.json',
      'README.md',
      'LICENSE',
      'skills/foo/SKILL.md',
      'rules/tracked.md',
    ], root)
  },
)

describe('Partita packager', () => {
  it.effect('filters package paths with default-deny allowlist semantics', () =>
    Effect.gen(function* () {
      const filtered = filterPackagePaths([
        'README.md',
        'notes/private.txt',
        'skills/foo/SKILL.md',
        'skills/foo/__pycache__/bad.pyc',
        'skills/foo/.DS_Store',
        'rules/shape.md',
      ], ['README.md', 'skills/**', 'rules/**'])

      assert.deepStrictEqual(filtered, [
        'README.md',
        'skills/foo/SKILL.md',
        'rules/shape.md',
      ])
    }))

  it.effect('validates a staged Codex plugin package', () =>
    Effect.scoped(Effect.gen(function* () {
      const stage = yield* tempDirectoryScoped('partita-stage-')
      yield* writeText(path.join(stage, '.codex-plugin', 'plugin.json'), JSON.stringify({
        name: 'partita',
        skills: './skills/',
      }))
      yield* writeText(path.join(stage, 'skills', 'foo', 'SKILL.md'), '# Foo\n')

      const validation = yield* validatePackageStage(stage)

      assert.strictEqual(validation.skillCount, 1)
      assert.deepStrictEqual(validation.skills, ['foo'])
    })))

  it.effect('packages tracked and untracked nonignored allowlisted files into dist/partita.zip', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* tempDirectoryScoped('partita-package-repo-')
      yield* seedPackageRepo(root)

      const result = yield* packagePartita({ root })
      const entriesOutput = yield* run('unzip', ['-Z1', result.output], root)
      const entries = entriesOutput.trim().split(/\r?\n/).filter(Boolean).sort()

      assert.strictEqual(path.relative(root, result.output), path.join('dist', 'partita.zip'))
      assert.isTrue(result.size > 0)
      assert.strictEqual(result.validation.skillCount, 1)
      assert.deepStrictEqual(entries, [
        '.codex-plugin/plugin.json',
        'LICENSE',
        'README.md',
        'rules/tracked.md',
        'rules/untracked.md',
        'skills/foo/SKILL.md',
      ])
      assert.isTrue(result.files.includes('rules/untracked.md'))
      assert.isFalse(result.files.includes('rules/ignored.md'))
      assert.isFalse(result.files.includes('notes/excluded.txt'))
      assert.isFalse(result.files.includes('skills/foo/__pycache__/bad.pyc'))
      assert.isFalse(result.files.includes('skills/foo/.DS_Store'))
    })))

  it.effect('keeps package command default output relative to --root', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* tempDirectoryScoped('partita-package-root-')
      const caller = yield* tempDirectoryScoped('partita-package-caller-')
      yield* seedPackageRepo(root)
      yield* cwdScoped(caller)

      yield* runCliWithArgs({ root: caller, version: 'test' }, ['package', '--root', root])

      assert.isTrue(yield* pathExists(path.join(root, 'dist', 'partita.zip')))
      assert.isFalse(yield* pathExists(path.join(caller, 'dist', 'partita.zip')))
    })))
})

describe('Partita install', () => {
  it.effect('maintains the personal Codex plugin symlink and marketplace entry', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* tempDirectoryScoped('partita-install-root-')
      const marketplaceRoot = yield* tempDirectoryScoped('partita-marketplace-')
      const otherRoot = yield* tempDirectoryScoped('partita-other-root-')
      const pluginsRoot = path.join(marketplaceRoot, 'plugins')

      yield* effectPromise(() => fs.mkdir(pluginsRoot, { recursive: true }))
      yield* effectPromise(() => fs.symlink(root, path.join(pluginsRoot, 'mini-waza'), 'dir'))
      yield* effectPromise(() => fs.symlink(otherRoot, path.join(pluginsRoot, 'craft'), 'dir'))
      yield* writeText(path.join(marketplaceRoot, '.agents', 'plugins', 'marketplace.json'), JSON.stringify({
        name: 'personal',
        interface: { displayName: 'Personal' },
        plugins: [
          { name: 'other', source: { source: 'local', path: './plugins/other' } },
          { name: 'mini-waza', source: { source: 'local', path: './plugins/mini-waza' } },
          { name: 'craft', source: { source: 'local', path: './plugins/craft' } },
          { name: 'partita', source: { source: 'local', path: './old' } },
        ],
      }))

      const result = yield* installCodexPlugin({ root, marketplaceRoot })
      const rootRealPath = yield* effectPromise(() => fs.realpath(root))
      const partitaTarget = yield* effectPromise(() => fs.readlink(path.join(pluginsRoot, 'partita')))
      const craftTarget = yield* effectPromise(() => fs.readlink(path.join(pluginsRoot, 'craft')))
      const marketplace = JSON.parse(yield* readText(result.marketplaceJson)) as { readonly plugins: ReadonlyArray<unknown> }

      assert.deepStrictEqual(result.removedLegacyLinks, [path.join(pluginsRoot, 'mini-waza')])
      assert.strictEqual(path.resolve(path.dirname(result.pluginLink), partitaTarget), rootRealPath)
      assert.strictEqual(path.resolve(path.dirname(path.join(pluginsRoot, 'craft')), craftTarget), otherRoot)
      assert.deepStrictEqual(marketplace.plugins, [
        { name: 'other', source: { source: 'local', path: './plugins/other' } },
        partitaMarketplaceEntry,
      ])
    })))

  it.effect('keeps npx skills remove/add command behavior and ignores remove failure', () =>
    Effect.gen(function* () {
      const calls: Array<InstallCommand> = []
      const root = '/tmp/partita-test-root'
      const result = yield* installCodexSkill({
        root,
        runCommand: (command: InstallCommand) => {
          calls.push(command)
          return Effect.succeed({
            exitCode: command.args[1] === 'remove' ? 17 : 0,
            output: '',
          })
        },
      })

      assert.strictEqual(result.removeExitCode, 17)
      assert.strictEqual(result.addExitCode, 0)
      assert.deepStrictEqual(calls, [
        {
          command: 'npx',
          args: ['skills', 'remove', 'author', 'patch', '-g', '-a', 'codex', 'opencode', '-y'],
          cwd: root,
        },
        {
          command: 'npx',
          args: ['skills', 'add', '.', '-a', 'codex', '-g', '--skill', '*', '-y', '--full-depth'],
          cwd: root,
        },
      ])
    }))
})
