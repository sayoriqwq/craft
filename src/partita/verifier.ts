import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import { PartitaError } from './errors.ts'

export interface VerifyProjectOptions {
  readonly root: string
}

export interface ValidationIssue {
  readonly code: string
  readonly message: string
  readonly path?: string
}

export interface ValidationReport {
  readonly ok: boolean
  readonly issues: ReadonlyArray<ValidationIssue>
}

interface SkillFrontmatter {
  readonly name: string
  readonly description: string
  readonly whenToUse: string
  readonly dispatchIntent: string
}

interface FrontmatterParseResult {
  readonly fields?: SkillFrontmatter
  readonly issues: ReadonlyArray<ValidationIssue>
}

const skillRefPattern = /skills\/([a-z][a-z0-9_-]*)\/SKILL\.md/gu
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/gu
const urlPrefixes = ['http://', 'https://', 'mailto:', 'ftp://', 'tel:', 'data:']
const miniWazaMarker = '🧭'
const skillContractSections = [
  '## Capability',
  '## Trigger',
  '## Soft Boundary',
  '## Hard Boundary',
  '## Workflow',
  '## Validation',
] as const
const stateTokens = ['`stateful`', '`stateless`'] as const
const activationTokens = ['`activation: broad`', '`activation: narrow`'] as const
const durationTokens = ['`duration: turn`', '`duration: task`', '`duration: topic`', '`duration: mode`'] as const

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

export const verifySourceProject = Effect.fn('verifySourceProject')(function* (options: VerifyProjectOptions) {
  return yield* Effect.sync(() => buildSourceReport(resolve(options.root)))
})

export const verifyRouting = Effect.fn('verifyRouting')(function* (options: VerifyProjectOptions) {
  return yield* Effect.sync(() => {
    const root = resolve(options.root)
    const skills = skillFiles(root).map(path => basename(dirname(path)))
    return reportFromIssues(checkRouting(root, new Set(skills)))
  })
})

export const verifyProject = Effect.fn('verifyProject')(function* (options: VerifyProjectOptions) {
  const report = yield* verifySourceProject(options)
  if (!report.ok) {
    yield* Console.error('Partita verification failed:')
    for (const issue of report.issues) {
      yield* Console.error(`- ${formatIssue(issue)}`)
    }
    return yield* Effect.fail(new PartitaError('Partita verification failed.'))
  }

  yield* Console.log(`Partita source verified: ${options.root}`)
})

function formatIssue(issue: ValidationIssue): string {
  return issue.path ? `${issue.path}: ${issue.message}` : issue.message
}

export function reportFromIssues(issues: ReadonlyArray<ValidationIssue>): ValidationReport {
  return {
    issues,
    ok: issues.length === 0,
  }
}

function buildSourceReport(root: string): ValidationReport {
  const skillResult = checkSkillFiles(root)
  const skills = new Set(Object.keys(skillResult.descriptions))
  const issues = [
    ...skillResult.issues,
    ...checkPluginManifest(root),
    ...checkRouting(root, skills),
    ...checkRuleFiles(root),
    ...checkMarkdownLinks(root),
    ...checkNoRootSkill(root),
  ]
  return reportFromIssues(issues)
}

