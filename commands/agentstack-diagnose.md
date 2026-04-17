---
name: agentstack-diagnose
description: Troubleshoot the AgentStack plugin — health, discovery, active project, current scopes, token validity, recent errors. Produces a single status table.
---

# /agentstack-diagnose

Run these in order and present results as a single Markdown table.

## Checks

1. **Health** — `GET https://agentstack.tech/api/health` (expected `200 {status:"ok"}`).
2. **Discovery** — `GET /mcp/actions` (expected ≥80 actions; print count per category).
3. **Token** — decode the JWT in `~/.cursor/mcp.json` → `mcpServers.agentstack.headers.Authorization` (local only, no network); print `sub`, `scope`, `exp`, and seconds to expiry.
4. **Whoami** — `GET /api/auth/whoami` with current Bearer.
5. **Project** — `projects.get_stats` with the active project id (from `~/.cursor/agentstack-project`).
6. **API keys** — `apikeys.list` (print label, prefix, scopes, ttl).
7. **Recent errors** — last 20 lines from `~/.cursor/agentstack-telemetry.jsonl` where `success=false`; show `trace_id` + action.
8. **Hooks** — verify `hooks/hooks.json` exists and its 4 scripts are executable.
9. **MCP cache** — `POST /mcp/cache/clear` (expected 200, `cleared: true`).

## Output

```
| Check          | Status | Detail                                   |
|----------------|--------|------------------------------------------|
| Health         | OK     | api.agentstack.tech v0.4.9               |
| Discovery      | OK     | 82 actions across 10 categories          |
| Token          | OK     | expires in 742s, scope=mcp:execute 8dna:write ... |
| Whoami         | OK     | user_id=42, email=...                    |
| Project        | WARN   | 9800/10000 API calls used today          |
| API keys       | OK     | 2 keys                                   |
| Recent errors  | OK     | 0 failures in last 20                    |
| Hooks          | OK     | 4 scripts executable                     |
| MCP cache      | OK     | cleared                                  |
```

## When something is wrong

- **Token** expired → run `/agentstack-login`.
- **Discovery** < 80 actions → user's key is scoped too narrowly; widen caps or re-login with more scopes.
- **Project** WARN (quota >90%) → suggest upgrading via `/agentstack-scaffold-backend` → AgentPay widget.
- **Recent errors** — pick the most recent `trace_id` and correlate it with backend logs (the same id is emitted on every MCP response via the `X-Trace-Id` header).
- **Hooks** missing → re-install the plugin.
