---
name: agentstack-login
description: Re-login or switch AgentStack project/scopes via Device Code (no API key).
---

# /agentstack-login

Use when already installed and the user wants to **re-auth**, **switch project**, or **change scopes**.

For first-time / “just sign me in” use **`/agentstack-authorize`** instead (no questions).

## Steps

1. Default to `--scope-preset=full`. Only ask if the user named a narrower preset:
   - `--scope-preset=readonly` — inspection.
   - `--scope-preset=builder` — app/data/rules/RAG/storage.
   - `--scope-preset=full` — platform work including Agents Fleet/support (default).
2. Resolve the plugin root (directory with `hooks/scripts/device-code.mjs` — typically `~/.cursor/plugins/local/agentstack`). Then run:
   `node ./hooks/scripts/device-code.mjs --scope-preset=full`
   or `node ./hooks/scripts/device-code.mjs --scopes="<space-separated>"`
   (If cwd is not the plugin root, pass an absolute path to the script.)
3. After success, if the token grants access to more than one tenant project, ask which to pin:
   - Call `projects.get_projects` via MCP (alias `projects.list`).
   - Persist the picked project id to `~/.cursor/agentstack-project` (plain text, 0600).
   - Do not pin ecosystem `1` as a working workspace.
4. Call `POST /mcp/cache/clear` to refresh discovery for the new scope set.
5. Tell the user **Developer: Reload Window**. Smoke with `system.ping` (list-only is a false green).

## Recovery

- **`invalid_grant`** — refresh token was revoked; clear `~/.cursor/agentstack-refresh` and restart.
- **`client_secret is required`** — prod before public-plugin deploy. After shared+core deploy, builtin `cursor-plugin` needs no secret. Stale DCR: unset `AGENTSTACK_OAUTH_USE_DCR` or delete `~/.cursor/agentstack-oauth-client.json`. Then Reload Window.
- **`invalid_scope`** — the requested scope is not allowed for `cursor-plugin` client; remove it.
- **Browser did not open** — print the URL + code and ask the user to open manually.
- **Support asks for diagnostics** — include the printed trace id from the login flow.

## Related

- `/agentstack-authorize` — one-shot Device Code (no API key, default full scopes).
- `/agentstack-init` — first-time install.
- `/agentstack-diagnose` — inspect current token state.
- Hook `session-start.mjs` — auto Device Code when unsigned / `service_caps=null` (`--from-hook`); leftover refresh file only if a prior OAuth grant stored one.
