---
name: iso-skill-creator
description: "Use when creating or updating a Codex skill from a workflow, skill primitive, or repeated agent drift, especially when the draft is becoming generic scaffolding, a CLI wrapper, oversized docs, unclear triggers, or an unvalidated artifact. Not for merely installing a skill, running an existing script, packaging a plugin, or writing one-off docs/prompts."
when_to_use: "create skill, update skill, skill primitive, behavior intervention, trigger boundary, soft hard boundary, validation"
dispatch_intent: "ISO skill creation from primitive"
---

# ISO Skill Creator

Prefix your first user-facing line with `🧭` inline, not as its own paragraph,
when this Mini-Waza skill is active.

Create or update Codex skills as agent behavior interventions. Start from the
primitive idea: prove repeated drift and behavior pressure before materializing
`SKILL.md`.

## Capability

Turn a workflow, correction, or skill-primitive-shaped source into a concise
Codex skill with clear activation, boundaries, resource rules, and validation.

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
- decide whether material belongs in a skill, prompt/profile, docs, CLI, script,
  reference, or asset;
- fix a skill that is too generic, too broad, runtime-shaped, or weakly routed;
- derive a plugin-distributed skill while preserving primitive semantics.

Do not use this skill when:

- the task is only to install or list existing skills;
- the user only wants to package or refresh a plugin without changing skill
  behavior;
- the output is one-off docs, task notes, prompts, or project instructions;
- the request is a targeted patch to an existing named skill's trigger,
  boundary, reading order, or workflow; use `iso-skill-improver`.

## Soft Boundary

Use agent judgment for:

- whether repeated drift is strong enough to justify a reusable skill;
- the smallest capability that changes future agent behavior;
- positive and negative activation examples for frontmatter `description`;
- what belongs in every-use `SKILL.md` body versus one-layer references;
- where user review is needed, and the smallest semantic unit to ask about;
- whether the draft is generic, verbose, implementation-shaped, or
  runtime-shaped;
- whether primitive semantics survive the materialized skill.

## Hard Boundary

- Deterministic scaffolding, metadata generation, linting, packaging, and
  filesystem checks belong in scripts or CLIs.
- Do not add README, changelog, install guide, process notes, or unrelated docs
  inside a skill directory.
- Do not invent unsupported Codex skill metadata.
- Do not copy private project paths, docwarden task state, contexta export
  commands, or isomorph internals into Mini-Waza runtime instructions unless the
  user explicitly makes Mini-Waza own that dependency.
- Do not materialize a skill if the trigger and exclusion boundary are still
  unknown; ask one smallest question instead.

## Workflow

1. Name the repeated pressure: what agent failure will recur without this skill?
2. Decide the artifact layer:
   - `skill`: behavior intervention with trigger, boundary, workflow, validation;
   - `prompt/profile`: always-on preference or collaboration style;
   - `docs`: durable explanation for humans, not activation behavior;
   - `script/CLI`: deterministic, repeated, or fragile operation;
   - `reference`: conditional detail loaded only when needed;
   - `asset`: material used in final output.
3. If a skill primitive or equivalent source exists, treat it as semantic input:
   capability, trigger, soft boundary, hard boundary, workflow, export shape, and
   validation.
4. Draft only the every-use skill body. Move optional detail to one-layer
   references only when needed.
5. Write frontmatter `description` as activation surface: include use cases and
   exclusions, not a neutral summary.
6. If direction is clear, implement a reversible baseline and validate it.
7. If a decision is unclear, ask for one minimal semantic choice, not a broad
   planning confirmation.

## Validation

Before calling the skill usable, verify:

- the first user-facing line includes `🧭` inline;
- capability names a behavior intervention and pressure scenario;
- trigger includes positive use cases and exclusions;
- soft judgment and deterministic hard constraints are separated;
- the skill directory contains only `SKILL.md` and direct supporting resources;
- `make regenerate` and `make test` pass after adding or changing Mini-Waza
  skills.
