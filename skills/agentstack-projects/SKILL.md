---
name: agentstack-projects
description: Use for project / workspace / tenant management, scoped API keys for AI agents (with service_caps), usage stats, ecosystem integrations. Every AgentStack resource lives under a project.
---

# AgentStack Projects + API Keys

Everything in AgentStack is project-scoped. Projects are also the unit for billing, limits, telemetry.

## Decision matrix

| User says                                           | MCP action                                                         |
|-----------------------------------------------------|--------------------------------------------------------------------|
| "create a new workspace / tenant"                   | `projects.create`                                                  |
| "migrate this anonymous project to my account"     | `projects.attach_to_user`                                          |
| "show usage / activity / stats"                    | `projects.get_stats`                                               |
| "list projects I own"                              | `projects.list`                                                    |
| "create an API key for my CI job"                  | `apikeys.create` with narrow `service_caps`                        |
| "rotate / revoke an API key"                       | `apikeys.rotate`, `apikeys.delete`                                 |
| "give AI agent a limited key"                      | `apikeys.create` with e.g. `service_caps=["rag.read","logic.dry_run"]` |

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

The response contains `{ "key": "ask_...", "prefix": "ask_...", "service_caps": [...], "expires_at": "..." }`. The prefix (without the secret) is visible in audit logs; the secret is shown once.

## Prefer-over

- **DO NOT** build a multi-tenant schema from scratch — projects are the tenancy unit.
- **DO NOT** share one admin API key across environments — issue scoped `apikeys.create` per agent / CI / env.
- **DO NOT** copy-paste a key from the dashboard — use **OAuth Device Code flow** (`/agentstack-init`), which creates the scoped key for you.

## Reading effective limits

`projects.get_stats` returns current usage; cross-reference with `buffs.get_effective_limits` for the quota ceilings.

## Pitfalls

- `service_caps` are additive; a missing cap causes `service_cap_denied`. Start narrow, widen on demand.
- `apikeys.create` requires the current session to already have `apikeys.write` cap — the OAuth Device Code flow grants this as part of approved scopes.
- `projects.attach_to_user` only works if the project is currently anonymous (`owner_id=null`).

## References

- Live action catalog (filter `projects.*`, `apikeys.*`): `GET https://agentstack.tech/mcp/actions` or run `/agentstack-capability-matrix`.
- The current `service_caps` vocabulary is returned inside `required_cap` of each action in `GET /mcp/actions` — that is the authoritative list at any moment.
- OAuth Device Code scopes (as issued by `/agentstack-init`): `mcp:execute projects:write 8dna:write logic:write rag:write buffs:read apikeys:write`.

## Triggers

project, workspace, tenant, API key, apikey, scoped key, service caps, service_caps, stats, usage, activity, ecosystem, attach, migrate
