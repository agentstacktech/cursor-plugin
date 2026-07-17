# Contributing (AgentStack Cursor plugin)

**SoT:** edit in the AgentStack monorepo at `provided_plugins/cursor-plugin/`, then sync to this public repo.

```bash
# From AgentStack workspace root
node provided_plugins/scripts/sync-plugin-kernel.mjs
node provided_plugins/scripts/audit-cursor-plugin.mjs --strict-screenshots
node provided_plugins/scripts/sync-cursor-plugin-publish.mjs ../cursor-plugin-publish
```

Do **not** invent a second MCP server or hard-code action counts in skills (see `docs/plugins/CANONICAL_COPY.md` in the monorepo).

Philosophy gate: Creation over Conflict, Elegant Minimalism, live catalog only — `docs/plugins/AGENTSTACK_PLUGIN_PHILOSOPHY.md`.

Gene: `repo.plugins.cursor.gen3` · `repo.plugins.publication_gates.gen1`
