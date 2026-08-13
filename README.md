# AgentStack Cursor Plugin

> Turn every Cursor agent into an AgentStack-native engineer.  
> **v0.4.17** (gen3) · OAuth Device Code install · one MCP tool

---

## 30-second install

```bash
# In Cursor chat:
/agentstack-init
```

The plugin prints a short code, opens `https://agentstack.tech/activate`, and after you approve writes a scoped Bearer into `~/.cursor/mcp.json`. No copy-pasting API keys. (OAuth 2.1 Device Authorization Grant — RFC 8628.)

**MCP surface (0.4.16+):**

| What | Contract |
|------|----------|
| Registration | `~/.cursor/mcp.json` only (Device Code / session-start) |
| `tools/list` | **One** tool: `agentstack.execute` (Cursor UI may show `agentstack_execute`) |
| `tools/call` | Accepts `agentstack.execute` **and** `agentstack_execute` |
| Actions | Live catalog: `GET https://agentstack.tech/mcp/actions` |

The package **must not** ship `mcp.json`. Cursor auto-registers it as a second MCP server (`plugin-agentstack-*`) with an empty `${AGENTSTACK_ACCESS_TOKEN}` placeholder — `discovery.list` still works, `projects.get_projects` does not. Device Code writes `~/.cursor/mcp.json` only. Example: [`mcp.example.json`](mcp.example.json).

---

## Why AgentStack

Most AI tools generate backend code. AgentStack teaches the agent to **route intent to an existing platform action** first, and only write code when no action fits.

| You asked the agent for … | Without the plugin | With the plugin |
|---|---|---|
| User sign-in / sign-up | Handwritten JWT, sessions, bcrypt | `auth.login` + session cookie |
| Role-based access | Custom middleware + roles table | `rbac.*` + `protected.*` 8DNA |
| Persistent app data | Prisma/Drizzle + migrations | 8DNA `project.data.*` / `user.data.*` |
| Payments / subscriptions | Stripe SDK from scratch | `payments.*` + `buffs.*` |
| RAG / semantic search | pgvector + embedding pipeline | `rag.*` (TurboQuant, hybrid) |
| Cron / webhooks / signals | New routes + queue glue | `scheduler.*`, `webhooks.*`, `logic.*` |

---

## Layout (Cursor 2.6+)

```
provided_plugins/cursor-plugin/
├── .cursor-plugin/
│   ├── marketplace.json     # Add marketplace / GitHub install (pluginRoot: plugins)
│   ├── listing.json         # Publisher SoT (screenshots, privacy, support)
│   └── VALIDATION.md
├── plugins/agentstack/      # ← the plugin package Cursor loads
│   ├── .cursor-plugin/plugin.json
│   ├── (no mcp.json)        # Cursor would auto-register it; use ~/.cursor/mcp.json
│   ├── rules/               # 9 .mdc (1 alwaysApply: agentstack-prefer)
│   ├── skills/              # 24 domains + optional solana
│   ├── commands/            # 13 slash workflows
│   ├── agents/              # 3 marketplace agents (+2 maintainer overlay)
│   ├── hooks/               # lifecycle + policy scripts
│   ├── lib/plugin-kernel/   # vendored Device Code + MCP helpers
│   └── assets/              # logos + marketplace screenshots
├── scripts/                 # validate, smoke, install-local, diagnose, verify
├── docs/CAPABILITY_MATRIX.md
├── README.md · CHANGELOG.md · LICENSE
└── FLOW.md · LOCAL_INSTALL.md · MCP_QUICKSTART.md · …
```

**5-layer product surface** (inside `plugins/agentstack/`): rules → skills → commands → agents → hooks.  
Catalog plane: live `GET /mcp/actions` (never hard-code action counts in skills).

---

## First 5 minutes

1. `node scripts/install-local.mjs` → **Developer: Reload Window**
2. `/agentstack-init` (Node on PATH) → approve at `/activate`
3. `/agentstack-diagnose` then `/agentstack-capability-matrix`
4. Optional: `/agentstack-host-site` for a live `/s/` URL

Primary auth is Device Code → Bearer in `~/.cursor/mcp.json`. Fallback: API key via [MCP_QUICKSTART.md](MCP_QUICKSTART.md).

---

## Slash commands

| Command | What it does |
|---------|--------------|
| `/agentstack-init` | Device Code auth + lean MCP write (canonical install) |
| `/agentstack-login` | Re-auth or switch project |
| `/agentstack-scaffold-auth` | Minimal login/register UI on `auth.*` |
| `/agentstack-scaffold-backend` | RBAC + Buffs gates + AgentPay + admin panel |
| `/agentstack-sync-schema` | Prisma/Drizzle → 8DNA + FAP + Logic |
| `/agentstack-index-docs` | RAG-index project markdown into `my-project-docs` |
| `/agentstack-capability-matrix` | Live domain × actions from `/mcp/actions` |
| `/agentstack-diagnose` | Token, discovery, MCP surface, hooks health |
| `/agentstack-host-site` | Publish HTML/ZIP → `/s/` URL |
| `/agentstack-support-setup` | Project support channel binding |
| `/agentstack-integrations-wizard` | Integration Hub recipes |
| `/agentstack-sdk-surface` | `@agentstack/sdk` / protocol pointers |
| `/agentstack-discover` | Discover hub / Compass routing |

