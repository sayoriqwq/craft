---
name: iso-skill-improver
description: "Use when the user names a target skill or reports that an existing skill's trigger, boundary, reading order, workflow, resources, or validation caused repeated friction and should be patched. Not for creating a new skill from scratch, ordinary code review, prose editing, one-off preference capture, or hard CLI/schema changes."
when_to_use: "skill improvement, target skill, trigger drift, boundary patch, reading order, workflow patch, validation gap"
dispatch_intent: "ISO skill improvement patch"
---

# ISO Skill Improver

Prefix your first user-facing line with `🧭` inline, not as its own paragraph,
when this Mini-Waza skill is active.

Patch an existing skill from direct dogfood feedback so the next invocation
routes, reads, and acts more correctly.

## Capability

Convert concrete feedback about a named skill into the smallest verifiable patch
to its trigger, boundary, workflow, resource-loading strategy, or validation.

Pressure scenario: the user corrects a skill's behavior, but the agent treats it
as chat feedback. The next agent then repeats the same over-read, mis-trigger,
boundary confusion, or validation miss.

## Trigger

Use this skill when:

- the user names a target skill and says its behavior is wrong, heavy, vague, or
  drifting;
- a real invocation exposed a trigger, exclusion, boundary, workflow, read-order,
  resource, or validation problem;
- the user asks to improve, patch, tighten, slim down, or correct a skill;
- dogfood shows a skill loads the wrong material, asks too broad a question, or
  writes beyond its responsibility.

Do not use this skill when:

- creating a new behavior skill from scratch; use `iso-skill-creator`;
- the feedback is only a one-off preference with no reusable failure pattern;
- the user wants ordinary code review, bug fixing, or prose editing;
- the change belongs to deterministic CLI/schema behavior rather than skill
  guidance.

## Soft Boundary

Use agent judgment for:

- whether the feedback is a repeated skill-use failure or a one-time execution
  issue;
- which skill is the target when multiple skills are mentioned;
- whether to patch description, trigger, soft boundary, hard boundary, workflow,
  read order, resources, or validation;
- how small the patch can be while preventing the next recurrence;
- whether the target should be improved, split, renamed, or left alone.

## Hard Boundary

- Do not rewrite the entire skill when a local patch fixes the failure.
- Do not create a cross-skill framework, docs package, schema, or automation
  just to record feedback.
- Do not patch generated/runtime copies when this repo has an editable
  `skills/<name>/SKILL.md` source.
- Do not preserve docwarden/contexta source paths as Mini-Waza runtime
  requirements unless Mini-Waza explicitly owns those paths.
- Do not change hard validation, CLI, packaging, or schema behavior from this
  skill alone; edit those code paths separately when requested.

## Workflow

1. Identify the target skill. Prefer the user-named skill; otherwise infer only
   from explicit context.
2. Name the patch intent:
   - what went wrong;
   - how the next invocation should behave differently;
   - what loss repeats if it is not fixed.
3. Choose the smallest patch location:
   - frontmatter `description` for trigger or exclusion drift;
   - `Trigger` for positive/negative examples;
   - `Soft Boundary` for judgment mistakes;
   - `Hard Boundary` for prohibited surfaces;
   - `Workflow` for read order, first move, or review gate;
   - `Validation` for missing proof of correct use.
4. Edit only the target skill and directly stale routing or metadata surfaces.
5. Regenerate generated metadata if frontmatter changed.
6. Run the fastest validation that proves the patch is usable.
7. Report what repeated failure was fixed and what remains a rough edge.

## Validation

Before calling the improvement done, verify:

- the first user-facing line includes `🧭` inline;
- the target skill and patch intent are explicit;
- the edit is smaller than a rewrite;
- generated dispatcher/resolver metadata is in sync when needed;
- `make regenerate` and `make test` pass after Mini-Waza skill changes.
