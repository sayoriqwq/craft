# Partita Harness

This file maps harness operations to the wiki. It is not a rules layer.

## Route Matrix

| Intent | Read first | Action surface | Verify |
| --- | --- | --- | --- |
| Understand the harness | `wiki/harness/index.md` | `CONTEXT.md`, `HARNESS.md`, `AGENTS.md` | `pnpm verify` |
| Create internal primitive skill | `skills/primitive/notate/SKILL.md` | `skills/primitive/<name>/SKILL.md`, `skills/primitive/<name>/agents/openai.yaml` | `pnpm generate`, `pnpm verify` |
| Create public workflow skill | `skills/primitive/conduct/SKILL.md` | `skills/<name>/SKILL.md`, `skills/<name>/agents/openai.yaml` | `pnpm generate`, `pnpm verify` |
| Patch existing skill from case | `skills/primitive/retune/SKILL.md` | target skill files and direct references | `pnpm generate`, `pnpm verify` |
| Check runtime projection | `wiki/projection/index.md` | `.codex-plugin/`, `skills/DISPATCHER.md`, projected references | `pnpm generate:check`, `pnpm verify` |
| Maintain docs | `wiki/documentation/index.md` | `wiki/`, root mapping files | `pnpm verify` |

## Boundaries

- Do not create a second durable knowledge layer in root files.
- Do not duplicate wiki definitions in root mapping files.
- Do not let generated runtime metadata redefine skill semantics.
- Do not add a skill unless the user defines the behavior.
- Keep profile canon outside this repository; only Partita-specific projections
  belong here.

## Commands

```bash
pnpm generate
pnpm generate:check
pnpm verify
```