function checkSkillFiles(root: string): { readonly descriptions: Record<string, string>, readonly issues: ReadonlyArray<ValidationIssue> } {
  const descriptions: Record<string, string> = {}
  const issues: Array<ValidationIssue> = []

  for (const path of skillFiles(root)) {
    const relativePath = relativePathFrom(root, path)
    const text = readText(path)
    const parsed = parseFrontmatter(text, relativePath)
    issues.push(...parsed.issues)

    if (!parsed.fields) {
      continue
    }

    const name = parsed.fields.name
    if (name !== basename(dirname(path))) {
      issues.push(issue('skill.name_mismatch', `name=${JSON.stringify(name)} dir=${JSON.stringify(basename(dirname(path)))}`, relativePath))
    }

    const description = parsed.fields.description.trim()
    if (description.length < 40) {
      issues.push(issue('skill.description_too_short', 'description must be at least 40 characters', relativePath))
    }
    const lowered = description.toLowerCase()
    if (!lowered.includes('use when') || !lowered.includes('not for')) {
      issues.push(issue('skill.description_activation_surface', 'description must include Use when and Not for', relativePath))
    }
    if (!parsed.fields.whenToUse) {
      issues.push(issue('skill.missing_when_to_use', 'missing when_to_use', relativePath))
    }
    if (!parsed.fields.dispatchIntent) {
      issues.push(issue('skill.missing_dispatch_intent', 'missing dispatch_intent', relativePath))
    }
    if (!text.includes(miniWazaMarker)) {
      issues.push(issue('skill.missing_marker', `missing ${miniWazaMarker} marker instruction`, relativePath))
    }

    const missingSections = skillContractSections.filter(section => !text.includes(section))
    if (missingSections.length > 0) {
      issues.push(issue('skill.missing_contract_sections', `missing sections: ${missingSections.join(', ')}`, relativePath))
    }

    const softBoundary = sectionBetween(text, '## Soft Boundary', '## Hard Boundary')
    if (!softBoundary.includes('Primitive audit:')) {
      issues.push(issue('skill.missing_primitive_audit', 'Soft Boundary must include Primitive audit:', relativePath))
    }
    if (!stateTokens.some(token => softBoundary.includes(token))) {
      issues.push(issue('skill.primitive_state_missing', 'Primitive audit must include `stateful` or `stateless`', relativePath))
    }
    if (!activationTokens.some(token => softBoundary.includes(token))) {
      issues.push(issue('skill.primitive_activation_missing', 'Primitive audit must include activation token', relativePath))
    }
    if (!durationTokens.some(token => softBoundary.includes(token))) {
      issues.push(issue('skill.primitive_duration_missing', 'Primitive audit must include duration token', relativePath))
    }

    const hardBoundary = sectionBetween(text, '## Hard Boundary', '## Workflow')
    if (!hardBoundary.includes('primitive `constraint.hard`') || !hardBoundary.includes('machine-checkable')) {
      issues.push(issue('skill.hard_boundary_wording', 'Hard Boundary must distinguish primitive `constraint.hard` from machine-checkable enforcement', relativePath))
    }

    descriptions[name] = description
  }

  return { descriptions, issues }
}

function parseFrontmatter(text: string, path: string): FrontmatterParseResult {
  const issues: Array<ValidationIssue> = []
  const lines = text.split(/\r?\n/u)
  if (lines.length === 0 || lines[0] !== '---') {
    return {
      issues: [issue('frontmatter.invalid', 'frontmatter must start with ---', path)],
    }
  }

  const end = lines.indexOf('---', 1)
  if (end === -1) {
    return {
      issues: [issue('frontmatter.invalid', 'frontmatter missing closing ---', path)],
    }
  }

  const fields: Partial<SkillFrontmatter> & { readonly version?: string } = {}
  let inMetadata = false
  for (const rawLine of lines.slice(1, end)) {
    if (!rawLine.trim()) {
      continue
    }

    if (rawLine.startsWith('  ')) {
      if (!inMetadata) {
        issues.push(issue('frontmatter.invalid_indent', `invalid frontmatter indent: ${JSON.stringify(rawLine)}`, path))
        continue
      }
      const [key, rawValue] = splitFrontmatterLine(rawLine.trim())
      if (!rawValue) {
        issues.push(issue('frontmatter.invalid_line', `invalid frontmatter line: ${JSON.stringify(rawLine)}`, path))
        continue
      }
      if (key === 'version') {
        const parsed = parseScalar('metadata.version', rawValue, path)
        issues.push(...parsed.issues)
        if (parsed.value) {
          Object.assign(fields, { version: parsed.value })
        }
      }
      continue
    }

    inMetadata = false
    const [key, rawValue] = splitFrontmatterLine(rawLine)
    if (!rawValue) {
      issues.push(issue('frontmatter.invalid_line', `invalid frontmatter line: ${JSON.stringify(rawLine)}`, path))
      continue
    }

    if (key === 'metadata') {
      if (rawValue.trim()) {
        issues.push(issue('frontmatter.invalid_metadata', 'metadata must be a mapping', path))
      }
      inMetadata = true
      continue
    }

    const field = frontmatterFieldName(key)
    if (field) {
      const parsed = parseScalar(key, rawValue, path)
      issues.push(...parsed.issues)
      if (parsed.value) {
        Object.assign(fields, { [field]: parsed.value })
      }
    }
  }

  if (!fields.name?.trim()) {
    issues.push(issue('frontmatter.missing_name', 'missing name', path))
  }
  if (!fields.description?.trim()) {
    issues.push(issue('frontmatter.missing_description', 'missing description', path))
  }
  if (fields.version) {
    issues.push(issue('frontmatter.stale_version', 'metadata.version is stale; use top-level VERSION', path))
  }

  if (!fields.name || !fields.description) {
    return { issues }
  }

  return {
    fields: {
      description: fields.description.trim(),
      dispatchIntent: fields.dispatchIntent?.trim() ?? '',
      name: fields.name.trim(),
      whenToUse: fields.whenToUse?.trim() ?? '',
    },
    issues,
  }
}

