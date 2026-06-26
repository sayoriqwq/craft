---
audience: agent
authors:
  - codex
reviewed_by: []
purpose: 说明 Partita managed projection marker 的 V1 语法和检查边界。
updated: 2026-06-27
---

# Projection Marker

## 核心规则

managed projection MUST 使用 `partita:projection` HTML comment marker。

V1 支持两类 projection：

- `block-table`: target 文件中的 marker block 由 generator 管理。
- `copy`: target 整个文件由 generator 从 source copy。

## Block Projection

```md
<!-- partita:projection:start id="routing-table" source="skills" mode="block-table" -->
<!-- partita:projection:end id="routing-table" -->
```

`block-table` 用于 `skills/DISPATCHER.md` routing table。

## File Projection

```md
<!-- partita:projection:file source="wiki/skill/case/insufficient-material.md" mode="copy" -->
```

`copy` 用于把 wiki 真源投影到 skill-local `references/`。

target content MUST 等于：

```text
projection header
blank line
source file content
```

## 真源边界

- wiki source 是共享内容唯一真源。
- projected reference 是 runtime-local generated copy。
- projected reference MUST NOT 包含 local edits。
- 需要 skill-local 差异时，MUST 新增非投影 reference，或拆出更小 wiki source。

## 检查

- `pnpm generate` MUST 更新 projection target。
- `pnpm generate:check` MUST 检查 projection drift。
- `pnpm verify` MUST 检查 marker syntax、source existence、mode support 和 file-copy drift。
