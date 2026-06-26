import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import { PartitaError } from './errors.ts'
import { validateSkillText } from './skill-validation.ts'

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

const skillRefPattern = /skills\/(?:(primitive)\/)?([a-z][a-z0-9_-]*)\/SKILL\.md/gu
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/gu
const wikiLinkPattern = /\[\[([^\]\n]+)\]\]/gu
const urlPrefixes = ['http://', 'https://', 'mailto:', 'ftp://', 'tel:', 'data:']
const loadedSkillMarkers = ['🧭', '🎼'] as const
const routingTableStart = '<!-- partita:projection:start id="routing-table" source="skills" mode="block-table" -->'
const routingTableEnd = '<!-- partita:projection:end id="routing-table" -->'
const legacyRoutingTableStart = '<!-- routing-table:start -->'
const legacyRoutingTableEnd = '<!-- routing-table:end -->'
const fileProjectionPrefix = '<!-- partita:projection:file '
const blockProjectionStartPrefix = '<!-- partita:projection:start '
const blockProjectionEndPrefix = '<!-- partita:projection:end '
const namespaceShorthands = {
  primitive: 'pm',
} as const

type SkillNamespace = keyof typeof namespaceShorthands

interface SkillFileDescriptor {
  readonly handle: string
  readonly name: string
  readonly namespace: SkillNamespace | undefined
  readonly path: string
}

const skillContractSections = [
  '## Rule',
  '## Pattern',
  '## Boundary',
  '## Effects',
  '## Workflow',
  '## References',
  '## Validation',
] as const
const forbiddenLegacySkillSections = [
  '## Capability',
  '## Trigger',
  '## Template',
  '## Protocol',
  '## Surface',
  '## External State',
  '## Soft Boundary',
  '## Hard Boundary',
  'Primitive audit:',
] as const
const descriptionMaximumLength = 500
const descriptionSelectorPrefixPattern = /^Use (?:when|for)\b/u
const descriptionSchedulingPollution = [
  'always use',
  'use for all',
  'best',
  'safest',
  'recommended',
] as const
const requiredOpenAiInterfaceFields = ['display_name', 'short_description', 'default_prompt'] as const

const requiredRootMapFiles = [
  'CONTEXT.md',
  'HARNESS.md',
] as const

const requiredWikiFiles = [
  'wiki/index.md',
  'wiki/harness/index.md',
  'wiki/skill/index.md',
  'wiki/skill/assertion.md',
  'wiki/skill/primitive.md',
  'wiki/skill/orchestrator.md',
  'wiki/skill/case/index.md',
  'wiki/skill/case/insufficient-material.md',
  'wiki/skill/case/pattern.md',
  'wiki/skill/case/pressure.md',
  'wiki/skill/governance/index.md',
  'wiki/skill/governance/identity.md',
  'wiki/skill/lifecycle/index.md',
  'wiki/workflow/index.md',
  'wiki/workflow/gate/index.md',
  'wiki/workflow/gate/contract.md',
  'wiki/workflow/gate/span.md',
  'wiki/projection/index.md',
  'wiki/projection/codex/index.md',
  'wiki/projection/codex/description.md',
  'wiki/projection/codex/frontmatter.md',
  'wiki/projection/codex/openai.md',
  'wiki/projection/codex/dispatcher.md',
  'wiki/projection/codex/projection-marker.md',
  'wiki/projection/codex/references.md',
  'wiki/projection/codex/skill-md.md',
  'wiki/projection/verifier/index.md',
  'wiki/projection/verifier/description.md',
  'wiki/projection/verifier/links.md',
  'wiki/projection/verifier/metadata.md',
  'wiki/projection/verifier/nodes.md',
  'wiki/projection/verifier/shape.md',
  'wiki/practice/index.md',
  'wiki/practice/create.md',
  'wiki/practice/patch.md',
  'wiki/practice/audit.md',
  'wiki/collaboration/index.md',
  'wiki/documentation/index.md',
  'wiki/vocabulary/index.md',
] as const

export const verifySourceProject = Effect.fn('verifySourceProject')(function* (options: VerifyProjectOptions) {
  return yield* Effect.sync(() => buildSourceReport(resolve(options.root)))
})

