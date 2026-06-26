---
name: partita
description: "Dispatcher for user-defined Partita workflow skills. Use when a Partita skill exists for the user's request. Not for generic work when no matching skill has been defined."
---

# Partita Dispatcher

Prefix your first user-facing line with `🧭` inline, not as its own paragraph
when a Partita skill is active.

Partita is a CLI-backed Codex skill harness for user-defined workflow skills. Match only
against skills that exist in the routing table.

## Routing Table

<!-- partita:projection:start id="routing-table" source="skills" mode="block-table" -->
| Handle | Name | Invocation | Description | File |
|--------|------|------------|-------------|------|
| aim | aim | true | Use when an active aim exists and the new request may drift from it, when the user sets or checks the current topic/target, or when a sustained mode such as argue needs an explicit topic before it can run. Not for creating formal goals, blocking user-initiated topic changes, ordinary summaries, or execution planning. | `skills/aim/SKILL.md` |
| argue | argue | false | Use when the user wants sustained challenge on an uncertain theory, idea, requirement, or conclusion and is not sure whether it is correct. Not for ordinary implementation, code review, adversarial debate for its own sake, or when the user has already made a settled decision. | `skills/argue/SKILL.md` |
| brainstorm | brainstorm | true | Use when the user wants open-ended ideation, candidate directions, possible wants, names, approaches, features, angles, or options before choosing one. Not for expanding an already-present seed idea, executing a clear task, sustained critique, exhaustive research, or planning after the target is chosen. | `skills/brainstorm/SKILL.md` |
| density | density | false | Use when the user directly invokes or loads density, asks for controlled high-density Chinese, maximum language density, terse sustained collaboration, fixed symbolic vocabulary, or Partita density mode. Not for one-off summarization, code minification, classical Chinese, hiding uncertainty, or compressing safety-critical meaning. | `skills/density/SKILL.md` |
| land | land | true | Use when the user wants to keep a first version or current topic from expanding before it is landed, especially after they name a v1 landing topic. Blocks scope expansion and asks whether the new point is necessary for v1 or off-topic. Not for open brainstorming, later-version planning, ordinary aim drift warnings, or when no landing topic exists yet. | `skills/land/SKILL.md` |
| pin | pin | true | Use when the user asks to pin an external repository or source repo into the current repository as a durable tracked source with locator, manifest, update path, and verification. Not for Effect-specific harness setup, package-version pinning only, UI/thread pinning, or copying source without provenance. | `skills/pin/SKILL.md` |
| pm:conduct | conduct | false | Use when creating a public workflow skill from a real workflow case with gate logic, internal skill routing, and disclosure boundary. Not for creating internal primitive skills, patching existing skills, running workflows, abstract workflow wishes, external skill migration, or verifier implementation. | `skills/primitive/conduct/SKILL.md` |
| pm:notate | notate | false | Use when creating an internal primitive skill from a real case with enough material for case pattern, pressure, governance action, and default failure. Not for public workflow skill creation, patching existing skills, external skill migration, abstract capability requests, hypothetical scenarios, or verifier implementation. | `skills/primitive/notate/SKILL.md` |
| pm:retune | retune | false | Use when patching an existing valid Partita skill from a real case that exposes a stale local surface. Not for creating internal primitive skills, creating public workflow skills, structure audits, identity-invalid skills, external skill migration, ordinary code review, or prose cleanup. | `skills/primitive/retune/SKILL.md` |
| reconcile | reconcile | true | Use when the user has finished a task phase and wants a semantic residue audit against the current topic, source document, or accepted framing. Lists suspicious stale or migration-era code/docs before repair. Not for general cleanup, formatting, ordinary code review, bug finding, or unapproved deletion. | `skills/reconcile/SKILL.md` |
| setup-effect-area | setup-effect-area | true | Use when the user asks to set up, update, verify, or repair a TypeScript/Effect target repository against effect-harness runtime and CLI contracts. Not for updating effect-harness itself, generic repo pinning, writing Effect business features, or defining Partita skill semantics. | `skills/setup-effect-area/SKILL.md` |
| update-effect-harness | update-effect-harness | true | Use when the user asks to update effect-harness itself to the latest official Effect source pin, package baseline, or self-update workflow. Not for setting up an Effect target repo, generic repo pinning, writing Effect application code, or one-off dependency bumps outside effect-harness. | `skills/update-effect-harness/SKILL.md` |
| want | want | true | Use when the user already has a seed idea, vague desire, dissatisfaction, or half-formed request and needs help expanding it into intent, context, constraints, and a next actionable instruction. Not for blank-page brainstorming, generating candidate desires, executing already-clear tasks, therapy, or specialized planning once the target is clear. | `skills/want/SKILL.md` |
<!-- partita:projection:end id="routing-table" -->

## How This Works

1. Read the user's message.
2. If the routing table has a matching skill, read that skill file.
3. If no skill matches, do normal agent work and do not invent a skill.

Skills chain manually, not automatically.
