---
name: ym-aiming
description: "Use when an active aim exists and the new request may drift from it, or when the user asks to set, reset, or check the active aim. Not for creating formal goals, blocking user-initiated topic changes, ordinary summaries, or execution planning."
when_to_use: "active aim, aim drift, target switch, focus check, side request, aim brief"
dispatch_intent: "YM aim drift warning"
---

# YM Aiming

Prefix your first user-facing line with `🧭` inline, not as its own paragraph,
when this Mini-Waza skill is active.

This skill is a warning, not a gate. It keeps the active aim visible when a
conversation starts drifting, without blocking the user from changing topics.

## Capability

Help the agent notice when the current request no longer serves the active aim.
The intervention is a short visible note or brief, not a new planning workflow.

Pressure scenario: the agent follows a fresh request because it is easy or
interesting, then silently drops the target the user was originally trying to
land.

## Trigger

Use this skill when:

- an active aim exists and the new request is side, adjacent, or drifting work;
- the user asks for an aim check, target check, or focus check;
- the user sets, resets, or switches an active aim and expects confirmation;
- the next action would create durable work, write files, open a long loop, or
  change task direction away from the active aim.

Do not use this skill when:

- there is no active aim in the conversation;
- the active aim has already been completed or explicitly paused;
- the user clearly asks to create or manage a formal goal;
- the request only needs ordinary planning, review, debugging, or summary.

## Soft Boundary

Classify the current request against the active aim:

- `aligned`: directly serves the aim; continue without extra ceremony unless
  the user explicitly asked for an aim check.
- `side`: unrelated but light; warn briefly, answer, then return attention.
- `adjacent`: useful but likely to slow the aim; warn and prefer a small choice.
- `drift`: starts a different durable work surface; warn and ask before acting.
- `aim-set`: user is setting or switching the aim; return an `Aim brief`.
- `unknown`: ask one minimal question about the relationship.

The warning should make drift visible without judging the user's choice.

## Hard Boundary

- Do not create, update, or close formal goals.
- Do not write files, run tools, browse, or scan repositories just to infer an
  aim.
- Do not depend on docwarden, contexta, handoff files, or external memory.
- Do not block a user-initiated topic switch.
- Do not treat a warning shown only in a tool update or hidden reasoning as
  complete; the final user-facing reply must keep the signal when drift matters.
- Do not turn this into a general planning, handoff, or task-management skill.

## Workflow

1. Identify the active aim from the current conversation. If it is not explicit,
   do not invent one.
2. Split the current request into what the user explicitly asks, what it implies,
   and whether it would create durable work.
3. Classify the relationship using the soft boundary labels.
4. Choose the smallest visible response:
   - `side`: `🧭 Aim note: This drifts from the active aim: {aim}. I will answer briefly, then return to it.`
   - `adjacent` or `drift`: show `Aim check` with active aim, current request,
     drift judgment, recommended action, and one question before durable action.
   - `aim-set`: show `Aim brief` with active aim, current request, boundary, and
     next step.
   - `unknown`: ask one question instead of guessing.
5. If the same turn has a final summary, keep the note, check, or brief visible
   there too.

## Validation

Before treating the skill as correctly applied, check:

- the first user-facing line includes `🧭` inline;
- drift, side work, or aim setting produced an `Aim note`, `Aim check`, or
  `Aim brief`;
- no formal goal or external workflow artifact was created;
- durable drift was not executed without user confirmation.