export const verifyRouting = Effect.fn('verifyRouting')(function* (options: VerifyProjectOptions) {
  return yield* Effect.sync(() => {
    const root = resolve(options.root)
    const skills = skillFiles(root).map(skill => skill.handle)
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

function reportFromIssues(issues: ReadonlyArray<ValidationIssue>): ValidationReport {
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
    ...checkRootMapFiles(root),
    ...checkWikiFiles(root),
    ...checkProjectionMarkers(root),
    ...checkMarkdownLinks(root),
    ...checkWikiLinks(root),
    ...checkRemovedSurfaces(root),
    ...checkNoRootSkill(root),
  ]
  return reportFromIssues(issues)
}

function checkSkillFiles(root: string): { readonly descriptions: Record<string, string>, readonly issues: ReadonlyArray<ValidationIssue> } {
  const descriptions: Record<string, string> = {}
  const issues: Array<ValidationIssue> = []

  issues.push(...checkSkillsRootShape(root))

  for (const descriptor of skillFiles(root)) {
    const path = descriptor.path
    const relativePath = relativePathFrom(root, path)
    const text = readText(path)
    const validation = validateSkillText(text, relativePath)
    issues.push(...validation.issues)

    if (!validation.fields) {
      continue
    }

    issues.push(...checkSkillDirectoryShape(root, path))

    const name = validation.fields.name
    if (name !== descriptor.name) {
      issues.push(issue('skill.name_mismatch', `name=${JSON.stringify(name)} dir=${JSON.stringify(descriptor.name)}`, relativePath))
    }

    const description = validation.fields.description.trim()
    issues.push(...checkSkillDescription(description, relativePath))
    if (!hasLoadedSkillMarker(text)) {
      issues.push(issue('skill.missing_marker', `missing supported marker instruction: ${loadedSkillMarkers.join(', ')}`, relativePath))
    }

    issues.push(...checkSkillBodyShape(text, relativePath))
    issues.push(...checkOpenAiMetadata(root, name, path))

    descriptions[descriptor.handle] = description
  }

  return { descriptions, issues }
}

function checkSkillDescription(description: string, relativePath: string): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []

  if (description.length < 40) {
    issues.push(issue('skill.description_too_short', 'description must be at least 40 characters', relativePath))
  }
  if (description.length > descriptionMaximumLength) {
    issues.push(issue('skill.description_too_long', `description must be at most ${descriptionMaximumLength} characters`, relativePath))
  }
  if (!descriptionSelectorPrefixPattern.test(description)) {
    issues.push(issue('skill.description_selector_prefix', 'description must start with Use when or Use for', relativePath))
  }
  if (!description.includes('Not for')) {
    issues.push(issue('skill.description_activation_surface', 'description must include Not for', relativePath))
  }

  const lowered = description.toLowerCase()
  for (const term of descriptionSchedulingPollution) {
    if (lowered.includes(term)) {
      issues.push(issue('skill.description_scheduling_pollution', `description must not include scheduling claim: ${term}`, relativePath))
    }
  }

  return issues
}

function checkSkillBodyShape(text: string, relativePath: string): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  const missingSections = skillContractSections.filter(section => !text.includes(section))
  if (missingSections.length > 0) {
    issues.push(issue('skill.missing_contract_sections', `missing sections: ${missingSections.join(', ')}`, relativePath))
  }

  let previousIndex = -1
  for (const section of skillContractSections) {
    const index = text.indexOf(section)
    if (index === -1) {
      continue
    }
    if (index < previousIndex) {
      issues.push(issue('skill.section_order', `sections must appear in V1 order: ${skillContractSections.join(', ')}`, relativePath))
      break
    }
    previousIndex = index
  }

  for (const section of forbiddenLegacySkillSections) {
    if (text.includes(section)) {
      issues.push(issue('skill.legacy_section', `legacy skill section or marker is not allowed: ${section}`, relativePath))
    }
  }

  const pattern = sectionBetween(text, '## Pattern', '## Boundary')
  if (pattern && (!pattern.includes('Use when:') || !pattern.includes('Do not use when:'))) {
    issues.push(issue('skill.pattern_shape', 'Pattern must include Use when: and Do not use when:', relativePath))
  }

  const boundary = sectionBetween(text, '## Boundary', '## Effects')
  if (boundary && !boundary.includes('Soft:')) {
    issues.push(issue('skill.boundary_missing_soft', 'Boundary must include Soft:', relativePath))
  }
  const hardIndex = boundary.indexOf('Hard:')
  if (hardIndex !== -1 && !boundary.slice(hardIndex + 'Hard:'.length).trim()) {
    issues.push(issue('skill.boundary_empty_hard', 'Boundary Hard: must not be empty when present', relativePath))
  }

  const effects = sectionBetween(text, '## Effects', '## Workflow')
  for (const effect of ['Conversation', 'Filesystem', 'External'] as const) {
    if (effects && !effects.includes(`- ${effect}:`)) {
      issues.push(issue('skill.effects_missing_surface', `Effects must include ${effect}`, relativePath))
    }
  }

  const validation = sectionBetween(text, '## Validation', '')
  if (validation && !validation.includes('Before done:')) {
    issues.push(issue('skill.validation_shape', 'Validation must include Before done:', relativePath))
  }

  return issues
}

function checkOpenAiMetadata(
  root: string,
  skillName: string,
  skillPath: string,
): ReadonlyArray<ValidationIssue> {
  const metadataPath = join(dirname(skillPath), 'agents', 'openai.yaml')
  const relativeMetadataPath = relativePathFrom(root, metadataPath)
  const exists = existsSync(metadataPath)
  const issues: Array<ValidationIssue> = []
  if (!exists) {
    issues.push(issue(
      'openai_metadata.missing',
      `${skillName} must project invocation policy through agents/openai.yaml`,
      relativeMetadataPath,
    ))
    return issues
  }

  const metadata = parseOpenAiMetadata(readText(metadataPath), relativeMetadataPath)
  issues.push(...metadata.issues)

  if (!metadata.sections.has('interface')) {
    issues.push(issue('openai_metadata.interface_missing', 'agents/openai.yaml must declare interface metadata', relativeMetadataPath))
  }
  for (const field of requiredOpenAiInterfaceFields) {
    if (!nonEmptyString(metadata.interfaceFields[field])) {
      issues.push(issue('openai_metadata.interface_field_missing', `interface.${field} is required`, relativeMetadataPath))
    }
  }

  if (metadata.topLevelScalars.allow_implicit_invocation !== undefined) {
    issues.push(issue('openai_metadata.policy_location', 'allow_implicit_invocation must be nested under policy', relativeMetadataPath))
  }
  if (!metadata.sections.has('policy')) {
    issues.push(issue('openai_metadata.policy_missing', 'agents/openai.yaml must declare policy metadata', relativeMetadataPath))
  }
  if (metadata.allowImplicitInvocation === undefined) {
    issues.push(issue('openai_metadata.missing_invocation_policy', 'agents/openai.yaml must declare policy.allow_implicit_invocation', relativeMetadataPath))
    return issues
  }

  return issues
}

interface OpenAiMetadata {
  readonly allowImplicitInvocation: boolean | undefined
  readonly interfaceFields: Record<string, string>
  readonly policyFields: Record<string, string>
  readonly sections: ReadonlySet<string>
  readonly topLevelScalars: Record<string, string>
  readonly issues: ReadonlyArray<ValidationIssue>
}

function parseOpenAiMetadata(
  text: string,
  path: string,
): OpenAiMetadata {
  const issues: Array<ValidationIssue> = []
  const interfaceFields: Record<string, string> = {}
  const policyFields: Record<string, string> = {}
  const topLevelScalars: Record<string, string> = {}
  const sections = new Set<string>()
  let currentSection: string | undefined

  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) {
      continue
    }

    if (rawLine.includes('\t')) {
      issues.push(issue('openai_metadata.invalid_indent', `tabs are not allowed in YAML metadata on line ${index + 1}`, path))
      continue
    }

    const indent = leadingSpaceCount(rawLine)
    const line = rawLine.trim()
    const [key, rawValue] = splitYamlLine(line)
    if (rawValue === undefined) {
      issues.push(issue('openai_metadata.invalid_line', `invalid YAML metadata line ${index + 1}: ${JSON.stringify(rawLine)}`, path))
      continue
    }

    if (indent === 0) {
      currentSection = key
      if (rawValue.trim()) {
        topLevelScalars[key] = rawValue.trim()
        if (key === 'interface' || key === 'policy') {
          issues.push(issue('openai_metadata.invalid_section', `${key} must be a YAML mapping block`, path))
        }
      }
      else {
        sections.add(key)
      }
      continue
    }

    if (indent !== 2 || currentSection === undefined) {
      issues.push(issue('openai_metadata.invalid_indent', `unsupported YAML indentation on line ${index + 1}`, path))
      continue
    }

    const value = parseYamlScalar(rawValue, path, index + 1, issues)
    if (value === undefined) {
      continue
    }
    if (currentSection === 'interface') {
      interfaceFields[key] = value
    }
    else if (currentSection === 'policy') {
      policyFields[key] = value
    }
  }

  const policyValue = policyFields.allow_implicit_invocation
  const allowImplicitInvocation = policyValue === undefined
    ? undefined
    : parseBooleanPolicy(policyValue, path, issues)

  return {
    allowImplicitInvocation,
    interfaceFields,
    issues,
    policyFields,
    sections,
    topLevelScalars,
  }
}

