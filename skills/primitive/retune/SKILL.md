---
name: retune
description: "Use when patching an existing valid Partita skill from a real case that exposes a stale local surface. Not for creating internal primitive skills, creating public workflow skills, structure audits, identity-invalid skills, external skill migration, ordinary code review, or prose cleanup."
---

# Retune

激活时，第一条用户可见行 MUST 以内联 `🎼 retune` 开头。

## Rule

面对真实 case 暴露已有且 identity 成立的 skill 局部 stale surface 时，MUST 先做最小 case-patch，避免无 case 的 structure-audit、整 skill rewrite，或把 identity 已不成立的 skill 当作可修补对象。

## Pattern

Use when:

- 用户提供真实 case，且该 case 指向一个已有 Partita skill 的局部错误、过宽、过窄、误触发、漏触发、越权 Effects 或错误 output pattern。
- 目标 skill 的 identity 仍然成立，只是某个局部 assertion、Pattern、Boundary、Effects、Workflow、References、Validation 或 metadata surface 已 stale。
- 用户明确要求根据这次真实 case patch 目标 skill。

Do not use when:

- 用户要创建 internal primitive skill；使用 `notate`。
- 用户要创建 public workflow skill；使用 `conduct`。
- 用户只要求 structure-audit，且没有真实 patch case。
- 目标 skill identity 不成立；MUST stop and report，删除旧 skill 是用户或普通文件操作。
- 用户要改造外部 skill 进入 Partita；外部 skill 只能作为创建新 skill 的参考材料。
- 用户要普通 code review、bug fix、prose cleanup、verifier/schema/CLI implementation。

## Boundary

Soft:

- MUST require a real patch case before changing a skill.
- MUST identify the target skill and the stale surface exposed by the case.
- MUST preserve the target skill identity.
- MUST stop and report when target identity is invalid; MUST NOT patch it.
- MUST NOT run structure-audit without a real case.
- MUST choose the smallest recurrence-preventing patch.
- SHOULD keep concrete case detail in references when it is needed for recurrence.

Hard:

- Run `pnpm generate:check` after changing skill frontmatter, `agents/openai.yaml`, dispatcher inputs, or generated projection targets.
- Run `pnpm verify` before finishing repo changes.

## Effects

- Conversation: MAY show `🎼 retune`, target skill, patch case summary, stale surface, changed assertion, and verification result.
- Filesystem: MAY update only the target skill, directly stale local references, `agents/openai.yaml`, and directly required generated projections.
- External: none.

## Workflow

1. Read the target skill and real patch case. If material is insufficient, MUST use the local insufficient-material reference and stop.
2. Confirm the target skill identity still holds. If not, MUST stop and report identity invalid.
3. Locate the smallest stale surface exposed by the case.
4. Patch only that stale surface and directly synchronized metadata or projections.
5. Run the required Hard checks or report the exact blocker.

## References

- 材料不足时，MUST use [insufficient material](references/insufficient-material.md).

## Validation

Before done:

- `🎼 retune` is visible when this skill is active;
- a real patch case and target skill were identified, or insufficient material was rejected;
- the target identity still holds before patching;
- the patch is smaller than a rewrite and limited to the stale surface exposed by the case;
- no structure-audit, external skill migration, new skill creation, or identity repair was performed by `retune`;
- Effects stayed within the declared filesystem scope;
- required Hard checks passed, or exact blockers were reported.
