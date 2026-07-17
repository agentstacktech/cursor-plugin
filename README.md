# AgentStack Cursor Plugin

> Turn every Cursor agent into an AgentStack-native engineer. v0.4.14 (gen3) · one-click install.

---

## 30-second install

```bash
# In Cursor, open the chat and run:
/agentstack-init
```

The plugin prints a short code, opens a browser tab to `https://agentstack.tech/activate`, and — after you confirm — writes a scoped Bearer token straight into `~/.cursor/mcp.json`. No copy-pasting API keys.

Behind the scenes: OAuth 2.1 Device Authorization Grant (RFC 8628).

MCP tools/list advertises **`agentstack.execute`** and the Cursor-safe alias **`agentstack_execute`** (same JSON-RPC `tools/call` batch arguments). Use **`safe_action`** from `GET /mcp/actions` when a client forbids dots in action ids.

---

## Why AgentStack

Most AI tools generate backend code. AgentStack teaches the agent to **route intent to an existing platform action** first, and only write code when no action fits.


| You asked the agent for … | Without the plugin                                 | With the plugin                                 |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| User sign-in / sign-up    | Handwritten JWT code, sessions, bcrypt, edge cases | `auth.login` MCP action + session cookie        |
| Role-based access         | Custom middleware, roles table, joins              | `rbac.`* actions + `protected.`* 8DNA fields    |
| Persistent app data       | Prisma/Drizzle schema + migrations                 | 8DNA `project.data.*` with dot-notation keys    |
| Payments / subscriptions  | Stripe SDK integration from scratch                | `payments.*` + `buffs.*`                        |
| RAG / semantic search     | pgvector + embedding pipeline                      | `rag.*` (TurboQuant, hybrid search)             |
| Cron / webhooks / signals | New FastAPI routes, queue glue                     | `scheduler.*`, `webhooks.*`, `logic.*` triggers |


---

## 5-layer architecture

```
.cursor-plugin/marketplace.json  ← Cursor install index (required for Add marketplace)
.cursor-plugin/listing.json      ← AgentStack publisher SoT (screenshots/support)
plugins/agentstack/              ← plugin package (Cursor 2.6+ layout)
  .cursor-plugin/plugin.json     ← per-plugin manifest (v0.4.14)
  rules/ skills/ commands/ agents/ hooks/ mcp.json assets/ lib/
scripts/                         ← validate / smoke / install-local (repo tooling)
```

## Marketplace submit

Ready-to-paste form fields (especially **Description**): **[SUBMIT_FORM.md](SUBMIT_FORM.md)**.  
Demo script: [MARKETPLACE_DEMO.md](MARKETPLACE_DEMO.md). Local verify: [LOCAL_INSTALL.md](LOCAL_INSTALL.md). Ship checklist: [SHIP_TODO.md](SHIP_TODO.md).

## First 5 minutes

1. Symlink or install plugin → reload Cursor  
2. `/agentstack-init` (Node on PATH) → approve at `/activate`  
3. Confirm whoami + `discovery.list` / `/agentstack-capability-matrix`  
4. Optional: `/agentstack-host-site` for a live `/s/` URL  

Auth notes: primary path is Device Code writing Bearer into `~/.cursor/mcp.json`. Fallback: set env `AGENTSTACK_ACCESS_TOKEN` and point MCP config at it, or API key via `MCP_QUICKSTART.md`. Dark logo assets: `assets/logo-dark.svg` (README/marketing; not schema fields).

---

## Quick start commands


| Command                         | What it does                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `/agentstack-init`              | Device Code auth + attach project + inject Bearer. The canonical install flow. |
| `/agentstack-login`             | Re-auth or switch project via Device Code.                                     |
| `/agentstack-scaffold-auth`     | Generate minimal login/register UI on top of `auth.*`.                         |
| `/agentstack-scaffold-backend`  | Scaffold RBAC middleware, Buffs tier gates, AgentPay widget, admin panel.      |
| `/agentstack-sync-schema`       | Migrate Prisma/Drizzle to 8DNA + FAP + Logic Engine.                           |
| `/agentstack-index-docs`        | RAG-index the project's markdown/text docs into `my-project-docs` so the agent can ground answers in your own documentation. Source code stays local (Cursor already indexes it). |
| `/agentstack-capability-matrix` | Print the live domain × actions table from `/mcp/actions`.                     |
| `/agentstack-diagnose`          | Health check: token, discovery, project status, hooks.                         |


---

## Routing table the agent follows


| Intent signal                         | First port of call                     |
| ------------------------------------- | -------------------------------------- |
| login / register / sessions / OAuth   | `auth.*` MCP actions                   |
| permissions / roles / RLS-like checks | `rbac.*` + `protected.*` 8DNA          |
| store/read user or project data       | 8DNA `project.data.*` / `user.data.*`  |
| upload files, blobs, images           | `storage.*` MCP actions                |
| payments / subscriptions / credits    | `payments.*` + `wallets.*` + `buffs.*` |
| chat, channels, followers             | `social.*` MCP actions                 |
| trials / feature flags / tier gates   | `buffs.*`                              |
| semantic search / memory              | `rag.*`                                |
| async reactions on data changes       | `logic.*` rules + triggers             |


The full, always-up-to-date catalogue: `GET https://agentstack.tech/mcp/actions`, or run `/agentstack-capability-matrix` inside Cursor.

---

## Test locally (Cursor)

```bash
# From provided_plugins/cursor-plugin/
node scripts/install-local.mjs          # junction/symlink → ~/.cursor/plugins/local/agentstack
# Cursor → Developer: Reload Window
# Chat → /agentstack-init

node scripts/install-local.mjs --check
node scripts/smoke-local.mjs --install  # install + offline smoke
# or: pwsh scripts/smoke-local.ps1 -Install

node scripts/uninstall-local.mjs        # remove local link only
```

