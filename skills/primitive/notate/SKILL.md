---
name: notate
description: "Use when creating an internal primitive skill from a real case with enough material for case pattern, pressure, governance action, and default failure. Not for public workflow skill creation, patching existing skills, external skill migration, abstract capability requests, hypothetical scenarios, or verifier implementation."
---

# Notate

激活时，第一条用户可见行 MUST 以内联 `🎼 notate` 开头。

## Rule

面对足以创建 internal primitive skill 的真实 case 时，MUST 先写出它的 case pattern、pressure、governance action、default failure 和 source projection，避免创建 task category prompt、泛能力文件，或 runtime 合法但不能治理行为的 skill。

## Pattern

Use when:

- 用户提供真实 case，且材料足以读出 case pattern、pressure、governance action 和 default failure。
- 用户明确要从真实 case 创建新的 internal primitive skill。
- 旧 skill 已被用户手动删除，旧材料只作为参考，当前目标是从真实 case 创建新的 internal primitive skill。

Do not use when:

- 用户要创建 public workflow skill；使用 `conduct`。
- 用户要 patch 已有且 identity 成立的 skill；使用 `retune`。
- 用户只有抽象能力愿望、task category、假设场景，或外部 skill 迁移材料。
- 用户要实现 verifier、CLI、schema、安装流程，或普通项目文档。

## Boundary

Soft:

- MUST require a real case before creating an internal primitive skill.
- MUST reject material that cannot support case pattern、pressure、governance action 和 default failure.
- MUST NOT invent case、pressure、A/Y/X 或 primitive identity。
- MUST keep one pressure and one governance action per internal primitive skill.
- MUST treat external skills and deleted old skills as references only, never as source of truth.
- SHOULD ask only for the smallest missing case material when rejection is recoverable.

Hard:

- Run `pnpm generate:check` after changing skill frontmatter, `agents/openai.yaml`, dispatcher inputs, or generated projection targets.
- Run `pnpm verify` before finishing repo changes.

## Effects

- Conversation: MAY show `🎼 notate`, rejection reason, A/Y/X assertion, source path, projected handle, and verification result.
- Filesystem: MAY create one internal primitive skill under `skills/primitive/<name>/`, its `agents/openai.yaml`, local references, and directly required generated projections.
- External: none.

## Workflow

1. Read the real case. If material is insufficient, MUST use the local insufficient-material reference and stop.
2. Read case pattern、pressure、governance action 和 default failure from the case.
3. Confirm the target is an internal primitive skill; otherwise route to `conduct` or `retune`.
4. Create the source projection: `SKILL.md`, `agents/openai.yaml`, and required local references.
5. Run the required Hard checks or report the exact blocker.

## References

- 材料不足时，MUST use [insufficient material](references/insufficient-material.md).

## Validation

Before done:

- `🎼 notate` is visible when this skill is active;
- the input was a real case, or insufficient material was rejected;
- case pattern、pressure、governance action 和 default failure are explicit before file creation;
- the created skill is an internal primitive with `policy.allow_implicit_invocation: false`;
- no public workflow skill, existing-skill patch, external migration, or verifier implementation was created by `notate`;
- Effects stayed within the declared filesystem scope;
- required Hard checks passed, or exact blockers were reported.
