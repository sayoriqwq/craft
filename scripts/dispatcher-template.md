---
name: mini-waza
description: "Dispatcher for user-defined Mini-Waza workflow skills. Use when a Mini-Waza skill exists for the user's request. Not for generic work when no matching skill has been defined."
---

# Mini-Waza Dispatcher

Prefix your first user-facing line with `🧭` inline, not as its own paragraph
when a Mini-Waza skill is active.

Mini-Waza is a Codex plugin for user-defined workflow skills. Match only
against skills that exist in the routing table.

## Routing Table

<!-- routing-table:start -->
<!-- routing-table:end -->

## How This Works

1. Read the user's message.
2. If the routing table has a matching skill, read that skill file.
3. If no skill matches, do normal agent work and do not invent a skill.

Skills chain manually, not automatically.
