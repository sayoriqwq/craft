---
name: conduct
description: "Use when creating a public workflow skill from a real workflow case with gate logic, internal skill routing, and disclosure boundary. Not for creating internal primitive skills, patching existing skills, running workflows, abstract workflow wishes, external skill migration, or verifier implementation."
---

# Conduct

激活时，第一条用户可见行 MUST 以内联 `🎼 conduct` 开头。

## Rule

面对足以创建 public workflow skill 的真实 workflow case 时，MUST 先写出 workflow assertion、gate logic、internal skill routing 和 disclosure boundary，避免创建 task category、大 prompt，或没有治理动作的 internal skill bundle。

## Pattern

Use when:

- 用户提供真实 workflow case，且材料足以读出 workflow default failure 和 orchestration action。
- 用户要创建对用户暴露的 public workflow skill。
- 材料包含或足以确定 gate logic、internal skill routing、disclosure boundary，以及 public workflow 的 invocation policy。

Do not use when:

- 用户要创建 internal primitive skill；使用 `notate`。
- 用户要 patch 已有且 identity 成立的 skill；使用 `retune`。
- 用户只是要运行某个 workflow，而不是创建 workflow skill。
- 用户只有抽象 workflow 愿望、task category、假设场景，或外部 skill 迁移材料。
- 用户要实现 verifier、CLI、schema、安装流程，或普通项目文档。

## Boundary

Soft:

- MUST require a real workflow case before creating a public workflow skill.
- MUST reject material that cannot support workflow A/Y/X、gate logic、internal skill routing 和 disclosure boundary.
- MUST NOT invent workflow case、routing、gate logic、disclosure boundary 或 A/Y/X。
- MUST keep the public workflow skill's own governance assertion distinct from the internal skills it routes to.
- MUST decide `policy.allow_implicit_invocation` from Pattern precision and side-effect risk.
- MUST treat external workflow skills and deleted old skills as references only, never as source of truth.
- SHOULD ask only for the smallest missing workflow material when rejection is recoverable.

Hard:

- Run `pnpm generate:check` after changing skill frontmatter, `agents/openai.yaml`, dispatcher inputs, or generated projection targets.
- Run `pnpm verify` before finishing repo changes.

## Effects

- Conversation: MAY show `🎼 conduct`, rejection reason, workflow assertion, gate logic, internal skill routing, disclosure boundary, and verification result.
- Filesystem: MAY create one public workflow skill under a supported direct skill path, its `agents/openai.yaml`, local references, and directly required generated projections.
- External: none.

## Workflow

1. Read the real workflow case. If material is insufficient, MUST use the local insufficient-material reference and stop.
2. Read workflow A/Y/X、gate logic、internal skill routing、disclosure boundary 和 invocation policy basis.
3. Confirm the target is a public workflow skill; otherwise route to `notate` or `retune`.
4. Create the source projection: `SKILL.md`, `agents/openai.yaml`, and required local references.
5. Run the required Hard checks or report the exact blocker.

## References

- 材料不足时，MUST use [insufficient material](references/insufficient-material.md).

## Validation

Before done:

- `🎼 conduct` is visible when this skill is active;
- the input was a real workflow case, or insufficient material was rejected;
- workflow A/Y/X、gate logic、internal skill routing 和 disclosure boundary are explicit before file creation;
- the created public workflow skill has `agents/openai.yaml` and an explicit `policy.allow_implicit_invocation` decision;
- no internal primitive skill, existing-skill patch, external migration, or verifier implementation was created by `conduct`;
- Effects stayed within the declared filesystem scope;
- required Hard checks passed, or exact blockers were reported.
