## Summary

- [ ] Philosophy gate (Creation / Minimalism / live catalog — no hard-coded action counts)
- [ ] `audit-cursor-plugin.mjs` green (add `--strict-screenshots` for release)
- [ ] `sync-plugin-kernel.mjs --check` green
- [ ] CHANGELOG section matches `plugins/agentstack/.cursor-plugin/plugin.json` version
- [ ] No `mcpServers` in `plugin.json` (0.4.16+)
- [ ] Skills: one domain each; router row updated if new skill

## Test plan

- [ ] `node scripts/validate-plugin.mjs`
- [ ] `node scripts/test-hooks-contract.mjs`
- [ ] `node scripts/run-intent-eval.mjs`
- [ ] `node scripts/verify-mcp-surface-e2e.mjs` when MCP / auth touched
- [ ] Local symlink smoke (`scripts/smoke-local.mjs` or `smoke-local.ps1`) when hooks/auth touched
