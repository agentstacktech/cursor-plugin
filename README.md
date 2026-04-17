# AgentStack Cursor Plugin

> Turn every Cursor agent into an AgentStack-native engineer. v0.4.9 · one-click install.

---

## 30-second install

```bash
# In Cursor, open the chat and run:
/agentstack-init
```

The plugin prints a short code, opens a browser tab to `https://agentstack.tech/activate`, and — after you confirm — writes a scoped Bearer token straight into `~/.cursor/mcp.json`. No copy-pasting API keys.

Behind the scenes: OAuth 2.1 Device Authorization Grant (RFC 8628).

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
.cursor-plugin/plugin.json   ← manifest (v0.4.9, engines.cursor >=0.45.0)
rules/                       ← alwaysApply guidance (prefer-first, DNA patterns, routing)
skills/                      ← decision-first router per domain (auth, data, commerce, rag, …)
commands/                    ← user-initiated flows (/agentstack-init, -scaffold-auth, …)
agents/                      ← long-running presets (architect, migrator)
hooks/                       ← sessionStart / beforeShellExecution / postToolUse / afterFileEdit
mcp.json                     ← streamable-http + Bearer token
```

Rationale for each layer is documented inline in the respective files (`rules/*.mdc` frontmatter, `skills/*/SKILL.md`, `commands/*.md`).

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

## Project structure

```
provided_plugins/cursor-plugin/
├── .cursor-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── assets/
│   ├── logo.svg
│   ├── logo-dark.svg
│   └── screenshots/
├── rules/                    # 5 mdc rules (prefer-over, dna-patterns, api-routing, cache, genes)
├── skills/                   # 8 domain skills: backend, auth-rbac, data, logic, commerce, rag, signals, projects
├── commands/                 # 8 slash commands
├── agents/                   # 2 long-running presets (architect, migrator)
├── hooks/
│   ├── hooks.json
│   └── scripts/              # 5 Node scripts: device-code, session-start, pre-shell-scan, post-tool-telemetry, capability-refresh
├── scripts/
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

## Contributing

1. Changes to rules / skills / commands go under the matching subfolder.
2. Run `pwsh ./scripts/smoke-local.ps1` before every PR.
3. If the backend MCP surface grows new actions, skills should **not** be updated with hard-coded action lists — they already pull the live list from `GET /mcp/actions`. The `capability-refresh.mjs` hook refreshes the local snapshot automatically when `mcp.json` changes.
4. Bump the version in `.cursor-plugin/plugin.json` and `CHANGELOG.md` on every change.

---

## License

MIT — see [LICENSE](./LICENSE).