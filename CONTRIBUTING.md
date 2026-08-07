# Contributing (AgentStack Cursor plugin)

**SoT:** edit in the AgentStack monorepo at `provided_plugins/cursor-plugin/`, then sync to the public publish checkout.

## Before every PR

```bash
# From this repo (or monorepo path provided_plugins/cursor-plugin/)
node scripts/validate-plugin.mjs
node scripts/test-hooks-contract.mjs
node scripts/smoke-local.mjs
```

From AgentStack workspace root:

```bash
node provided_plugins/scripts/sync-plugin-kernel.mjs
node provided_plugins/scripts/audit-cursor-plugin.mjs --strict-screenshots
node provided_plugins/scripts/sync-cursor-plugin-publish.mjs ../cursor-plugin-publish
```

## Rules of the road

1. **One MCP registration path** — never add `mcpServers` to `plugin.json`. Device Code writes `~/.cursor/mcp.json`.
2. **Live catalog only** — do not hard-code action counts in skills (see monorepo `docs/plugins/CANONICAL_COPY.md`).
3. **Bump together** — `plugins/agentstack/.cursor-plugin/plugin.json` version + `CHANGELOG.md`.
4. **Kernel changes** — edit `provided_plugins/shared/plugin-kernel/` then `sync-plugin-kernel.mjs` (do not hand-edit vendored files only).

Philosophy: Creation over Conflict, Elegant Minimalism — monorepo `docs/plugins/AGENTSTACK_PLUGIN_PHILOSOPHY.md`.

Genes: `repo.plugins.cursor.gen3` · `repo.plugins.publication_gates.gen1`
