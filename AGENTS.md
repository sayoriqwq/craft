# Agent Instructions

## Project

`partita` 是 CLI-backed Codex skill harness，用来维护 sayori 自己创建或 maintain 的 skills workspace、workflow skills 和治理机制。

Partita 的核心边界是 personal skill workflow/source harness。

Partita 不拥有 user-home dotfile materialization、global runtime skill universe、provider runtime、external skill collections、target-repo runtime copies 或 one-off workflow history。

## Core

本 repo owns：

- `skills/` 下的 self-owned skill source；
- `src/partita/` 下的 TypeScript/Effect CLI、generator、verifier、skills.sh install wrapper、chezmoi home adapter 和 source pin code；
- `tests/` 下的 executable behavior checks；
- `harness/skills/dispatcher.md` 下的 generated source inventory 和 projection audit artifact；
- `packages/generic-projection/` 下的 repo-internal generic projection helpers；
- root operating docs：`README.md`、`AGENTS.md` 和 `MIGRATION.md`。

本 repo 不 owns：

- `.codex-plugin/` plugin runtime metadata；
- `packages/wiki/` wiki layer；
- `runtime/references/` shared runtime reference layer；
- `harness/skills/{checks,family,policy,routing,shape}.md` old harness reference docs；
- `CONTEXT.md` 和 `HARNESS.md` wiki root maps；
- `CLAUDE.md` tool-specific projection；
- external skill collections 或其 taxonomies；
- external plugin marketplace metadata；
- project-specific commands、private local paths 或 one-off workflow history；
- `sayoriqwq/sayoriqwq` personal skills monorepo 路径。

迁出的参考材料位于 `/Users/sayori/Desktop/partita-ref`。

## Rules

- 除非用户显式定义 skill，否则 MUST NOT 新增 skill。
- `skills/` 是 self-owned skill source input。
- `skills/` 下的 Partita `SKILL.md` files 是 runtime-installable skill source，不是 wiki projection output。
- 外部 repos MUST 通过 `partita source` 的 GitHub git-subtree pin 进入 Partita。
- GitHub subtree pin contract MUST 使用 sibling path，例如 `repos/<name>.subtree.json`。
- `repos/<name>/` 是 read-only external source materialization，不是 Partita-owned skill source。
- dispatcher output 属于 `harness/skills/dispatcher.md`，不属于 `skills/`。
- dispatcher MUST remain generated source inventory 和 projection audit artifact。
- dispatcher MUST NOT become runtime governance、installer state、mapping layer 或 durable knowledge layer。
- `packages/generic-projection/` owns generic marker parsing、file-copy rendering、block marker constants 和 projection helper functions。
- `packages/generic-projection/` 不 owns Partita-specific routing、skill family handles、source pin policy 或 install behavior。
- root `wiki/` 和 `packages/wiki/` MUST NOT exist in this repo。
- `.codex-plugin/` MUST NOT exist in this repo。
- `runtime/references/` MUST NOT exist in this repo。
- executable setup、sync 和 verification mechanisms 属于 owning harness 或 CLI repo。
- Partita skills 可以调用这些 mechanisms，但 SHOULD NOT 用 prose 重新实现它们。
- global runtime skill mutation MUST 通过 skills.sh CLI；Partita 只能提供 thin wrapper，例如 `partita install codex-skill`。
- user-home materialization MUST 通过 chezmoi；Partita 只能提供 thin wrapper，例如 `partita home status`、`partita home diff` 和显式写入的 `partita home apply --write`。
- agent MUST NOT 直接编辑 `~/.agents/skills` 里的 installed runtime projection。
- zero skills MUST 保持为合法 framework state。
- 修改 skill names、trigger policy、harness install behavior、global skill state 或 marker conventions 前，如果用户指令有多种解读，MUST 使用 interpretation gate。

## Skills

新增 request-orientation skill 时，创建 `skills/orientation/<name>/SKILL.md` 和 `skills/orientation/<name>/agents/openai.yaml`，运行 `pnpm generate`，再运行 `pnpm verify`。

新增 expression protocol skill 时，创建 `skills/expression/<name>/SKILL.md` 和 `skills/expression/<name>/agents/openai.yaml`，运行 `pnpm generate`，再运行 `pnpm verify`。

新增 external authority link skill 时，创建 `skills/link/<name>/SKILL.md` 和 `skills/link/<name>/agents/openai.yaml`，运行 `pnpm generate`，再运行 `pnpm verify`。

新增 maintenance skill 时，创建 `skills/maintenance/<name>/SKILL.md` 和 `skills/maintenance/<name>/agents/openai.yaml`，运行 `pnpm generate`，再运行 `pnpm verify`。

新增 Partita-managed base skill 时，创建 `skills/primitive/<name>/SKILL.md` 和 `skills/primitive/<name>/agents/openai.yaml`，运行 `pnpm generate`，再运行 `pnpm verify`。

## Commands

```bash
pnpm generate
pnpm generate:check
pnpm verify
pnpm install:codex-skill
pnpm home:status
pnpm home:diff
```
