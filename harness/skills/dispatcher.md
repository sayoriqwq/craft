# Dispatcher

Dispatcher 是 Partita harness 从当前 `skills/` source 生成的 routing index。

它不是 skill content，不放在 `skills/` 目录，也不定义 portable skill。只根据 routing table 中实际存在的 skill 进行匹配。

## Routing Table

<!-- partita:projection:start id="routing-table" source="skills" mode="block-table" -->
| Handle | Name | Invocation | Description | File |
|--------|------|------------|-------------|------|
| ex:density | density | false | Use when the user explicitly invokes density or asks for sustained controlled high-density Chinese with stable symbol vocabulary, terse collaboration, semantic invariance, and low filler. Not for one-off summarization, code minification, classical Chinese, ordinary prose editing, hiding uncertainty, or compressing safety-critical meaning. | `skills/expression/density/SKILL.md` |
| lk:pin | pin | false | Use when the user explicitly asks to pin a GitHub repository into the current project as a git-subtree source prefix with sibling subtree contract, anchor, route, editor policy, update path, verify path, and import block. Not for non-GitHub sources, non-subtree mechanisms, temporary clones, web fetches, node_modules lookup, package-version pins, or UI/thread pinning. | `skills/link/pin/SKILL.md` |
| mt:reconcile | reconcile | false | Use when a completed and verified task phase may still contain garbage state, residue, obsolete surfaces, stale dependencies, or stale authority that could mislead future agents. Audits before cleanup. Not for ordinary formatting, code review, bug finding, CI repair, or unapproved deletion. | `skills/maintenance/reconcile/SKILL.md` |
| og:aim | aim | false | Use when the user explicitly asks to set, reset, sustain, or check the current conversation aim or asks for visible alignment against a current direction. Not for formal goals, task planning, decision making, baseline snapshots, ordinary summaries, or implicit drift policing. | `skills/orientation/aim/SKILL.md` |
| og:argue | argue | false | Use when the user explicitly asks to argue, challenge, or pressure-test an unstable assertion under the current aim before treating it as a premise. Not for ordinary implementation, code review, blank-page brainstorming, expanding a vague seed, recording consensus, settled decisions, harmless preferences, or adversarial debate. | `skills/orientation/argue/SKILL.md` |
| og:baseline | baseline | false | Use when the user explicitly asks to record, capture, or summarize the accepted consensus since the current conversation aim began. Not for setting aims, maintaining direction, unresolved questions, decision making, meeting notes, durable documentation, or ordinary summaries. | `skills/orientation/baseline/SKILL.md` |
| og:land | land | false | Use when the user wants to keep a first version or current topic from expanding before it is landed, especially after they name a v1 landing topic. Blocks scope expansion and asks whether the new point is necessary for v1 or off-topic. Not for open brainstorming, later-version planning, ordinary aim drift warnings, or when no landing topic exists yet. | `skills/orientation/land/SKILL.md` |
| pm:conduct | conduct | false | Use when creating a public workflow skill from a real workflow case with gate logic, internal skill routing, disclosure boundary, and target runtime shape. Defaults to OpenAI/Codex skill target; in Partita landing creates a public workflow source skill. Not for case-rooted non-workflow skill creation, patching existing skills, running workflows, abstract workflow wishes, or verifier implementation. | `skills/primitive/conduct/SKILL.md` |
| pm:notate | notate | false | Use when creating a case-rooted OpenAI/Codex skill from a real case with enough material for default failure, pressure, governance action, and target runtime shape. In Partita landing, creates a Partita primitive source skill. Not for public workflow skill creation, patching existing skills, abstract capability requests, hypothetical scenarios, or verifier implementation. | `skills/primitive/notate/SKILL.md` |
| pm:retune | retune | false | Use when patching an existing identity-valid OpenAI/Codex skill from a real recurrence case that exposes a stale local surface. In Partita landing, patches an existing valid Partita source skill. Not for creating new skills, structure audits without a patch case, identity-invalid skills, external skill migration, ordinary code review, or prose cleanup. | `skills/primitive/retune/SKILL.md` |
| pm:score | score | true | Use when creating or modifying Markdown docs that should follow sayoriqwq-style Markdown writing preferences. Not for non-Markdown prose, product copy, release notes, social posts, translation, localization, code comments, commit messages, skill creation, workflow creation, or skill patching. | `skills/primitive/score/SKILL.md` |
<!-- partita:projection:end id="routing-table" -->

## 运行方式

1. 读取用户消息。
2. 如果 routing table 有匹配 skill，读取该 skill file。
3. 如果没有匹配 skill，执行普通 agent work，不要发明 skill。

skills 只手动串联，不自动链式触发。
