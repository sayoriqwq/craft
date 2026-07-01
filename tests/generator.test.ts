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
---

# Demo
`,
      )

      assert.deepStrictEqual(fields, {
        name: 'demo',
        description: 'Use when demo is needed. Not for unrelated work.',
      })
    }))

  it.effect('accepts official optional skill frontmatter fields', () =>
    Effect.gen(function* () {
      const fields = yield* parseSkillFrontmatter(
        'skills/demo/SKILL.md',
        `---
name: demo
description: "Use when demo is needed. Not for unrelated work."
license: MIT
allowed-tools:
  - web
metadata:
  short-description: "Demo skill"
---
`,
      )

      assert.deepStrictEqual(fields, {
        name: 'demo',
        description: 'Use when demo is needed. Not for unrelated work.',
      })
    }))

  it.effect('rejects non-official skill frontmatter fields', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(parseSkillFrontmatter(
        'skills/demo/SKILL.md',
        `---
name: demo
description: "Use when demo is needed. Not for unrelated work."
unsupported_field: Demo routing
---
`,
      ))

      assert.strictEqual(error._tag, 'PartitaFrontmatterError')
      assert.include(error.message, 'skill_validation.unexpected_frontmatter_key')
    }))

  it.effect('renders generated files for a zero-skill repo', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* makeRepo({
        'package.json': JSON.stringify({ version: '0.2.0' }),
        '.effect-harness.json': effectHarnessManifest,
      })

      const files = yield* renderGeneratedFiles(root)
        .pipe(Effect.provide(NodeFileSystem.layer))

      assert.deepStrictEqual(
        files.map(file => file.relativePath),
        ['.codex-plugin/plugin.json', 'package.json', 'harness/skills/dispatcher.md'],
      )
      const pluginFile = requireElement(files, 0)
      const packageFile = requireElement(files, 1)
      const dispatcherFile = requireElement(files, 2)

      assert.include(dispatcherFile.content, '| Handle | Name | Invocation | Description | File |')
      assert.notInclude(dispatcherFile.content, 'skills/demo/SKILL.md')

      const pluginJson = JSON.parse(pluginFile.content) as { version: string, skills: string }
      assert.strictEqual(pluginJson.version, '0.2.0')
      assert.strictEqual(pluginJson.skills, './skills/')

      const packageJson = JSON.parse(packageFile.content) as {
        bin: { partita: string }
        dependencies: Record<string, string>
        devDependencies: Record<string, string>
        files: ReadonlyArray<string>
        name: string
        packageManager: string
        publishConfig: { access: string }
        scripts: {
          build: string
          generate: string
          lint: string
          package?: string
          prepack: string
          test: string
          typecheck: string
          verify: string
        }
      }
      assert.strictEqual(packageJson.name, '@sayoriqwq/partita')
      assert.strictEqual(packageJson.packageManager, 'pnpm@11.7.0')
      assert.strictEqual(packageJson.dependencies.effect, '4.0.0-beta.90')
      assert.strictEqual(packageJson.dependencies['@effect/platform-node'], '4.0.0-beta.90')
      assert.strictEqual(packageJson.devDependencies.turbo, '^2.10.1')
      assert.deepStrictEqual(packageJson.files, ['dist', 'LICENSE', 'README.md'])
      assert.strictEqual(packageJson.publishConfig.access, 'public')
      assert.strictEqual(packageJson.bin.partita, 'dist/bin/partita.js')
      assert.strictEqual(packageJson.scripts.build, 'turbo run build --filter=@partita/generic-projection && rm -rf dist && tsc --project tsconfig.build.json && chmod +x dist/bin/partita.js')
      assert.strictEqual(packageJson.scripts.generate, 'pnpm build && node dist/bin/partita.js generate')
      assert.strictEqual(packageJson.scripts.lint, 'eslint eslint.config.mjs "bin/**/*.ts" "src/**/*.ts" "tests/**/*.ts" "packages/*/src/**/*.ts" --no-error-on-unmatched-pattern')
      assert.strictEqual(packageJson.scripts.package, undefined)
      assert.strictEqual(packageJson.scripts.prepack, 'pnpm build')
      assert.strictEqual(packageJson.scripts.test, 'turbo run build --filter=@partita/generic-projection && vitest run')
      assert.strictEqual(packageJson.scripts.typecheck, 'turbo run build --filter=@partita/generic-projection && turbo run typecheck --filter=@partita/generic-projection && tsgo --noEmit')
      assert.strictEqual(packageJson.scripts.verify, 'pnpm generate:check && node dist/bin/partita.js verify && pnpm typecheck && pnpm test && pnpm lint && pnpm knip && pnpm effect:verify')
    }).pipe(Effect.provide(NodeFileSystem.layer))))

  it.effect('collects skill metadata sorted by directory and rejects name drift', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* makeRepo({
        'package.json': JSON.stringify({ version: '0.2.0' }),
        'skills/bravo/SKILL.md': `---
