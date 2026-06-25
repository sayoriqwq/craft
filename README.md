# Partita

`partita` is a Codex plugin harness for user-defined workflow skills.

It keeps the Waza-inspired skill framework shape without shipping Waza's
predefined skill taxonomy. Zero skills remains a valid framework state, but the
current customization defines the user's Partita skill domain.

## Current State

- Codex plugin metadata: present.
- User-defined skills: recorded in `skills/RESOLVER.md`.
- Waza original skills: removed.
- Claude Code marketplace metadata: not part of this repo.
- Executable maintenance is moving to the TypeScript/Effect `partita` CLI.

## Repository Map

- `skills/RESOLVER.md` records the current skill registry.
- `.codex-plugin/plugin.json` is the generated Codex plugin manifest.
- `skills/DISPATCHER.md` is the generated dispatcher reference.
- `bin/partita.ts` is the TypeScript/Effect CLI entrypoint.
- `src/partita/` owns generation, verification, packaging, and local install behavior.
- `rules/` contains shared behavior rules that future skills may reference.
- `rules/skills/` is the harness entrypoint for Partita skill design language:
  primitive, shape, care, and authoring.
- `packaging.allowlist` controls what ships in `dist/partita.zip`.

## Commands

```bash
pnpm generate
pnpm generate:check
pnpm verify
pnpm package
pnpm link:global
```

## Install Locally

Partita's local install path syncs skills globally first, then maps this repo
into the personal Codex plugin marketplace:

```bash
pnpm install:codex-skill
pnpm install:codex-plugin
```

Open a new Codex thread after installing so global skills are reloaded. The
local marketplace maps `~/plugins/partita` back to this repo, so source edits
stay in one place.

To run only the global sync:

```bash
pnpm install:codex-skill
```

`pnpm install:codex-plugin` maps the local plugin marketplace entry.

## Adding A Skill

Only add a skill after the user defines the workflow.

Design the skill from `rules/skills/index.md` before writing `SKILL.md`.

Minimum shape:

```text
skills/<name>/SKILL.md
```

Required frontmatter:

```yaml
---
name: <name>
description: "Use when ... Not for ..."
when_to_use: "comma, separated, triggers"
dispatch_intent: "short routing label"
---
```

After adding or changing a skill:

```bash
pnpm generate
pnpm verify
```
