@/Users/sayori/.codex/RTK.md

# Agent Instructions

## Project

`mini-waza` is a customized Waza framework fork.

The first baseline intentionally ships no skills. The framework is copied from
Waza, then reduced so the user can define their own skill set later without
inheriting Waza's eight-skill taxonomy.

## Boundaries

This repo owns:

- skill framework shape;
- resolver and dispatcher metadata;
- rules that can be shared across future skills;
- verifier and package skeleton;
- future user-defined skills under `skills/<name>/SKILL.md`.

This repo does not own:

- Waza's `think/design/check/hunt/write/learn/read/health` skill contents;
- docwarden project-context persistence;
- contexta runtime resolve/assemble/bind/inject;
- isomorph primitive, locator, vocabulary, or projection.

## Current Rule

- Do not add a skill unless the user explicitly defines it.
- Do not reconstruct Waza's old skill taxonomy.
- Keep zero skills as a valid framework state.
- If a new skill is added, update `skills/RESOLVER.md`, run
  `make regenerate`, then run `make test`.

## Commands

```bash
make test
make regenerate
make package
```
