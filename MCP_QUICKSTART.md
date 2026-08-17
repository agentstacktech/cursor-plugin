# MCP Quick start — Cursor plugin

**Endpoint:** `https://agentstack.tech/mcp`  
**Tool:** `agentstack.execute` (Cursor may show `agentstack_execute`; underscore alias still works on `tools/call`)  
**Live catalog:** `GET https://agentstack.tech/mcp/actions`  
**Version:** 0.4.17+

## Install plugin (dev)

```bash
node scripts/install-local.mjs
# Cursor → Developer: Reload Window → /agentstack-init
```

See [LOCAL_INSTALL.md](LOCAL_INSTALL.md).

## Auth (primary)

OAuth 2.1 Device Code via `/agentstack-authorize` (or `/agentstack-init`) → Bearer in `~/.cursor/mcp.json`.

Requires **Node.js** on PATH. Fallback: API key header `X-API-Key: ask_…` from https://agentstack.tech/me/keys.

**Do not** ship `mcp.json` inside the plugin package (Cursor auto-registers it). One registration path: `~/.cursor/mcp.json`. The plugin panel will **not** show an MCP server — that is intentional (G-A162). After Device Code, Cursor lists **`user-agentstack`**. `/agentstack-authorize` is the auth control (no webview Connect button).

## Lean `~/.cursor/mcp.json` shape

```json
{
  "mcpServers": {
    "agentstack": {
      "type": "streamable-http",
      "url": "https://agentstack.tech/mcp",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

No per-tool `tools{}` map — actions come from `GET /mcp/actions`.

## Call shape

Prefer JSON-RPC `tools/call` with batched steps:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "agentstack.execute",
    "arguments": {
      "steps": [{ "id": "d1", "action": "discovery.list", "params": {} }],
      "options": { "stopOnError": true }
    }
  },
  "id": 1
}
```

## Diagnose

| Command | Purpose |
|---------|---------|
| `/agentstack-diagnose` | Token, discovery, MCP surface |
| `node scripts/diagnose-local.mjs` | Offline + live `tools/list` probe |
| `node scripts/verify-mcp-surface-e2e.mjs` | Single-tool + Postel alias contract |

Flow diagram: [FLOW.md](FLOW.md). Monorepo hub (if present): `docs/MCP_QUICKSTART.md`.
