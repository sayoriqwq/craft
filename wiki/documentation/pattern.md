---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 定义 Markdown 中可被 agent 稳定识别和复用的结构模式。
status: active
sources: []
updated: 2026-06-29
---

# Pattern

## Definition

`pattern` 是 Markdown 中可被 agent 稳定识别和复用的结构模式。

## Rules

- 面向 agent 的 Markdown SHOULD 使用稳定 pattern，而不是只靠自然语言说明。
- pattern 可以是 frontmatter、固定字段名、枚举值、目录和文件命名、约定 section、固定 section 顺序、必填字段、状态格式或检查清单。
- 当目标是规范 agent 行为时，SHOULD 先写可匹配的 pattern，再写解释。
- 长期复用的 pattern SHOULD 后续脚本化检查。
- pattern 错误 SHOULD 暴露出来，不应该让 agent 靠猜或静默降级。

## Template

`template` 是 pattern 的可填写形态。

定义 template 时，SHOULD 说明每个槽位的语义职责，而不是只给一个示例。

template SHOULD 使用稳定字段名，让 agent 能复用同一读取方式。

template SHOULD 把条件、动作、对象、状态或结果拆成不同槽位，不要压进一整句自然语言。

template 里的动作槽位 SHOULD 使用 normative keywords 表达强度。

template 的说明 SHOULD 包含：

- 槽位名称。
- 槽位负责表达什么。
- 槽位是否承载 normative keyword。
- 一个最小可复制示例。

## Hard Pattern

skill runtime 的 `Hard:` 区 SHOULD 使用 `When:` / `Do:` pattern。

`When:` 只写触发条件。

`Do:` 只写必须执行或禁止执行的动作。

```md
- When: 修改 skill frontmatter、`agents/openai.yaml`、dispatcher 输入或 generated projection target。
  Do: MUST 运行 `pnpm generate:check`。
```