function leadingSpaceCount(line: string): number {
  return line.length - line.trimStart().length
}

function splitYamlLine(line: string): readonly [string, string | undefined] {
  const separator = line.indexOf(':')
  if (separator === -1) {
    return [line, undefined]
  }
  return [line.slice(0, separator), line.slice(separator + 1)]
}

function parseYamlScalar(
  rawValue: string,
  path: string,
  line: number,
  issues: Array<ValidationIssue>,
): string | undefined {
  const value = rawValue.trim()
  if (!value) {
    issues.push(issue('openai_metadata.empty_value', `empty YAML scalar on line ${line}`, path))
    return undefined
  }

  if (value.startsWith('"') || value.startsWith('\'')) {
    const parsed = parseQuotedString(value)
    if (parsed.ok) {
      return parsed.value
    }
    issues.push(issue('openai_metadata.invalid_quote', `invalid YAML quote on line ${line}: ${parsed.message}`, path))
    return undefined
  }

  return value
}

function parseBooleanPolicy(value: string, path: string, issues: Array<ValidationIssue>): boolean | undefined {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  issues.push(issue('openai_metadata.invalid_invocation_policy', 'policy.allow_implicit_invocation must be true or false', path))
  return undefined
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
  const packageJsonPath = join(root, 'package.json')
  const packageJsonRelPath = 'package.json'
  const manifestPath = join(root, '.codex-plugin', 'plugin.json')
  const manifestRelPath = '.codex-plugin/plugin.json'

  const version = packageJsonVersion(packageJsonPath, packageJsonRelPath, issues)

  if (existsSync(join(root, 'VERSION'))) {
    issues.push(issue('version_file.forbidden', 'VERSION file is not used; package.json owns the version', 'VERSION'))
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
    issues.push(issue('plugin_manifest.version_drift', `plugin.json version ${stringifyField(data.version)} != package.json version ${version}`, manifestRelPath))
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

function packageJsonVersion(path: string, relativePath: string, issues: Array<ValidationIssue>): string {
  if (!existsSync(path)) {
    issues.push(issue('package_json.missing', 'package.json missing', relativePath))
    return ''
  }

  const parsed = parseJson(readText(path), relativePath)
  if (!parsed.ok) {
    issues.push(parsed.issue)
    return ''
  }

  const data = parsed.value
  if (!isRecord(data)) {
    issues.push(issue('package_json.invalid', 'package.json must be a JSON object', relativePath))
    return ''
  }

  if (!nonEmptyString(data.version)) {
    issues.push(issue('package_json.version_missing', 'package.json version is required', relativePath))
    return ''
  }

  return data.version.trim()
}

function checkRouting(root: string, skills: ReadonlySet<string>): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  const routingPaths = ['skills/DISPATCHER.md']

  if (!existsSync(join(root, 'skills/DISPATCHER.md'))) {
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
    if (!hasLoadedSkillMarker(text)) {
      issues.push(issue('routing.missing_marker', `missing supported marker: ${loadedSkillMarkers.join(', ')}`, path))
    }
    if (!text.includes(routingTableStart) || !text.includes(routingTableEnd)) {
      issues.push(issue('routing.missing_projection_marker', 'dispatcher must use partita routing-table projection markers', path))
    }
  }

  return issues
}

function checkProjectionMarkers(root: string): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  for (const path of markdownFiles(root)) {
    const relativePath = relativePathFrom(root, path)
    const text = readText(path)
    if (text.includes(legacyRoutingTableStart) || text.includes(legacyRoutingTableEnd)) {
      issues.push(issue('projection.legacy_marker', 'legacy routing-table marker is not allowed; use partita:projection markers', relativePath))
    }

    issues.push(...checkBlockProjectionMarkers(text, relativePath))
    issues.push(...checkFileProjectionMarker(root, text, relativePath))
  }
  return issues
}

