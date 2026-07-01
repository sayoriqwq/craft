/* eslint-disable ts/no-use-before-define */
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import * as Stream from 'effect/Stream'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'
import { PartitaError } from './errors.ts'

type PinOwnershipMode = 'direct' | 'provider' | 'prelude-maintain'

type PinPolicyDecision = 'enabled' | 'recommended' | 'disabled'
type PinFilesExcludeDecision = 'enabled' | 'disabled'
type ParsedPinOwnershipMode = PinOwnershipMode | ''
type ParsedPinPolicyDecision = PinPolicyDecision | ''
type ParsedPinFilesExcludeDecision = PinFilesExcludeDecision | ''

export interface GitHubSubtreePinContract {
  readonly schemaVersion: 1
  readonly name: string
  readonly github: {
    readonly repository: string
    readonly branch: string
    readonly ref: string
  }
  readonly local: {
    readonly prefix: string
  }
  readonly mechanism: 'git-subtree' | ''
  readonly subtree: {
    readonly split: string
    readonly trailer: string
  }
  readonly anchor: {
    readonly llmDocument: string
  }
  readonly commands: {
    readonly update: string
    readonly verify: string
  }
  readonly agent: {
    readonly route: string
  }
  readonly editorPolicy: {
    readonly autoImportExclude: 'block' | ''
    readonly watcherExclude: ParsedPinPolicyDecision
    readonly searchExclude: ParsedPinPolicyDecision
    readonly filesExclude: ParsedPinFilesExcludeDecision
  }
  readonly ownership: {
    readonly mode: ParsedPinOwnershipMode
  }
  readonly boundaries: {
    readonly readOnly: boolean
    readonly importBlock: boolean
  }
}

export interface PinPlanOptions {
  readonly root: string
  readonly contractPath?: string
  readonly name?: string
  readonly repository?: string
  readonly branch?: string
  readonly ref?: string
  readonly prefix?: string
  readonly anchor?: string
  readonly updateCommand?: string
  readonly verifyCommand?: string
  readonly agentRoute?: string
  readonly ownershipMode?: PinOwnershipMode
  readonly watcherExclude?: PinPolicyDecision
  readonly searchExclude?: PinPolicyDecision
  readonly filesExclude?: PinFilesExcludeDecision
}

export interface PinCommandOptions {
  readonly root: string
  readonly contractPath?: string
  readonly name?: string
  readonly prefix?: string
}

export interface PinIssue {
  readonly code: string
  readonly message: string
  readonly path?: string
}

export interface PinStatus {
  readonly name: string
  readonly repository: string
  readonly prefix: string
  readonly mechanism: string
  readonly ownershipMode: string
  readonly subtreeSplit: string
  readonly contractPath: string
  readonly sourceExists: boolean
  readonly anchorExists: boolean
  readonly routeExists: boolean
}

interface PinReport {
  readonly ok: boolean
  readonly contractPath: string
  readonly entry: PinStatus
  readonly issues: ReadonlyArray<PinIssue>
}

export interface PinPlan {
  readonly contractPath: string
  readonly contract: GitHubSubtreePinContract
  readonly contractJson: string
  readonly editorSettings: {
    readonly vscode: string
    readonly zed: string
  }
}

type JsonRecord = Record<string, unknown>

const sourceCodeExtensions = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
])

const ignoredDirectoryNames = new Set([
  '.git',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
])

const fromSpecifierPattern = /\bfrom\s*['"]([^'"]+)['"]/gu
const sideEffectImportPattern = /^\s*import\s*['"]([^'"]+)['"]/gmu
const dynamicImportPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu
const requirePattern = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu

export function defaultPinContractPath(options: {
  readonly name?: string
  readonly prefix?: string
}): string {
  const name = nonEmpty(options.name) ?? lastPathSegment(nonEmpty(options.prefix) ?? '') ?? 'pin'
  const prefix = normalizeRelativePath(nonEmpty(options.prefix) ?? `repos/${name}`)
  return siblingSubtreeContractPath(prefix, name)
}

