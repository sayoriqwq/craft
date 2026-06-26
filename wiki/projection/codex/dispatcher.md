# Dispatcher

`skills/DISPATCHER.md` is the generated routing projection.

Its generation input is direct or namespaced `SKILL.md` frontmatter under
`skills/` plus `agents/openai.yaml` invocation policy. Skill semantics remain in
the wiki-guided skill files; the dispatcher only exposes routing metadata.

The dispatcher table columns are:

```text
Handle | Name | Invocation | Description | File
```

`Invocation` projects `policy.allow_implicit_invocation` as `true` or `false`.

The `primitive` source namespace projects to `pm:<name>` handles.

Installed Codex skills stay flat by frontmatter name. Dispatcher handles keep
Partita's source-family semantics without requiring nested global install
paths.

See [[projection/codex/projection-marker]].
