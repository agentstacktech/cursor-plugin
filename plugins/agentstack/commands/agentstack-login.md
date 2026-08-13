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

1. Ask the user which scopes to request. Prefer presets:
   - `--scope-preset=readonly` for inspection.
   - `--scope-preset=builder` for app/data/rules/RAG/storage work.
   - `--scope-preset=full` for full platform work including Agents Fleet/support.
2. Resolve the plugin root (directory with `hooks/scripts/device-code.mjs` — typically `~/.cursor/plugins/local/agentstack`). Then run:
   `node ./hooks/scripts/device-code.mjs --scope-preset=builder`
   or `node ./hooks/scripts/device-code.mjs --scopes="<space-separated>"`
   (If cwd is not the plugin root, pass an absolute path to the script.)
3. After success, if the token grants access to more than one project, ask the user to pick one:
   - Call `projects.get_projects` via MCP (alias `projects.list`).
   - Persist the picked project id to `~/.cursor/agentstack-project` (plain text, 0600).
4. Call `POST /mcp/cache/clear` to refresh discovery for the new scope set.
5. Show the new effective capabilities: `agentstack.execute` with `{action: "discovery.list"}` grouped by cap.

## Recovery

- **`invalid_grant`** — refresh token was revoked; clear `~/.cursor/agentstack-refresh` and restart.
- **`client_secret is required`** — prod before public-plugin deploy. After shared+core deploy, builtin `cursor-plugin` needs no secret. Stale DCR: unset `AGENTSTACK_OAUTH_USE_DCR` or delete `~/.cursor/agentstack-oauth-client.json`. Then Reload Window.
- **`invalid_scope`** — the requested scope is not allowed for `cursor-plugin` client; remove it.
- **Browser did not open** — print the URL + code and ask the user to open manually.
- **Support asks for diagnostics** — include the printed trace id from the login flow.

## Related

- `/agentstack-init` — first-time install.
- `/agentstack-diagnose` — inspect current token state.
- Hook `session-start.mjs` — auto-refreshes 2 minutes before expiry (public `cursor-plugin` by default; confidential secret only from env or `AGENTSTACK_OAUTH_USE_DCR=1`).
