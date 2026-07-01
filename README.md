# Partita

`partita` 是 CLI-backed Codex skill harness，用来维护 sayori 自己创建或 maintain 的 skills workspace、workflow skills 和治理机制。

Partita 当前目标是 personal skill workflow/source harness。

Partita 不 owns user-home dotfile materialization、global runtime skill universe、provider runtime、external skill collections、target-repo runtime copies 或 one-off workflow history。

## State

- `skills/` 是 self-owned skill source input。
- `src/partita/` 负责 Partita-specific generation、verification、source pin、skills.sh install wrapper 和 chezmoi home adapter。
- `harness/skills/dispatcher.md` 是 generated source inventory 和 projection audit artifact。
- `packages/generic-projection/` 是 repo-internal generic projection helper。
- `tests/` 承载 executable behavior checks。
- 旧 wiki、runtime references、plugin runtime metadata 和 harness reference docs 已迁出到 `/Users/sayori/Desktop/partita-ref`。

## Map

- `bin/partita.ts` 是 TypeScript/Effect CLI entrypoint。
- `src/cli/Main.ts` 定义 CLI command surface。
- `src/partita/generator.ts` 生成 package metadata、dispatcher audit 和 valid file-copy projections。
- `src/partita/verifier.ts` 校验 Partita source shape，并阻止迁出 surfaces 回流。
- `src/partita/source-entry.ts` 管理 GitHub git-subtree source pins。
- `src/partita/install.ts` 是 skills.sh CLI 的 thin wrapper。
- `src/partita/home.ts` 是 chezmoi CLI 的 thin wrapper。
- `harness/skills/dispatcher.md` 从 `skills/` source `SKILL.md` frontmatter 和 `agents/openai.yaml` 生成。
- `MIGRATION.md` 记录迁移目标、架构图和 ownership table。

## Commands

```bash
pnpm generate
pnpm generate:check
pnpm verify
pnpm install:codex-skill
pnpm home:status
pnpm home:diff
```

## Loop

Partita 不直接写 global runtime skill universe。

Codex global skill installation 由 skills.sh CLI 负责。Partita 的 install wrapper 只调用 skills.sh CLI，把 `./skills` 同步到 flat global skills：

```bash
pnpm install:codex-skill
```

用户目录里的唯一 global runtime copy 是 `~/.agents/skills/<name>`。

不要同时把 Partita 安装进 personal Codex plugin marketplace；plugin cache 会生成 `partita:<skill>` 副本，和 flat global skill 形成双入口。

chezmoi 负责 user-home mapping 和 dotfile materialization。

Partita 的 home adapter 只调用 chezmoi，不直接编辑用户目录：

```bash
pnpm home:status
pnpm home:diff
partita home apply --write
```

`partita home diff` 运行非写入的 `chezmoi diff`。只有显式传入 `--write` 时，`partita home apply` 才运行 `chezmoi apply`。

## Source Pins

`partita source` 只支持 GitHub repository + git subtree source pin。

默认 contract path 是 subtree prefix 的 sibling 文件。

例如：

```bash
partita source plan --name effect --prefix repos/effect --repository https://github.com/Effect-TS/effect --branch main
```

默认读取或生成：

```text
repos/effect.subtree.json
```

`repos/<name>/` 是 read-only external source materialization，不是 Partita-owned skill source。

## Dispatcher

`harness/skills/dispatcher.md` 是 generated source inventory 和 projection audit artifact。

dispatcher 不决定 Codex runtime 加载哪些 skills。

dispatcher 不承担 runtime governance、installer state、mapping layer 或 durable knowledge layer。

## Skill

只有在用户明确 skill behavior 后，才能新增 skill。

创建或修改 skill 时，直接维护 skill-local source 和 references，不再依赖 `packages/wiki/`。

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

`description` 是 Codex selector surface：保持 40-500 characters，以 `Use when` 或 `Use for` 开头，并包含 `Not for`。

Partita 从 `SKILL.md` frontmatter 只读取 `name` 和 `description`。

`policy.allow_implicit_invocation` MUST 位于 `agents/openai.yaml` 的 `policy` block 下。

source namespaces 只投影 dispatcher handles；frontmatter 和 global installed skills 保持 short skill name。

| Source namespace | Dispatcher handle |
| --- | --- |
| `expression` | `ex:<name>` |
| `link` | `lk:<name>` |
| `maintenance` | `mt:<name>` |
| `orientation` | `og:<name>` |
| `primitive` | `pm:<name>` |

新增或修改 skill 后运行：

```bash
pnpm generate
pnpm verify
```

## Acknowledgement

早期探索参考了 [Waza](https://github.com/tw93/Waza)，其由 Tw93 以 MIT License 发布。

Partita 不 ship Waza 的 skill taxonomy 或 skill contents。
