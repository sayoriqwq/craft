# Shape

Shape is the supported form that carries a primitive into a usable Partita skill.

Use this rule when writing or auditing `SKILL.md`, progressive disclosure, or
bundled resources. Shape checks happen after the primitive is known.

## Terms

- `namespace`: optional matching and projection identity for grouped skills. It
  can combine with a short skill name as `<namespace>:<name>`. Namespace is not
  the skill name itself.
- `description`: the activation surface. It should follow the primitive's
  `activation`: broad descriptions cover natural language cases; narrow
  descriptions avoid accidental routing. It should also make sustained duration
  visible when a skill persists beyond one turn.
- `frontmatter`: Codex-supported metadata such as `name`, `description`,
  `when_to_use`, and `dispatch_intent`. Do not add unsupported metadata just to
  preserve a primitive field.
- `body`: every-use instructions in `SKILL.md`.
- `references`: conditional detail loaded only when the active task needs it.
- `verifier`: deterministic checks over supported file shape, routing, and
  package surfaces. Hard constraints belong here, or in CLI commands, tests,
  schemas, or package checks.

## Main Skill Body

- Keep `SKILL.md` concise, ideally under 100 lines.
- Keep every-use instructions in `SKILL.md`.
- Move rare detail, long examples, case logs, and advanced guidance to one-level
  references.
- Do not create nested reference trees unless the user explicitly asks.

## Description

- Treat frontmatter `description` as the activation surface.
- State what the skill does and when to use it.
- Include important exclusions with `Not for ...`.
- Do not write a neutral summary that fails to route.
- Check whether the description is broad or narrow according to the primitive's
  activation policy.
- Check whether duration is visible enough to prevent accidental persistence or
  premature exit.

## Structure Audit

- Check that the capability names an agent behavior intervention, not a folder
  shape, runtime package shape, or generic scaffold.
- Check that the pressure scenario names the repeated agent failure.
- Check that trigger and exclusion rules are specific enough to route.
- Check that soft agent judgment and hard deterministic constraints are
  separated.
- Check that each hard constraint has a machine-checkable enforcement surface.
  A `## Hard Boundary` sentence without a verifier, CLI command, test, schema,
  or package check is not a complete hard constraint.
- Check that workflow steps are reviewable and ask for the smallest uncertain
  semantic unit when user confirmation is needed.
- Check that workflow or validation names the stop condition for `task`, `topic`,
  or `mode` duration.
- Check that validation proves the skill can be used, including generated
  metadata when frontmatter changes.
- Check that namespace, when present in routing or plugin projection, is not
  folded into the skill name.

## Hard Constraints

- A hard constraint must point to a machine-checkable enforcement surface.
- Put deterministic Partita maintenance in the TypeScript/Effect CLI.
- When checks become a parameterized family or repeated command surface, extend
  the CLI instead of accumulating unrelated mechanisms.
- The skill body should teach when to run the CLI, how to run it, and
  what failure means. It should not rely on prose to enforce hard constraints.

## Resources

- Add CLI commands only for deterministic repeated operations owned by Partita.
- Add references for conditional detail.
- Add examples or cases only from real use or user-provided material.
- Keep generated metadata and runtime copies out of manual patch scope.
- Do not create a cross-skill framework, docs package, schema, or automation
  just to record feedback.
- Do not preserve private source paths as Partita runtime requirements unless
  Partita explicitly owns those paths.