name: bravo
description: "Use when bravo is needed. Not for unrelated work."
---
`,
        'skills/bravo/agents/openai.yaml': openAiMetadata(true),
        'skills/alpha/SKILL.md': `---
name: alpha
description: "Use when alpha is needed. Not for unrelated work."
---
`,
        'skills/alpha/agents/openai.yaml': openAiMetadata(false),
        'skills/expression/density/SKILL.md': `---
name: density
description: "Use when density is needed. Not for unrelated prose."
---
`,
        'skills/expression/density/agents/openai.yaml': openAiMetadata(false),
        'skills/link/pin/SKILL.md': `---
name: pin
description: "Use when pinning external authority is needed. Not for unrelated links."
---
`,
        'skills/link/pin/agents/openai.yaml': openAiMetadata(false),
        'skills/orientation/argue/SKILL.md': `---
name: argue
description: "Use when arguing is needed. Not for settled decisions."
---
`,
        'skills/orientation/argue/agents/openai.yaml': openAiMetadata(false),
        'skills/maintenance/reconcile/SKILL.md': `---
name: reconcile
description: "Use when reconciling completed work is needed. Not for ordinary review."
---
`,
        'skills/maintenance/reconcile/agents/openai.yaml': openAiMetadata(false),
        'skills/primitive/notate/SKILL.md': `---
name: notate
description: "Use when notating a skill is needed. Not for local retuning."
---
`,
        'skills/primitive/notate/agents/openai.yaml': openAiMetadata(false),
      })

      const skills = yield* collectSkillMetadata(root)
      assert.deepStrictEqual(
        skills.map(skill => skill.name),
        ['alpha', 'bravo', 'density', 'pin', 'reconcile', 'argue', 'notate'],
      )
      assert.deepStrictEqual(
        skills.map(skill => skill.handle),
        ['alpha', 'bravo', 'ex:density', 'lk:pin', 'mt:reconcile', 'og:argue', 'pm:notate'],
      )
      assert.deepStrictEqual(
        skills.map(skill => skill.allowImplicitInvocation),
        [false, true, false, false, false, false, false],
      )
      assert.strictEqual(requireElement(skills, 0).description, 'Use when alpha is needed. Not for unrelated work.')
      assert.strictEqual(requireElement(skills, 1).description, 'Use when bravo is needed. Not for unrelated work.')
      assert.strictEqual(requireElement(skills, 2).relativePath, 'skills/expression/density/SKILL.md')
      assert.strictEqual(requireElement(skills, 3).relativePath, 'skills/link/pin/SKILL.md')
      assert.strictEqual(requireElement(skills, 4).relativePath, 'skills/maintenance/reconcile/SKILL.md')
      assert.strictEqual(requireElement(skills, 5).relativePath, 'skills/orientation/argue/SKILL.md')
      assert.strictEqual(requireElement(skills, 6).relativePath, 'skills/primitive/notate/SKILL.md')

      yield* writeFixtureFile(
        root,
        'skills/primitive/notate/SKILL.md',
        `---
name: mismatch
description: "Use when notating a skill is needed. Not for local retuning."
---
`,
      )
      const error = yield* Effect.flip(collectSkillMetadata(root))
      assert.strictEqual(error._tag, 'PartitaGeneratorError')
      assert.include(error.message, 'frontmatter name="mismatch" != directory "notate"')
    }).pipe(Effect.provide(NodeFileSystem.layer))))

  it.effect('writes harness/skills/dispatcher.md as the dispatcher surface', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* makeRepo({
        'package.json': JSON.stringify({ version: '0.2.0' }),
        '.effect-harness.json': effectHarnessManifest,
        'skills/demo/SKILL.md': `---
name: demo
description: "Use when demo is needed. Not for unrelated work."
---
`,
        'skills/demo/agents/openai.yaml': openAiMetadata(true),
        'skills/expression/density/SKILL.md': `---
name: density
description: "Use when density is needed. Not for unrelated prose."
---
`,
        'skills/expression/density/agents/openai.yaml': openAiMetadata(false),
        'skills/link/pin/SKILL.md': `---
name: pin
description: "Use when pinning external authority is needed. Not for unrelated links."
---
`,
        'skills/link/pin/agents/openai.yaml': openAiMetadata(false),
        'skills/orientation/argue/SKILL.md': `---