function splitFrontmatterLine(line: string): readonly [string, string] {
  const separator = line.indexOf(':')
  if (separator === -1) {
    return [line, '']
  }
  return [line.slice(0, separator), line.slice(separator + 1)]
}

function frontmatterFieldName(key: string): keyof SkillFrontmatter | undefined {
  switch (key) {
    case 'name':
      return 'name'
    case 'description':
      return 'description'
    case 'when_to_use':
      return 'whenToUse'
    case 'dispatch_intent':
      return 'dispatchIntent'
    default:
      return undefined
  }
}

function parseScalar(field: string, raw: string, path: string): { readonly value?: string, readonly issues: ReadonlyArray<ValidationIssue> } {
  const value = raw.trim()
  if (!value) {
    return { issues: [issue('frontmatter.empty_value', `empty frontmatter value: ${field}`, path)] }
  }

  if (value.startsWith('"') || value.startsWith('\'')) {
    const parsed = parseQuotedString(value)
    return parsed.ok
      ? { issues: [], value: parsed.value }
      : { issues: [issue('frontmatter.invalid_quote', `invalid frontmatter quote in ${field}: ${parsed.message}`, path)] }
  }

  if (value.includes(': ')) {
    return { issues: [issue('frontmatter.unquoted_colon', `quote values containing ': ' in ${field}`, path)] }
  }

  return { issues: [], value }
}

function parseQuotedString(value: string): { readonly ok: true, readonly value: string } | { readonly ok: false, readonly message: string } {
  const quote = value[0]
  if (value[value.length - 1] !== quote) {
    return { message: 'missing closing quote', ok: false }
  }

  let result = ''
  for (let index = 1; index < value.length - 1; index += 1) {
    const character = value[index]
    if (character !== '\\') {
      result += character
      continue
    }

    index += 1
    if (index >= value.length - 1) {
      return { message: 'dangling escape', ok: false }
    }
    const escaped = value[index]
    switch (escaped) {
      case 'n':
        result += '\n'
        break
      case 'r':
        result += '\r'
        break
      case 't':
        result += '\t'
        break
      case '\\':
      case '"':
      case '\'':
        result += escaped
        break
      default:
        result += escaped
    }
  }

  return { ok: true, value: result }
}

function checkPluginManifest(root: string): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  const versionPath = join(root, 'VERSION')
  const manifestPath = join(root, '.codex-plugin', 'plugin.json')
  const manifestRelPath = '.codex-plugin/plugin.json'

  const version = existsSync(versionPath) ? readText(versionPath).trim() : ''
  if (!version) {
    issues.push(issue('version.empty', 'VERSION is missing or empty', 'VERSION'))
  }

  if (!existsSync(manifestPath)) {
    issues.push(issue('plugin_manifest.missing', '.codex-plugin/plugin.json missing', manifestRelPath))
    return issues
  }

  const parsed = parseJson(readText(manifestPath), manifestRelPath)
  if (!parsed.ok) {
    issues.push(parsed.issue)
    return issues
  }

  const data = parsed.value
  if (!isRecord(data)) {
    issues.push(issue('plugin_manifest.invalid', 'plugin manifest must be a JSON object', manifestRelPath))
    return issues
  }

  if (data.name !== 'partita') {
    issues.push(issue('plugin_manifest.name', 'name must be partita', manifestRelPath))
  }
  if (version && data.version !== version) {
    issues.push(issue('plugin_manifest.version_drift', `plugin.json version ${stringifyField(data.version)} != VERSION ${version}`, manifestRelPath))
  }
  if (data.skills !== './skills/') {
    issues.push(issue('plugin_manifest.skills_path', 'skills must be ./skills/', manifestRelPath))
  }

  const interfaceValue = data.interface
  if (!isRecord(interfaceValue)) {
    issues.push(issue('plugin_manifest.interface', 'interface must be an object', manifestRelPath))
    return issues
  }

  for (const field of ['displayName', 'shortDescription', 'longDescription', 'developerName', 'category'] as const) {
    if (!nonEmptyString(interfaceValue[field])) {
      issues.push(issue('plugin_manifest.interface_field', `interface.${field} is required`, manifestRelPath))
    }
  }

  for (const field of ['capabilities', 'defaultPrompt'] as const) {
    const value = interfaceValue[field]
    if (!Array.isArray(value) || !value.every(nonEmptyString)) {
      issues.push(issue('plugin_manifest.interface_array', `interface.${field} must be non-empty strings`, manifestRelPath))
    }
  }

  return issues
}

