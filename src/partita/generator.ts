import type { GeneratedFile, GeneratedFileCheckResult, GeneratedFileWriteResult, JsonObject, PluginManifest, SkillMetadata } from './model.ts'

import { Effect, FileSystem } from 'effect'
import { readSkillFrontmatter } from './frontmatter.ts'
import { PartitaGeneratorError } from './model.ts'

const ROUTING_TABLE_START = '<!-- partita:projection:start id="routing-table" source="skills" mode="block-table" -->'
const ROUTING_TABLE_END = '<!-- partita:projection:end id="routing-table" -->'
const FILE_COPY_PROJECTION_PATTERN = /^<!-- partita:projection:file source="([^"]+)" mode="copy" -->\r?\n/u
const namespaceShorthands = {
  primitive: 'pm',
} as const

type SkillNamespace = keyof typeof namespaceShorthands

export interface SourceSkillMetadata extends SkillMetadata {
  readonly allowImplicitInvocation: boolean
  readonly handle: string
  readonly relativePath: string
}

const dispatcherTemplate = `---
name: partita
description: "Dispatcher for user-defined Partita workflow skills. Use when a Partita skill exists for the user's request. Not for generic work when no matching skill has been defined."
---

# Partita Dispatcher

Prefix your first user-facing line with \`🧭\` inline, not as its own paragraph
when a Partita skill is active.

Partita is a CLI-backed Codex skill harness for user-defined workflow skills. Match only
against skills that exist in the routing table.

## Routing Table

${ROUTING_TABLE_START}
${ROUTING_TABLE_END}

## How This Works

1. Read the user's message.
2. If the routing table has a matching skill, read that skill file.
3. If no skill matches, do normal agent work and do not invent a skill.

Skills chain manually, not automatically.
`

function failGenerator(path: string, message: string) {
  return Effect.fail(new PartitaGeneratorError({ path, message }))
}

export function joinPath(root: string, ...segments: ReadonlyArray<string>): string {
  const normalizedRoot = root.endsWith('/') && root !== '/' ? root.slice(0, -1) : root
  const normalizedSegments = segments.map(segment => segment.replace(/^\/+|\/+$/g, ''))
  if (normalizedRoot === '/') {
    return `/${normalizedSegments.filter(Boolean).join('/')}`
  }
  return [normalizedRoot, ...normalizedSegments].filter(Boolean).join('/')
}

function parentPath(path: string): string {
  const index = path.lastIndexOf('/')
  if (index <= 0) {
    return index === 0 ? '/' : '.'
  }
  return path.slice(0, index)
}

function fileCopyProjectionHeader(source: string): string {
  return `<!-- partita:projection:file source="${source}" mode="copy" -->`
}

const renderJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pathExists(fs: FileSystem.FileSystem, path: string) {
  return fs.exists(path).pipe(
    Effect.catchTag('PlatformError', () => Effect.succeed(false)),
  )
}

function skillHandle(namespace: SkillNamespace | undefined, name: string): string {
  return namespace === undefined ? name : `${namespaceShorthands[namespace]}:${name}`
}

function isSkillNamespace(value: string): value is SkillNamespace {
  return Object.hasOwn(namespaceShorthands, value)
}

const readAllowImplicitInvocation = Effect.fn('readAllowImplicitInvocation')(function* (metadataPath: string) {
  const fs = yield* FileSystem.FileSystem
  const exists = yield* pathExists(fs, metadataPath)
  if (!exists) {
    return yield* failGenerator(metadataPath, `ERROR: missing OpenAI metadata: ${metadataPath}`)
  }

  const value = parseAllowImplicitInvocation(yield* fs.readFileString(metadataPath))
  if (value === undefined) {
    return yield* failGenerator(metadataPath, `ERROR: ${metadataPath} must declare policy.allow_implicit_invocation as true or false`)
  }
  return value
})

