# Marketplace ship — detailed task list (0.4.14)

**Gene:** `repo.plugins.cursor.gen3` · `repo.plugins.publication_gates.gen1`  
**Status legend:** `[x]` done in tree · `[ ]` human / credentials · `[~]` optional polish

---

## A. Cursor install layout (P0 — marketplace.json)

- [x] Restore schema-valid `.cursor-plugin/marketplace.json` (`pluginRoot: plugins`, `source: agentstack`)
- [x] Nest runtime under `plugins/agentstack/` (Cursor 2.6+ — bare source, not `.`)
- [x] Keep `.cursor-plugin/listing.json` as AgentStack publisher SoT (screenshots/support)
- [x] Point local install / validators / CI at nested package
- [ ] Reload Cursor → **Add marketplace** from `https://github.com/agentstacktech/cursor-plugin` **or** re-run `node scripts/install-local.mjs --force`
- [ ] Confirm plugin appears (rules/skills/commands)

---

## B. Copy & marketplace form

- [x] Ready-to-paste **Description** in [`SUBMIT_FORM.md`](SUBMIT_FORM.md)
- [ ] Submit at https://cursor.com/marketplace/publish (paste SUBMIT_FORM; attach screenshots under `plugins/agentstack/assets/screenshots/`)

---

## C. Call / data flow

| Step | Contract | Status |
|------|----------|--------|
| Marketplace resolve | `marketplace.json` → `plugins/agentstack/.cursor-plugin/plugin.json` | [x] |
| Device Code authorize | `POST /api/oauth2/device/authorize` | [x] |
| Token poll | HTTP **400** + `authorization_pending` → continue | [x] |
| Write MCP Bearer | `applyAgentstackMcpBearer` | [x] |
| Catalog snapshot | flat `actions[]` | [x] |
| Cap hint | `beforeMCPExecution` | [x] |
| Local install | junction → `plugins/agentstack` | [x] scripts |

**Human e2e:**

- [ ] `/agentstack-init` → approve `/activate`
- [ ] `whoami` / `/agentstack-capability-matrix`
- [ ] Tick [`VERIFICATION_CHECKLIST.md`](VERIFICATION_CHECKLIST.md)

---

## D. Gates & push

- [x] `validate-plugin --strict-screenshots` / hooks / kernel (re-run after layout change)
- [ ] `git push origin master` + `git push origin v0.4.14` (`agentstacktech` auth)

```bash
node provided_plugins/scripts/sync-plugin-kernel.mjs --check
cd provided_plugins/cursor-plugin && node scripts/smoke-local.mjs --install
```

---

## E. After approval

- [ ] Post-release checklist (monorepo `docs/plugins/CURSOR_PLUGIN_POST_RELEASE_CHECKLIST.md`)
