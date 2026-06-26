# Partita

`partita` is a CLI-backed Codex skill harness for user-defined workflow skills.

Zero skills remains a valid framework state, but the current customization
defines the user's Partita skill domain.

## Current State

- Codex plugin metadata: present.
- User-defined skills: read from direct or namespaced `SKILL.md` frontmatter
  under `skills/`.
- Executable maintenance is moving to the TypeScript/Effect `partita` CLI.

## Repository Map

- `.codex-plugin/plugin.json` is the generated Codex plugin manifest.
- `CONTEXT.md` maps the repository context to wiki nodes.
- `HARNESS.md` maps harness operations to wiki nodes.
- `skills/DISPATCHER.md` is the generated dispatcher reference.
- `bin/partita.ts` is the TypeScript/Effect CLI entrypoint.
- `src/partita/` owns generation, verification, and local install behavior.
- `wiki/` is the canonical Partita knowledge base for harness, skill,
  workflow, projection, practice, collaboration, documentation, and vocabulary
  nodes.

## Commands

```bash
pnpm generate
pnpm generate:check
pnpm verify
pnpm link:global
```

## Install Locally

Partita's local install path syncs skills from `./skills` globally first, then
maps this repo into the personal Codex plugin marketplace:

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

Codex global skill installation is flat: `npx skills add ./skills --full-depth`
discovers nested source skills, but installs them by their `name` frontmatter.
For example, `skills/primitive/notate/SKILL.md` installs as the global skill
`notate`. The source family remains `primitive`, and Partita's dispatcher handle
remains `pm:notate`.

## Adding A Skill

Only add a skill after the user defines the workflow.

Read `wiki/practice/create.md` before writing a new skill. Use
`pm:notate` for internal primitive skill creation, `pm:conduct` for public
workflow skill creation, and `pm:retune` only for patching an existing valid
skill from a real case. The current `SKILL.md` body shape is documented in
`wiki/projection/codex/skill-md.md`.

Minimum shape:

```text
skills/<name>/SKILL.md
skills/<name>/agents/openai.yaml
skills/<name>/{scripts,references,assets}/...
skills/primitive/<name>/SKILL.md
skills/primitive/<name>/agents/openai.yaml
skills/primitive/<name>/{scripts,references,assets}/...
```

`agents/openai.yaml` is required for every Partita skill because it projects
the skill's invocation policy into runtime metadata. `scripts/`, `references/`,
and `assets/` are optional official bundled resource directories.

Required frontmatter:

```yaml
---
name: <name>
description: "Use when ... Not for ..."
---
```

Description is the Codex selector surface: keep it 40-500 characters, start it
with `Use when` or `Use for`, and include `Not for`. Partita reads only `name`
and `description`; official optional frontmatter keys are `license`,
`allowed-tools`, and `metadata`. Put Codex-specific UI,
`policy.allow_implicit_invocation`, and tool dependencies in `agents/openai.yaml`;
the policy key must live under the `policy` block.

`partita` is the product and plugin name, not a skill prefix. The `primitive`
source namespace is the current Partita-managed base layer and projects as
`pm:<name>` in dispatcher and plugin-facing handles while frontmatter and
global installed skills keep the short skill name.

`skills/DISPATCHER.md` is generated from `SKILL.md` frontmatter and
`agents/openai.yaml`. Its routing table projects `Handle`, `Name`,
`Invocation`, `Description`, and `File`.

After adding or changing a skill:

```bash
pnpm generate
pnpm verify
```

`pnpm verify` includes Effect harness verification for this repo; treat that as
a hard script check, not a prose-only boundary.

## Acknowledgement

Early exploration referenced [Waza](https://github.com/tw93/Waza), published
under the MIT License by Tw93. Partita does not ship Waza's skill taxonomy or
skill contents.
