# Mini-Waza Routing

Mini-Waza does not ship predefined skills.

Routing only exists after the user defines a skill under
`skills/<name>/SKILL.md` and records it in `skills/RESOLVER.md`.

## Rule

- Do not silently map user requests to Waza's old `think/design/check/hunt/write/learn/read/health` taxonomy.
- Do not invent a route for a missing skill.
- If a matching Mini-Waza skill exists, read its `SKILL.md` before acting.
- If no matching skill exists, do normal agent work and leave the framework unchanged.
