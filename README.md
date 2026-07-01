# Partita

`partita` 是 CLI-backed Codex skill harness，用来维护用户定义的 workflow skills。

zero-skill 仍然是合法 framework state。

当前定制定义 sayori 拥有的 Partita skill domain。

## State

- Codex plugin metadata 由 `.codex-plugin/plugin.json` 承载。
- user-defined skills 从 `skills/` 下的 direct 或 namespaced `SKILL.md` frontmatter 读取。
- dispatcher 是 harness-owned routing index，不是 skill content。
- `packages/wiki/` 是 canonical semantic content。
- `packages/generic-projection/` 是 repo 内部通用 projection helper。
- generation、verification 和 local install 由 TypeScript/Effect `partita` CLI 执行。

## Map

- `.codex-plugin/plugin.json` 是生成的 Codex plugin manifest。
- `CONTEXT.md` 把 repository context 映射到 wiki nodes。
- `HARNESS.md` 把 harness operations 映射到 wiki nodes。
- `harness/skills/dispatcher.md` 是生成的 harness dispatcher reference。
- `bin/partita.ts` 是 TypeScript/Effect CLI entrypoint。
- `src/partita/` 负责 Partita-specific generation、verification、routing 和 install。
- `packages/generic-projection/` 负责通用 projection marker、file copy 和 block marker helper。
- `packages/wiki/` 负责 harness、skill、workflow、projection、practice、collaboration、documentation 和 vocabulary nodes。

## Commands

```bash
pnpm generate
pnpm generate:check
pnpm verify
pnpm link:global
```

## Npm CLI

Partita CLI 发布为 `@sayoriqwq/partita`，bin name 是 `partita`。

下游仓库不应该依赖本机 sibling repo 路径；source pin 应通过 package-level CLI 调用：

```bash
npx @sayoriqwq/partita pin status --name effect --prefix repos/effect --contract repos/effect.subtree.json
npx @sayoriqwq/partita pin verify --name effect --prefix repos/effect --contract repos/effect.subtree.json
pnpm dlx @sayoriqwq/partita pin verify --name effect --prefix repos/effect --contract repos/effect.subtree.json
```

`pin plan` 用于生成 GitHub git-subtree pin contract 和 editor settings shape：

```bash
npx @sayoriqwq/partita pin plan --name effect --prefix repos/effect --contract repos/effect.subtree.json --repository https://github.com/Effect-TS/effect --branch main --ref <commit-or-split>
```

默认 contract path 是 `repos/<name>.subtree.json`，和 `repos/<name>/` 并列。

## Projection

`generic projection` 是内部机制，不是独立产品名。

`generic projection` 只处理通用 projection shape：marker parsing、file copy、block marker 和 drift comparison。

Partita-specific routing、skill family handle、Codex plugin metadata 和 install policy 仍由 `src/partita/` 负责。

`wiki/` 根目录不再存在；wiki source 位于 `packages/wiki/`。

## Install

Partita 的 local install 会先把 `./skills` 同步到 global skills，再把本 repo 映射到 personal Codex plugin marketplace：

```bash
pnpm install:codex-skill
pnpm install:codex-plugin
```

安装后需要打开新的 Codex thread，让 global skills 重新加载。

local marketplace 会把 `~/plugins/partita` 映射回本 repo，因此 source edits 仍保留在同一处。

只运行 global sync 时使用：

```bash
pnpm install:codex-skill
```

`pnpm install:codex-plugin` 映射 local plugin marketplace entry。

Codex global skill installation 是 flat 的：`npx skills add ./skills --full-depth` 会发现 nested source skills，但会按 `name` frontmatter 安装。

例如，`skills/primitive/notate/SKILL.md` 安装为 global skill `notate`。source family 仍是 `primitive`，Partita dispatcher handle 仍是 `pm:notate`。

`skills/orientation/argue/SKILL.md` 安装为 `argue`，投影为 `og:argue`。

`skills/maintenance/reconcile/SKILL.md` 安装为 `reconcile`，投影为 `mt:reconcile`。

`skills/expression/density/SKILL.md` 安装为 `density`，投影为 `ex:density`。

`skills/link/pin/SKILL.md` 安装为 `pin`，投影为 `lk:pin`。

`skills/` 是 skill source input。它后续可以被拆成独立 skill 族再 pin 回
Partita；dispatcher 仍由 Partita harness 生成在 `harness/skills/dispatcher.md`。

## Skill

只有在用户明确 skill behavior 后，才能新增 skill。

写新 skill 前读取 `packages/wiki/practice/create.md`。

创建 internal primitive skill 使用 `pm:notate`。

创建 public workflow skill 使用 `pm:conduct`。

从真实 case patch 已存在且 identity 成立的 skill 时，才使用 `pm:retune`。

当前 `SKILL.md` body shape 定义在 `packages/wiki/projection/codex/skill-md.md`。

minimum shape：

```text
skills/<name>/SKILL.md
skills/<name>/agents/openai.yaml
skills/<name>/{scripts,references,assets}/...
skills/expression/<name>/SKILL.md
skills/expression/<name>/agents/openai.yaml
skills/expression/<name>/{scripts,references,assets}/...
skills/link/<name>/SKILL.md
skills/link/<name>/agents/openai.yaml
skills/link/<name>/{scripts,references,assets}/...
skills/orientation/<name>/SKILL.md
skills/orientation/<name>/agents/openai.yaml
skills/orientation/<name>/{scripts,references,assets}/...
skills/maintenance/<name>/SKILL.md
skills/maintenance/<name>/agents/openai.yaml
skills/maintenance/<name>/{scripts,references,assets}/...
skills/primitive/<name>/SKILL.md
skills/primitive/<name>/agents/openai.yaml
skills/primitive/<name>/{scripts,references,assets}/...
```

每个 Partita skill MUST 有 `agents/openai.yaml`，因为它会把 skill 的 invocation policy 投影到 runtime metadata。

`scripts/`、`references/` 和 `assets/` 是 optional official bundled resource directories。

required frontmatter：

```yaml
---
name: <name>
description: "Use when ... Not for ..."
---
```

`description` 是 Codex selector surface：保持 40-500 characters，以 `Use when` 或 `Use for` 开头，并包含 `Not for`。

Partita 从 `SKILL.md` frontmatter 只读取 `name` 和 `description`。

official optional frontmatter keys 是 `license`、`allowed-tools` 和 `metadata`。

Codex-specific UI、`policy.allow_implicit_invocation` 和 tool dependencies 放在 `agents/openai.yaml`。

`policy.allow_implicit_invocation` MUST 位于 `policy` block 下。

`partita` 是 product 和 plugin name，不是 skill prefix。

source namespaces 只投影 dispatcher handles；frontmatter 和 global installed skills 保持 short skill name。

`expression` 投影为 `ex:<name>`。

`link` 投影为 `lk:<name>`。

`orientation` 投影为 `og:<name>`。

`maintenance` 投影为 `mt:<name>`。

`primitive` 投影为 `pm:<name>`。

`harness/skills/dispatcher.md` 从 `skills/` source `SKILL.md` frontmatter 和 `agents/openai.yaml` 生成。

routing table 投影 `Handle`、`Name`、`Invocation`、`Description` 和 `File`。

新增或修改 skill 后运行：

```bash
pnpm generate
pnpm verify
```

`pnpm verify` 包含本 repo 的 Effect harness verification；这是 hard script check，不是 prose-only boundary。

## Acknowledgement

早期探索参考了 [Waza](https://github.com/tw93/Waza)，其由 Tw93 以 MIT License 发布。

Partita 不 ship Waza 的 skill taxonomy 或 skill contents。
