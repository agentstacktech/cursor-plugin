# Marketplace / local ship — detailed task list (0.4.14)

**Gene:** `repo.plugins.cursor.gen3` · `repo.plugins.publication_gates.gen1`  
**Status:** `[x]` done · `[ ]` human · `[~]` optional

---

## A. Install layout

- [x] `.cursor-plugin/marketplace.json` + `plugins/agentstack/` (Cursor 2.6+)
- [x] Local junction → `plugins/agentstack` (`install-local.mjs`)
- [x] Local link verified OK on this machine
- [ ] Reload Window after latest hook/mcpConfig changes

---

## B. Call / data flow (verified)

| Step | Contract | Status |
|------|----------|--------|
| Marketplace → package | `pluginRoot=plugins` / `source=agentstack` | [x] |
| Local package load | `~/.cursor/plugins/local/agentstack` → SoT | [x] |
| Device Code | authorize → poll 400+pending → tokens | [x] code |
| MCP write | lean `streamable-http` + Bearer (strips `tools`, drops API key on OAuth) | [x] |
| MCP normalize | `--fix` / sessionStart strips non-lean keys | [x] |
| Snapshot | flat `actions[]` from `GET /mcp/actions` | [x] seeded via API key |
| Cap hint | `beforeMCPExecution` reads flat snapshot | [x] |
| Session start | auth via Bearer **or** X-API-Key for catalog; Bearer refresh only | [x] |

**This machine (diagnose):**

- [x] Plugin linked
- [x] mcp lean after `--fix`
- [x] Snapshot flat (live catalog via `--seed-snapshot`)
- [ ] Auth still **X-API-Key** — run `/agentstack-init` for Device Code + refresh file
- [ ] `/agentstack-diagnose` + `/agentstack-capability-matrix` in Cursor

---

## C. Commands for Lance (now)

```bash
cd provided_plugins/cursor-plugin
node scripts/diagnose-local.mjs              # status
node scripts/diagnose-local.mjs --fix        # lean mcp.json
node scripts/diagnose-local.mjs --seed-snapshot
```

In Cursor after Reload:

1. `/agentstack-init` (upgrade to Device Code)
2. `/agentstack-diagnose`
3. `/agentstack-capability-matrix`
4. Optional `/agentstack-host-site`

Form paste: [`SUBMIT_FORM.md`](SUBMIT_FORM.md)

---

## D. Publish

- [ ] `git push origin master` + `v0.4.14` (`agentstacktech`)
- [ ] https://cursor.com/marketplace/publish
- [ ] Post-release checklist (monorepo)

---

## E. Optional

- [~] Live screenshots replace mocks
- [~] Prefer Device Code over long-lived API key in local mcp.json
