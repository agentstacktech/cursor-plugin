---
name: agentstack-diagnose
description: Troubleshoot the AgentStack plugin — health, discovery, active project, current scopes, token validity, recent errors. Produces a single status table.
---

# /agentstack-diagnose

Run these in order and present results as a single Markdown table.

## Checks

1. **Health** — `GET https://agentstack.tech/api/health` (expected `200 {status:"ok"}`).
2. **Discovery** — `GET /mcp/actions` (print live count per category; compare to docs/publication/PLATFORM_SCALE.md if needed).
3. **Token** — decode the JWT in `~/.cursor/mcp.json` → `mcpServers.agentstack.headers.Authorization` (local only, no network); print `sub`, `scope`, `exp`, and seconds to expiry.
4. **Whoami** — `GET /api/auth/whoami` with current Bearer.
5. **Project** — `projects.get_stats` with the active project id (from `~/.cursor/agentstack-project`).
6. **API keys** — `apikeys.list` (print label, prefix, scopes, ttl).
7. **Recent errors** — last 20 lines from `~/.cursor/agentstack-telemetry.jsonl` where `success=false`; show `trace_id` + action.
8. **Hooks** — verify `hooks/hooks.json` lists sessionStart, beforeShellExecution, beforeMCPExecution, postToolUse, postToolUseFailure, sessionEnd, afterFileEdit; scripts under `hooks/scripts/` resolve from plugin root (`~/.cursor/plugins/local/agentstack` or marketplace install).
9. **Capability snapshot** — age of `~/.cursor/agentstack-capabilities.json` (mtime); if missing or >24h, refresh via session-start or `GET /mcp/actions`. Confirm `actions` is a **flat array** (not nested `domains`).
10. **MCP cache** — `POST /mcp/cache/clear` (expected 200, `cleared: true`).
11. **MCP surface** — `POST /mcp` JSON-RPC `tools/list` (expect **1** tool `agentstack.execute`; `mcp_surface_tools: 1` on `GET /mcp/health`). If Cursor shows two servers, Reload after plugin 0.4.16+ and run `refresh-cursor-runtime.mjs --fix`.
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
| MCP surface    | OK     | tools/list=1; single MCP server in Cursor |
```

## When something is wrong

- **Token** expired → run `/agentstack-login`.
- **HTTP 429** → honor `Retry-After`; backoff; do not tight-loop.
- **Discovery** count unexpectedly low → key scoped too narrowly, prod lags behind `main`, or MCP modules failed to load; widen caps or re-login.
- **Project** WARN (quota >90%) → suggest upgrading via `/agentstack-scaffold-backend` → AgentPay widget.
- **Recent errors** — pick the most recent `trace_id` and correlate it with backend logs (`X-Trace-Id`).
- **Hooks** missing → re-install the plugin.
- **Snapshot** stale → reload window (sessionStart) or clear MCP cache.
