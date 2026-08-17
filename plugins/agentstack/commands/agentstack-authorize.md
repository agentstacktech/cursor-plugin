---
name: agentstack-authorize
description: Authorize AgentStack MCP via Device Code (browser, no API key). Writes ~/.cursor/mcp.json.
---

# /agentstack-authorize

One-shot plugin sign-in. This **is** the auth control — Cursor plugins have no webview Connect button, and the package **must not** ship `mcp.json` (that creates empty `plugin-agentstack-*` and shadows user MCP).

Do **not** ask which scopes. Do **not** paste an API key. Do **not** call tenant `auth.login`.

## Steps

1. Prerequisite: Node.js on PATH (`node -v`). If missing, stop and say so.
2. Resolve the plugin root (directory with `hooks/scripts/device-code.mjs` — typically `~/.cursor/plugins/local/agentstack` or the marketplace install path).
3. Run immediately (cwd = plugin root, or pass an absolute script path):

```bash
node ./hooks/scripts/device-code.mjs --scope-preset=full
```

4. The script prints `Open:` + `Code:`, opens `https://agentstack.tech/activate?user_code=…`, and polls until approved. New agent chats also auto-spawn this script via `sessionStart --from-hook` when MCP is unsigned / placeholder / `service_caps=null` (opt out: `AGENTSTACK_DISABLE_AUTO_LOGIN=1`).
5. After success: tell the user **Developer: Reload Window**. MCP appears as **`user-agentstack`** from `~/.cursor/mcp.json`, not as a plugin-owned server.
6. If `projects.get_projects` returns more than one tenant workspace, persist the chosen id to `~/.cursor/agentstack-project` and keep `X-Project-ID` off ecosystem `1`.
7. Smoke: `agentstack.execute` `{ "steps": [{ "id": "p", "action": "system.ping", "params": {} }] }`. `tools/list` alone is a false green.

## Recovery

- **`authorization_pending`** — keep polling (not an error).
- **`expired_token` / code expired** — re-run this command (do not invent a new OAuth client).
- **Limit exceeded / `invalid_grant`** — Device Code rotates the plugin PAT after G-A166/167 deploy. On current prod a Profile user key still counts as Free `1/1`: revoke the extra key at https://agentstack.tech/me/keys, retry once, Reload. If it persists, `/agentstack-diagnose`.
- **`service_caps_required_in_prod`** — old user PAT with `service_caps=null`. This command mints a Device Code token with explicit caps. Reload after it finishes.
- **Browser did not open** — print the Activate URL + user code.
- **MCP still missing in the plugin panel** — expected. Look under user MCP (`agentstack` / `user-agentstack`), not `plugin-agentstack-*`.

## Related

- `/agentstack-login` — re-login, switch project, or a narrower `--scope-preset`.
- `/agentstack-init` — first-time bootstrap (SDK scaffold + matrix) after auth.
- `/agentstack-diagnose` — token + `system.ping` probe.
