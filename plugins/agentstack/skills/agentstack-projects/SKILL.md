---
name: agentstack-projects
description: Use for project / workspace / tenant management, scoped API keys for AI agents (with service_caps), usage stats, ecosystem integrations. Every AgentStack resource lives under a project.
---

# AgentStack Projects + API Keys

Everything in AgentStack is project-scoped. Projects are also the unit for billing, limits, telemetry.

## UI discovery

When the user asks where a feature lives in the app, use `docs/plugins/UI_SURFACE_REGISTRY_FOR_AGENTS.md` and `docs/dual-shell/PAGES_MAP.md` — do not invent `/dev` routes. Gene: `frontend.spa.ui_surface_registry.gen1`.

## Decision matrix

| User says                                           | MCP action                                                         |
|-----------------------------------------------------|--------------------------------------------------------------------|
| "create a new workspace / tenant"                   | `projects.create`                                                  |
| "migrate this anonymous project to my account"     | REST `POST /api/auth/convert-anonymous` (no MCP `attach_to_user` yet) |
| "show usage / activity / stats"                    | `projects.get_stats`                                               |
| "list projects I own"                              | `projects.get_projects` (alias: `projects.list`)                   |
| "create an API key for my CI job / Cursor agent" | `apikeys.create` **or** `user.apikeys.create` with `actor_kind=agent`, `preset=agent_runner`, and `context.project_id` |
| "rotate / revoke an API key"                       | `user.apikeys.revoke` / `user.apikeys.rotate` (alias: `apikeys.delete`) |
| "give AI agent a limited key"                      | agent PAT — **not** a project `ask_` key. Outbound OpenAI/Stripe secrets are `service_keys`, not PATs. |

## Working project under OAuth

Cursor `/agentstack-authorize` issues a **user-scoped** Bearer (ecosystem `project_id=1`). For any session-scoped work on a tenant project, pass **`context.project_id`** on `agentstack.execute`:

```json
{
  "tool": "agentstack_execute",
  "arguments": {
    "context": { "project_id": 2048 },
    "steps": [
      { "id": "1", "action": "projects.get_stats", "params": { "project_id": 2048 } }
    ]
  }
}
```

- Use **`context.project_id`** so logic/list/write tools see the correct session project.
- Still pass **`params.project_id`** when the action schema requires it (resource target).
- Do **not** expect a project-bound API key to switch tenants via `context` unless it has `cross_project`.

## Scoped API keys — the canonical pattern for AI agents

The agent must never be given a wide "master" key. Instead, `apikeys.create` emits a scoped key carrying `service_caps`:

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      { "action": "apikeys.create", "params": {
        "project_id": "{{project_id}}",
        "label": "cursor-agent-dev",
        "service_caps": [
          "projects.read",
          "projects.write",
          "8dna.read",
          "8dna.write",
          "logic.dry_run",
          "logic.write",
          "rag.read",
          "rag.write",
          "buffs.read"
        ],
        "ttl_days": 30
      }}
    ]
  }
}
```

The response contains `{ "api_key": "<JWT>", "key_id": "...", "actor_kind": "agent", "service_caps": [...], "resource_scope": {...} }`. The secret is shown once. Pass `context.project_id` on later MCP calls — JWT identity `project_id` is always 1.

## Prefer-over

- **DO NOT** build a multi-tenant schema from scratch — projects are the tenancy unit.
- **DO NOT** share one unrestricted PAT across environments — issue an **agent PAT** (`apikeys.create`) per agent / CI / env with `context.project_id`. There are no product project `ask_` keys.
- **DO NOT** copy-paste a key from the dashboard — use **OAuth Device Code** (`/agentstack-authorize` or `/agentstack-init`), which writes a scoped Bearer into `~/.cursor/mcp.json`.

## Reading effective limits

`projects.get_stats` returns current usage; cross-reference with `buffs.get_effective_limits` for the quota ceilings. Omit `entity_kind` (must be the string `user` or `project`, never an object). Named read bootstrap: `mcp_read_bootstrap` with `continueOnError`. Do **not** add `apikeys.list` to that batch unless the token has L1 `api_keys` — `service_cap_denied` aborts `stopOnError` packs.

## Pitfalls

- Under OAuth, forgetting `context.project_id` leaves the session on ecosystem project `1` — many tools then look like they “do nothing” or hit the wrong DNA slice.
- `service_caps` are additive; a missing cap causes `service_cap_denied`. Start narrow, widen on demand. `apikeys.list` needs `api_keys` / `apikeys.read` — skip it on diagnose/bootstrap if the cap is absent.
- `apikeys.create` requires the current session to already have the apikeys write capability — the OAuth Device Code flow grants this as part of approved scopes.
- Anonymous project attach uses REST convert-anonymous (no MCP attach_to_user yet).

## References

- Live action catalog (filter `projects.*`, `apikeys.*`): `GET https://agentstack.tech/mcp/actions` or run `/agentstack-capability-matrix`.
- The current `service_caps` vocabulary is returned inside `required_cap` of each action in `GET /mcp/actions` — that is the authoritative list at any moment.
- OAuth Device Code scopes (as issued by `/agentstack-init`): `mcp:execute projects:write 8dna:write logic:write rag:write buffs:read apikeys:write`.

## Triggers

project, workspace, tenant, API key, apikey, scoped key, service caps, service_caps, stats, usage, activity, ecosystem, attach, migrate
