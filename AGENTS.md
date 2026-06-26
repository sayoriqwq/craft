@/Users/sayori/.codex/RTK.md

# Agent Instructions

## Project

`partita` is a CLI-backed Codex skill harness for user-defined workflow skills.

The framework supports a zero-skill baseline. The current customization defines
user-owned Partita skills under direct skill paths and supported namespace paths
such as `skills/primitive/<name>/SKILL.md`.

## Boundaries

This repo owns:

- Codex plugin metadata under `.codex-plugin/plugin.json`;
- skill framework shape;
- generated dispatcher metadata;
- canonical wiki nodes shared across future skills;
- verifier skeleton;
- user-defined skills under direct skill paths and supported namespace paths
  such as `skills/primitive/<name>/SKILL.md`.

This repo does not own:

- external skill collections or their taxonomies;
- external plugin marketplace metadata;
- project-specific commands, private local paths, or one-off workflow history.

## Current Rule

- Do not add a skill unless the user explicitly defines it.
- `CONTEXT.md` and `HARNESS.md` are root maps into `wiki/`, not separate
  durable knowledge layers.
- Before adding or changing a skill, start from `wiki/practice/create.md` or
  `wiki/practice/patch.md`, then follow `wiki/projection/codex/skill-md.md`
  for the current V1 `SKILL.md` section shape.
- Partita's canonical knowledge lives under `wiki/`.
- Partita `SKILL.md` files under `skills/` are source skill runtime projections.
  Wiki nodes hold the canonical behavior language; copies installed into
  external harnesses or target repos are managed projections and must not
  redefine the skill.
- `partita` is the product and plugin name, not a skill prefix. The `primitive`
  source namespace is the current Partita-managed base layer and projects as
  `pm:<name>` in dispatcher and plugin-facing handles.
  Codex global skill installation is flat by frontmatter `name`, so
  `skills/primitive/notate/SKILL.md` installs as `notate`; the source family
  remains in this repo and dispatcher projection.
- Executable setup, sync, and verification mechanisms belong to the owning
  harness or CLI repo. Partita skills may call those mechanisms, but should not
  reimplement them as prose.
- Keep zero skills as a valid framework state.
- Keep wiki nodes short and reusable.
- Before changing skill names, trigger policy, harness install behavior, global
  skill state, or marker conventions, use an interpretation gate if the user's
  instruction can be read more than one way.
- If a new Partita-managed base skill is added, create
  `skills/primitive/<name>/SKILL.md` and
  `skills/primitive/<name>/agents/openai.yaml`, run `pnpm generate`, then run
  `pnpm verify`. Effect harness verification is part of the hard verification
  surface when the repo uses the Effect harness.

## Commands

```bash
pnpm generate
pnpm generate:check
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