name: argue
description: "Use when arguing is needed. Not for settled decisions."
---
`,
        'skills/orientation/argue/agents/openai.yaml': openAiMetadata(false),
        'skills/maintenance/reconcile/SKILL.md': `---
name: reconcile
description: "Use when reconciling completed work is needed. Not for ordinary review."
---
`,
        'skills/maintenance/reconcile/agents/openai.yaml': openAiMetadata(false),
        'skills/primitive/notate/SKILL.md': `---
name: notate
description: "Use when notating a skill is needed. Not for local retuning."
---
`,
        'skills/primitive/notate/agents/openai.yaml': openAiMetadata(false),
      })
      const fs = yield* FileSystem.FileSystem

      const results = yield* writeGeneratedFiles(root)
      assert.deepStrictEqual(
        results.map(result => [result.relativePath, result.status]),
        [
          ['.codex-plugin/plugin.json', 'written'],
          ['package.json', 'written'],
          ['harness/skills/dispatcher.md', 'written'],
        ],
      )

      const dispatcher = yield* fs.readFileString(joinPath(root, 'harness', 'skills', 'dispatcher.md'))
      assert.include(dispatcher, '<!-- partita:projection:start id="routing-table" source="skills" mode="block-table" -->')
      assert.include(dispatcher, '| demo | demo | true | Use when demo is needed. Not for unrelated work. | `skills/demo/SKILL.md` |')
      assert.include(dispatcher, '| ex:density | density | false | Use when density is needed. Not for unrelated prose. | `skills/expression/density/SKILL.md` |')
      assert.include(dispatcher, '| lk:pin | pin | false | Use when pinning external authority is needed. Not for unrelated links. | `skills/link/pin/SKILL.md` |')
      assert.include(dispatcher, '| mt:reconcile | reconcile | false | Use when reconciling completed work is needed. Not for ordinary review. | `skills/maintenance/reconcile/SKILL.md` |')
      assert.include(dispatcher, '| og:argue | argue | false | Use when arguing is needed. Not for settled decisions. | `skills/orientation/argue/SKILL.md` |')
      assert.include(dispatcher, '| pm:notate | notate | false | Use when notating a skill is needed. Not for local retuning. | `skills/primitive/notate/SKILL.md` |')

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

  it.effect('projects wiki sources into runtime references', () =>
    Effect.scoped(Effect.gen(function* () {
      const root = yield* makeRepo({
        'package.json': JSON.stringify({ version: '0.2.0' }),
        '.effect-harness.json': effectHarnessManifest,
        'packages/wiki/skill/case/insufficient-material.md': '# 材料不足\n\nMUST 打回。\n',
        'skills/demo/SKILL.md': `---
name: demo
description: "Use when demo is needed. Not for unrelated work."
---
`,
        'skills/demo/agents/openai.yaml': openAiMetadata(false),
        'skills/demo/references/insufficient-material.md': '<!-- partita:projection:file source="packages/wiki/skill/case/insufficient-material.md" mode="copy" -->\n',
      })
      const fs = yield* FileSystem.FileSystem

      const files = yield* renderGeneratedFiles(root)
      assert.isTrue(files.some(file => file.relativePath === 'skills/demo/references/insufficient-material.md'))

      const results = yield* writeGeneratedFiles(root)
      assert.deepStrictEqual(
        results.map(result => [result.relativePath, result.status]),
        [
          ['.codex-plugin/plugin.json', 'written'],
          ['package.json', 'written'],
          ['harness/skills/dispatcher.md', 'written'],
          ['skills/demo/references/insufficient-material.md', 'written'],
        ],
      )

      const projected = yield* fs.readFileString(joinPath(root, 'skills', 'demo', 'references', 'insufficient-material.md'))
      assert.strictEqual(
        projected,
        '<!-- partita:projection:file source="packages/wiki/skill/case/insufficient-material.md" mode="copy" -->\n\n# 材料不足\n\nMUST 打回。\n',
      )

      const checks = yield* checkGeneratedFiles(root)
      assert.deepStrictEqual(
        checks.map(check => check.status),
        ['ok', 'ok', 'ok', 'ok'],
      )
    }).pipe(Effect.provide(NodeFileSystem.layer))))
})

function openAiMetadata(allowImplicitInvocation: boolean): string {
  return [
    'interface:',
    '  display_name: "Demo"',
    '  short_description: "Demo skill fixture"',
    '  default_prompt: "Use $demo for verifier tests."',
    'policy:',
    `  allow_implicit_invocation: ${String(allowImplicitInvocation)}`,
  ].join('\n')
}