Full guide: [LOCAL_INSTALL.md](LOCAL_INSTALL.md) · data flow: [FLOW.md](FLOW.md)

Offline only (no Cursor UI):

```bash
node scripts/validate-plugin.mjs
pwsh scripts/smoke-local.ps1
```

From monorepo root: `node provided_plugins/scripts/audit-cursor-plugin.mjs`

---

## Project structure

```
provided_plugins/cursor-plugin/
├── .cursor-plugin/
│   ├── plugin.json
│   └── listing.json
├── .github/workflows/validate.yml
├── assets/
│   ├── logo.svg
│   ├── logo-dark.svg
│   └── screenshots/
├── lib/plugin-kernel/        # vendored OAuth helpers
├── rules/                    # 9 mdc rules
├── skills/                   # 24 domain skills
├── commands/                 # 13 slash commands
├── agents/                   # 5 long-running presets
├── hooks/
│   ├── hooks.json
│   └── scripts/              # device-code, session-*, pre-shell, pre-mcp, telemetry, failure, capability-refresh
├── scripts/
```
│   ├── validate-plugin.mjs   # structure validator
│   ├── smoke-local.ps1       # 3-layer local smoke test (validator + node --check + curl)
│   └── test-device-code.ps1  # e2e: Device Code + approve + Bearer write
├── mcp.json
├── README.md  · CHANGELOG.md
├── MCP_QUICKSTART.md · VERIFICATION_CHECKLIST.md · TESTING_AND_CAPABILITIES.md
└── LICENSE
```

---

## OAuth 2.1 Device Code flow

```
┌─────────┐  (1) POST /api/oauth2/device/authorize   ┌──────────────┐
│ Cursor  │ ───────────────────────────────────────► │ agentstack   │
│ plugin  │ ◄──────────────── device_code + user_code│ backend      │
└────┬────┘                                          └──────┬───────┘
     │(2) open browser: /activate?user_code=…              │
     ▼                                                     │
┌─────────┐  (3) user signs in & approves scopes           │
│ browser │ ──► POST /api/oauth2/device/approve  ──────────┘
└─────────┘
     ▲
     │(4) poll POST /api/oauth2/token  → access_token + refresh_token
     │
┌────┴────┐
│ plugin  │  (5) writes Authorization: Bearer … into ~/.cursor/mcp.json
└─────────┘  (6) session-start.mjs hook rotates the Bearer automatically
```

Backend surface used by this flow: `POST /api/oauth2/device/authorize`, `GET /api/oauth2/device/info`, `POST /api/oauth2/device/approve`, `POST /api/oauth2/token`. Consent UI lives at `https://agentstack.tech/activate`.

---

## Pre-publish self-check (for plugin maintainers)

AgentStack itself runs only as a cloud service (`https://agentstack.tech`). The checks below run on your own machine but hit the cloud API for contract verification — there is no local backend to spin up.

```powershell
# Layer 1+2: offline — validator + node --check + pre-shell-scan behaviour
pwsh ./scripts/smoke-local.ps1

# Layer 1+2+3: add contract checks against the cloud API
pwsh ./scripts/smoke-local.ps1 -BaseUrl https://agentstack.tech -TestCookie 'session=…'

# Full e2e for the Device Code path (spins up device-code.mjs, auto-approves via cloud)
pwsh ./scripts/test-device-code.ps1 -BaseUrl https://agentstack.tech -TestCookie 'session=…'

# Just the structural validator
node ./scripts/validate-plugin.mjs
```

`-TestCookie` is a fresh session cookie from your own authenticated browser session on `https://agentstack.tech`; the script uses it only to exercise the `/api/oauth2/device/approve` contract. Prefer pointing `-BaseUrl` at a staging environment (e.g. `https://staging.agentstack.tech`) when one is available.

See `VERIFICATION_CHECKLIST.md` for the full 16-point release gate and `MCP_QUICKSTART.md` for the one-pager install guide.

---

## Telemetry

Telemetry is **opt-in**. Set `agentstack.sendTelemetry: true` in your Cursor settings to let the plugin post usage events to `POST /api/telemetry/plugin`. Data is aggregated daily under the ecosystem project's 8DNA so the team can measure the north-star metric: **how often the agent picks an MCP action versus writing custom code**.

Source: `hooks/scripts/post-tool-telemetry.mjs`. The backend endpoint is documented via `GET https://agentstack.tech/mcp/actions` (see `telemetry.*` if exposed, otherwise the raw REST URL above).

---

## Git (AgentStack monorepo workspace)

The folder `AgentStack/` opened in Cursor is often **not** a Git repository (empty or missing `.git` at the workspace root). **Commit and push from this plugin directory:**

```bash
cd provided_plugins/cursor-plugin   # or open this folder as the Cursor workspace root
git status && git commit && git push
```

Marketplace publish uses a copy-only sibling repo — see `https://github.com/agentstacktech/cursor-plugin` and the monorepo doc `docs/plugins/CURSOR_PLUGIN_PUBLISH.md` when your checkout includes it.

---

## Contributing

1. Changes to rules / skills / commands go under the matching subfolder.
2. Run `pwsh ./scripts/smoke-local.ps1` before every PR.
3. If the backend MCP surface grows new actions, skills should **not** be updated with hard-coded action lists — they already pull the live list from `GET /mcp/actions`. The `capability-refresh.mjs` hook refreshes the local snapshot automatically when `mcp.json` changes.
4. Bump the version in `.cursor-plugin/plugin.json` and `CHANGELOG.md` on every change.

---

## License

MIT — see [LICENSE](./LICENSE).