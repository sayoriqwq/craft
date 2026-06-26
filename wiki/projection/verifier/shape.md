# Shape

Shape checks validate supported runtime files.

Current `SKILL.md` body shape is V1:

```text
## Rule
## Pattern
## Boundary
## Effects
## Workflow
## References
## Validation
```

Legacy sections are not valid: `Primitive Audit`, `Capability`, `Trigger`,
`Template`, `Protocol`, `Surface`, `External State`, `Soft Boundary`, and
`Hard Boundary`.

Supported skill directory entries follow the official Codex skill resource
shape: `SKILL.md`, `agents/`, `scripts/`, `references/`, and `assets/`.

Partita additionally requires `agents/openai.yaml` for invocation policy
projection. `references/` remains one-level so conditional context is directly
discoverable from `SKILL.md`. `scripts/` and `assets/` are bundled resources and
may contain implementation or output files.

Supported namespace roots under `skills/` are verifier-owned. Current namespace:
`primitive`, the Partita-managed base source family projected as `pm:<name>`.

Hard verification surfaces include generated-file checks, `partita verify`,
tests, package checks, and Effect harness verification when the target uses the
Effect harness.
