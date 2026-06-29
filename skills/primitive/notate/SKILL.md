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

- MUST 在创建 internal primitive skill 前要求真实 case。
- MUST 打回不能支撑 case pattern、pressure、governance action 和 default failure 的材料。
- MUST NOT 编造 case、pressure、A/Y/X 或 primitive identity。
- MUST 保持每个 internal primitive skill 只有一个 pressure 和一个 governance action。
- MUST 只把外部 skill 和已删除旧 skill 当作参考，不能当作 source of truth。
- 如果材料不足但可补救，SHOULD 只询问最小缺失 case material。

Hard:

- When: 修改 skill frontmatter、`agents/openai.yaml`、dispatcher 输入或 generated projection target。
  Do: MUST 运行 `pnpm generate:check`。

- When: 完成 repo 变更前。
  Do: MUST 运行 `pnpm verify`。

## Effects

- Conversation: MAY 展示打回原因、A/Y/X rule、source path、projected handle 和验证结果。
- Filesystem: MAY 在 `skills/primitive/<name>/` 下创建一个 internal primitive skill、它的 `agents/openai.yaml`、本地 references 和直接需要的 generated projections。
- External: none.

## Workflow

1. 读取真实 case。材料不足时，MUST 使用本地 insufficient-material reference 并停止。
2. 从 case 中读出 case pattern、pressure、governance action 和 default failure。
3. 确认目标是 internal primitive skill；否则路由到 `conduct` 或 `retune`。
4. 创建 source projection：`SKILL.md`、`agents/openai.yaml` 和必要本地 references。
5. 运行要求的 Hard checks，或报告准确 blocker。

## References

- 材料不足时，MUST 使用 [insufficient material](references/insufficient-material.md)。

## Validation

Before done:

- 输入是真实 case，或材料不足已被打回；
- 创建文件前，case pattern、pressure、governance action 和 default failure 已明确；
- 创建的 skill 是 `policy.allow_implicit_invocation: false` 的 internal primitive；
- `notate` 没有创建 public workflow skill、已有 skill patch、外部迁移或 verifier implementation；
- Effects 保持在声明的 filesystem scope 内；
- 要求的 Hard checks 已通过，或准确 blocker 已报告。