function checkBlockProjectionMarkers(text: string, relativePath: string): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  const starts = projectionCommentLines(text, blockProjectionStartPrefix)
  const ends = projectionCommentLines(text, blockProjectionEndPrefix)
  const endCounts = new Map<string, number>()

  for (const end of ends) {
    const attrs = parseProjectionAttributes(end)
    const id = attrs.id
    if (!id) {
      issues.push(issue('projection.block_end_missing_id', 'projection block end marker must include id', relativePath))
      continue
    }
    endCounts.set(id, (endCounts.get(id) ?? 0) + 1)
  }

  for (const start of starts) {
    const attrs = parseProjectionAttributes(start)
    const id = attrs.id
    if (!id || !attrs.source || !attrs.mode) {
      issues.push(issue('projection.block_start_missing_attributes', 'projection block start marker must include id, source, and mode', relativePath))
      continue
    }
    if (attrs.mode !== 'block-table') {
      issues.push(issue('projection.unsupported_block_mode', `unsupported projection block mode: ${attrs.mode}`, relativePath))
    }

    const remaining = endCounts.get(id) ?? 0
    if (remaining === 0) {
      issues.push(issue('projection.block_end_missing', `missing projection block end marker for id=${id}`, relativePath))
      continue
    }
    endCounts.set(id, remaining - 1)
  }

  for (const [id, count] of endCounts) {
    if (count > 0) {
      issues.push(issue('projection.block_start_missing', `missing projection block start marker for id=${id}`, relativePath))
    }
  }

  return issues
}