function parseAllowImplicitInvocation(text: string): boolean | undefined {
  let currentSection: string | undefined
  for (const rawLine of text.split(/\r?\n/u)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) {
      continue
    }

    const indent = rawLine.length - rawLine.trimStart().length
    const line = rawLine.trim()
    const separator = line.indexOf(':')
    if (separator === -1) {
      continue
    }

    const key = line.slice(0, separator)
    const rawValue = line.slice(separator + 1).trim()
    if (indent === 0) {
      currentSection = rawValue ? undefined : key
      continue
    }

    if (indent === 2 && currentSection === 'policy' && key === 'allow_implicit_invocation') {
      const value = unquoteScalar(rawValue)
      if (value === 'true') {
        return true
      }
      if (value === 'false') {
        return false
      }
      return undefined
    }
  }
  return undefined
}

function unquoteScalar(value: string): string {
  const quote = value[0]
  if (value.length >= 2 && quote !== undefined && (quote === '"' || quote === '\'') && value.endsWith(quote)) {
    return value.slice(1, -1)
  }
  return value
}

function requireRecord(value: unknown, path: string, field: string) {
  return isRecord(value)
    ? Effect.succeed(value)
    : failGenerator(path, `INVALID EFFECT HARNESS MANIFEST: ${field} must be an object`)
}

function requireString(value: Record<string, unknown>, path: string, field: string) {
  return typeof value[field] === 'string'
    ? Effect.succeed(value[field])
    : failGenerator(path, `INVALID EFFECT HARNESS MANIFEST: ${field} is required`)
}

export const collectSkillMetadata = Effect.fn('collectSkillMetadata')(function* (root: string) {
  const fs = yield* FileSystem.FileSystem
  const skillsDir = joinPath(root, 'skills')
  const skillsDirExists = yield* pathExists(fs, skillsDir)
  if (!skillsDirExists) {
    return [] satisfies Array<SourceSkillMetadata>
  }

  const entries = [...(yield* fs.readDirectory(skillsDir))].sort()
  const skills: Array<SourceSkillMetadata> = []
  for (const entry of entries) {
    const skillPath = joinPath(skillsDir, entry, 'SKILL.md')
    const skillExists = yield* pathExists(fs, skillPath)
    if (skillExists) {
      const fields = yield* readSkillFrontmatter(skillPath)
      if (fields.name !== entry) {
        return yield* failGenerator(
          skillPath,
          `ERROR: ${skillPath} frontmatter name=${JSON.stringify(fields.name)} != directory ${JSON.stringify(entry)}`,
        )
      }
      const allowImplicitInvocation = yield* readAllowImplicitInvocation(joinPath(parentPath(skillPath), 'agents', 'openai.yaml'))
      skills.push({
        ...fields,
        allowImplicitInvocation,
        handle: skillHandle(undefined, fields.name),
        relativePath: `skills/${entry}/SKILL.md`,
      })
      continue
    }

    if (!isSkillNamespace(entry)) {
      continue
    }

    const namespaceDir = joinPath(skillsDir, entry)
    const namespaceEntries = [...(yield* fs.readDirectory(namespaceDir))].sort()
    for (const skillName of namespaceEntries) {
      const namespacedSkillPath = joinPath(namespaceDir, skillName, 'SKILL.md')
      const namespacedSkillExists = yield* pathExists(fs, namespacedSkillPath)
      if (!namespacedSkillExists) {
        continue
      }
      const fields = yield* readSkillFrontmatter(namespacedSkillPath)
      if (fields.name !== skillName) {
        return yield* failGenerator(
          namespacedSkillPath,
          `ERROR: ${namespacedSkillPath} frontmatter name=${JSON.stringify(fields.name)} != directory ${JSON.stringify(skillName)}`,
        )
      }
      const allowImplicitInvocation = yield* readAllowImplicitInvocation(joinPath(parentPath(namespacedSkillPath), 'agents', 'openai.yaml'))
      skills.push({
        ...fields,
        allowImplicitInvocation,
        handle: skillHandle(entry, fields.name),
        relativePath: `skills/${entry}/${skillName}/SKILL.md`,
      })
    }
  }
  return skills
})