export const buildPinPlan = Effect.fn('buildPinPlan')(function* (options: PinPlanOptions) {
  const root = resolve(options.root)
  const name = nonEmpty(options.name) ?? 'pin'
  const prefix = normalizeRelativePath(nonEmpty(options.prefix) ?? `repos/${name}`)
  const contractPath = pinContractPathFromOption(root, options.contractPath, defaultPinContractPath({ name, prefix }))
  const ownershipMode = options.ownershipMode ?? (yield* defaultOwnershipMode(root))
  const agentRoute = normalizeRelativePath(nonEmpty(options.agentRoute) ?? (yield* defaultAgentRoute(root)))
  const split = nonEmpty(options.ref) ?? '<TODO:github-ref-or-subtree-split>'
  const contract: GitHubSubtreePinContract = {
    schemaVersion: 1,
    name,
    github: {
      repository: nonEmpty(options.repository) ?? '<TODO:github-repository>',
      branch: nonEmpty(options.branch) ?? 'main',
      ref: split,
    },
    local: {
      prefix,
    },
    mechanism: 'git-subtree',
    subtree: {
      split,
      trailer: split.startsWith('<TODO:') ? '<TODO:git-subtree-split-trailer>' : `git-subtree-split: ${split}`,
    },
    anchor: {
      llmDocument: normalizeRelativePath(nonEmpty(options.anchor) ?? `${prefix}/LLMS.md`),
    },
    commands: {
      update: nonEmpty(options.updateCommand) ?? `partita pin update --name ${name} --prefix ${prefix} --contract ${contractPath} --dry-run`,
      verify: nonEmpty(options.verifyCommand) ?? `partita pin verify --name ${name} --prefix ${prefix} --contract ${contractPath}`,
    },
    agent: {
      route: agentRoute,
    },
    editorPolicy: {
      autoImportExclude: 'block',
      watcherExclude: options.watcherExclude ?? 'recommended',
      searchExclude: options.searchExclude ?? 'recommended',
      filesExclude: options.filesExclude ?? 'disabled',
    },
    ownership: {
      mode: ownershipMode,
    },
    boundaries: {
      importBlock: true,
      readOnly: true,
    },
  }

  return {
    contract,
    contractJson: `${JSON.stringify(contract, null, 2)}\n`,
    contractPath,
    editorSettings: renderEditorSettings(contract),
  } satisfies PinPlan
})

export const inspectPins = Effect.fn('inspectPins')(function* (options: PinCommandOptions) {
  const root = resolve(options.root)
  const defaultPathOptions: { name?: string, prefix?: string } = {}
  const name = nonEmpty(options.name)
  const prefix = nonEmpty(options.prefix)
  if (name !== undefined) {
    defaultPathOptions.name = name
  }
  if (prefix !== undefined) {
    defaultPathOptions.prefix = prefix
  }
  const contractPath = pinContractPathFromOption(root, options.contractPath, defaultPinContractPath(defaultPathOptions))
  const contract = yield* readGitHubSubtreeContract(root, contractPath)
  return yield* buildPinReport(root, contractPath, contract)
})

export const printPinPlan = Effect.fn('printPinPlan')(function* (options: PinPlanOptions) {
  const plan = yield* buildPinPlan(options)
  yield* Console.log(`GitHub subtree pin plan: ${plan.contractPath}`)
  yield* Console.log('')
  yield* Console.log(plan.contractJson.trimEnd())
  yield* Console.log('')
  yield* Console.log('VSCode settings shape:')
  yield* Console.log(plan.editorSettings.vscode.trimEnd())
  yield* Console.log('')
  yield* Console.log('Zed settings shape:')
  yield* Console.log(plan.editorSettings.zed.trimEnd())
  return plan
})

export const printPinStatus = Effect.fn('printPinStatus')(function* (options: PinCommandOptions) {
  const report = yield* inspectPins(options)
  yield* Console.log(`GitHub subtree pin contract: ${report.contractPath}`)
  yield* Console.log(formatPinStatus(report.entry))
  if (report.issues.length > 0) {
    yield* Console.log('Issues:')
    for (const issue of report.issues) {
      yield* Console.log(`- ${formatPinIssue(issue)}`)
    }
  }
  return report
})

export const verifyPins = Effect.fn('verifyPins')(function* (options: PinCommandOptions) {
  const report = yield* inspectPins(options)
  if (!report.ok) {
    yield* Console.error('GitHub subtree pin verification failed:')
    for (const issue of report.issues) {
      yield* Console.error(`- ${formatPinIssue(issue)}`)
    }
    return yield* Effect.fail(new PartitaError('GitHub subtree pin verification failed.'))
  }

  yield* Console.log(`GitHub subtree pin verified: ${report.contractPath}`)
  return report
})

