# Authoring

Workflow for turning a primitive into a Partita skill.

## Rule

- Start from [primitive](primitive.md), not folder shape, runtime package shape,
  CLI wrapper, plugin namespace, or generic scaffold.
- Name the repeated pressure before writing a skill. If no repeatable agent
  drift exists, do not add a skill.
- Define trigger, boundary, constraint, state, activation, duration, workflow,
  and validation before materializing `SKILL.md`.
- Use [shape](shape.md) to carry the primitive through supported files.
- Use [care](care.md) to track projection loss and future patch surfaces.
- Separate soft agent judgment from hard deterministic constraints. Soft
  constraints stay in model-applied instructions. Hard constraints must have a
  machine-checkable surface such as a CLI command, verifier, schema, test, or
  package validation.
- Put repeated Partita maintenance checks in the TypeScript/Effect CLI instead
  of accumulating ad hoc scripts.
- Keep workflow moves reviewable. When user confirmation is needed, ask for the
  smallest uncertain semantic unit.
- Materialize only Codex-supported skill surfaces in this repo.

## Interpretation Gate

Use an interpretation gate before changing skill names, trigger policy, harness
install behavior, global skill state, namespace conventions, or marker
conventions when the user's instruction can be read more than one way.

State the planned interpretation before editing:

- what will be kept;
- what will be changed;
- what will not be touched;
- any global install or runtime effect.

Then ask for confirmation or correction. Do not treat broad words such as
`default`, `flat`, `prefix`, `global`, `marker`, `namespace`, `restore`, or
`all` as implementation-ready when they affect multiple surfaces.
