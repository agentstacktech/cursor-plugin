# MCP Quick start — Cursor plugin

> **Interactive setup (all clients):** [agentstack.tech/mcp-docs#clients?client=cursor](https://agentstack.tech/mcp-docs#clients?client=cursor)

**Endpoint:** `https://agentstack.tech/mcp`  
**Tool:** `agentstack.execute` (Cursor may show `agentstack_execute`; underscore alias still works on `tools/call`)  
**Live catalog:** `GET https://agentstack.tech/mcp/actions`  
**Version:** align with `plugins/agentstack/.cursor-plugin/plugin.json` (marketplace SoT).

## Step 0 — stale plugin cache (after upgrade)

If auth behaved oddly right after a plugin update:

```bash
node scripts/refresh-cursor-runtime.mjs --fix
```

Then **Developer → Reload Window** before Connect or `/agentstack-authorize`.

## Install plugin (dev)

```bash
node scripts/install-local.mjs
# Cursor → Developer: Reload Window → /agentstack-init
```

See [LOCAL_INSTALL.md](LOCAL_INSTALL.md).

## Empty plugin cache (Marketplace)

If Cursor shows the plugin installed but `plugins/cache/agentstack` is empty, see [LOCAL_INSTALL.md](LOCAL_INSTALL.md) troubleshooting (purge + Reload + Connect G-A174).

## Auth (primary) — two transports, one Core session

| Transport | When | Signed? |
|-----------|------|---------|
| **Plugin MCP** (`plugin-agentstack-*` in Cursor) | Marketplace install; click **Connect** (G-A174) | After OAuth Connect on plugin panel |
| **User MCP** (`~/.cursor/mcp.json` → `agentstack`) | Device Code `/agentstack-authorize` or profile API key | Bearer / X-API-Key in headers |

**Common trap:** Cursor agents often call **plugin** MCP without Bearer. `mcp_auth` does **not** copy Device Code into the plugin transport. Symptom: `not_authenticated` while `context.project_id` is set. **Fix:** Connect on plugin MCP **or** run the CLI bridge below (same POST `/mcp` as hooks).

OAuth 2.1 Device Code via `/agentstack-authorize` (or `/agentstack-init`) → Bearer in `~/.cursor/mcp.json`.

Requires **Node.js** on PATH. Fallback: API key header `X-API-Key: ask_…` from [Profile → API keys](https://agentstack.tech/user/profile?tab=api).

Plugin **0.4.18** ships URL-only `plugins/agentstack/mcp.json` (`plugin.json` `mcpServers: "./mcp.json"`). After **Reload Window**, AgentStack MCP appears in the plugin panel — click **Connect** (G-A174). Do **not** put `${AGENTSTACK_ACCESS_TOKEN}` in that file (G-A162). Device Code (`/agentstack-authorize`) still writes `~/.cursor/mcp.json` (`user-agentstack`) for hooks.

**Agent bridge (unsigned `plugin-agentstack-*`):** run MCP with the same Bearer as hooks:

```bash
node scripts/mcp-execute.mjs --project-id 1444 agents.work_next
node scripts/mcp-execute.mjs auth.get_profile
# Mutating work-graph steps need a semantic anchor (same as agentstack.execute options):
node scripts/mcp-execute.mjs --project-id 1 --execution-intent direct --focus-node-id mcp-registry-auth agents.plan_claim --params '{"project_id":1,"node_ids":["mcp-registry-auth"],"if_match_revision":9}'
```

Implementation: `scripts/mcp-execute.mjs` + `lib/plugin-kernel/mcpExecuteHttp.mjs`.

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
| Contract | Prompt `agentstack_safe_project_cycle` and recipe `mcp_universal_safe_change` |

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

Cursor command: `/agentstack-tenant-ops`. Prompt: `agentstack_tenant_ops_mcp_first`.

## Troubleshooting (auth)

| Symptom | Fix |
|---------|-----|
| Agent uses `plugin-agentstack-*` but you only ran Device Code | **Connect** on plugin MCP (G-A174) + Reload Window, or route agents to `user-agentstack` / `mcp-execute.mjs` |
| `diagnose-local` shows **DUAL_SURFACE** | Expected when PAT is in `mcp.json` but plugin namespace unsigned — see [CURSOR_MCP_OPERATOR_AUTH_RUNBOOK.md](../../docs/operations/CURSOR_MCP_OPERATOR_AUTH_RUNBOOK.md) |
| Hooks say unsigned while Connect works | Normal for Connect-only; optional `/agentstack-authorize` for hooks/catalog |
| `beforeMCPExecution` should hard-fail unsigned bridge | Set `AGENTSTACK_PLUGIN_AUTH_BRIDGE_STRICT=1` (opt-in; default stays best-effort) |

Reproduce kit: [MCP_AUTH_REPRODUCE_KIT.md](../../docs/plans/MCP_AUTH_REPRODUCE_KIT.md).

## Diagnose

| Command | Purpose |
|---------|---------|
| `/agentstack-status` | Auth + profile + pin (everyday) |
| `/agentstack-diagnose` | Token, discovery, MCP surface |
| `node scripts/diagnose-local.mjs` | Offline layout + live `auth.get_profile` execute probe (not list-only) |
| `node scripts/verify-mcp-surface-e2e.mjs` | Single-tool + Postel alias contract |

Flow diagram: [FLOW.md](FLOW.md). Monorepo hub (if present): `docs/MCP_QUICKSTART.md`.