const readGitHubSubtreeContract = Effect.fn('readGitHubSubtreeContract')(function* (
  root: string,
  contractPath: string,
) {
  const fs = yield* FileSystem.FileSystem
  const relativePath = normalizeRelativePath(contractPath)
  const absolutePath = resolve(root, relativePath)
  const exists = yield* fileExists(absolutePath)
  if (!exists) {
    return yield* Effect.fail(new PartitaError(`GitHub subtree pin contract missing: ${relativePath}`))
  }
  const text = yield* fs.readFileString(absolutePath).pipe(
    Effect.mapError(cause => new PartitaError(`Read ${relativePath}: ${formatUnknown(cause)}`)),
  )
  const raw = yield* parseJson(text, relativePath)
  return normalizeGitHubSubtreeContract(raw)
})

const buildPinReport = Effect.fn('buildPinReport')(function* (
  root: string,
  contractPath: string,
  contract: GitHubSubtreePinContract,
) {
  const issues = yield* checkGitHubSubtreeContract(root, contractPath, contract)
  return {
    contractPath,
    entry: yield* pinStatus(root, contractPath, contract),
    issues,
    ok: issues.length === 0,
  } satisfies PinReport
})

const checkGitHubSubtreeContract = Effect.fn('checkGitHubSubtreeContract')(function* (
  root: string,
  contractPath: string,
  contract: GitHubSubtreePinContract,
) {
  const issues: Array<PinIssue> = [
    ...checkRequiredContractFields(contract),
    ...checkRelativeContractPaths(contract),
    ...checkGitHubOnly(contract),
    ...checkGitSubtreeOnly(contract),
    ...checkContractPathOutsidePrefix(contractPath, contract),
  ]
  const prefix = contract.local.prefix
  const prefixPath = resolve(root, prefix)

  if (!isMissingValue(prefix) && !(yield* fileExists(prefixPath))) {
    issues.push(issue('pin.source_missing', `source prefix is missing: ${prefix}`, prefix))
  }
  if (!isMissingValue(prefix) && (yield* sourcePrefixIsGitlink(root, prefix))) {
    issues.push(issue('pin.gitlink', `source prefix must be a git subtree checkout, not a submodule or gitlink: ${prefix}`, prefix))
  }
  if (!isMissingValue(prefix) && (yield* fileExists(join(prefixPath, '.git')))) {
    issues.push(issue('pin.gitlink', `source prefix contains nested git metadata: ${prefix}/.git`, `${prefix}/.git`))
  }

  if (isMissingValue(contract.github.ref) && isMissingValue(contract.subtree.split) && isMissingValue(contract.subtree.trailer)) {
    issues.push(issue('pin.ref_missing', 'missing GitHub ref or git-subtree split/trailer', prefix))
  }

  if (!isMissingValue(contract.anchor.llmDocument) && !(yield* fileExists(resolve(root, contract.anchor.llmDocument)))) {
    issues.push(issue('pin.anchor_missing', `anchor LLM document is missing: ${contract.anchor.llmDocument}`, contract.anchor.llmDocument))
  }
  if (!isMissingValue(contract.agent.route) && !(yield* fileExists(resolve(root, contract.agent.route)))) {
    issues.push(issue('pin.agent_route_missing', `agent route is missing: ${contract.agent.route}`, contract.agent.route))
  }

  if (!contract.boundaries.readOnly) {
    issues.push(issue('pin.read_only_missing', 'GitHub subtree pin must be marked read-only', prefix))
  }
  if (!contract.boundaries.importBlock) {
    issues.push(issue('pin.import_block_missing', 'GitHub subtree pin must enable import blocking', prefix))
  }
  if ((yield* preludeManaged(root)) && contract.ownership.mode === 'direct') {
    issues.push(issue('pin.prelude_direct_write', 'prelude-managed targets must not use direct GitHub subtree writes', '.prelude/manifest.json'))
  }

  if (contract.boundaries.importBlock && !isMissingValue(prefix)) {
    issues.push(...(yield* checkForbiddenImports(root, contract)))
  }
  issues.push(...(yield* checkEditorPolicy(root, contract)))

  return issues
})

