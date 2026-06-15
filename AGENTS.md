@/Users/sayori/.codex/RTK.md
@/Users/sayori/Desktop/craft/AGENTS.profile.md

# Agent Instructions

## Project

`craft` is a Codex plugin harness for user-defined workflow skills.

The framework started from a zero-skill baseline. The current customization
defines user-owned Craft skills under `skills/<name>/SKILL.md`.

## Boundaries

This repo owns:

- Codex plugin metadata under `.codex-plugin/plugin.json`;
- skill framework shape;
- resolver and dispatcher metadata;
- rules that can be shared across future skills;
- verifier and package skeleton;
- user-defined skills under `skills/<name>/SKILL.md`.

This repo does not own:

- Waza's `think/design/check/hunt/write/learn/read/health` skill contents or
  taxonomy;
- Claude Code plugin marketplace metadata;
- project-specific commands, private local paths, or one-off workflow history.

## Current Rule

- Do not add a skill unless the user explicitly defines it.
- Before adding or changing a skill, apply `rules/skills/index.md`, then the
  relevant layer rule: `primitive.md`, `shape.md`, `care.md`, or
  `authoring.md`.
- Skill design language lives under `rules/skills/`. Do not add more
  prefix-named rule files such as `skill-*.md` when a directory layer can carry
  the scope.
- Craft `skills/<name>/SKILL.md` files are the source authority for Craft skill
  semantics. Copies installed into external harnesses or target repos are
  managed projections and must not redefine the skill.
- Executable setup, sync, and verification mechanisms belong to the owning
  harness or CLI repo. Craft skills may call those mechanisms, but should not
  reimplement them as prose.
- Do not reconstruct Waza's old skill taxonomy; use Waza only as mechanism
  lineage.
- Keep zero skills as a valid framework state.
- Keep shared rules short and reusable.
- Before changing skill names, trigger policy, harness install behavior, global
  skill state, or marker conventions, use an interpretation gate if the user's
  instruction can be read more than one way.
- If a new skill is added, update `skills/RESOLVER.md`, run `make regenerate`,
  then run `make test`.

## Commands

```bash
make test
make regenerate
make package
```