function buildPluginJson(version: string): PluginManifest {
  return {
    name: 'partita',
    version,
    description: 'CLI-backed Codex skill harness for user-defined workflow skills.',
    author: { name: 'sayori' },
    license: 'MIT',
    keywords: ['codex', 'skills', 'workflow'],
    skills: './skills/',
    interface: {
      displayName: 'Partita',
      shortDescription: 'A Codex skill harness for user-defined workflows',
      longDescription: 'Partita defines user-owned Codex workflow skills with a wiki-backed CLI and skill runtime.',
      developerName: 'sayori',
      category: 'Developer Tools',
      capabilities: ['Interactive'],
      defaultPrompt: ['Add a custom Partita skill'],
    },
  }
}

const renderPluginJson = (version: string): string => renderJson(buildPluginJson(version))

const parseJsonObject = Effect.fn('parseJsonObject')(function* (path: string, text: string) {
  const parsed = yield* Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: (cause): PartitaGeneratorError =>
      new PartitaGeneratorError({
        path,
        message: `INVALID JSON: ${path}: ${cause instanceof Error ? cause.message : String(cause)}`,
      }),
  })

  return yield* requireRecord(parsed, path, 'manifest')
})

const readPackageVersion = Effect.fn('readPackageVersion')(function* (root: string) {
  const packageJsonPath = joinPath(root, 'package.json')
  const fs = yield* FileSystem.FileSystem
  const packageJson = yield* parseJsonObject(packageJsonPath, yield* fs.readFileString(packageJsonPath))
  const version = packageJson.version
  if (typeof version !== 'string' || version.trim().length === 0) {
    return yield* failGenerator(packageJsonPath, 'ERROR: package.json version is missing or empty')
  }
  return version.trim()
})

const effectHarnessPackageFields = Effect.fn('effectHarnessPackageFields')(function* (root: string) {
  const manifestPath = joinPath(root, '.effect-harness.json')
  const fs = yield* FileSystem.FileSystem
  const exists = yield* pathExists(fs, manifestPath)
  if (!exists) {
    return {} satisfies JsonObject
  }

  const manifest = yield* parseJsonObject(manifestPath, yield* fs.readFileString(manifestPath))
  const baseline = yield* requireRecord(manifest.packageBaseline, manifestPath, 'packageBaseline')
  const commands = yield* requireRecord(manifest.commands, manifestPath, 'commands')

  return {
    dependencies: {
      'effect': yield* requireString(baseline, manifestPath, 'effect'),
      '@effect/platform-node': yield* requireString(baseline, manifestPath, '@effect/platform-node'),
    },
    devDependencies: {
      '@antfu/eslint-config': '^9.0.0',
      '@types/node': '^25.6.0',
      '@effect/vitest': yield* requireString(baseline, manifestPath, '@effect/vitest'),
      '@effect/tsgo': yield* requireString(baseline, manifestPath, '@effect/tsgo'),
      '@effect/language-service': yield* requireString(baseline, manifestPath, '@effect/language-service'),
      '@typescript/native-preview': yield* requireString(baseline, manifestPath, '@typescript/native-preview'),
      'eslint': '^10.3.0',
      'knip': '^6.12.0',
      'typescript': '^6.0.3',
      'vitest': '^4.1.8',
    },
    scripts: {
      'build': 'rm -rf dist && tsc --project tsconfig.build.json && chmod +x dist/bin/partita.js',
      'effect:status': yield* requireString(commands, manifestPath, 'status'),
      'effect:verify': yield* requireString(commands, manifestPath, 'verify'),
      'generate': 'pnpm build && node dist/bin/partita.js generate',
      'generate:check': 'pnpm build && node dist/bin/partita.js generate --check',
      'install:codex-plugin': 'pnpm build && node dist/bin/partita.js install codex-plugin',
      'install:codex-skill': 'pnpm build && node dist/bin/partita.js install codex-skill',
      'knip': 'knip',
      'link:global': 'pnpm build && pnpm link --global',
      'lint': 'eslint eslint.config.mjs "bin/**/*.ts" "src/**/*.ts" "tests/**/*.ts" --no-error-on-unmatched-pattern',
      'lint:fix': 'eslint eslint.config.mjs "bin/**/*.ts" "src/**/*.ts" "tests/**/*.ts" --fix --no-error-on-unmatched-pattern',
      'test': 'vitest run',
      'typecheck': 'tsgo --noEmit',
      'verify': 'pnpm generate:check && node dist/bin/partita.js verify && pnpm typecheck && pnpm test && pnpm lint && pnpm knip && pnpm effect:verify',
    },
  } satisfies JsonObject
})

