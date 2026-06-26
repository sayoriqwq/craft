---
audience: agent
authors:
  - codex
reviewed_by: []
purpose: 说明 case-rooted skill 创建或修补在材料不足时如何打回。
updated: 2026-06-27
---

# 材料不足

## 核心规则

case-rooted skill 工作在材料不足时 MUST 打回，MUST NOT 生成草案。

材料不足包括：

- 没有真实 case。
- 不能读出 case pattern。
- 不能读出 default failure。
- 不能读出 governance action。
- 不能判断目标 skill 类型或目标已有 skill。

## 打回模板

```md
🎼 <handle>：材料不足，不能<目标动作>。

缺少：
- <missing item>
- <missing item>

请补<最小补充材料>。
```

## 使用规则

- MUST 明确说明当前不能继续。
- MUST 列出具体缺失项。
- MUST 只询问最小补充材料。
- MUST NOT invent case、pressure、workflow、routing 或 A/Y/X。
- MUST NOT 输出占位草案、假设方案或“先这样写”的 skill。

## 最小 case 字段

```yaml
case:
  situation: 当时发生了什么
  default_behavior: agent 无治理时实际怎样失败
  governance_reference: 为什么这不符合当前要求
```
