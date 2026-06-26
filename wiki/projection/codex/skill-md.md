# Skill Md

`SKILL.md` files under `skills/` are the source skill runtime projection.

It is not an installed copy and not the full wiki. It must contain every-run
instructions and link or route to conditional detail.

V1 body section order is:

```text
## Rule
## Pattern
## Boundary
## Effects
## Workflow
## References
## Validation
```

Source namespaces come from path structure, not frontmatter. For example,
`skills/primitive/notate/SKILL.md` keeps `name: notate` and projects to
`pm:notate`.

Codex global skill installation is flat. The same source skill installs as
`notate`; `primitive` remains the current Partita-managed base source family,
not a global install directory.
