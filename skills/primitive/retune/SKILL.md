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
- 目标 skill 的 identity 仍然成立，只是某个局部 Rule、Pattern、Boundary、Effects、Workflow、References、Validation 或 metadata surface 已 stale。
- 用户明确要求根据这次真实 case patch 目标 skill。

Do not use when:

- 用户要创建 internal primitive skill；使用 `notate`。
- 用户要创建 public workflow skill；使用 `conduct`。
- 用户只要求 structure-audit，且没有真实 patch case。
- 目标 skill identity 不成立；MUST 停止并报告，删除旧 skill 是用户或普通文件操作。
- 用户要改造外部 skill 进入 Partita；外部 skill 只能作为创建新 skill 的参考材料。
- 用户要普通 code review、bug fix、prose cleanup、verifier/schema/CLI implementation。

## Boundary

Soft:

- MUST 在修改 skill 前要求真实 patch case。
- MUST 识别 target skill 和 case 暴露的 stale surface。
- MUST 保持 target skill identity。
- target identity 不成立时，MUST 停止并报告；MUST NOT patch 它。
- 没有真实 case 时，MUST NOT 运行 structure-audit。
- MUST 选择能防止复发的最小 patch。
- 当复发判断需要具体 case detail 时，SHOULD 把它保留在 references。

Hard:

- When: 修改 skill frontmatter、`agents/openai.yaml`、dispatcher 输入或 generated projection target。
  Do: MUST 运行 `pnpm generate:check`。

- When: 完成 repo 变更前。
  Do: MUST 运行 `pnpm verify`。

## Effects

- Conversation: MAY 展示 target skill、patch case summary、stale surface、变更后的 rule 和验证结果。
- Filesystem: MAY 只更新 target skill、直接 stale 的本地 references、`agents/openai.yaml` 和直接需要的 generated projections。
- External: none.

## Workflow

1. 读取 target skill 和真实 patch case。材料不足时，MUST 使用本地 insufficient-material reference 并停止。
2. 确认 target skill identity 仍然成立；否则 MUST 停止并报告 identity invalid。
3. 定位 case 暴露的最小 stale surface。
4. 只 patch 该 stale surface，以及直接需要同步的 metadata 或 projections。
5. 运行要求的 Hard checks，或报告准确 blocker。

## References

- 材料不足时，MUST 使用 [insufficient material](references/insufficient-material.md)。

## Validation

Before done:

- 已识别真实 patch case 和 target skill，或材料不足已被打回；
- patch 前 target identity 仍然成立；
- patch 小于 rewrite，且限制在 case 暴露的 stale surface 内；
- `retune` 没有执行 structure-audit、外部 skill 迁移、新 skill 创建或 identity repair；
- Effects 保持在声明的 filesystem scope 内；
- 要求的 Hard checks 已通过，或准确 blocker 已报告。
