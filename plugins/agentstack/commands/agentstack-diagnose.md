---
name: agentstack-diagnose
description: Troubleshoot the AgentStack plugin — health, discovery, active project, current scopes, token validity, recent errors. Produces a single status table.
---

# /agentstack-diagnose

Run these in order and present results as a single Markdown table.

## Checks

1. **Health** — `GET https://agentstack.tech/api/health` (expected `200 {status:"ok"}`).
2. **Discovery** — `GET /mcp/actions` (print live count per category; compare to docs/publication/PLATFORM_SCALE.md if needed).
3. **Token** — decode the JWT in `~/.cursor/mcp.json` → `mcpServers.agentstack.headers.Authorization` (local only, no network); print `type`, `actor_kind`, `service_caps` (null vs list length), `exp`, and seconds to expiry. **`service_caps=null` on `agentstack.tech` fails every `tools/call`** even if `tools/list` is OK.
4. **Whoami** — `GET /api/auth/whoami` with current Bearer.
5. **Project** — `projects.get_stats` with `X-Project-ID` (not JWT `project_id=1`). If the header is `1`, pin a tenant workspace (e.g. 1444).
6. **API keys** — `apikeys.list` (print label, prefix, scopes, ttl).
7. **Recent errors** — last 20 lines from `~/.cursor/agentstack-telemetry.jsonl` where `success=false`; show `trace_id` + action.
8. **Hooks** — verify `hooks/hooks.json` lists sessionStart, beforeShellExecution, beforeMCPExecution, postToolUse, postToolUseFailure, sessionEnd, afterFileEdit; scripts under `hooks/scripts/` resolve from plugin root (`~/.cursor/plugins/local/agentstack` or marketplace install).
9. **Capability snapshot** — age of `~/.cursor/agentstack-capabilities.json` (mtime); if missing or >24h, refresh via session-start or `GET /mcp/actions`. Confirm `actions` is a **flat array** (not nested `domains`).
10. **MCP cache** — `POST /mcp/cache/clear` (expected 200, `cleared: true`).
11. **MCP surface** — plugin 0.4.18 shows AgentStack MCP in the plugin panel (click **Connect** if needed). `POST /mcp` JSON-RPC `tools/list` (expect **1** tool `agentstack.execute`) **and** `tools/call` `system.ping`. List-only green is a false OK. Cursor may show native `mcp_auth` — do **not** call it from the agent; user clicks Connect (G-A174). Device Code `user-agentstack` may coexist. Empty Bearer on `plugin-agentstack-*` is G-A162.
12. **Local layout (optional)** — from the publish checkout: `node scripts/diagnose-local.mjs` and `node scripts/audit-layers.mjs`.

## Output

```
| Check          | Status | Detail                                   |
|----------------|--------|------------------------------------------|
| Health         | OK     | agentstack.tech/api                      |
| Discovery      | OK     | N actions across M domains (from live GET) |
| Token          | OK     | expires in 742s, scope=mcp:execute ...   |
| Whoami         | OK     | user_id=42, email=...                    |
| Project        | WARN   | 9800/10000 API calls used today          |
| API keys       | OK     | 2 keys                                   |
| Recent errors  | OK     | 0 failures (opt-in telemetry only)       |
| Hooks          | OK     | lifecycle scripts present                |
| Snapshot       | OK     | age=12m                                  |
| MCP cache      | OK     | cleared                                  |
| MCP surface    | OK     | tools/list=1; tools/call ping OK; one Cursor server |
```

## When something is wrong

- **Token** expired or `service_caps=null` on prod → run `/agentstack-authorize` (Device Code, no API key).
- **Token** `service_caps=null` on prod → `/agentstack-authorize` (Device Code). List can still look connected. Deploy G-A169/170 so user PATs hydrate too.
- **HTTP 429** → honor `Retry-After`; backoff; do not tight-loop.
- **Discovery** count unexpectedly low → key scoped too narrowly, prod lags behind `main`, or MCP modules failed to load; widen caps or re-login.
- **Project** WARN (quota >90%) → suggest upgrading via `/agentstack-scaffold-backend` → AgentPay widget.
- **Recent errors** — pick the most recent `trace_id` and correlate it with backend logs (`X-Trace-Id`).
- **Hooks** missing → re-install the plugin.
- **Snapshot** stale → reload window (sessionStart) or clear MCP cache.
