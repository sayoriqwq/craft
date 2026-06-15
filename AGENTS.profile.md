# Craft Profile

This file is repo-local profile context loaded by agent-guide include. It is not
part of the Craft plugin package and is not a shared skill rule.

Current user instructions, `AGENTS.md`, `CLAUDE.md`, and repo files override
this profile.

## Collaboration Defaults

- Prefer Chinese by default. Keep necessary technical names in English.
- Be direct, dense, and specific. Cut filler and generic summaries.
- Judge the boundary before producing durable content: which layer it serves,
  what loss it prevents, and what should stay out.
- Keep durable text single-purpose and reviewable. Separate evidence,
  inference, and decision.
- Treat repeated correction as a signal for future behavior. Do not keep
  repeating a corrected mistake.

## Craft Defaults

- Use Waza's mechanism first: skill source, resolver, dispatcher, verifier, and
  packaging projection.
- Do not inherit Waza's original skill taxonomy or skill contents.
- Do not add repo layers just to store profile, task, or project-specific
  context.
- User profile content remains external context unless it is abstracted into a
  reusable skill-design rule.
- Future skills should start from `rules/skills/`: primitive, shape, care, and
  authoring.
- Treat Craft skill files as source authority. Runtime copies in other repos are
  projections; CLI/verifier implementation belongs in the repo that owns that
  mechanism.
- The current loaded-skill marker is `🧭`. Future skill families may use
  family-specific markers.
