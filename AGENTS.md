@/Users/sayori/.codex/RTK.md
@/Users/sayori/Desktop/yume-infra/partita/AGENTS.profile.md

# Agent Instructions

## Project

`partita` is a Codex plugin harness for user-defined workflow skills.

The framework started from a zero-skill baseline. The current customization
defines user-owned Partita skills under `skills/<name>/SKILL.md`.

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
- Partita `skills/<name>/SKILL.md` files are the source authority for Partita
  skill semantics. Copies installed into external harnesses or target repos are
  managed projections and must not redefine the skill.
- Executable setup, sync, and verification mechanisms belong to the owning
  harness or CLI repo. Partita skills may call those mechanisms, but should not
  reimplement them as prose.
- Do not reconstruct Waza's old skill taxonomy; use Waza only as mechanism
  lineage.
- Keep zero skills as a valid framework state.
- Keep shared rules short and reusable.
- Before changing skill names, trigger policy, harness install behavior, global
  skill state, or marker conventions, use an interpretation gate if the user's
  instruction can be read more than one way.
- If a new skill is added, update `skills/RESOLVER.md`, run `pnpm generate`,
  then run `pnpm verify`.

## Commands

```bash
pnpm generate
pnpm generate:check
pnpm package
pnpm verify
```

<!-- effect-harness:start -->
# Effect Harness

This repo uses `/Users/sayori/Desktop/yume-infra/effect-harness` as its Effect harness root.

Before writing non-trivial Effect code, read:

- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/LLMS.md`
- `/Users/sayori/Desktop/yume-infra/effect-harness/harness/index.md`
- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect.subtree.json`
- `.effect-harness.json`

Runtime skills and agents installed by the harness:

- Use `.codex/skills/effect-code/SKILL.md` for Effect implementation and review.
- Use `.codex/skills/effect-feedback/SKILL.md` for reusable target feedback.
- Use `.codex/agents/effect-worker.md` when delegating focused Effect subagent work.

Use:

```bash
pnpm effect:status
pnpm effect:verify
pnpm verify
```

Do not import from `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect`.
Do not copy effect-harness `.codex/skills`; this target only uses the runtime installed under
`.codex/`.
<!-- effect-harness:end -->
