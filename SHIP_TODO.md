# Marketplace / local ship — detailed task list (0.4.16)

**Gene:** `repo.plugins.cursor.gen3` · `repo.plugins.publication_gates.gen1`  
**Status:** `[x]` done · `[ ]` human · `[~]` optional

---

## A. Layer inventory (skills / rules / commands / hooks)

| Layer | Count | Gate | Status |
|-------|------:|------|--------|
| Skills | 24 | frontmatter + live catalog pointer | [x] `audit-layers.mjs` |
| Rules | 9 | exactly 1 `alwaysApply` (prefer) | [x] |
| Commands | 13 | name/description + init/login/diagnose | [x] |
| Agents | 3 | name/description; no oncall/fleet-operator | [x] |
| Maintainer overlay | 2 agents | `cursor-plugin-maintainer/` — LOCAL_INSTALL only | [x] |
| Hooks | 7 events | scripts resolve under package | [x] |
| Device Code | 1 script | not a hook event; install path | [x] |

- [x] Fix backend skill: no `docs/MCP_CAPABILITY_MATRIX.md` (use live `GET /mcp/actions`)
- [x] login command: resolve plugin root before `device-code.mjs`
- [x] capability-refresh: shared `agentstackAuthHeaders` (Bearer or API key)
- [x] CI + smoke run `audit-layers.mjs`
- [x] Remove `$schema` from manifests (Cursor load blocker)
- [x] Add `variables` for `${AGENTSTACK_ACCESS_TOKEN}`
- [x] Fix `agentstack-guidance` skill frontmatter + tenant paths
- [x] `refresh-cursor-runtime.mjs` — purge/sync stale marketplace cache (root cause of lingering `$schema` UI error)

---

## B. Call / data flow

| Step | Contract | Status |
|------|----------|--------|
| Marketplace → package | `pluginRoot=plugins` / `source=agentstack` | [x] |
| Local link | `~/.cursor/plugins/local/agentstack` | [x] |
| Marketplace cache | `~/.cursor/plugins/cache|marketplaces` must match SoT (no `$schema`) | [x] `refresh-cursor-runtime` |
| Device Code | authorize → poll pending → tokens | [x] |
| MCP lean write | no `tools` key; Bearer or API key | [x] |
| Snapshot | flat `actions[]` | [x] |
| beforeMCPExecution | cap hint from snapshot | [x] |
| sessionStart | normalize + seed catalog | [x] |
| afterFileEdit mcp.json | cache clear + snapshot | [x] |
| Telemetry | opt-in only | [x] |
| Plugin variables | `${AGENTSTACK_ACCESS_TOKEN}` ↔ Configure UI | [x] |

---

## F. MCP dedupe 0.4.16 (`P0-MCP-DEDUPE-0416`)

| GAP | Item | Status |
|-----|------|--------|
| GAP-01 | Core `tools/list` → 1 tool `agentstack.execute` | [x] |
| GAP-02 | No `mcpServers` in `plugin.json` | [x] |
| GAP-03 | `codegen-plugin-versions` correct path | [x] |
| GAP-07 | Health `mcp_surface_tools` field | [x] |
| GAP-08 | Lean MCP snippets (frontend/docs) | [x] |
| GAP-15 | `refresh-cursor-runtime` stale `mcpServers` cache | [x] |

---

## C. Human e2e (this machine)

```bash
cd provided_plugins/cursor-plugin
node scripts/refresh-cursor-runtime.mjs --fix
node scripts/diagnose-local.mjs
node scripts/audit-layers.mjs
node scripts/smoke-local.mjs
```

In Cursor after **Reload Window**:

- [ ] Plugin loads without "$schema version" error (version 0.4.16)
- [ ] `/agentstack-init` (upgrade X-API-Key → Device Code)
- [ ] `/agentstack-diagnose`
- [ ] `/agentstack-capability-matrix`
- [ ] Spot-check one skill route (e.g. hosting or auth)

Form: [`SUBMIT_FORM.md`](SUBMIT_FORM.md)

---

## D. Publish

- [ ] `git push origin master` + `v0.4.16`
- [ ] https://cursor.com/marketplace/publish
- [ ] Post-release checklist

---

## E. Optional

- [~] Live screenshots
- [~] Explicit `alwaysApply: false` on all non-T0 rules (cosmetic)
