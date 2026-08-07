# MCP Quick start — Cursor plugin

**Endpoint:** `https://agentstack.tech/mcp`  
**Tool:** `agentstack.execute` (Cursor shows `agentstack_execute`; underscore alias still works in `tools/call`)  
**Live catalog:** `GET https://agentstack.tech/mcp/actions`

## Local plugin install (dev)

```bash
node scripts/install-local.mjs
# Reload Cursor → /agentstack-init
```

See [LOCAL_INSTALL.md](LOCAL_INSTALL.md).

## Auth (primary)

OAuth 2.1 Device Code via `/agentstack-init` (writes Bearer into `~/.cursor/mcp.json`).

Requires **Node.js** on PATH. Fallback: API key — set header `X-API-Key: ask_…` from https://agentstack.tech/me/keys.

## Call shape

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [{ "action": "discovery.list", "params": {} }]
  }
}
```

## Diagnose

`/agentstack-diagnose` · flow diagram: [FLOW.md](FLOW.md)

Monorepo hub (if present): `docs/MCP_QUICKSTART.md`
