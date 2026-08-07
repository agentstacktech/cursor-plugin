# Plugin structure validation

This plugin follows [Cursor plugin building docs](https://cursor.com/docs/plugins/building).

Layout: repo root `.cursor-plugin/marketplace.json` + package under `plugins/agentstack/` (Cursor 2.6+).

## Checklist

- [x] `plugins/agentstack/.cursor-plugin/plugin.json` Cursor-schema-valid (**no** `$schema` — Cursor rejects external schema URLs)
- [x] `name` kebab-case: `agentstack`
- [x] **no** `mcpServers` in `plugin.json` (0.4.16+ — MCP via `~/.cursor/mcp.json` only)
- [x] Repo `.cursor-plugin/listing.json` AgentStack publisher SoT
- [x] Repo `.cursor-plugin/marketplace.json` with `pluginRoot: plugins`, `source: agentstack`
- [x] Package `skills/`, `rules/`, `commands/`, `agents/`, `hooks/`
- [x] `lib/plugin-kernel/` self-contained Device Code + MCP helpers
- [x] `README.md`, `CHANGELOG.md`, `LICENSE`

## Automated validation

```bash
# From provided_plugins/cursor-plugin/
node scripts/validate-plugin.mjs
node scripts/validate-plugin.mjs --strict-screenshots
node scripts/test-hooks-contract.mjs
node scripts/ci-validate.mjs
```

GitHub Actions runs `node scripts/ci-validate.mjs` (single checkout action; re-run if GitHub reports "Service Unavailable" on action download).

From monorepo: `node provided_plugins/scripts/audit-cursor-plugin.mjs --strict-screenshots`

See [VERIFICATION_CHECKLIST.md](../VERIFICATION_CHECKLIST.md) and [MARKETPLACE_DEMO.md](../MARKETPLACE_DEMO.md).
