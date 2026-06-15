# Craft

`craft` is a Codex plugin harness for user-defined workflow skills.

It keeps the Waza-inspired skill framework shape without shipping Waza's
predefined skill taxonomy. Zero skills remains a valid framework state, but the
current customization defines the user's Craft skill domain.

## Current State

- Codex plugin metadata: present.
- User-defined skills: recorded in `skills/RESOLVER.md`.
- Waza original skills: removed.
- Claude Code marketplace metadata: not part of this repo.

## Repository Map

- `skills/RESOLVER.md` records the current skill registry.
- `.codex-plugin/plugin.json` is the generated Codex plugin manifest.
- `scripts/dispatcher-template.md` is the source for the generated dispatcher reference.
- `scripts/build_metadata.py` regenerates `.codex-plugin/plugin.json`, `package.json`, and `scripts/dispatcher.md`.
- `scripts/verify_skills.py` validates the framework and any future `skills/*/SKILL.md`.
- `rules/` contains shared behavior rules that future skills may reference.
- `rules/skills/` is the harness entrypoint for Craft skill design language:
  primitive, shape, care, and authoring.
- `packaging.allowlist` controls what ships in `dist/craft.zip`.

## Commands

```bash
make test
make regenerate
make install
make package
```

## Install Locally

Craft's local install path syncs skills globally first, then maps this repo
into the personal Codex plugin marketplace:

```bash
make install
```

Open a new Codex thread after installing so global skills are reloaded. The
local marketplace maps `~/plugins/craft` back to this repo, so source edits stay
in one place.

To run only the global sync:

```bash
make install-codex-skill
```

`make install-codex-plugin` also runs the global sync before marketplace setup.

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
make regenerate
make test
```