function checkFileProjectionMarker(root: string, text: string, relativePath: string): ReadonlyArray<ValidationIssue> {
  if (!text.startsWith(fileProjectionPrefix)) {
    return []
  }

  const firstLine = text.split(/\r?\n/u, 1)[0] ?? ''
  const attrs = parseProjectionAttributes(firstLine)
  const source = attrs.source
  if (!source || !attrs.mode) {
    return [issue('projection.file_missing_attributes', 'file projection marker must include source and mode', relativePath)]
  }
  if (attrs.mode !== 'copy') {
    return [issue('projection.unsupported_file_mode', `unsupported file projection mode: ${attrs.mode}`, relativePath)]
  }
  if (!validProjectionSource(source)) {
    return [issue('projection.invalid_source', `invalid projection source: ${source}`, relativePath)]
  }

  const sourcePath = join(root, source)
  if (!existsSync(sourcePath)) {
    return [issue('projection.missing_source', `missing projection source: ${source}`, relativePath)]
  }

  const expected = `${fileProjectionHeader(source)}\n\n${readText(sourcePath)}`
  return text === expected
    ? []
    : [issue('projection.file_drift', `file projection is out of sync with ${source}`, relativePath)]
}

function projectionCommentLines(text: string, prefix: string): ReadonlyArray<string> {
  return text
    .split(/\r?\n/u)
    .filter(line => line.startsWith(prefix) && line.endsWith('-->'))
}

function parseProjectionAttributes(comment: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of comment.matchAll(/([a-z-]+)="([^"]*)"/gu)) {
    const key = match[1]
    const value = match[2]
    if (key !== undefined && value !== undefined) {
      attrs[key] = value
    }
  }
  return attrs
}

function fileProjectionHeader(source: string): string {
  return `<!-- partita:projection:file source="${source}" mode="copy" -->`
}

function validProjectionSource(source: string): boolean {
  return !source.startsWith('/') && !source.split('/').includes('..') && source.endsWith('.md')
}

function checkWikiFiles(root: string): ReadonlyArray<ValidationIssue> {
  return requiredWikiFiles
    .filter(path => !existsSync(join(root, path)))
    .map(path => issue('wiki.missing_file', 'missing wiki file', path))
}

function checkRootMapFiles(root: string): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  for (const path of requiredRootMapFiles) {
    const absolutePath = join(root, path)
    if (!existsSync(absolutePath)) {
      issues.push(issue('root_map.missing_file', 'missing root map file', path))
      continue
    }

    const text = readText(absolutePath)
    if (!text.includes('wiki/')) {
      issues.push(issue('root_map.missing_wiki_route', 'root map must route readers into wiki/', path))
    }
    if (text.includes('rules/') || text.includes('theory/')) {
      issues.push(issue('root_map.old_layer_ref', 'root map must not route to removed rules/ or theory/ layers', path))
    }
  }
  return issues
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

