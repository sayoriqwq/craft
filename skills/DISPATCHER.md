---
name: partita
description: "Dispatcher for user-defined Partita workflow skills. Use when a Partita skill exists for the user's request. Not for generic work when no matching skill has been defined."
---

# Partita Dispatcher

Prefix your first user-facing line with `🧭` inline, not as its own paragraph
when a Partita skill is active.

Partita is a Codex plugin for user-defined workflow skills. Match only
against skills that exist in the routing table.

## Routing Table

<!-- routing-table:start -->
| Intent | Skill | File |
|--------|-------|------|
| Partita aim and topic alignment | aim | `skills/aim/SKILL.md` |
| Sustained necessary challenge until agreement | argue | `skills/argue/SKILL.md` |
| Generate and narrow candidate directions | brainstorm | `skills/brainstorm/SKILL.md` |
| Partita controlled high-density Chinese | density | `skills/density/SKILL.md` |
| Block expansion until current v1 lands | land | `skills/land/SKILL.md` |
| Pin external repository source | pin | `skills/pin/SKILL.md` |
| Reconcile task changes with current framing | reconcile | `skills/reconcile/SKILL.md` |
| Set up Effect target area with effect-harness | setup-effect-area | `skills/setup-effect-area/SKILL.md` |
| Partita skill patch or structure audit | skill-patch | `skills/skill-patch/SKILL.md` |
| Partita skill writing from primitive | skill-write | `skills/skill-write/SKILL.md` |
| Update effect-harness official source and baseline | update-effect-harness | `skills/update-effect-harness/SKILL.md` |
| Expand vague seed idea into actionable target | want | `skills/want/SKILL.md` |
<!-- routing-table:end -->

## How This Works

1. Read the user's message.
2. If the routing table has a matching skill, read that skill file.
3. If no skill matches, do normal agent work and do not invent a skill.

Skills chain manually, not automatically.
