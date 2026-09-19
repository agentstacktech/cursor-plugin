---
name: agentstack-tenant-builder
description: Build tenant apps on AgentStack — 8DNA sandbox and canary rollouts allowed when user requests experiments.
---

# @agentstack-tenant-builder

Build **tenant products** on AgentStack — consumer repos and monorepo **tenant jurisdiction** (not platform substrate deploy).

## Start here

1. **`/agentstack-product-flow`** — pick archetype before domain work.
2. **Hosted vertical SaaS** (`/s/{pid}/editflow/`, kanban workspace) → **`/agentstack-hosted-vertical`** + skill `agentstack-hosted-vertical`.
3. Prefer MCP per `agentstack-prefer` · `@agentstack/sdk` · Device Code or scoped keys.

## Monorepo vs consumer

| Where you edit | Agent entry | 8DNA / canary |
|----------------|-------------|---------------|
| **AgentStack monorepo** (`hosted-vertical/`, wire core) | `hosted-vertical/AGENTS.md` · build playbook | Flagship persona via generation on PID 1472; **founder direct ship** — no default sandbox forks for Lance |
| **Consumer / tenant repo** (app on AgentStack) | This agent + `/agentstack-product-flow` | Sandbox + `generation.*` when user asks or paid defaults apply |

Platform deploy (`deploy.full`) ships **substrate only** — not tenant flagship DNA. Gene: `repo.ops.deploy_tenant_boundary.gen1`.

## Hosted vertical (EDITFLOW pattern)

**Read:** `docs/sdk/HOSTED_VERTICAL_TENANT_BUILD_PLAYBOOK.md`

| Layer | Use |
|-------|-----|
| Wire | `@agentstack/hosted-wire` (`hostedWireCore.ts`) |
| UI writes | `tenantActions` → `tenantApi` |
| UI reads | `tenantRest` + hooks |
| Auth | `{ email, password, p: flagship_pid }` + `resolveSessionBearerToken` |
| Publish | `publish_editflow_hosted.py` — not VPS deploy |

Never add `editflow_*` backend services — extend generic MCP in core.

## Tenant 8DNA supply (config / bots / KB changes)

**MCP-first:** `/agentstack-tenant-ops` · prompt `agentstack_tenant_ops_mcp_first` · recipe `mcp_tenant_bots_heal_verify`.

1. `generation.fork` or `auto_generation_mode` sandbox
2. Mutate via MCP (`bots.ensure_mentor_commands`, `knowledge.config.patch`, `projects.patch_data` leaf)
3. `generation.diff_vs_prod` — review before promote
4. `generation.gates` — when paid tenant requires gates
5. Verify in sandbox: `bots.simulate` / `knowledge.playground` (one heavy step per sync batch)
6. `generation.promote` — strategy from `auto_promote_strategy` (not hardcoded canary)

Prompts: `agentstack_tenant_8dna_supply` (supply chain) · `agentstack_tenant_ops_mcp_first` (heal/verify).  
Never full-blob `data=` writes — leaf paths only. Do **not** write new backend code when MCP actions exist.

Do **not** apply platform-monorepo founder-direct-ship constraints to **consumer** repos — sandbox/canary remain valid when the user requests experiments.

## References

- Skill: `agentstack-hosted-vertical`
- Gene: `frontend.hosted.vertical.tenant_build.gen1`
- Playbook: `HOSTED_VERTICAL_TENANT_BUILD_PLAYBOOK.md`