function normalizeGitHubSubtreeContract(raw: unknown): GitHubSubtreePinContract {
  const value = recordAt(raw)
  const github = recordAt(value.github)
  const upstream = recordAt(value.upstream)
  const local = recordAt(value.local)
  const subtree = recordAt(value.subtree)
  const anchor = recordAt(value.anchor)
  const commands = recordAt(value.commands)
  const agent = recordAt(value.agent)
  const editorPolicy = recordAt(value.editorPolicy)
  const ownership = recordAt(value.ownership)
  const boundaries = recordAt(value.boundaries)
  const legacyPin = recordAt(value.pin)
  const split = stringAt(subtree.split) ?? stringAt(value.split) ?? stringAt(legacyPin.ref) ?? ''

  return {
    schemaVersion: value.schemaVersion === 1 ? 1 : 1,
    name: stringAt(value.name) ?? lastPathSegment(stringAt(local.prefix) ?? stringAt(value.prefix) ?? '') ?? '',
    github: {
      repository: stringAt(github.repository) ?? stringAt(upstream.repository) ?? stringAt(value.repository) ?? '',
      branch: stringAt(github.branch) ?? stringAt(upstream.branch) ?? stringAt(value.branch) ?? '',
      ref: stringAt(github.ref) ?? stringAt(upstream.ref) ?? split,
    },
    local: {
      prefix: normalizeRelativePath(stringAt(local.prefix) ?? stringAt(value.prefix) ?? ''),
    },
    mechanism: stringAt(value.mechanism) === 'git-subtree' ? 'git-subtree' : '',
    subtree: {
      split,
      trailer: stringAt(subtree.trailer) ?? stringAt(legacyPin.trailer) ?? stringAt(value.trailer) ?? (split ? `git-subtree-split: ${split}` : ''),
    },
    anchor: {
      llmDocument: normalizeRelativePath(stringAt(anchor.llmDocument) ?? stringAt(value.llmDocument) ?? ''),
    },
    commands: {
      update: stringAt(commands.update) ?? stringAt(value.updateCommand) ?? '',
      verify: stringAt(commands.verify) ?? stringAt(value.verifyCommand) ?? '',
    },
    agent: {
      route: normalizeRelativePath(stringAt(agent.route) ?? stringAt(value.agentRoute) ?? ''),
    },
    editorPolicy: {
      autoImportExclude: stringAt(editorPolicy.autoImportExclude) === 'block' ? 'block' : '',
      watcherExclude: normalizePolicyDecision(stringAt(editorPolicy.watcherExclude)),
      searchExclude: normalizePolicyDecision(stringAt(editorPolicy.searchExclude)),
      filesExclude: normalizeFilesExclude(stringAt(editorPolicy.filesExclude)),
    },
    ownership: {
      mode: normalizeOwnershipMode(stringAt(ownership.mode) ?? stringAt(value.ownershipMode)),
    },
    boundaries: {
      importBlock: booleanAt(boundaries.importBlock) ?? booleanAt(value.importBlock) ?? false,
      readOnly: booleanAt(boundaries.readOnly) ?? booleanAt(value.readOnly) ?? false,
    },
  }
}

function checkRequiredContractFields(contract: GitHubSubtreePinContract): ReadonlyArray<PinIssue> {
  const fields = [
    ['pin.name', contract.name],
    ['pin.github.repository', contract.github.repository],
    ['pin.github.branch', contract.github.branch],
    ['pin.github.ref', contract.github.ref || contract.subtree.split || contract.subtree.trailer],
    ['pin.local.prefix', contract.local.prefix],
    ['pin.mechanism', contract.mechanism],
    ['pin.subtree.split', contract.subtree.split || contract.github.ref],
    ['pin.subtree.trailer', contract.subtree.trailer],
    ['pin.anchor.llmDocument', contract.anchor.llmDocument],
    ['pin.commands.update', contract.commands.update],
    ['pin.commands.verify', contract.commands.verify],
    ['pin.agent.route', contract.agent.route],
    ['pin.editorPolicy.autoImportExclude', contract.editorPolicy.autoImportExclude],
    ['pin.editorPolicy.watcherExclude', contract.editorPolicy.watcherExclude],
    ['pin.editorPolicy.searchExclude', contract.editorPolicy.searchExclude],
    ['pin.editorPolicy.filesExclude', contract.editorPolicy.filesExclude],
    ['pin.ownership.mode', contract.ownership.mode],
  ] as const
  return fields
    .filter(([, value]) => isMissingValue(value))
    .map(([field]) => issue('pin.contract_missing', `missing GitHub subtree pin contract field: ${field}`))
}

