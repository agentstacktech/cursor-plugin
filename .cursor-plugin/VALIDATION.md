# Plugin structure validation

This plugin follows [Cursor plugin building docs](https://cursor.com/docs/plugins/building).

## Checklist

- [x] `.cursor-plugin/plugin.json` with required fields: `name`, `displayName`, `author`, `description`, `keywords`, `license`, `version`
- [x] `name` is lowercase kebab-case: `agentstack`
- [x] `skills/` directory with SKILL.md files (per skill); each skill may optionally include `reference.md` or `examples.md` (one level deep, per the [Cursor plugin building docs](https://cursor.com/docs/plugins/building))
- [x] `rules/` directory with `.mdc` rule files
- [x] MCP configuration reference (see `mcp.json` or README)
- [x] `README.md`, `CHANGELOG.md`, `LICENSE` at repo root

## Automated validation

From the plugin root:

```bash
node scripts/validate-plugin.mjs
```

Checks: required files and dirs, `plugin.json` (kebab-case name, semver version), `mcp.json` (valid JSON, `mcpServers.agentstack`, placeholder API key), skills with SKILL.md and frontmatter, rules with .mdc files. Exit 0 = success.

Optional MCP endpoint smoke test (PowerShell):

```powershell
.\scripts\test-mcp-endpoint.ps1
# Or with API key: .\scripts\test-mcp-endpoint.ps1 -ApiKey "your-key"
```

See [VERIFICATION_CHECKLIST.md](../VERIFICATION_CHECKLIST.md) for full verification and testing steps.

## Optional (template)

If using the official [cursor/plugin-template](https://github.com/cursor/plugin-template), run `node scripts/validate-template.mjs` from the template repo. This repo is standalone and does not depend on the template.