---

## Intent → MCP routing

| Intent signal | First port of call |
|---------------|-------------------|
| login / register / sessions | `auth.*` |
| permissions / roles | `rbac.*` + `protected.*` 8DNA |
| store / read app data | `project.data.*` / `user.data.*` |
| files / blobs | `storage.*` |
| payments / credits | `payments.*` + `wallets.*` + `buffs.*` |
| chat / channels | `social.*` |
| trials / tier gates | `buffs.*` |
| semantic search / memory | `rag.*` |
| async reactions | `logic.*` rules + triggers |

Live catalogue: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.

---

## Local test

```bash
# From this repo root (provided_plugins/cursor-plugin/)
node scripts/install-local.mjs
# Cursor → Developer: Reload Window → /agentstack-init

node scripts/install-local.mjs --check
node scripts/smoke-local.mjs --install
node scripts/diagnose-local.mjs --seed-snapshot
node scripts/verify-mcp-surface-e2e.mjs   # single tools/list + Postel alias

node scripts/uninstall-local.mjs
```

Offline CI-style:

```bash
node scripts/validate-plugin.mjs --strict-screenshots
node scripts/ci-validate.mjs
```

Monorepo: `node provided_plugins/scripts/audit-cursor-plugin.mjs`

Guides: [LOCAL_INSTALL.md](LOCAL_INSTALL.md) · data flow: [FLOW.md](FLOW.md) · MCP dedupe map: monorepo `docs/plugins/MCP_DEDUPE_FLOW.md`

If Cursor still loads an old manifest (`$schema` error or duplicate MCP servers):

```bash
node scripts/refresh-cursor-runtime.mjs --fix
# then Developer: Reload Window
```

---

## Docs map

| Doc | Audience |
|-----|----------|
| [MCP_QUICKSTART.md](MCP_QUICKSTART.md) | Auth + call shape one-pager |
| [FLOW.md](FLOW.md) | Device Code → mcp.json → hooks → MCP |
| [LOCAL_INSTALL.md](LOCAL_INSTALL.md) | Symlink install + troubleshooting |
| [TESTING_AND_CAPABILITIES.md](TESTING_AND_CAPABILITIES.md) | Layers, skills, agents, automated checks |
| [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md) | Staging / release operator log |
| [SHIP_TODO.md](SHIP_TODO.md) | Marketplace ship checklist |
| [SUBMIT_FORM.md](SUBMIT_FORM.md) | Marketplace form paste fields |
| [MARKETPLACE_DEMO.md](MARKETPLACE_DEMO.md) | 60–90s demo script |
| [PUBLISHER_TERMS_CHECK.md](PUBLISHER_TERMS_CHECK.md) | Publisher Terms compliance |
| [SECURITY.md](SECURITY.md) | Tokens, telemetry, reporting |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Sync / audit before PR |
| [CHANGELOG.md](CHANGELOG.md) | Release notes |

---

## Marketplace submit

1. Paste fields from [SUBMIT_FORM.md](SUBMIT_FORM.md)  
2. Terms check: [PUBLISHER_TERMS_CHECK.md](PUBLISHER_TERMS_CHECK.md)  
3. Demo: [MARKETPLACE_DEMO.md](MARKETPLACE_DEMO.md)  
4. Preflight: `node scripts/diagnose-local.mjs` · `node scripts/audit-layers.mjs`

Submit URL: https://cursor.com/marketplace/publish

---

## OAuth Device Code (summary)

1. `POST /api/oauth2/device/authorize` → `device_code` + `user_code`  
2. Browser: `/activate?user_code=…` → user approves  
3. Poll `POST /api/oauth2/token` until `access_token` (+ `refresh_token`)  
4. Plugin writes `Authorization: Bearer …` into `~/.cursor/mcp.json`  
5. `session-start` refreshes Bearer near expiry and keeps a flat capability snapshot  

Full sequence diagram: [FLOW.md](FLOW.md).

---

## Telemetry

**Opt-in only.** Set `agentstack.sendTelemetry: true` in Cursor settings to buffer usage events and flush to `POST /api/telemetry/plugin`. No prompt text is uploaded. Source: `plugins/agentstack/hooks/scripts/post-tool-telemetry.mjs`.

---

## Git (monorepo workspace)

`AgentStack/` is often **not** a single Git root. Commit from this directory:

```bash
cd provided_plugins/cursor-plugin
git status && git commit && git push
```

Marketplace publish is a copy-only sibling checkout — see monorepo `docs/plugins/CURSOR_PLUGIN_PUBLISH.md`.

---

## Contributing

1. Edit under `plugins/agentstack/{rules,skills,commands,agents,hooks}/`.  
2. Run `node scripts/smoke-local.mjs` (or `pwsh scripts/smoke-local.ps1`) before every PR.  
3. Do **not** hard-code action lists in skills — use live `GET /mcp/actions`.  
4. Bump `plugins/agentstack/.cursor-plugin/plugin.json` **and** `CHANGELOG.md` together.  
5. From monorepo: `node provided_plugins/scripts/sync-plugin-kernel.mjs` then `audit-cursor-plugin.mjs`.

Details: [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](./LICENSE).