function checkRelativeContractPaths(contract: GitHubSubtreePinContract): ReadonlyArray<PinIssue> {
  const paths = [
    ['pin.local.prefix', contract.local.prefix],
    ['pin.anchor.llmDocument', contract.anchor.llmDocument],
    ['pin.agent.route', contract.agent.route],
  ] as const
  return paths.flatMap(([field, value]) => {
    if (isMissingValue(value) || validRelativePath(value)) {
      return []
    }
    return [issue('pin.path_invalid', `${field} must be a relative path inside the target repo: ${value}`, value)]
  })
}

function checkGitHubOnly(contract: GitHubSubtreePinContract): ReadonlyArray<PinIssue> {
  if (isMissingValue(contract.github.repository) || githubRepositoryUrl(contract.github.repository)) {
    return []
  }
  return [issue('pin.github_only', `source repository must be a GitHub URL: ${contract.github.repository}`)]
}

function checkGitSubtreeOnly(contract: GitHubSubtreePinContract): ReadonlyArray<PinIssue> {
  if (contract.mechanism === 'git-subtree') {
    return []
  }
  return [issue('pin.mechanism_invalid', 'source mechanism must be git-subtree')]
}

function checkContractPathOutsidePrefix(contractPath: string, contract: GitHubSubtreePinContract): ReadonlyArray<PinIssue> {
  if (isMissingValue(contract.local.prefix) || !pathIsSameOrInside(contractPath, contract.local.prefix)) {
    return []
  }
  return [issue('pin.contract_path_inside_prefix', 'GitHub subtree pin contract must not live inside the subtree prefix', contractPath)]
}

const checkForbiddenImports = Effect.fn('checkForbiddenImports')(function* (
  root: string,
  contract: GitHubSubtreePinContract,
) {
  const files = yield* collectSourceCodeFiles(root, [contract.local.prefix])
  const issues: Array<PinIssue> = []
  const fs = yield* FileSystem.FileSystem
  for (const file of files) {
    const text = yield* fs.readFileString(file).pipe(
      Effect.mapError(cause => new PartitaError(`Read ${relativePathFrom(root, file)}: ${formatUnknown(cause)}`)),
    )
    for (const specifier of importedSpecifiers(text)) {
      if (specifierTargetsPrefix(root, file, specifier, contract.local.prefix)) {
        const relativeFile = relativePathFrom(root, file)
        issues.push(issue(
          'pin.import_blocked',
          `application/test code must not import from GitHub subtree prefix ${contract.local.prefix}: ${specifier}`,
          relativeFile,
        ))
      }
    }
  }
  return issues
})

const checkEditorPolicy = Effect.fn('checkEditorPolicy')(function* (
  root: string,
  contract: GitHubSubtreePinContract,
) {
  const issues: Array<PinIssue> = []
  if (contract.editorPolicy.autoImportExclude !== 'block') {
    issues.push(issue('pin.editor_auto_import_missing', 'editor policy must block auto-import from the GitHub subtree prefix'))
  }

  const vscodeSettings = join(root, '.vscode', 'settings.json')
  if (yield* fileExists(vscodeSettings)) {
    const value = yield* parseSettingsFile(vscodeSettings, '.vscode/settings.json')
    if (!vscodeAutoImportExcluded(value, contract.local.prefix)) {
      issues.push(issue('pin.editor_vscode_auto_import_missing', 'VSCode settings must exclude the GitHub subtree prefix from TypeScript and JavaScript auto-imports', '.vscode/settings.json'))
    }
  }

  const zedSettings = join(root, '.zed', 'settings.json')
  if (yield* fileExists(zedSettings)) {
    const value = yield* parseSettingsFile(zedSettings, '.zed/settings.json')
    if (!zedAutoImportExcluded(value, contract.local.prefix)) {
      issues.push(issue('pin.editor_zed_auto_import_missing', 'Zed settings must exclude the GitHub subtree prefix through nested TypeScript LSP auto-import preferences', '.zed/settings.json'))
    }
  }

  return issues
})

