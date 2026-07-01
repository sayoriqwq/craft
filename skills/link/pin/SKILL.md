---
name: pin
description: "Use when the user explicitly asks to pin a GitHub repository into the current project as a git-subtree source prefix with sibling subtree contract, anchor, route, editor policy, update path, verify path, and import block. Not for non-GitHub sources, non-subtree mechanisms, temporary clones, web fetches, node_modules lookup, package-version pins, or UI/thread pinning."
---

# Pin

激活时，第一条用户可见行 MUST 以内联 `🔗` 开头。

## Rule

面对用户要 `pin` repository 时，MUST 把它收敛为 GitHub git-subtree pin：GitHub 仓库以 `git subtree` materialize 到本地 prefix，旁边的 `repos/<name>.subtree.json` 是唯一 source pin 真源，记录 GitHub repo、branch/ref、本地 prefix、subtree split/trailer、anchor、agent route、editor policy、update command、verify command、ownership mode 和 read-only/import block。

`pin` 不是非 GitHub source、任意 external source 抽象、非 subtree mechanism、临时 clone、一次性 web fetch、`node_modules` 猜测、普通 package version pin，也不是把外部内容复制进当前项目后失去 provenance。

## Pattern

Use when:

- 用户显式要求 `pin`、link 或接入 GitHub repository 作为长期 agent source。
- 当前项目需要通过 `git subtree` 把 GitHub 仓库放到本地 prefix，例如 `repos/<name>`，并让 agent 从 anchor/LLM doc 读取它。
- 已有临时 clone、下载件、copied material 或 URL 记录需要升级为可更新、可验证的 `repos/<name>.subtree.json` contract。
- 需要约束应用/测试代码不得从 source prefix import。
- 需要把 editor auto-import、watch/search 和隐藏策略明确成 project decision。

Do not use when:

- 用户只是要一次性读取、比较或总结外部内容，不需要接入当前项目。
- 请求只是 pin npm、pnpm、Docker、toolchain 或 package version。
- source 不是 GitHub repository，或用户要求使用 submodule、普通 clone、archive、HTTP fetch、package install、download cache 或其他 mechanism。
- 用户要求从 `node_modules`、web cache、临时 clone 或粘贴内容推断真源。
- `pin` 指 UI 项、线程、笔记、任务或本地工作状态。
- 用户要做 projection 分发或 runtime copy 管理；这属于 owning projection mechanism。

## Boundary

Soft:

- SHOULD 优先使用 `partita pin plan`、`partita pin status` 和 `partita pin verify` 表达 GitHub subtree pin contract。
- SHOULD 让 target repo 的脚本保持短，只调用 Partita CLI 或 owning domain wrapper。
- SHOULD 将 domain-specific 语义留给 owning harness；Partita 只表达 GitHub subtree pin 字段和 hard blocks。
- SHOULD 默认 contract path 为 `repos/<name>.subtree.json`，与 `repos/<name>/` 并列；MAY 只在明确需要时使用 `--contract <path>` 覆盖。
- SHOULD 检测现有 `.vscode/` 和 `.zed/`，存在什么维护什么；两者 settings shape 分开处理。
- SHOULD 把 watch/search exclude 作为明确 decision；大仓库通常选择启用或保留为推荐状态。
- SHOULD 把 `files.exclude` 或 Zed file-scan 隐藏视为偏好项，不默认写入。

Hard:

- When: 开始 pin。
  Do: MUST 明确 GitHub repository、branch/ref、local prefix、subtree split/trailer、anchor/LLM doc、update command、verify command、agent route、editor policy、ownership mode、read-only/import block。

- When: source 不是 GitHub repository 或 mechanism 不是 `git-subtree`。
  Do: MUST hard block；Partita source pin 不接受其他 source/mechanism。

- When: contract path 未显式覆盖。
  Do: MUST 使用 `repos/<name>.subtree.json`；它与 `repos/<name>/` 并列，MUST NOT 放进 subtree prefix 内部。

- When: 只有 web fetch、临时 clone、`node_modules` lookup、下载件或复制粘贴内容。
  Do: MUST NOT 称其为 GitHub subtree pin。

- When: editor policy 未决。
  Do: MUST 默认阻断 auto-import；MUST 把 watch/search exclude 作为明确 decision；MUST NOT 默认隐藏 repo。

- When: 需要 materialize、update 或 verify pinned source prefix。
  Do: MUST 使用 Partita CLI、当前项目已有 wrapper 或 owning harness command；MUST NOT 把大段脚本塞进 target repo。

- When: 当前 repo 是 prelude-managed target。
  Do: MUST NOT direct write 绕过 prelude lifecycle；使用 provider/prelude-maintain ownership mode 或停止报告 blocker。

- When: 应用或测试代码从 source prefix import。
  Do: MUST hard block；pinned source prefix 是 agent reference，不是 application dependency。

## Effects

- Conversation: MAY 展示 GitHub subtree pin contract、缺失 decisions、hard block issue codes、editor policy decisions 和验证结果。
- Filesystem: MAY 在批准 scope 内写入 `repos/<name>.subtree.json` 或由 owning command materialize 的 source prefix；MUST NOT 手工复制外部 source 来绕过 command。
- External: MAY 通过 git/GitHub locator 读取 ref/trailer metadata；materialize、update 和 verify MUST 走 Partita CLI 或 owning command。

## Workflow

1. 确认请求是 GitHub repository git-subtree pin，而不是 temporary clone、web fetch、`node_modules` lookup、package version pin 或非 GitHub source。
2. 收集 GitHub repository、branch/ref、local prefix、subtree split/trailer、anchor/LLM doc、agent route、ownership mode、update command 和 verify command。
3. 决定 editor policy：auto-import exclude 默认 block；watch/search exclude 明确选择；files/repo hide 只有用户选择时启用；VSCode 和 Zed 分开处理。
4. 运行 `partita pin plan` 生成只读 `repos/<name>.subtree.json` contract 和 editor settings shape。
5. 如果 target 是 prelude-managed，确认 ownership 是 `provider` 或 `prelude-maintain`，不要 direct write managed surfaces。
6. 使用 `partita pin status --name <name> --prefix repos/<name>` 检查当前 source prefix、anchor、route、subtree split/trailer 和 editor state。
7. 使用 `partita pin verify --name <name> --prefix repos/<name>` hard block source 缺失、gitlink/submodule、缺 split/trailer、非 GitHub URL、非 subtree mechanism、错误 import、缺 anchor/route 和 prelude direct write。
8. 汇报 changed files、contract path、CLI commands、hard block 覆盖点和验证结果。

## References

- `partita pin plan`
- `partita pin status`
- `partita pin verify`

## Validation

Before done:

- 第一条用户可见行包含内联 `🔗`；
- `repos/<name>.subtree.json` contract 明确 GitHub repository、branch/ref、local prefix、`git-subtree` mechanism、subtree split/trailer、anchor/LLM doc、update command、verify command、agent route、editor policy、ownership mode 和 read-only/import block；
- 默认 contract path 与 subtree prefix 并列，且未回落到 `.partita`；
- 没有接受非 GitHub source 或非 subtree mechanism；
- 没有把 web fetch、临时 clone、`node_modules` lookup、下载件或 copied material 称为 pin；
- editor policy 默认阻断 auto-import，watch/search exclude 有明确 decision，files/repo hide 没有默认启用；
- VSCode 和 Zed settings shape 已分开处理；
- prelude-managed target 没有被 direct write 绕过；
- 应用和测试代码没有从 source prefix import；
- `partita pin status` 或 `partita pin verify` 的结果已报告，或已说明具体 blocker。
