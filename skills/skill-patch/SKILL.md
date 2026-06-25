---
name: skill-patch
description: "Use when the user reports a real skill behavior case that should change a named skill, or asks to audit primitive preservation, namespace, constraint, state, activation, duration, or Partita skill shape. Not for creating a new skill from scratch, ordinary code review, prose editing, speculative examples, or hard CLI/schema changes."
when_to_use: "skill improvement, real user case, structure audit, primitive preservation, skill shape audit, namespace audit, constraint audit, state audit, activation audit, duration audit, target skill, trigger drift, boundary patch, case capture, workflow patch, validation gap"
dispatch_intent: "Partita skill patch or structure audit"
---

# Skill Patch

Prefix your first user-facing line with `🧭` inline when this Partita skill is active.

Patch an existing skill from a real observed case or a structure audit.

## Capability

Convert concrete feedback or structure review into the smallest verifiable
patch to trigger, boundary, workflow, resources, or validation.

Pressure scenario: the user corrects a skill from a real example, but the agent
only edits abstract rules; or the user asks for structural legality, but the
agent refuses because no behavior case exists.

## Trigger

Use this skill when:

- the user names a target skill and reports a real behavior problem;
- a concrete case should become a reusable skill example or regression pattern;
- the user asks whether a named skill preserves its primitive, namespace,
  constraint, state, activation, duration, or Partita skill shape;
- dogfood shows wrong routing, over-reading, under-reading, vague boundaries, or
  work outside the skill's responsibility.

Do not use this skill when:

- creating a new behavior skill from scratch; use `skill-write`;
- inventing examples or cases from a structure audit;
- the request is ordinary code review, bug fixing, prose editing, or hard
  CLI/schema work.

## Soft Boundary

Primitive audit: `skill-patch` is `stateful`, `activation: narrow`, and
`duration: task`. It may write or update `SKILL.md`, references, real case
records, resolver metadata, and verifier surfaces that belong to the requested
skill patch. It stops when the requested case patch or structure audit is
implemented, validated, and reported. Its constraints are mixed: routing,
scope, and patch judgment are `soft`; generated metadata, link checks, package
checks, and test commands are primitive `constraint.hard` only when enforced by
CLI commands, verifiers, or tests.

Use agent judgment for:

- whether the observed case reveals a reusable skill-use failure;
- whether the request is `case-patch` or `structure-audit`;
- which skill is the target when multiple skills are mentioned;
- how to preserve the user's case shape without leaking unnecessary private
  detail;
- where the smallest recurrence-preventing patch belongs;
- whether the target should be improved, split, renamed, or left alone.

## Hard Boundary

This section mixes model-applied boundaries with hard checks. Only items tied
to machine-checkable surfaces such as CLI commands, verifiers, tests, schemas,
or package validation are primitive `constraint.hard`; prose-only boundaries
remain strict `soft` constraints.

- The real user case is the teaching unit. If safe and allowed, capture it in
  the target skill's references.
- A structure audit may patch skill shape without case capture, but must not
  invent a case.
- Do not add speculative examples, style galleries, or generic answer templates.
- Do not rewrite the entire skill when a local patch fixes the failure.
- Keep the target `SKILL.md` concise; move concrete cases and long guidance into
  one-level references.
- Do not patch generated/runtime copies when this repo has an editable
  `skills/<name>/SKILL.md` source.
- Do not change hard validation, CLI, packaging, or schema behavior from this
  skill alone; edit those code paths separately when requested.

## Workflow

1. Identify the target skill and mode: `case-patch` or `structure-audit`.
2. For `case-patch`, capture what happened, what the agent must learn, and what
   detail to omit. Apply [case capture](references/case-capture.md) only when a
   real case is available.
3. For `structure-audit`, apply [primitive](../../rules/skills/primitive.md)
   when checking semantics, then [shape](../../rules/skills/shape.md) when
   checking materialized `SKILL.md` form. Do not invent cases.
4. Name the patch intent and smallest patch location: description, trigger,
   boundary, workflow, references, validation, or case file.
5. Edit only the target skill and directly stale routing or metadata surfaces.
6. Regenerate generated metadata if frontmatter changed, validate, and report the
   mode, patch intent, changed surface, and any rough edge.

## References

- Read [case capture](references/case-capture.md) before adding, moving, or
  deleting examples or case patterns.
- Read [primitive](../../rules/skills/primitive.md) before auditing primitive
  preservation, constraint, state, activation, or duration.
- Read [shape](../../rules/skills/shape.md) before auditing namespace,
  description, `SKILL.md` body, references, or verifier surface.
- Read [care](../../rules/skills/care.md) before auditing projection loss,
  cases, or forward tests.
- Read [cases](references/cases.md) when checking known recurrence patterns.

## Validation

Before calling the improvement done, verify:

- the first user-facing line includes `🧭` inline;
- the target skill, mode, and patch intent are explicit;
- case capture happens only for real cases, and structure audits invent none;
- primitive preservation and materialized shape are checked separately;
- hard constraints without machine-checkable enforcement are reported as
  projection loss;
- stateful edits are limited to the target skill and directly stale metadata,
  references, cases, or verifier surfaces;
- the edit is smaller than a rewrite;
- concrete cases live in one-level references, not the every-use body;
- generated dispatcher/resolver metadata is in sync when needed;
- `pnpm generate` and `pnpm verify` pass after Partita skill changes.
