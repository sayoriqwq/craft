# Mini-Waza

`mini-waza` is a clean customized Waza framework.

This repo starts from Waza's framework shape, but deliberately removes Waza's
skills. The first useful state is an empty skill framework that can accept
user-defined skills later.

## Current State

- Framework skeleton: present.
- User-defined skills: none.
- Waza original skills: removed.
- Runtime/context injection: not part of this repo.

## Repository Map

- `skills/RESOLVER.md` records the current skill registry. It is empty until the user defines skills.
- `scripts/dispatcher-template.md` is the source for the generated packaged dispatcher.
- `scripts/build_metadata.py` regenerates `.claude-plugin/marketplace.json`, `package.json`, and `scripts/dispatcher.md`.
- `scripts/verify_skills.py` validates the framework and any future `skills/*/SKILL.md`.
- `rules/` contains shared behavior rules that future skills may reference.
- `packaging.allowlist` controls what ships in `dist/mini-waza.zip`.

## Commands

```bash
make test
make regenerate
make package
```

## Adding A Skill

Only add a skill after the user defines the workflow.

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
