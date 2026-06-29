---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 定义 Markdown 正文和 section 命名的语言偏好。
status: active
sources: []
updated: 2026-06-29
---

# Language

## Definition

`language` 是 Markdown 正文和 section 命名的表达偏好。

## Rules

- 主内容 MUST 使用简体中文。
- 英文用于准确表达，不用于装饰。
- canonical term、常见技术词、简单英文词 SHOULD 保留英文。
- MUST NOT 机械翻译技术词。
- MUST NOT 默认给英文术语添加括号中文标注。
- 生僻英文术语第一次出现时，SHOULD 使用 `term(翻译)` 解释。
- section 名称 SHOULD 使用简短英文词或短语。
- 中英文混排时，中文和英文之间 SHOULD 留空格。
- skill runtime 文档正文也属于 Markdown 主内容，SHOULD 使用中文表达执行口径。
- frontmatter `description`、V1 section 名称、verifier-required labels、YAML keys、命令、路径、handle 和 canonical terms 可以保留英文。
- skill runtime 的 `Hard:` 区 SHOULD 使用 `When:` / `Do:` pattern 表达硬约束。
- `When:` 只写触发条件，`Do:` 只写必须执行或禁止执行的动作。
