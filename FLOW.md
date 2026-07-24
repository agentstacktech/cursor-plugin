# Data & call flow — AgentStack Cursor plugin

**Gene:** `repo.plugins.oauth_device_code.gen1` · `repo.plugins.hooks.contract.gen1` · `repo.plugins.capability_routing.gen1`

## Repo layout (Cursor 2.6+)

| Path | Role |
|------|------|
| `.cursor-plugin/marketplace.json` | **Required** for Cursor “Add marketplace” / GitHub install (`pluginRoot: plugins`, `source: agentstack`) |
| `.cursor-plugin/listing.json` | AgentStack publisher SoT (screenshots, privacy, pricing) — **not** Cursor’s marketplace schema |
| `plugins/agentstack/` | Plugin package: `plugin.json`, rules, skills, commands, agents, hooks, mcp, assets, vendored kernel |
| `scripts/` | Validate / smoke / local install tooling |

```mermaid
sequenceDiagram
  participant User
  participant Init as agentstack-init
  participant DC as device-code.mjs
  participant AS as agentstack.tech
  participant MCP as Cursor MCP client
  participant Hooks as hooks lifecycle
  participant Snap as agentstack-capabilities.json

  User->>Init: /agentstack-init
  Init->>DC: node hooks/scripts/device-code.mjs
  DC->>AS: POST /api/oauth2/device/authorize
  AS-->>DC: device_code + user_code
  User->>AS: /activate approve
  loop poll
    DC->>AS: POST /api/oauth2/token
    Note over AS: 400 + authorization_pending until approved
  end
  AS-->>DC: access_token + refresh_token
  DC->>MCP: write ~/.cursor/mcp.json Bearer
  DC->>AS: POST /mcp/cache/clear
  DC->>AS: GET /mcp/actions
  DC->>Snap: flat actions[] snapshot
  Hooks->>MCP: sessionStart refresh if exp less than 120s
  Hooks->>Snap: refresh if older than 24h
  MCP->>AS: agentstack.execute steps
  Hooks->>Snap: beforeMCPExecution cap hint
```

## Artifacts on disk

| Path | Writer | Reader |
|------|--------|--------|
| `~/.cursor/mcp.json` | device-code, session-start | Cursor MCP, hooks |
| `~/.cursor/agentstack-refresh` | device-code, session-start | session-start |
| `~/.cursor/agentstack-capabilities.json` | device-code, session-start, capability-refresh | pre-mcp-cap-check, diagnose |
| `~/.cursor/agentstack-telemetry.jsonl` | post-tool-* (opt-in only) | session-end flush, diagnose |
| `~/.cursor/plugins/local/agentstack` | `scripts/install-local.mjs` | Cursor local plugins |

## Catalog shape

Live `GET /mcp/actions` returns `{ domains: { [name]: Entry[] }, total_actions }`.  
Local snapshot stores **flat** `actions: Entry[]` via `tenantActionsFromCatalog` (tenant-facing filter; mirrors `doc_audience.py`).

Validate / CI uses vendored `docs/CAPABILITY_MATRIX.md` plus `scripts/lib/stale-actions.mjs` — **no monorepo-only imports** in the publish repo.

## Local health

```bash
node scripts/diagnose-local.mjs
node scripts/diagnose-local.mjs --fix --seed-snapshot
```

`sessionStart` normalizes lean `mcpServers.agentstack` and refreshes the flat capability snapshot using Bearer **or** `X-API-Key`.
