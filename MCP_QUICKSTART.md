# MCP Quick Start — AgentStack Cursor Plugin v0.4.9

## Recommended: OAuth 2.1 Device Code (default, 30 seconds)

Inside Cursor, run:

```text
/agentstack-init
```

Flow:

1. The plugin prints a short `user_code` (e.g. `ABCD-1234`) and a verification URL.
2. A browser tab opens at `https://agentstack.tech/activate?user_code=ABCD-1234`.
3. Sign in (if you are not already) and click **Approve**. The requested scopes are shown — you can uncheck any you do not want to grant.
4. The plugin receives `access_token` + `refresh_token` and writes the Bearer into `~/.cursor/mcp.json`. Cursor detects the change automatically.

No copy-pasting. No manual config. The refresh token is rotated by the `sessionStart` hook on every Cursor launch.

### Result in `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "agentstack": {
      "type": "streamable-http",
      "url": "https://agentstack.tech/mcp",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOi..."
      },
      "tools": { "enabled": true, "autoDiscover": true }
    }
  }
}
```

### Troubleshooting

- `device/authorize failed` — check your network; corporate proxies must allow `https://agentstack.tech`.
- Browser does not open — copy the URL from the terminal manually.
- `expired_token` — the 10-minute approval window lapsed. Re-run `/agentstack-init`.
- Refresh repeatedly fails — run `/agentstack-login` to start a fresh flow.

## Fallback: deep-link install

If Node is not on PATH but Cursor is, you can install the MCP server by clicking a deep link:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=agentstack&config=<BASE64>
```

Where `<BASE64>` is the base64 of:

```json
{
  "type": "streamable-http",
  "url": "https://agentstack.tech/mcp",
  "headers": { "Authorization": "Bearer <PASTE_BEARER>" },
  "tools": { "enabled": true, "autoDiscover": true }
}
```

Visit `https://agentstack.tech/me/keys` → **Create scoped key** to get a Bearer without a terminal.

## Fallback: manual `X-API-Key`

Not recommended — kept for air-gapped or scripted environments.

1. Create a scoped API key at `https://agentstack.tech/me/keys` (pick `service_caps` = `mcp.execute` plus whatever you need).
2. Paste it into `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agentstack": {
      "type": "streamable-http",
      "url": "https://agentstack.tech/mcp",
      "headers": {
        "Content-Type": "application/json",
        "X-API-Key": "ask_XXXXXXXXXXXXXXXX"
      },
      "tools": { "enabled": true, "autoDiscover": true }
    }
  }
}
```

3. Restart Cursor if the MCP tab does not refresh automatically.

> **Security:** keys starting with `ask_` are secrets. The plugin's `beforeShellExecution` hook will block commands that contain them as plaintext. Store them only in `~/.cursor/mcp.json` or in your OS keyring.

## Next steps

- `/agentstack-capability-matrix` — see what the MCP can do (live list from `GET https://agentstack.tech/mcp/actions`).
- `/agentstack-scaffold-auth` — drop in login + register + session gating.
- `/agentstack-scaffold-backend` — RBAC + buffs + payments + admin in one pass.
- `/agentstack-diagnose` — single status table for MCP, tokens, hooks, errors.

## Manual test

```bash
curl -X POST https://agentstack.tech/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER" \
  -d '{"tool":"agentstack.execute","params":{"steps":[{"action":"projects.get_projects"}]}}'
```

You should receive a list of projects. The response header `X-Trace-Id` is the correlation id you can quote when filing a bug.