const buildPackageJson = Effect.fn('buildPackageJson')(function* (root: string, version: string) {
  const packageJson = {
    name: 'partita',
    type: 'module',
    version,
    description: 'CLI-backed Codex skill harness for user-defined workflow skills.',
    author: 'sayori',
    private: true,
    license: 'MIT',
    main: 'dist/src/index.js',
    types: 'dist/src/index.d.ts',
    bin: {
      partita: 'dist/bin/partita.js',
    },
    files: [
      'dist',
      '.codex-plugin',
      'LICENSE',
      'README.md',
      'CONTEXT.md',
      'HARNESS.md',
      'skills',
      'wiki',
    ],
    ...(yield* effectHarnessPackageFields(root)),
  }

  return packageJson satisfies JsonObject
})

const renderPackageJson = Effect.fn('renderPackageJson')(function* (root: string, version: string) {
  return renderJson(yield* buildPackageJson(root, version))
})

const renderDispatcher = Effect.fn('renderDispatcher')(function* (
  template: string,
  skills: ReadonlyArray<SourceSkillMetadata>,
) {
  const start = template.indexOf(ROUTING_TABLE_START)
  const end = template.indexOf(ROUTING_TABLE_END, start + ROUTING_TABLE_START.length)
  if (start === -1 || end === -1) {
    return yield* failGenerator('skills/DISPATCHER.md', 'ERROR: dispatcher template is missing routing-table markers')
  }

  const rows = ['| Handle | Name | Invocation | Description | File |', '|--------|------|------------|-------------|------|']
  for (const skill of [...skills].sort((left, right) => left.handle.localeCompare(right.handle))) {
    rows.push(`| ${skill.handle} | ${skill.name} | ${String(skill.allowImplicitInvocation)} | ${markdownTableCell(skill.description)} | \`${skill.relativePath}\` |`)
  }

  const block = `${ROUTING_TABLE_START}\n${rows.join('\n')}\n${ROUTING_TABLE_END}`
  return `${template.slice(0, start)}${block}${template.slice(end + ROUTING_TABLE_END.length)}`
})

function markdownTableCell(value: string): string {
  return value.replace(/\s+/g, ' ').replaceAll('|', '\\|').trim()
}