const pinStatus = Effect.fn('pinStatus')(function* (
  root: string,
  contractPath: string,
  contract: GitHubSubtreePinContract,
) {
  return {
    anchorExists: !isMissingValue(contract.anchor.llmDocument) && (yield* fileExists(resolve(root, contract.anchor.llmDocument))),
    contractPath,
    mechanism: contract.mechanism,
    name: contract.name,
    ownershipMode: contract.ownership.mode,
    prefix: contract.local.prefix,
    repository: contract.github.repository,
    routeExists: !isMissingValue(contract.agent.route) && (yield* fileExists(resolve(root, contract.agent.route))),
    sourceExists: !isMissingValue(contract.local.prefix) && (yield* fileExists(resolve(root, contract.local.prefix))),
    subtreeSplit: contract.subtree.split || contract.github.ref || contract.subtree.trailer,
  } satisfies PinStatus
})

function formatPinStatus(entry: PinStatus): string {
  return [
    `- ${entry.name}`,
    `repository=${entry.repository}`,
    `prefix=${entry.prefix}`,
    `contract=${entry.contractPath}`,
    `mechanism=${entry.mechanism}`,
    `ownership=${entry.ownershipMode}`,
    `split=${entry.subtreeSplit || '<missing>'}`,
    `source=${entry.sourceExists ? 'present' : 'missing'}`,
    `anchor=${entry.anchorExists ? 'present' : 'missing'}`,
    `route=${entry.routeExists ? 'present' : 'missing'}`,
  ].join(' ')
}

function formatPinIssue(issue: PinIssue): string {
  return issue.path ? `${issue.path}: ${issue.code}: ${issue.message}` : `${issue.code}: ${issue.message}`
}

function renderEditorSettings(contract: GitHubSubtreePinContract): PinPlan['editorSettings'] {
  const glob = `${contract.local.prefix}/**`
  const vscode: JsonRecord = {
    'javascript.preferences.autoImportFileExcludePatterns': [glob],
    'typescript.preferences.autoImportFileExcludePatterns': [glob],
  }
  if (contract.editorPolicy.watcherExclude !== 'disabled') {
    vscode['files.watcherExclude'] = { [glob]: true }
  }
  if (contract.editorPolicy.searchExclude !== 'disabled') {
    vscode['search.exclude'] = { [glob]: true }
  }
  if (contract.editorPolicy.filesExclude === 'enabled') {
    vscode['files.exclude'] = { [glob]: true }
  }

  const zed: JsonRecord = {
    lsp: {
      'vtsls': {
        settings: {
          javascript: {
            preferences: {
              autoImportFileExcludePatterns: [glob],
            },
          },
          typescript: {
            preferences: {
              autoImportFileExcludePatterns: [glob],
            },
          },
        },
      },
      'typescript-language-server': {
        initialization_options: {
          preferences: {
            autoImportFileExcludePatterns: [glob],
          },
        },
      },
    },
  }
  if (contract.editorPolicy.filesExclude === 'enabled') {
    zed.file_scan_exclusions = [glob]
  }

  return {
    vscode: `${JSON.stringify(vscode, null, 2)}\n`,
    zed: `${JSON.stringify(zed, null, 2)}\n`,
  }
}

function vscodeAutoImportExcluded(settings: JsonRecord, prefix: string): boolean {
  const glob = `${prefix}/**`
  return stringArrayIncludes(settings['typescript.preferences.autoImportFileExcludePatterns'], glob)
    && stringArrayIncludes(settings['javascript.preferences.autoImportFileExcludePatterns'], glob)
}

function zedAutoImportExcluded(settings: JsonRecord, prefix: string): boolean {
  const glob = `${prefix}/**`
  const lsp = recordAt(settings.lsp)
  const vtslsSettings = recordAt(recordAt(recordAt(lsp.vtsls).settings))
  const tsPreferences = recordAt(recordAt(vtslsSettings.typescript).preferences)
  const jsPreferences = recordAt(recordAt(vtslsSettings.javascript).preferences)
  const typescriptLanguageServer = recordAt(lsp['typescript-language-server'])
  const initializationOptions = recordAt(typescriptLanguageServer.initialization_options)
  const tlsPreferences = recordAt(initializationOptions.preferences)

  const vtslsConfigured = stringArrayIncludes(tsPreferences.autoImportFileExcludePatterns, glob)
    && stringArrayIncludes(jsPreferences.autoImportFileExcludePatterns, glob)
  const tlsConfigured = stringArrayIncludes(tlsPreferences.autoImportFileExcludePatterns, glob)
  return vtslsConfigured || tlsConfigured
}

