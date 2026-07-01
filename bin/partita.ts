#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as Effect from 'effect/Effect'
import * as CliError from 'effect/unstable/cli/CliError'
import { runCli } from '../src/cli/Main.ts'
import { errorMessage } from '../src/partita/errors.ts'

const packageRoot = resolvePackageRoot(fileURLToPath(import.meta.url))
const version = readPackageVersion(join(packageRoot, 'package.json'))

runCli({ root: process.cwd(), version }).pipe(
  Effect.catch((error: unknown) =>
    Effect.sync(() => {
      if (CliError.isCliError(error)) {
        process.exitCode = 1
        return
      }
      console.error(errorMessage(error))
      process.exitCode = 1
    }),
  ),
  NodeRuntime.runMain,
)

function resolvePackageRoot(entrypoint: string): string {
  const candidate = dirname(dirname(entrypoint))
  if (candidate.endsWith('/dist')) {
    return dirname(candidate)
  }
  return candidate
}

function readPackageVersion(packageJsonPath: string): string {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    return typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'
  }
  catch {
    return '0.0.0'
  }
}
