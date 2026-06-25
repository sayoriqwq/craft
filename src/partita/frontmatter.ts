import type { SkillMetadata } from './model.ts'

import { Effect, FileSystem } from 'effect'
import { PartitaFrontmatterError } from './model.ts'

const FRONTMATTER_DELIMITER = '---'

interface ParsedFields {
  name?: string
  description?: string
  whenToUse?: string
  dispatchIntent?: string
  version?: string
}

function failFrontmatter(path: string, message: string) {
  return Effect.fail(new PartitaFrontmatterError({ path, message }))
}

const splitLines = (text: string): Array<string> => text.split(/\r\n|\n|\r/)

function partition(line: string, separator: string): readonly [string, boolean, string] {
  const index = line.indexOf(separator)
  if (index === -1) {
    return [line, false, '']
  }
  return [line.slice(0, index), true, line.slice(index + separator.length)]
}

function parseQuotedScalar(value: string): string {
  const quote = value[0]
  if ((quote !== '\'' && quote !== '"') || value.length < 2 || value[value.length - 1] !== quote) {
    throw new Error('unterminated string literal')
  }

  let parsed = ''
  for (let index = 1; index < value.length - 1; index += 1) {
    const char = value[index]
    if (char === quote) {
      throw new Error('unexpected trailing characters after string literal')
    }
    if (char !== '\\') {
      parsed += char
      continue
    }

    index += 1
    if (index >= value.length - 1) {
      throw new Error('unterminated escape sequence')
    }
    const escaped = value[index]
    switch (escaped) {
      case '\\':
      case '\'':
      case '"':
        parsed += escaped
        break
      case 'n':
        parsed += '\n'
        break
      case 'r':
        parsed += '\r'
        break
      case 't':
        parsed += '\t'
        break
      case 'b':
        parsed += '\b'
        break
      case 'f':
        parsed += '\f'
        break
      default:
        parsed += `\\${escaped}`
        break
    }
  }

  return parsed
}

const parseScalar = Effect.fn('parseScalar')(function* (
  path: string,
  field: string,
  raw: string,
) {
  const value = raw.trim()
  if (!value) {
    return yield* failFrontmatter(path, `EMPTY FRONTMATTER VALUE: ${path} field ${field}`)
  }
  if (value[0] === '\'' || value[0] === '"') {
    return yield* Effect.try({
      try: () => parseQuotedScalar(value),
      catch: (cause): PartitaFrontmatterError =>
        new PartitaFrontmatterError({
          path,
          message: `INVALID FRONTMATTER QUOTE: ${path} field ${field}: ${cause instanceof Error ? cause.message : String(cause)}`,
        }),
    })
  }
  if (value.includes(': ')) {
    return yield* failFrontmatter(
      path,
      `UNQUOTED FRONTMATTER COLON: ${path} field ${field}\n`
      + '  Quote values containing \': \' so the metadata contract stays unambiguous.',
    )
  }
  return value
})

export const parseSkillFrontmatter = Effect.fn('parseSkillFrontmatter')(function* (
  path: string,
  text: string,
) {
  const lines = splitLines(text)
  if (lines.length === 0 || lines[0] !== FRONTMATTER_DELIMITER) {
    return yield* failFrontmatter(path, `INVALID FRONTMATTER: ${path} must start with ---`)
  }

  const end = lines.indexOf(FRONTMATTER_DELIMITER, 1)
  if (end === -1) {
    return yield* failFrontmatter(path, `INVALID FRONTMATTER: ${path} missing closing ---`)
  }

  const fields: ParsedFields = {}
  let inMetadata = false

  for (const rawLine of lines.slice(1, end)) {
    if (!rawLine.trim()) {
      continue
    }

    if (rawLine.startsWith('  ')) {
      if (!inMetadata) {
        return yield* failFrontmatter(path, `INVALID FRONTMATTER INDENT: ${path}: ${JSON.stringify(rawLine)}`)
      }
      const [key, hasSeparator, rawValue] = partition(rawLine.trim(), ':')
      if (!hasSeparator) {
        return yield* failFrontmatter(path, `INVALID FRONTMATTER LINE: ${path}: ${JSON.stringify(rawLine)}`)
      }
      if (key === 'version') {
        fields.version = yield* parseScalar(path, 'metadata.version', rawValue)
      }
      continue
    }

    inMetadata = false
    const [key, hasSeparator, rawValue] = partition(rawLine, ':')
    if (!hasSeparator) {
      return yield* failFrontmatter(path, `INVALID FRONTMATTER LINE: ${path}: ${JSON.stringify(rawLine)}`)
    }

    if (key === 'metadata') {
      if (rawValue.trim()) {
        return yield* failFrontmatter(path, `INVALID FRONTMATTER METADATA: ${path} metadata must be a mapping`)
      }
      inMetadata = true
    }
    else if (key === 'name') {
      fields.name = yield* parseScalar(path, key, rawValue)
    }
    else if (key === 'description') {
      fields.description = yield* parseScalar(path, key, rawValue)
    }
    else if (key === 'when_to_use') {
      fields.whenToUse = yield* parseScalar(path, key, rawValue)
    }
    else if (key === 'dispatch_intent') {
      fields.dispatchIntent = yield* parseScalar(path, key, rawValue)
    }
  }

  const name = fields.name
  const description = fields.description
  const whenToUse = fields.whenToUse ?? ''
  const dispatchIntent = fields.dispatchIntent ?? ''

  if (!name?.trim()) {
    return yield* failFrontmatter(path, `MISSING name: in ${path}`)
  }
  if (!description?.trim()) {
    return yield* failFrontmatter(path, `MISSING description: in ${path}`)
  }
  if (fields.version !== undefined) {
    return yield* failFrontmatter(
      path,
      `STALE metadata.version: ${path} still declares a per-skill version. `
      + 'Source of truth is the top-level VERSION file; remove the metadata block from frontmatter.',
    )
  }

  return {
    name: name.trim(),
    description: description.trim(),
    whenToUse: whenToUse.trim(),
    dispatchIntent: dispatchIntent.trim(),
  } satisfies SkillMetadata
})

export const readSkillFrontmatter = Effect.fn('readSkillFrontmatter')(function* (path: string) {
  const fs = yield* FileSystem.FileSystem
  const text = yield* fs.readFileString(path)
  return yield* parseSkillFrontmatter(path, text)
})
