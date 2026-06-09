# Mini-Waza

`mini-waza` is a Codex plugin skeleton for user-defined workflow skills.

It keeps the Waza-inspired skill framework shape without shipping Waza's
predefined skill taxonomy. Zero skills remains a valid framework state, but the
current customization starts with a single user-defined `ym` skill.

## Current State

- Codex plugin metadata: present.
- User-defined skills: `ym-aiming`.
- Waza original skills: removed.
- Claude Code marketplace metadata: not part of this repo.

## Repository Map

- `skills/RESOLVER.md` records the current skill registry.
- `.codex-plugin/plugin.json` is the generated Codex plugin manifest.
- `scripts/dispatcher-template.md` is the source for the generated dispatcher reference.
- `scripts/build_metadata.py` regenerates `.codex-plugin/plugin.json`, `package.json`, and `scripts/dispatcher.md`.
- `scripts/verify_skills.py` validates the framework and any future `skills/*/SKILL.md`.
- `rules/` contains shared behavior rules that future skills may reference.
- `packaging.allowlist` controls what ships in `dist/mini-waza.zip`.

## Commands

```bash
make test
make regenerate
make package
```

## Install Locally

Mini-Waza's primary runtime shape is a Codex plugin. For local development, map
this repo into the personal Codex plugin marketplace:

```bash
make install-codex-plugin
```

Open a new Codex thread after installing so the plugin skills are loaded.
The local marketplace maps `~/plugins/mini-waza` back to this repo, so source
edits stay in one place.

For a Waza-style quick check that installs the current skill directly into the
global Codex skill directory, use:

```bash
make install-codex-skill
```

This installs `ym-aiming` from `skills/ym-aiming/SKILL.md` without changing the
plugin source of truth.

## Adding A Skill

Only add a skill after the user defines the workflow.

Design the skill from `rules/skill-authoring.md` before writing `SKILL.md`.

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