function checkWikiLinks(root: string): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  const wikiRoot = join(root, 'wiki')
  for (const path of markdownFiles(root)) {
    const relativePath = relativePathFrom(root, path)
    const text = readText(path)
    for (const match of text.matchAll(wikiLinkPattern)) {
      const target = match[1]
      if (target === undefined) {
        continue
      }

      const clean = cleanWikiTarget(target)
      if (!clean) {
        continue
      }

      const targetPath = clean.endsWith('.md') ? clean : `${clean}.md`
      if (!existsSync(join(wikiRoot, targetPath))) {
        issues.push(issue('wiki.broken_link', `broken wiki link: ${target}`, relativePath))
      }
    }
  }
  return issues
}

function checkRemovedSurfaces(root: string): ReadonlyArray<ValidationIssue> {
  const removed = [
    ['VERSION', 'deprecated VERSION file must not exist'],
    ['AGENTS.profile.md', 'removed profile file must not exist'],
    ['packaging.allowlist', 'removed package allowlist must not exist'],
    ['rules', 'removed rules directory must not exist'],
    ['theory', 'removed theory directory must not exist'],
    ['skills/RESOLVER.md', 'removed resolver registry must not exist'],
    ['skills/skill-write', 'removed skill-write path must not exist; use skills/primitive/notate'],
    ['skills/skill-patch', 'removed skill-patch path must not exist; use skills/primitive/retune'],
    ['src/partita/packager.ts', 'removed zip packager must not exist'],
    ['src/partita/package-verify.ts', 'removed package verifier must not exist'],
    ['tests/packager.test.ts', 'removed packager tests must not exist'],
    ['wiki/skill/design-v1.md', 'absorbed design-v1 source must not exist'],
    ['wiki/practice/migrate.md', 'removed migration practice node must not exist'],
    ['wiki/projection/verifier/package.md', 'removed package verifier node must not exist'],
    ['partita.zip', 'removed zip artifact must not exist'],
    ['dist/partita.zip', 'removed zip artifact must not exist'],
  ] as const

  return removed
    .filter(([path]) => existsSync(join(root, path)))
    .map(([path, message]) => issue('surface.removed_exists', message, path))
}

function checkNoRootSkill(root: string): ReadonlyArray<ValidationIssue> {
  return existsSync(join(root, 'SKILL.md'))
    ? [issue('root_skill.forbidden', 'source root SKILL.md is not allowed', 'SKILL.md')]
    : []
}

function skillFiles(root: string): ReadonlyArray<SkillFileDescriptor> {
  const skillsRoot = join(root, 'skills')
  if (!existsSync(skillsRoot)) {
    return []
  }

  const descriptors: Array<SkillFileDescriptor> = []
  for (const entry of readdirSync(skillsRoot, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) {
      continue
    }

    const directSkillPath = join(skillsRoot, entry.name, 'SKILL.md')
    if (existsSync(directSkillPath)) {
      descriptors.push({
        handle: skillHandle(undefined, entry.name),
        name: entry.name,
        namespace: undefined,
        path: directSkillPath,
      })
      continue
    }

    if (!isSkillNamespace(entry.name)) {
      continue
    }

    const namespaceRoot = join(skillsRoot, entry.name)
    for (const skillEntry of readdirSync(namespaceRoot, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      if (!skillEntry.isDirectory()) {
        continue
      }

      const skillPath = join(namespaceRoot, skillEntry.name, 'SKILL.md')
      if (!existsSync(skillPath)) {
        continue
      }
      descriptors.push({
        handle: skillHandle(entry.name, skillEntry.name),
        name: skillEntry.name,
        namespace: entry.name,
        path: skillPath,
      })
    }
  }

  return descriptors
}

function skillHandle(namespace: SkillNamespace | undefined, name: string): string {
  return namespace === undefined ? name : `${namespaceShorthands[namespace]}:${name}`
}

function isSkillNamespace(value: string): value is SkillNamespace {
  return Object.hasOwn(namespaceShorthands, value)
}

function checkSkillsRootShape(root: string): ReadonlyArray<ValidationIssue> {
  const skillsRoot = join(root, 'skills')
  if (!existsSync(skillsRoot)) {
    return []
  }

  const issues: Array<ValidationIssue> = []
  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }

    const directSkillPath = join(skillsRoot, entry.name, 'SKILL.md')
    if (existsSync(directSkillPath) || isSkillNamespace(entry.name)) {
      continue
    }

    issues.push(issue(
      'skills_root.unsupported_directory',
      'skills directories must be direct skills or supported namespaces',
      relativePathFrom(root, join(skillsRoot, entry.name)),
    ))
  }
  return issues
}

