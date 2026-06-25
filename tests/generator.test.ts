import { NodeFileSystem } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, FileSystem } from 'effect'

import { parseSkillFrontmatter } from '../src/partita/frontmatter.ts'
import {
  checkGeneratedFiles,
  collectSkillMetadata,
  generateProject,
  joinPath,
  renderGeneratedFiles,
  writeGeneratedFiles,
} from '../src/partita/generator.ts'

const effectHarnessManifest = JSON.stringify(
  {
    packageBaseline: {
      'effect': '4.0.0-beta.90',
      '@effect/platform-node': '4.0.0-beta.90',
      '@effect/vitest': '4.0.0-beta.90',
      '@effect/tsgo': '0.14.6',
      '@effect/language-service': '0.86.2',
      '@typescript/native-preview': '7.0.0-dev.20260624.1',
    },
    commands: {
      status: 'effect-harness status',
      verify: 'effect-harness verify --target .',
    },
  },
  null,
  2,
)

const parentPath = (path: string): string => path.slice(0, path.lastIndexOf('/'))

function requireElement<A>(values: ReadonlyArray<A>, index: number): A {
  const value = values[index]
  if (value === undefined) {
    throw new Error(`Missing element at index ${index}`)
  }
  return value
}

const writeFixtureFile = Effect.fn('writeFixtureFile')(function* (
  root: string,
  relativePath: string,
  content: string,
) {
  const fs = yield* FileSystem.FileSystem
  const path = joinPath(root, relativePath)
  yield* fs.makeDirectory(parentPath(path), { recursive: true })
  yield* fs.writeFileString(path, content)
})

const makeRepo = Effect.fn('makeRepo')(function* (files: Record<string, string>) {
  const fs = yield* FileSystem.FileSystem
  const root = yield* fs.makeTempDirectoryScoped({ prefix: 'partita-generator-' })
  for (const [relativePath, content] of Object.entries(files)) {
    yield* writeFixtureFile(root, relativePath, content)
  }
  return root
})

