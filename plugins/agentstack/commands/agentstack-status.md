---
name: agentstack-status
description: Show AgentStack auth status, signed-in profile, and pinned project (no extra login steps).
---

# /agentstack-status

One screen: **who is signed in**, **which project is pinned**, **whether MCP is usable**. Do not ask the user to paste a key. Do not call native `mcp_auth`. There is no plugin Configure API-key form (that was leftover `variables`). Auth UI is this card + **Connect** in the MCP panel.

## How auth works (do not invent a second login)

1. **Plugin panel MCP** — after Reload, URL-only `mcp.json`. User clicks **Connect** once (site login).
2. **Device Code** (`/agentstack-authorize`, or sessionStart auto) writes `~/.cursor/mcp.json` Bearer for hooks and this chat (`user-agentstack`).
3. **Pin** — `~/.cursor/agentstack-project` (tenant id, never ecosystem `1`). Header `X-Project-ID` follows that pin.
4. **Data access** — Core RBAC/membership. `context.user_id` impersonation is denied without `impersonate`. `projects.get_projects` defaults to **membership only**.

## Steps

1. Read `~/.cursor/mcp.json` → `mcpServers.agentstack.headers` (do **not** print the token). Decode JWT payload locally: `user_id`, `type`, `service_caps` length, `exp`.
2. Read `~/.cursor/agentstack-project` if present.
3. MCP (real actions, not `system.ping`):
   - `auth.get_profile`
   - `projects.get_stats` with pinned or `context.project_id`
4. Present:

```
| Field    | Value |
|----------|--------|
| Auth     | signed in / unsigned / placeholder / null caps |
| Profile  | user_id, email or display name if returned |
| Project  | pin or X-Project-ID (warn if 1) |
| Caps     | list:N or null |
| Expires  | relative time |
| Next     | Connect in plugin panel, or /agentstack-authorize if unsigned |
```

5. If unsigned / placeholder / `service_caps=null` on prod → run `/agentstack-authorize` (auto Device Code also starts on new chats). Then Reload.

## Related

- `/agentstack-authorize` — first sign-in (no questions).
- `/agentstack-login` — re-auth or switch pin.
- `/agentstack-diagnose` — deeper table (hooks, snapshot, surface).