function checkSkillDirectoryShape(root: string, skillPath: string): ReadonlyArray<ValidationIssue> {
  const issues: Array<ValidationIssue> = []
  const skillDir = dirname(skillPath)
  for (const entry of readdirSync(skillDir, { withFileTypes: true })) {
    const entryPath = join(skillDir, entry.name)
    const relativeEntryPath = relativePathFrom(root, entryPath)
    switch (entry.name) {
      case 'SKILL.md':
        if (!entry.isFile()) {
          issues.push(issue('skill_shape.invalid_skill_file', 'SKILL.md must be a file', relativeEntryPath))
        }
        break
      case 'agents':
        issues.push(...checkAgentsDirectory(root, entryPath, entry.isDirectory()))
        break
      case 'assets':
        issues.push(...checkBundledResourceDirectory(root, entryPath, entry.isDirectory(), 'assets'))
        break
      case 'references':
        issues.push(...checkReferencesDirectory(root, entryPath, entry.isDirectory()))
        break
      case 'scripts':
        issues.push(...checkBundledResourceDirectory(root, entryPath, entry.isDirectory(), 'scripts'))
        break
      default:
        issues.push(issue('skill_shape.unsupported_entry', 'skill directories may only contain SKILL.md, agents/, scripts/, references/, and assets/', relativeEntryPath))
    }
  }
  return issues
}

function checkAgentsDirectory(root: string, path: string, isDirectory: boolean): ReadonlyArray<ValidationIssue> {
  if (!isDirectory) {
    return [issue('skill_shape.invalid_agents_dir', 'agents must be a directory', relativePathFrom(root, path))]
  }

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(path, entry.name)
    const relativeEntryPath = relativePathFrom(root, entryPath)
    if (!entry.isFile()) {
      return [issue('skill_shape.unsupported_agent_entry', 'agents must contain one-level config files', relativeEntryPath)]
    }
    return []
  })
}

function checkBundledResourceDirectory(
  root: string,
  path: string,
  isDirectory: boolean,
  name: 'assets' | 'scripts',
): ReadonlyArray<ValidationIssue> {
  return isDirectory
    ? []
    : [issue(`skill_shape.invalid_${name}_dir`, `${name} must be a directory`, relativePathFrom(root, path))]
}

function checkReferencesDirectory(root: string, path: string, isDirectory: boolean): ReadonlyArray<ValidationIssue> {
  if (!isDirectory) {
    return [issue('skill_shape.invalid_references_dir', 'references must be a directory', relativePathFrom(root, path))]
  }

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(path, entry.name)
    const relativeEntryPath = relativePathFrom(root, entryPath)
    if (!entry.isFile()) {
      return [issue('skill_shape.unsupported_reference', 'references must be one-level files', relativeEntryPath)]
    }
    return []
  })
}

function markdownFiles(root: string): ReadonlyArray<string> {
  const files: Array<string> = []
  walk(root, files)
  return files.sort()
}

function hasLoadedSkillMarker(text: string): boolean {
  return loadedSkillMarkers.some(marker => text.includes(marker))
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
  return path.split(sep).some(part => part === '.git' || part === 'assets' || part === 'node_modules')
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
    const namespace = match[1]
    const skill = match[2]
    if (skill !== undefined) {
      refs.push(skillHandle(namespace === undefined || !isSkillNamespace(namespace) ? undefined : namespace, skill))
    }
  }
  return new Set(refs)
}

function isExternalLink(target: string): boolean {
  return urlPrefixes.some(prefix => target.startsWith(prefix))
}

function cleanWikiTarget(target: string): string {
  const aliasIndex = target.indexOf('|')
  const withoutAlias = aliasIndex === -1 ? target : target.slice(0, aliasIndex)
  const hashIndex = withoutAlias.indexOf('#')
  const withoutHash = hashIndex === -1 ? withoutAlias : withoutAlias.slice(0, hashIndex)
  return withoutHash.trim().replace(/^\/+|\/+$/g, '')
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