const sourcePrefixIsGitlink = Effect.fn('sourcePrefixIsGitlink')(function* (root: string, prefix: string) {
  const result = yield* runCommand({
    args: ['ls-files', '--stage', '--', prefix],
    command: 'git',
    cwd: root,
  })
  if (result.exitCode !== 0) {
    return false
  }
  return result.output.split(/\r?\n/u).some(line => line.startsWith('160000 '))
})

const collectSourceCodeFiles = Effect.fn('collectSourceCodeFiles')(function* (
  root: string,
  sourcePrefixes: ReadonlyArray<string>,
) {
  const fs = yield* FileSystem.FileSystem
  const entries = yield* fs.readDirectory(root, { recursive: true }).pipe(
    Effect.mapError(cause => new PartitaError(`Read directory ${root}: ${formatUnknown(cause)}`)),
  )
  const files: Array<string> = []
  for (const entry of entries) {
    const relativePath = normalizeRelativePath(entry)
    const name = lastPathSegment(relativePath) ?? ''
    if (ignoredDirectoryNames.has(name) || sourcePrefixes.some(prefix => pathIsSameOrInside(relativePath, prefix))) {
      continue
    }
    if (relativePath.split('/').some(segment => ignoredDirectoryNames.has(segment))) {
      continue
    }
    if (!sourceCodeExtensions.has(extensionOf(relativePath))) {
      continue
    }
    const absolutePath = resolve(root, relativePath)
    const stat = yield* fs.stat(absolutePath).pipe(
      Effect.catchTag('PlatformError', () => Effect.succeed(undefined)),
    )
    if (stat?.type === 'File') {
      files.push(absolutePath)
    }
  }
  return files
})

function importedSpecifiers(text: string): ReadonlyArray<string> {
  const specifiers: Array<string> = []
  for (const pattern of [fromSpecifierPattern, sideEffectImportPattern, dynamicImportPattern, requirePattern]) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1]
      if (value !== undefined) {
        specifiers.push(value)
      }
    }
  }
  return specifiers
}

function specifierTargetsPrefix(root: string, importer: string, specifier: string, prefix: string): boolean {
  if (specifier === prefix || specifier.startsWith(`${prefix}/`)) {
    return true
  }
  if (!specifier.startsWith('.')) {
    return false
  }
  const resolved = resolve(dirname(importer), specifier)
  return pathIsSameOrInside(relativePathFrom(root, resolved), prefix)
}

const parseJson = Effect.fn('parseJson')(function* (text: string, path: string) {
  return yield* Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: cause => new PartitaError(`Invalid JSON in ${path}: ${formatUnknown(cause)}`),
  })
})

const parseSettingsFile = Effect.fn('parseSettingsFile')(function* (path: string, relativePath: string) {
  const fs = yield* FileSystem.FileSystem
  const text = yield* fs.readFileString(path).pipe(
    Effect.mapError(cause => new PartitaError(`Read ${relativePath}: ${formatUnknown(cause)}`)),
  )
  const parsed = yield* parseJson(stripJsonComments(text), relativePath)
  if (!isRecord(parsed)) {
    return yield* Effect.fail(new PartitaError(`${relativePath} must contain a JSON object`))
  }
  return parsed
})

function stripJsonComments(text: string): string {
  let output = ''
  let inString = false
  let escaped = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === undefined) {
      continue
    }
    if (inString) {
      const wasEscaped = escaped
      output += char
      escaped = char === '\\' && !escaped
      if (char === '"' && !wasEscaped) {
        inString = false
      }
      else if (char !== '\\') {
        escaped = false
      }
      continue
    }
    if (char === '"') {
      inString = true
      output += char
      continue
    }
    if (char === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') {
        index += 1
      }
      output += '\n'
      continue
    }
    if (char === '/' && next === '*') {
      index += 2
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        index += 1
      }
      index += 1
      continue
    }
    output += char
  }
  return output
}

interface CommandResult {
  readonly exitCode: number
  readonly output: string
}

interface PinCommand {
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly cwd: string
}

const runCommand = Effect.fn('runPinCommand')(function* (command: PinCommand) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  const handle = yield* spawner.spawn(
    ChildProcess.make(command.command, command.args, {
      cwd: command.cwd,
      extendEnv: true,
    }),
  ).pipe(
    Effect.mapError(cause => new PartitaError(`Spawn ${command.command}: ${formatUnknown(cause)}`)),
  )
  const output = yield* handle.all.pipe(
    Stream.decodeText(),
    Stream.mkString,
    Effect.mapError(cause => new PartitaError(`Collect ${command.command} output: ${formatUnknown(cause)}`)),
  )
  const exitCode = Number(yield* handle.exitCode.pipe(
    Effect.mapError(cause => new PartitaError(`Wait for ${command.command}: ${formatUnknown(cause)}`)),
  ))
  return {
    exitCode,
    output,
  } satisfies CommandResult
})

