import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { assert, describe, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { verifyPackageStage } from '../src/partita/package-verify.ts'
import { verifyRouting, verifySourceProject } from '../src/partita/verifier.ts'

const marker = '🧭'

const requiredRuleFiles = [
  'rules/anti-patterns.md',
  'rules/chinese.md',
  'rules/durable-context.md',
  'rules/routing.md',
  'rules/skills/index.md',
  'rules/skills/primitive.md',
  'rules/skills/shape.md',
  'rules/skills/care.md',
  'rules/skills/authoring.md',
] as const

describe('Partita verifier', () => {
  it.effect('accepts a valid source fixture', () =>
    Effect.gen(function* () {
      const root = makeValidSourceFixture()
      const report = yield* verifySourceProject({ root })

      assert.isTrue(report.ok)
      assert.deepStrictEqual(report.issues, [])
    }))

  it.effect('reports skill contract drift', () =>
    Effect.gen(function* () {
      const root = makeValidSourceFixture()
      write(root, 'skills/demo/SKILL.md', [
        '---',
        'name: demo',
        'description: too short',
        '---',
        '',
        '# Demo',
      ].join('\n'))

      const report = yield* verifySourceProject({ root })
      const codes = report.issues.map(issue => issue.code)

      assert.strictEqual(report.ok, false)
      assert.isTrue(codes.includes('skill.description_too_short'))
      assert.isTrue(codes.includes('skill.missing_marker'))
      assert.isTrue(codes.includes('skill.missing_contract_sections'))
      assert.isTrue(codes.includes('skill.missing_primitive_audit'))
      assert.isTrue(codes.includes('skill.hard_boundary_wording'))
    }))

  it.effect('reports dispatcher routing drift', () =>
    Effect.gen(function* () {
      const root = makeValidSourceFixture()
      write(root, 'skills/DISPATCHER.md', [
        '# Partita Dispatcher',
        '',
        `Prefix with ${marker}.`,
        '',
        '| Intent | Skill | File |',
        '| --- | --- | --- |',
        '| Missing | missing | `skills/missing/SKILL.md` |',
      ].join('\n'))

      const report = yield* verifyRouting({ root })
      const codes = report.issues.map(issue => issue.code)

      assert.strictEqual(report.ok, false)
      assert.isTrue(codes.includes('routing.missing_skill_refs'))
      assert.isTrue(codes.includes('routing.stale_skill_refs'))
    }))

  it.effect('validates package stage boundaries', () =>
    Effect.gen(function* () {
      const stage = makeValidPackageStage()
      write(stage, 'SKILL.md', '# Root skill is forbidden\n')
      mkdirSync(join(stage, '.claude-plugin'), { recursive: true })

      const report = yield* verifyPackageStage({ stage })
      const codes = report.issues.map(issue => issue.code)

      assert.strictEqual(report.ok, false)
      assert.isTrue(codes.includes('package.root_skill_forbidden'))
      assert.isTrue(codes.includes('package.claude_plugin_forbidden'))
    }))
})

function makeValidSourceFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'partita-verifier-'))
  write(root, 'VERSION', '0.1.0\n')
  write(root, '.codex-plugin/plugin.json', JSON.stringify({
    name: 'partita',
    version: '0.1.0',
    skills: './skills/',
    interface: {
      displayName: 'Partita',
      shortDescription: 'A Codex skill harness for user-defined workflows',
      longDescription: 'Partita verifies user-defined Codex workflow skills.',
      developerName: 'sayori',
      category: 'Developer Tools',
      capabilities: ['Interactive'],
      defaultPrompt: ['Add a custom Partita skill'],
    },
  }, null, 2))

  for (const path of requiredRuleFiles) {
    write(root, path, `# ${path}\n`)
  }

  write(root, 'skills/demo/SKILL.md', validSkill())
  write(root, 'skills/RESOLVER.md', resolver())
  write(root, 'skills/DISPATCHER.md', dispatcher())
  return root
}

function makeValidPackageStage(): string {
  const stage = mkdtempSync(join(tmpdir(), 'partita-package-'))
  write(stage, '.codex-plugin/plugin.json', JSON.stringify({
    name: 'partita',
    skills: './skills/',
  }, null, 2))
  mkdirSync(join(stage, 'skills'), { recursive: true })
  return stage
}

function validSkill(): string {
  return [
    '---',
    'name: demo',
    'description: "Use when verifying Partita skill shape in tests. Not for production routing or broad behavior."',
    'when_to_use: "demo verifier"',
    'dispatch_intent: "Verify demo skill fixture"',
    '---',
    '',
    '# Demo',
    '',
    `Prefix your first user-facing line with ${marker} inline when this Partita skill is active.`,
    '',
    '## Capability',
    '',
    'Verify the fixture behavior.',
    '',
    'Pressure scenario: tests need a realistic skill contract.',
    '',
    '## Trigger',
    '',
    'Use when the verifier tests need a valid skill.',
    '',
    '## Soft Boundary',
    '',
    'Primitive audit: `demo` is `stateless`, `activation: narrow`, and `duration: turn`.',
    '',
    '## Hard Boundary',
    '',
    'This shape has no primitive `constraint.hard` until machine-checkable enforcement exists.',
    '',
    '## Workflow',
    '',
    '1. Run the verifier.',
    '',
    '## Validation',
    '',
    'The verifier passes.',
  ].join('\n')
}

function resolver(): string {
  return [
    '# Partita Skill Resolver',
    '',
    `All Partita skills use ${marker} as the visible loaded-skill signal.`,
    '',
    '| Intent | Skill | File |',
    '| --- | --- | --- |',
    '| Demo | `demo` | `skills/demo/SKILL.md` |',
  ].join('\n')
}

function dispatcher(): string {
  return [
    '# Partita Dispatcher',
    '',
    `Prefix with ${marker} when a Partita skill is active.`,
    '',
    '| Intent | Skill | File |',
    '| --- | --- | --- |',
    '| Demo | demo | `skills/demo/SKILL.md` |',
  ].join('\n')
}

function write(root: string, path: string, contents: string) {
  const absolutePath = join(root, path)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, contents)
}
