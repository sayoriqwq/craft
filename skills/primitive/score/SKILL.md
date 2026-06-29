---
name: score
description: "Use when creating or modifying Markdown docs that should follow sayoriqwq-style Markdown writing preferences. Not for non-Markdown prose, product copy, release notes, social posts, translation, localization, code comments, commit messages, skill creation, workflow creation, or skill patching."
---

# Score

激活时，第一条用户可见行 MUST 以内联 `🎼 score` 开头。

## Rule

面对创建或修改 Markdown 时，MUST 按 sayoriqwq-style Markdown preferences 组织 module、section 和 assertion，并维护 metadata、audience、language、pattern、index、path、links 与 normative keywords，避免 agent 写出无边界、不可审查、不可复用或不符合用户文档偏好的 Markdown。

## Pattern

Use when:

- agent 将要创建或修改 `.md` 文件，且当前用户要求没有覆盖该偏好。
- 用户明确要求按 sayoriqwq 的 Markdown 写作偏好、文档规范或 `score` 处理。
- 当前任务需要判断 Markdown 中的 `assertion` 是否清晰、原子或可 review。
- 当前任务需要维护 Markdown metadata、audience、section、path、links、pattern 或 normative keywords。

Do not use when:

- 目标不是 Markdown。
- 用户要普通润色、去 AI 味、产品文案、release notes、社交文案、翻译或本地化文案。
- 用户要写代码注释、commit message、PR 描述或 issue 回复。
- 用户要创建 internal primitive skill；使用 `notate`。
- 用户要创建 public workflow skill；使用 `conduct`。
- 用户要 patch 已有且 identity 成立的 skill；使用 `retune`。

## Boundary

Soft:

- MUST 在创建或修改 Markdown 前读取相关本地 preference references。
- MUST 把 `assertion` 当作一条可单独审查的语义判断，而不是正确性证明。
- MUST 把每个 `.md` 文件当作一个 `module`。
- MUST 维护 module boundary：一个 module 负责承载其职责内 assertions，并拒绝职责外 assertions。
- 除非更高优先级规则禁止，sayoriqwq-style docs MUST 使用 frontmatter metadata。
- MUST 先选择 `audience`，再决定偏 pattern 还是偏 description。
- MUST 使用简体中文作为主内容语言。
- section 名称 SHOULD 使用简短英文词或短语。
- 目标文档系统支持 OFM wiki link 时，SHOULD 优先使用 OFM。
- path 和 filename SHOULD 短、符合 scope、且不重复父级语义。

Hard:

- When: 修改 projected references、dispatcher 输入、generated projection target 或 skill metadata。
  Do: MUST 运行 `pnpm generate:check`。

- When: 完成 repo 变更前。
  Do: MUST 运行 `pnpm verify`。

## Effects

- Conversation: MAY 展示已应用的 preference blocks、preference conflict 和验证结果。
- Filesystem: MAY 创建或更新 Markdown docs、wiki documentation nodes、skill-local projected references 和直接需要的 generated projections。
- External: none.

## Workflow

1. 读取与当前 Markdown surface 相关的本地 preference references。
2. 识别 target module 及其 boundary。
3. 在组织正文前，选择或维护 metadata，尤其是 `audience`。
4. 用 sections 组织 assertions；heading 只打开 section，不当作 assertion。
5. 应用 language、keywords、pattern、path 和 links preferences。
6. 运行当前变更 surface 需要的 checks，或报告准确 blocker。

## References

- 需要可单独审查的语义判断时，读取 [assertion](references/assertion.md)。
- 需要 `.md` 文件作用域时，读取 [module](references/module.md)。
- 需要单一职责 module boundary 时，读取 [boundary](references/boundary.md)。
- 需要由 heading 打开的局部上下文时，读取 [section](references/section.md)。
- 需要中文正文和英文 section naming 时，读取 [language](references/language.md)。
- 需要 normative keyword 强度时，读取 [keywords](references/keywords.md)。
- 需要 frontmatter fields 时，读取 [metadata](references/metadata.md)。
- 在选择偏 pattern 还是偏 description 前，读取 [audience](references/audience.md)。
- 需要 agent-facing structures 或 template 定义时，读取 [pattern](references/pattern.md)。
- 需要 index 和短 scope filename 时，读取 [path](references/path.md)。
- 需要 OFM-first linking 时，读取 [links](references/links.md)。

## Validation

Before done:

- target surface 是 Markdown；
- 相关本地 preference references 已应用；
- 当变更触及 metadata、audience、module boundary、sections、assertions、language、keywords、pattern、path 或 links 时，这些面已被处理；
- `score` 没有执行非 Markdown prose polish、product copy、workflow skill、primitive skill、skill patch、code comment、commit message、PR description 或 issue reply；
- Effects 保持在声明的 filesystem scope 内；
- 要求的 Hard checks 已通过，或准确 blocker 已报告。
