# Marketplace ship — detailed task list (0.4.14)

**Gene:** `repo.plugins.cursor.gen3` · `repo.plugins.publication_gates.gen1`  
**Status legend:** `[x]` done in tree · `[ ]` human / credentials · `[~]` optional polish

---

## A. Copy & marketplace form

- [x] Ready-to-paste **Description** + short/tagline in [`SUBMIT_FORM.md`](SUBMIT_FORM.md)
- [x] Align `listing.json` description (no monorepo-only paths)
- [x] Link from README + `docs/plugins/CURSOR_MARKETPLACE_SUBMIT_NOW.md` (monorepo)
- [ ] Open https://cursor.com/marketplace/publish and paste fields from `SUBMIT_FORM.md`
- [ ] Upload screenshots `assets/screenshots/01`–`05` (alts in that folder’s README)
- [ ] Confirm category / keywords / privacy / terms / support / freemium pricing on the form

**Description rule:** live catalog wording inside the plugin tree; numeric marketing shorthand only from monorepo `docs/plugins/PUBLISHER_COPY.md` into the **web form**, if Cursor insists on a number.

---

## B. Call / data flow (verified in code + automated smoke)

| Step | Contract | Status |
|------|----------|--------|
| Device Code authorize | `POST /api/oauth2/device/authorize` | [x] `device-code.mjs` |
| Token poll | HTTP **400** + `authorization_pending` → continue | [x] `deviceCodeClient.postForm` / `pollDeviceToken` |
| Write MCP Bearer | flat `mcpServers.agentstack` via `applyAgentstackMcpBearer` | [x] no stray `tools` key |
| Catalog snapshot | `GET /mcp/actions` → **flat** `actions[]` | [x] `flattenMcpActionsCatalog` |
| Cap hint hook | `beforeMCPExecution` reads flat snapshot | [x] `pre-mcp-cap-check.mjs` |
| Session refresh | refresh token + catalog age | [x] `session-start.mjs` |
| Telemetry | buffer only if opt-in | [x] post-tool hooks |
| `--help` | exit 0, no OAuth | [x] smoke |
| Local install | junction/symlink `~/.cursor/plugins/local/agentstack` | [x] `install-local.mjs --check` |
| Standalone validate CI | local `stale-actions` + matrix (no monorepo `../../scripts`) | [x] |

**Human e2e still required:**

- [ ] Reload Cursor after local install
- [ ] `/agentstack-init` → approve `/activate` → Bearer in `~/.cursor/mcp.json`
- [ ] `whoami` / discovery / `/agentstack-capability-matrix`
- [ ] Optional `/agentstack-host-site` → live `/s/` URL
- [ ] Tick [`VERIFICATION_CHECKLIST.md`](VERIFICATION_CHECKLIST.md)

---

## C. Gates & publish repo

- [x] `validate-plugin` / hooks contract / kernel catalog tests (re-run before push)
- [x] Schema-valid `plugin.json`, version **0.4.14**, vendored `lib/plugin-kernel`
- [x] Vendored `scripts/lib/stale-actions.mjs` + `docs/CAPABILITY_MATRIX.md` for GitHub Actions
- [x] CI workflow: validate + hooks + intent-eval + device-code `--help` + kernel catalog (no `|| true`)
- [ ] `git push origin master` + `git push origin v0.4.14` with **agentstacktech** credentials
- [ ] Or: `node provided_plugins/scripts/sync-cursor-plugin-publish.mjs ../cursor-plugin-publish` then push sibling

**Maintainer sync (monorepo):**

```bash
node provided_plugins/scripts/sync-plugin-kernel.mjs          # kernel + stale-actions + matrix
node provided_plugins/scripts/sync-plugin-kernel.mjs --check
node provided_plugins/scripts/audit-cursor-plugin.mjs --strict-screenshots
```

---

## D. After Cursor approval

- [ ] [`docs/plugins/CURSOR_PLUGIN_POST_RELEASE_CHECKLIST.md`](../../docs/plugins/CURSOR_PLUGIN_POST_RELEASE_CHECKLIST.md)
- [ ] Update post-release status doc
- [ ] Announce / listing URL when live

---

## E. Optional polish (not blocking submit)

- [~] Replace mock screenshots with live Cursor captures
- [~] Commit monorepo-side `docs/plugins/*` / `provided_plugins/scripts/*` if umbrella git exists
- [~] Gen3.1 backlog items from audit (non-P0)

---

## Quick commands

```bash
cd provided_plugins/cursor-plugin
node scripts/install-local.mjs --check
node scripts/smoke-local.mjs
node scripts/validate-plugin.mjs --strict-screenshots
```
