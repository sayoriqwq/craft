import { Schema } from 'effect'

export interface SkillMetadata {
  readonly name: string
  readonly description: string
  readonly whenToUse: string
  readonly dispatchIntent: string
}

export interface PluginManifest {
  readonly name: string
  readonly version: string
  readonly description: string
  readonly author: {
    readonly name: string
  }
  readonly license: string
  readonly keywords: ReadonlyArray<string>
  readonly skills: string
  readonly interface: {
    readonly displayName: string
    readonly shortDescription: string
    readonly longDescription: string
    readonly developerName: string
    readonly category: string
    readonly capabilities: ReadonlyArray<string>
    readonly defaultPrompt: ReadonlyArray<string>
  }
}

export type JsonObject = Record<string, unknown>

export interface GeneratedFile {
  readonly relativePath: string
  readonly path: string
  readonly content: string
}

export interface GeneratedFileWriteResult {
  readonly relativePath: string
  readonly path: string
  readonly status: 'written' | 'unchanged'
}

export interface GeneratedFileCheckResult {
  readonly relativePath: string
  readonly path: string
  readonly status: 'ok' | 'drift'
}

export class PartitaFrontmatterError extends Schema.TaggedErrorClass<PartitaFrontmatterError>()(
  'PartitaFrontmatterError',
  {
    path: Schema.String,
    message: Schema.String,
  },
) {}

export class PartitaGeneratorError extends Schema.TaggedErrorClass<PartitaGeneratorError>()(
  'PartitaGeneratorError',
  {
    path: Schema.String,
    message: Schema.String,
  },
) {}