const fileExists = Effect.fn('fileExists')(function* (path: string) {
  const fs = yield* FileSystem.FileSystem
  return yield* fs.exists(path).pipe(
    Effect.catchTag('PlatformError', () => Effect.succeed(false)),
  )
})

const defaultAgentRoute = Effect.fn('defaultAgentRoute')(function* (root: string) {
  return (yield* fileExists(join(root, 'AGENTS.md'))) ? 'AGENTS.md' : '<TODO:agent-route>'
})

const defaultOwnershipMode = Effect.fn('defaultOwnershipMode')(function* (root: string) {
  return (yield* preludeManaged(root)) ? 'prelude-maintain' : 'direct'
})

const preludeManaged = Effect.fn('preludeManaged')(function* (root: string) {
  return yield* fileExists(join(root, '.prelude', 'manifest.json'))
})

function githubRepositoryUrl(value: string): boolean {
  return /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/u.test(value)
    || /^git@github\.com:[^/\s]+\/[^/\s]+$/u.test(value)
}

function siblingSubtreeContractPath(prefix: string, name: string): string {
  const normalizedPrefix = normalizeRelativePath(prefix)
  const parent = dirname(normalizedPrefix).replaceAll('\\', '/')
  const basename = lastPathSegment(normalizedPrefix) ?? name
  if (parent === '.' || parent.length === 0) {
    return `${basename}.subtree.json`
  }
  return `${parent}/${basename}.subtree.json`
}

function pinContractPathFromOption(root: string, value: string | undefined, fallback: string): string {
  const rawPath = nonEmpty(value) ?? fallback
  const relativePath = isAbsolute(rawPath) ? relativePathFrom(root, rawPath) : rawPath
  return normalizeRelativePath(relativePath)
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed
}

function isMissingValue(value: string): boolean {
  return value.trim().length === 0 || value.includes('<TODO:')
}

function normalizeRelativePath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\/+/u, '').replace(/\/+$/u, '')
}

function validRelativePath(value: string): boolean {
  if (isAbsolute(value)) {
    return false
  }
  const segments = normalizeRelativePath(value).split('/')
  return !segments.includes('..')
}

function pathIsSameOrInside(path: string, parent: string): boolean {
  const normalizedPath = normalizeRelativePath(path)
  const normalizedParent = normalizeRelativePath(parent)
  return normalizedPath === normalizedParent || normalizedPath.startsWith(`${normalizedParent}/`)
}

function relativePathFrom(root: string, path: string): string {
  const value = relative(root, path)
  return value.split(sep).join('/')
}

function extensionOf(path: string): string {
  const index = path.lastIndexOf('.')
  return index === -1 ? '' : path.slice(index)
}

function lastPathSegment(path: string): string | undefined {
  const normalized = normalizeRelativePath(path)
  if (normalized.length === 0) {
    return undefined
  }
  return normalized.split('/').filter(Boolean).at(-1)
}

function normalizeOwnershipMode(value: string | undefined): ParsedPinOwnershipMode {
  if (value === 'provider' || value === 'prelude-maintain') {
    return value
  }
  return value === 'direct' ? 'direct' : ''
}

function normalizePolicyDecision(value: string | undefined): ParsedPinPolicyDecision {
  if (value === 'enabled' || value === 'recommended' || value === 'disabled') {
    return value
  }
  return ''
}

function normalizeFilesExclude(value: string | undefined): ParsedPinFilesExcludeDecision {
  if (value === 'enabled' || value === 'disabled') {
    return value
  }
  return ''
}

function recordAt(value: unknown): JsonRecord {
  return isRecord(value) ? value : {}
}

function stringAt(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined
}

function booleanAt(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function stringArrayIncludes(value: unknown, expected: string): boolean {
  return Array.isArray(value) && value.includes(expected)
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatUnknown(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message
  }
  return String(cause)
}

function issue(code: string, message: string, path?: string): PinIssue {
  return path === undefined ? { code, message } : { code, message, path }
}
