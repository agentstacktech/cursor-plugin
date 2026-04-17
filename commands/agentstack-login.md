---
name: agentstack-login
description: Authenticate via OAuth Device Code (re-login, switch project, refresh scope). Wraps hooks/scripts/device-code.mjs.
---

# /agentstack-login

Use when:

- The Bearer token has expired and refresh failed.
- The user wants to switch projects (different owner / workspace).
- The user wants to widen scopes (e.g. add `logic.write`).
- First-time setup without running `/agentstack-init`.

## Steps

1. Ask the user which scopes to request (default: the same set as `/agentstack-init`). Allow narrower sets for read-only sessions.
2. Run `node ./hooks/scripts/device-code.mjs --scopes="<space-separated>"`.
3. After success, if the token grants access to more than one project, ask the user to pick one:
   - Call `projects.list` via MCP.
   - Persist the picked project id to `~/.cursor/agentstack-project` (plain text, 0600).
4. Call `POST /mcp/cache/clear` to refresh discovery for the new scope set.
5. Show the new effective capabilities: `agentstack.execute` with `{action: "discovery.list"}` grouped by cap.

## Recovery

- **`invalid_grant`** — refresh token was revoked; clear `~/.cursor/agentstack-refresh` and restart.
- **`invalid_scope`** — the requested scope is not allowed for `cursor-plugin` client; remove it.
- **Browser did not open** — print the URL + code and ask the user to open manually.

## Related

- `/agentstack-init` — first-time install.
- `/agentstack-diagnose` — inspect current token state.
- Hook `session-start.mjs` — auto-refreshes 2 minutes before expiry.