const renderFileCopyProjections = Effect.fn('renderFileCopyProjections')(function* (
  root: string,
  skills: ReadonlyArray<SourceSkillMetadata>,
) {
  const fs = yield* FileSystem.FileSystem
  const files: Array<GeneratedFile> = []

  for (const skill of skills) {
    const skillDir = parentPath(joinPath(root, skill.relativePath))
    const referencesDir = joinPath(skillDir, 'references')
    const referencesExist = yield* pathExists(fs, referencesDir)
    if (!referencesExist) {
      continue
    }

    const referenceEntries = [...(yield* fs.readDirectory(referencesDir))].sort()
    for (const entry of referenceEntries) {
      const targetPath = joinPath(referencesDir, entry)
      const info = yield* fs.stat(targetPath)
      if (info.type !== 'File') {
        continue
      }

      const targetText = yield* fs.readFileString(targetPath)
      const source = fileCopyProjectionSource(targetText)
      if (source === undefined) {
        continue
      }
      if (!validProjectionSource(source)) {
        return yield* failGenerator(targetPath, `ERROR: invalid file projection source: ${source}`)
      }

      const sourcePath = joinPath(root, source)
      const sourceExists = yield* pathExists(fs, sourcePath)
      if (!sourceExists) {
        return yield* failGenerator(targetPath, `ERROR: missing file projection source: ${source}`)
      }

      const sourceText = yield* fs.readFileString(sourcePath)
      files.push({
        relativePath: `${parentPath(skill.relativePath)}/references/${entry}`,
        path: targetPath,
        content: `${fileCopyProjectionHeader(source)}\n\n${sourceText}`,
      })
    }
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
})

function fileCopyProjectionSource(text: string): string | undefined {
  return FILE_COPY_PROJECTION_PATTERN.exec(text)?.[1]
}

function validProjectionSource(source: string): boolean {
  return !source.startsWith('/') && !source.split('/').includes('..') && source.endsWith('.md')
}

export const renderGeneratedFiles = Effect.fn('renderGeneratedFiles')(function* (root: string) {
  const version = yield* readPackageVersion(root)
  const skills = yield* collectSkillMetadata(root)
  const packageJson = yield* renderPackageJson(root, version)
  const dispatcher = yield* renderDispatcher(dispatcherTemplate, skills)
  const projectedReferences = yield* renderFileCopyProjections(root, skills)

  return [
    {
      relativePath: '.codex-plugin/plugin.json',
      path: joinPath(root, '.codex-plugin', 'plugin.json'),
      content: renderPluginJson(version),
    },
    {
      relativePath: 'package.json',
      path: joinPath(root, 'package.json'),
      content: packageJson,
    },
    {
      relativePath: 'skills/DISPATCHER.md',
      path: joinPath(root, 'skills', 'DISPATCHER.md'),
      content: dispatcher,
    },
    ...projectedReferences,
  ] satisfies Array<GeneratedFile>
})

export const checkGeneratedFiles = Effect.fn('checkGeneratedFiles')(function* (root: string) {
  const fs = yield* FileSystem.FileSystem
  const files = yield* renderGeneratedFiles(root)
  const results: Array<GeneratedFileCheckResult> = []

  for (const file of files) {
    const exists = yield* pathExists(fs, file.path)
    const actual = exists ? yield* fs.readFileString(file.path) : ''
    results.push({
      relativePath: file.relativePath,
      path: file.path,
      status: actual === file.content ? 'ok' : 'drift',
    })
  }

  return results
})

export const writeGeneratedFiles = Effect.fn('writeGeneratedFiles')(function* (root: string) {
  const fs = yield* FileSystem.FileSystem
  const files = yield* renderGeneratedFiles(root)
  const results: Array<GeneratedFileWriteResult> = []

  for (const file of files) {
    const exists = yield* pathExists(fs, file.path)
    const actual = exists ? yield* fs.readFileString(file.path) : ''
    if (actual === file.content) {
      results.push({
        relativePath: file.relativePath,
        path: file.path,
        status: 'unchanged',
      })
      continue
    }

    yield* fs.makeDirectory(parentPath(file.path), { recursive: true })
    yield* fs.writeFileString(file.path, file.content)
    results.push({
      relativePath: file.relativePath,
      path: file.path,
      status: 'written',
    })
  }

  return results
})

export interface GenerateProjectOptions {
  readonly root: string
  readonly check?: boolean
}

export const generateProject = Effect.fn('generateProject')(function* ({ check = false, root }: GenerateProjectOptions) {
  if (!check) {
    return yield* writeGeneratedFiles(root)
  }

  const results = yield* checkGeneratedFiles(root)
  const drift = results.filter(result => result.status === 'drift')
  if (drift.length > 0) {
    return yield* failGenerator(
      root,
      `DRIFT: ${drift.map(result => result.relativePath).join(', ')} out of sync; run generate.`,
    )
  }
  return results
})
