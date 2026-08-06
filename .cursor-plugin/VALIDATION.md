# Plugin structure validation

This plugin follows [Cursor plugin building docs](https://cursor.com/docs/plugins/building).

## Checklist

- [x] `.cursor-plugin/plugin.json` Cursor-schema-valid (no `$schema` field — Cursor rejects external schema URLs)
- [x] `name` kebab-case: `agentstack`
- [x] `.cursor-plugin/listing.json` AgentStack publisher SoT
- [x] `skills/`, `rules/`, `commands/`, `agents/`, `hooks/`
- [x] `lib/plugin-kernel/` self-contained Device Code
- [x] `README.md`, `CHANGELOG.md`, `LICENSE`

## Automated validation

```bash
node scripts/validate-plugin.mjs
node scripts/validate-plugin.mjs --strict-screenshots
node scripts/test-hooks-contract.mjs
```

From monorepo: `node provided_plugins/scripts/audit-cursor-plugin.mjs --strict-screenshots`

See [VERIFICATION_CHECKLIST.md](../VERIFICATION_CHECKLIST.md) and [MARKETPLACE_DEMO.md](../MARKETPLACE_DEMO.md).
