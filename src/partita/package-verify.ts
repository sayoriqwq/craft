import type { ValidationIssue, ValidationReport } from './verifier.ts'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as Effect from 'effect/Effect'
import { reportFromIssues } from './verifier.ts'

export interface PackageVerifyOptions {
  readonly stage: string
}

export const verifyPackageStage = Effect.fn('verifyPackageStage')(function* (options: PackageVerifyOptions) {
  return yield* Effect.sync(() => buildPackageStageReport(resolve(options.stage)))
})

function buildPackageStageReport(stage: string): ValidationReport {
  const issues: Array<ValidationIssue> = []
  const manifestPath = join(stage, '.codex-plugin', 'plugin.json')
  const manifestRelPath = '.codex-plugin/plugin.json'

  if (!existsSync(manifestPath)) {
    issues.push(issue('package.plugin_manifest_missing', '.codex-plugin/plugin.json missing', manifestRelPath))
  }
  else {
    const parsed = parseJson(readFileSync(manifestPath, 'utf8'), manifestRelPath)
    if (!parsed.ok) {
      issues.push(parsed.issue)
    }
    else if (isRecord(parsed.value)) {
      if (parsed.value.name !== 'partita') {
        issues.push(issue('package.plugin_name', 'plugin name is not partita', manifestRelPath))
      }
      if (parsed.value.skills !== './skills/') {
        issues.push(issue('package.skills_path', 'plugin skills path must be ./skills/', manifestRelPath))
      }
    }
    else {
      issues.push(issue('package.plugin_manifest_shape', 'plugin manifest must be a JSON object', manifestRelPath))
    }
  }

  if (!existsSync(join(stage, 'skills'))) {
    issues.push(issue('package.skills_missing', 'skills directory missing', 'skills'))
  }
  if (existsSync(join(stage, 'SKILL.md'))) {
    issues.push(issue('package.root_skill_forbidden', 'root SKILL.md is not part of the Codex plugin', 'SKILL.md'))
  }
  if (existsSync(join(stage, '.claude-plugin'))) {
    issues.push(issue('package.claude_plugin_forbidden', '.claude-plugin must not be packaged', '.claude-plugin'))
  }

  return reportFromIssues(issues)
}

function parseJson(text: string, path: string): { readonly ok: true, readonly value: unknown } | { readonly ok: false, readonly issue: ValidationIssue } {
  try {
    return { ok: true, value: JSON.parse(text) }
  }
  catch (error) {
    return { issue: issue('package.invalid_json', `invalid JSON: ${errorMessage(error)}`, path), ok: false }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function issue(code: string, message: string, path?: string): ValidationIssue {
  return path ? { code, message, path } : { code, message }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
