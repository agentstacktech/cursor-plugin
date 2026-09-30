# MCP Quick start — Cursor plugin

> **Interactive setup (all clients):** [agentstack.tech/mcp-docs#clients?client=cursor](https://agentstack.tech/mcp-docs#clients?client=cursor)

**Endpoint:** `https://agentstack.tech/mcp`  
**Tool:** `agentstack.execute` (Cursor may show `agentstack_execute`; underscore alias still works on `tools/call`)  
**Live catalog:** `GET https://agentstack.tech/mcp/actions`  
**Version:** 0.4.18+

## Install plugin (dev)

```bash
node scripts/install-local.mjs
# Cursor → Developer: Reload Window → /agentstack-init
```

See [LOCAL_INSTALL.md](LOCAL_INSTALL.md).

## Auth (primary)

OAuth 2.1 Device Code via `/agentstack-authorize` (or `/agentstack-init`) → Bearer in `~/.cursor/mcp.json`.

Requires **Node.js** on PATH. Fallback: API key header `X-API-Key: ask_…` from [Profile → API keys](https://agentstack.tech/user/profile?tab=api).

Plugin **0.4.18** ships URL-only `plugins/agentstack/mcp.json` (`plugin.json` `mcpServers: "./mcp.json"`). After **Reload Window**, AgentStack MCP appears in the plugin panel — click **Connect** (G-A174). Do **not** put `${AGENTSTACK_ACCESS_TOKEN}` in that file (G-A162). Device Code (`/agentstack-authorize`) still writes `~/.cursor/mcp.json` (`user-agentstack`) for hooks.

**Tenant workspace (OAuth / password):** Connect or Device Code mints a **user-scoped** Bearer (JWT may show ecosystem `project_id=1`). Before tenant **mutations**, run recipe `mcp_session_setup` → set **`context.project_id`** → confirm **`auth.get_profile`** → **`mutation_allowed`** or **`session_ready`**. Call **`auth.switch_project`** only when **`required_client_action`** is **`apply_bearer`** (typical: project-pinned API key). Cursor hook **`pre-mcp-session-handoff.mjs`** runs REST switch only when a batch includes **`auth.switch_project`**. **ChatGPT-only OAuth:** if switch tokens are redacted, Disconnect → Connect after picking workspace, or Device Code.

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

Default batches stay **fail-closed** (`stopOnError: true`) — money and mutations. For a **read-only bootstrap** (profile, stats, limits, quota) use named recipe `mcp_read_bootstrap` / prompt `agentstack_read_bootstrap` with `"continueOnError": true`. **Do not** include `apikeys.list` unless the token has L1 `api_keys` / `apikeys.read`; that step is what aborted the Ф16 6-pack after buffs.

**Heavy LLM:** at most one `bots.simulate` / `knowledge.playground` per **sync** execute (60s `mcp_batch` for the whole batch). Suites: one simulate per call, or `options.async=true` then `discovery.job_status`. Live: `GET /mcp/actions` → `execute_budget`.

## Safe project cycle (all tenant work)

For **any** tenant config / data change — master playbook before mutations:

| Step | Action |
|------|--------|
| Command | `/agentstack-safe-cycle` |
| Playbook | `GET /mcp/prompts/get?name=agentstack_safe_project_cycle&project_id=<PID>` |
| Recipe | `mcp_universal_safe_change` |
| SoT | `docs/operations/ECOSYSTEM_SAFE_PROJECT_CYCLE.md` |

Phases: session → preflight → domain mutate (leaf) → verify sandbox → diff → gates → promote.

Setup hub: [agentstack.tech/mcp-docs#setup](https://agentstack.tech/mcp-docs#setup) · per client: `?client=chatgpt|cursor|claude|gemini`

## Tenant ops (mentor heal → verify → promote)

For mentor menu drift — specialized case of safe cycle:

| Step | Action |
|------|--------|
| Playbook | `GET /mcp/prompts/get?name=agentstack_tenant_ops_mcp_first` |
| Recipe | `mcp_tenant_bots_heal_verify` |
| Heal | `bots.ensure_mentor_commands` |
| Verify | `bots.simulate` / `knowledge.playground` (one per batch) |
| Ship | `generation.diff_vs_prod` → `generation.promote` |

Cursor command: `/agentstack-tenant-ops`. Monorepo SoT: `docs/operations/TENANT_OPS_MCP_FIRST_PLAYBOOK.md`.

## Diagnose

| Command | Purpose |
|---------|---------|
| `/agentstack-status` | Auth + profile + pin (everyday) |
| `/agentstack-diagnose` | Token, discovery, MCP surface |
| `node scripts/diagnose-local.mjs` | Offline + live `tools/list` probe |
| `node scripts/verify-mcp-surface-e2e.mjs` | Single-tool + Postel alias contract |

Flow diagram: [FLOW.md](FLOW.md). Monorepo hub (if present): `docs/MCP_QUICKSTART.md`.
