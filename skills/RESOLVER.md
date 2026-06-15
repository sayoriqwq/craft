# Craft Skill Resolver

## Shared Output Marker

All Craft skills use the same output convention: prefix the first
user-facing line with `🧭` inline, not as its own paragraph. This marker is a
visible loaded-skill signal.

This file is the routing registry for user-defined workflow skills.
Do not recreate Waza's original eight-skill table here.

When a skill is added:

1. apply `rules/skills/index.md`;
2. create `skills/<name>/SKILL.md`;
3. add one row to the table below;
4. run `make regenerate`;
5. run `make test`.

## Routing Table

| Intent | Skill | File |
| --- | --- | --- |
| Sustained necessary challenge until agreement | `argue` | `skills/argue/SKILL.md` |
| Generate and narrow candidate directions | `brainstorm` | `skills/brainstorm/SKILL.md` |
| Create or update skill from primitive behavior pressure | `skill-write` | `skills/skill-write/SKILL.md` |
| Patch named skill from a real case or structure audit | `skill-patch` | `skills/skill-patch/SKILL.md` |
| Craft aim and topic alignment | `aim` | `skills/aim/SKILL.md` |
| Controlled high-density Chinese collaboration mode | `density` | `skills/density/SKILL.md` |
| Block expansion until current v1 lands | `land` | `skills/land/SKILL.md` |
| Pin external repository source | `pin` | `skills/pin/SKILL.md` |
| Set up Effect target area with effect-harness | `setup-effect-area` | `skills/setup-effect-area/SKILL.md` |
| Expand vague seed idea into actionable target | `want` | `skills/want/SKILL.md` |