describe('Partita generator', () => {
  it.effect('parses skill frontmatter and trims scalar fields', () =>
    Effect.gen(function* () {
      const fields = yield* parseSkillFrontmatter(
        'skills/demo/SKILL.md',
        `---
name: demo
description: "Use when demo is needed. Not for unrelated work."
when_to_use: demo, sample
dispatch_intent: "Run the demo skill"
---

# Demo
`,
      )

      assert.deepStrictEqual(fields, {
        name: 'demo',
        description: 'Use when demo is needed. Not for unrelated work.',
        whenToUse: 'demo, sample',
        dispatchIntent: 'Run the demo skill',
      })
    }))

  it.effect('rejects stale metadata.version in skill frontmatter', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(parseSkillFrontmatter(
        'skills/demo/SKILL.md',
        `---
name: demo
description: "Use when demo is needed. Not for unrelated work."
metadata:
  version: 1.2.3
---
`,
      ))

      assert.strictEqual(error._tag, 'PartitaFrontmatterError')
      assert.include(error.message, 'STALE metadata.version')
    }))

  it.effect('renders generated files for a zero-skill repo', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* makeRepo({
        'VERSION': '0.2.0\n',
        '.effect-harness.json': effectHarnessManifest,
      })

      const files = yield* renderGeneratedFiles(root)
        .pipe(Effect.provide(NodeFileSystem.layer))

      assert.deepStrictEqual(
        files.map(file => file.relativePath),
        ['.codex-plugin/plugin.json', 'package.json', 'skills/DISPATCHER.md'],
      )
      const pluginFile = requireElement(files, 0)
      const packageFile = requireElement(files, 1)
      const dispatcherFile = requireElement(files, 2)

      assert.include(dispatcherFile.content, '| Intent | Skill | File |')
      assert.notInclude(dispatcherFile.content, 'skills/demo/SKILL.md')

      const pluginJson = JSON.parse(pluginFile.content) as { version: string, skills: string }
      assert.strictEqual(pluginJson.version, '0.2.0')
      assert.strictEqual(pluginJson.skills, './skills/')

      const packageJson = JSON.parse(packageFile.content) as {
        bin: { partita: string }
        dependencies: Record<string, string>
        files: ReadonlyArray<string>
        scripts: { build: string, generate: string, verify: string }
      }
      assert.strictEqual(packageJson.dependencies.effect, '4.0.0-beta.90')
      assert.deepStrictEqual(packageJson.files, ['dist', '.codex-plugin', 'LICENSE', 'README.md', 'rules', 'skills'])
      assert.strictEqual(packageJson.bin.partita, 'dist/bin/partita.js')
      assert.strictEqual(packageJson.scripts.build, 'rm -rf dist && tsc --project tsconfig.build.json && chmod +x dist/bin/partita.js')
      assert.strictEqual(packageJson.scripts.generate, 'pnpm build && node dist/bin/partita.js generate')
      assert.strictEqual(packageJson.scripts.verify, 'pnpm generate:check && node dist/bin/partita.js verify && pnpm typecheck && pnpm test && pnpm lint && pnpm knip && pnpm effect:verify')
    }).pipe(Effect.provide(NodeFileSystem.layer))))

  it.effect('collects skill metadata sorted by directory and rejects name drift', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* makeRepo({
        'VERSION': '0.2.0\n',
        'skills/bravo/SKILL.md': `---
name: bravo
description: "Use when bravo is needed. Not for unrelated work."
dispatch_intent: Bravo intent
---
`,
        'skills/alpha/SKILL.md': `---
name: alpha
description: "Use when alpha is needed. Not for unrelated work."
---
`,
      })

      const skills = yield* collectSkillMetadata(root)
      assert.deepStrictEqual(
        skills.map(skill => skill.name),
        ['alpha', 'bravo'],
      )
      assert.strictEqual(requireElement(skills, 0).dispatchIntent, '')
      assert.strictEqual(requireElement(skills, 1).dispatchIntent, 'Bravo intent')

      yield* writeFixtureFile(
        root,
        'skills/alpha/SKILL.md',
        `---
name: mismatch
description: "Use when alpha is needed. Not for unrelated work."
---
`,
      )
      const error = yield* Effect.flip(collectSkillMetadata(root))
      assert.strictEqual(error._tag, 'PartitaGeneratorError')
      assert.include(error.message, 'frontmatter name="mismatch" != directory "alpha"')
    }).pipe(Effect.provide(NodeFileSystem.layer))))

  it.effect('writes skills/DISPATCHER.md as the dispatcher surface', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* makeRepo({
        'VERSION': '0.2.0\n',
        '.effect-harness.json': effectHarnessManifest,
        'skills/demo/SKILL.md': `---
name: demo
description: "Use when demo is needed. Not for unrelated work."
dispatch_intent: Demo routing
---
`,
      })
      const fs = yield* FileSystem.FileSystem

      const results = yield* writeGeneratedFiles(root)
      assert.deepStrictEqual(
        results.map(result => [result.relativePath, result.status]),
        [
          ['.codex-plugin/plugin.json', 'written'],
          ['package.json', 'written'],
          ['skills/DISPATCHER.md', 'written'],
        ],
      )

      const dispatcher = yield* fs.readFileString(joinPath(root, 'skills', 'DISPATCHER.md'))
      assert.include(dispatcher, '| Demo routing | demo | `skills/demo/SKILL.md` |')

      const checks = yield* checkGeneratedFiles(root)
      assert.deepStrictEqual(
        checks.map(check => check.status),
        ['ok', 'ok', 'ok'],
      )

      const generateChecks = yield* generateProject({ check: true, root })
      assert.deepStrictEqual(
        generateChecks.map(check => check.status),
        ['ok', 'ok', 'ok'],
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))))
})