function checkRouting(root: string, skills: ReadonlySet<string>): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  const dispatcherPaths = ['skills/DISPATCHER.md']
  const routingPaths = [
    ...dispatcherPaths.filter(path => existsSync(join(root, path))),
    'skills/RESOLVER.md',
  ]

  if (!dispatcherPaths.some(path => existsSync(join(root, path)))) {
    issues.push(issue('routing.dispatcher_missing', 'missing dispatcher routing file: skills/DISPATCHER.md'))
  }

  for (const path of routingPaths) {
    const absolutePath = join(root, path)
    if (!existsSync(absolutePath)) {
      issues.push(issue('routing.missing_file', 'missing routing file', path))
      continue
    }

    const text = readText(absolutePath)
    const refs = skillRefs(text)
    const missing = [...skills].filter(skill => !refs.has(skill)).sort()
    const stale = [...refs].filter(skill => !skills.has(skill)).sort()
    if (missing.length > 0) {
      issues.push(issue('routing.missing_skill_refs', `missing skill refs: ${missing.join(', ')}`, path))
    }
    if (stale.length > 0) {
      issues.push(issue('routing.stale_skill_refs', `stale skill refs: ${stale.join(', ')}`, path))
    }
    if (!text.includes(miniWazaMarker)) {
      issues.push(issue('routing.missing_marker', `missing ${miniWazaMarker} marker`, path))
    }
  }

  return issues
}

function checkRuleFiles(root: string): ReadonlyArray<ValidationIssue> {
  return requiredRuleFiles
    .filter(path => !existsSync(join(root, path)))
    .map(path => issue('rules.missing_file', 'missing rule file', path))
}

function checkMarkdownLinks(root: string): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  for (const path of markdownFiles(root)) {
    const relativePath = relativePathFrom(root, path)
    const text = readText(path)
    for (const match of text.matchAll(linkPattern)) {
      const target = match[1]
      if (target === undefined) {
        continue
      }
      if (isExternalLink(target) || target.startsWith('#')) {
        continue
      }

      const hashIndex = target.indexOf('#')
      const clean = (hashIndex === -1 ? target : target.slice(0, hashIndex)).trim()
      if (!clean) {
        continue
      }
      if (!existsSync(join(dirname(path), clean))) {
        issues.push(issue('markdown.broken_link', `broken markdown link: ${target}`, relativePath))
      }
    }
  }
  return issues
}

function checkNoRootSkill(root: string): ReadonlyArray<ValidationIssue> {
  return existsSync(join(root, 'SKILL.md'))
    ? [issue('root_skill.forbidden', 'source root SKILL.md is not allowed', 'SKILL.md')]
    : []
}

function skillFiles(root: string): ReadonlyArray<string> {
  const skillsRoot = join(root, 'skills')
  if (!existsSync(skillsRoot)) {
    return []
  }

  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(skillsRoot, entry.name, 'SKILL.md'))
    .filter(path => existsSync(path))
    .sort()
}

function markdownFiles(root: string): ReadonlyArray<string> {
  const files: Array<string> = []
  walk(root, files)
  return files.sort()
}

function walk(path: string, files: Array<string>) {
  if (shouldSkipPath(path)) {
    return
  }

  const stat = statSync(path)
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      walk(join(path, entry), files)
    }
    return
  }

  if (path.endsWith('.md')) {
    files.push(path)
  }
}

function shouldSkipPath(path: string): boolean {
  return path.split(sep).some(part => part === '.git' || part === 'node_modules')
}

function sectionBetween(text: string, start: string, end: string): string {
  const startIndex = text.indexOf(start)
  if (startIndex === -1) {
    return ''
  }

  const contentStart = startIndex + start.length
  const endIndex = text.indexOf(end, contentStart)
  return endIndex === -1 ? text.slice(contentStart) : text.slice(contentStart, endIndex)
}

function skillRefs(text: string): ReadonlySet<string> {
  const refs: Array<string> = []
  for (const match of text.matchAll(skillRefPattern)) {
    const skill = match[1]
    if (skill !== undefined) {
      refs.push(skill)
    }
  }
  return new Set(refs)
}

function isExternalLink(target: string): boolean {
  return urlPrefixes.some(prefix => target.startsWith(prefix))
}

function readText(path: string): string {
  return readFileSync(path, 'utf8')
}

function parseJson(text: string, path: string): { readonly ok: true, readonly value: unknown } | { readonly ok: false, readonly issue: ValidationIssue } {
  try {
    return { ok: true, value: JSON.parse(text) }
  }
  catch (error) {
    return { issue: issue('json.invalid', `invalid JSON: ${errorMessage(error)}`, path), ok: false }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function stringifyField(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function relativePathFrom(root: string, path: string): string {
  const relativePath = relative(root, path)
  return relativePath === '' ? '.' : relativePath.split(sep).join('/')
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
