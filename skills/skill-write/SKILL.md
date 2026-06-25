---
name: skill-write
description: "Use when creating or updating a Codex skill from a workflow, skill primitive, or repeated agent drift, especially when the draft is becoming generic scaffolding, a CLI wrapper, oversized docs, unclear triggers, or an unvalidated artifact. Not for merely installing a skill, running an existing script, packaging a plugin, or writing one-off docs/prompts."
when_to_use: "create skill, update skill, primitive, behavior intervention, trigger boundary, soft constraint, hard constraint, validation"
dispatch_intent: "Partita skill writing from primitive"
---

# Skill Write

Prefix your first user-facing line with `🧭` inline, not as its own paragraph,
when this Partita skill is active.

Create or update Codex skills as agent behavior interventions. Start from the
skill primitive: prove repeated drift and behavior pressure before
materializing `SKILL.md`.

## Capability

Turn a workflow, correction, or primitive-shaped source into a concise
Codex skill with clear activation, boundaries, state, resource rules, and
validation.

Pressure scenarios:

- the agent creates folders and `SKILL.md` before naming the repeated failure;
- a skill is derived from runtime folder shape, plugin export shape, or generic
  scaffolding instead of behavior;
- hard deterministic checks and soft workflow judgment are both written as
  prose;
- a draft passes structure checks but lacks trigger boundary, pressure, review
  gate, or forward-test surface.

## Trigger

Use this skill when the user asks to:

- create, write, design, migrate, or update a Codex skill;
- turn a workflow, primitive, habit, or repeated correction into a skill;
- decide whether material belongs in a skill, prompt/profile, docs, CLI,
  verifier/test, reference, or asset;
- fix a skill that is too generic, too broad, runtime-shaped, or weakly routed;
- derive a plugin-distributed skill while preserving primitive semantics.

Do not use this skill when:

- the task is only to install or list existing skills;
- the user only wants to package or refresh a plugin without changing skill
  behavior;
- the output is one-off docs, task notes, prompts, or project instructions;
- the request is a targeted patch to an existing named skill's trigger,
  boundary, reading order, or workflow; use `skill-patch`.

## Soft Boundary

Primitive audit: `skill-write` is `stateful`, `activation: narrow`, and
`duration: task`. It may create or update persistent skill files, direct
supporting resources, rules, resolver metadata, and verifier surfaces that
belong to the requested skill-writing task. It stops when the skill baseline is
materialized, validated, and reported, or when the missing primitive choice
blocks safe authoring. Its constraints are mixed: design judgment is `soft`;
frontmatter parsing, metadata generation, link checks, package checks, and test
commands are primitive `constraint.hard` only when enforced by CLI commands,
verifiers, or tests.

Use agent judgment for:

- whether repeated drift is strong enough to justify a reusable skill;
- the smallest capability that changes future agent behavior;
- positive and negative activation examples for frontmatter `description`;
- what belongs in every-use `SKILL.md` body versus one-layer references;
- where user review is needed, and the smallest semantic unit to ask about;
- whether the draft is generic, verbose, implementation-shaped, or
  runtime-shaped;
- whether state, activation, duration, and namespace are being kept in the right
  layer;
- whether primitive semantics survive the materialized skill.

## Hard Boundary

This section mixes model-applied boundaries with hard checks. Only items tied
to machine-checkable surfaces such as CLI commands, verifiers, tests, schemas,
or package validation are primitive `constraint.hard`; prose-only boundaries
remain strict `soft` constraints.

- Deterministic scaffolding, metadata generation, linting, packaging, and
  filesystem checks belong in the TypeScript/Effect CLI, verifiers, or tests.
- Extend the CLI when related checks form a command family instead of
  accumulating ad hoc scripts.
- Do not add README, changelog, install guide, process notes, or unrelated docs
  inside a skill directory.
- Do not invent unsupported Codex skill metadata.
- Do not copy private project paths, docwarden task state, contexta export
  commands, or isomorph internals into Partita runtime instructions unless the
  user explicitly makes Partita own that dependency.
- Do not materialize a skill if the trigger and exclusion boundary are still
  unknown; ask one smallest question instead.

## Workflow

1. Build or read the skill primitive: pressure, capability, trigger, boundary,
   constraint, state, activation, duration, workflow, and validation.
2. Decide the artifact layer:
   - `skill`: behavior intervention with trigger, boundary, workflow, validation;
   - `prompt/profile`: always-on preference or collaboration style;
   - `docs`: durable explanation for humans, not activation behavior;
   - `CLI/verifier`: deterministic, repeated, or fragile operation;
   - `reference`: conditional detail loaded only when needed;
   - `asset`: material used in final output.
3. Preserve layer boundaries: primitive decides semantics, shape carries them,
   and care tracks projection loss.
4. Draft only the every-use skill body. Move optional detail to one-layer
   references only when needed.
5. Write frontmatter `description` as activation surface: include use cases and
   exclusions, and make it broad or narrow according to the primitive.
6. Keep namespace as optional matching or plugin projection identity, not as a
   prefix inside the skill name.
7. If direction is clear, implement a reversible baseline and validate it.
8. If a decision is unclear, ask for one minimal semantic choice, not a broad
   planning confirmation.

## References

- Read `/Users/sayori/Desktop/yume-infra/partita/rules/skills/index.md` before creating a
  new skill.
- Read `/Users/sayori/Desktop/yume-infra/partita/rules/skills/primitive.md` before defining
  pressure, constraint, state, activation, duration, or validation.
- Read `/Users/sayori/Desktop/yume-infra/partita/rules/skills/shape.md` before adding
  namespace or writing the materialized `SKILL.md`.
- Read `/Users/sayori/Desktop/yume-infra/partita/rules/skills/care.md` before checking
  projection loss or future patch surfaces.

## Validation

Before calling the skill usable, verify:

- the first user-facing line includes `🧭` inline;
- capability names a behavior intervention and pressure scenario;
- trigger includes positive use cases and exclusions;
- soft constraints stay in model-applied instructions, and hard constraints have
  a machine-checkable enforcement surface;
- state, activation, and duration are explicit when they affect behavior,
  routing, or persistence;
- soft judgment and deterministic hard constraints are separated;
- stateful edits are limited to the skill and directly supporting resources,
  rules, resolver metadata, or verifier surfaces required by the task;
- the skill directory contains only `SKILL.md` and direct supporting resources;
- `pnpm generate` and `pnpm verify` pass after adding or changing Partita
  skills.
