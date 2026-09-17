---
name: agentstack-hosted-vertical
description: Use when building hosted vertical SaaS tenants (EDITFLOW, /s/{pid}/editflow/, workspace kanban, finance widgets). Prefer @agentstack/hosted-wire + tenantApi facades over raw MCP in UI. Monorepo substrate vs consumer tenant repos.
---

# AgentStack Hosted Vertical (tenant SaaS)

## When to use

| User says | This skill | Not |
|-----------|------------|-----|
| EDITFLOW / `/s/1472/editflow/` | `hosted-vertical/` + wire core | Custom Express API |
| Key2Unity / `/s/1444/key2unity/` | `shell_mode: auth_portal` + `agentstack_key2unity_site` | `vertical_workspace.bootstrap` |
| Hosted workspace SaaS / vertical tenant | `vertical_workspace.bootstrap` + static publish | `deploy.full` DNA |
| Kanban / CRM board in hosted shell | `tenantActions` + CDN widgets | Duplicate CRM REST in pages |
| Login on hosted vertical | `{ email, password, p: flagship_pid }` | NextAuth / Clerk |
| Wire / Bearer / remint | `@agentstack/hosted-wire` | `hybrid_key` as Bearer |

**Archetype:** `hosted_vertical_saas` · Command: `/agentstack-hosted-vertical` · Product flow: `/agentstack-product-flow`

## Read order (mandatory)

1. **Monorepo agents:** `hosted-vertical/AGENTS.md`
2. **Build playbook:** `docs/sdk/HOSTED_VERTICAL_TENANT_BUILD_PLAYBOOK.md`
3. **Wire contract:** `docs/sdk/HOSTED_WORKSPACE_INTEGRATOR.md`
4. **Consumer repos:** `/agentstack-product-flow` → this skill → MCP per `agentstack-prefer`

## Two jurisdictions

| Context | Rules |
|---------|-------|
| **AgentStack monorepo** (platform) | Founder direct ship — one code path; substrate MCP in platform Core; tenant static via hosted publish scripts; **never** `editflow_*` backend services |
| **Consumer tenant repo** | 8DNA sandbox + `generation.*` when config/persona changes; canary only when user asks |

Deploy boundary gene: `repo.ops.deploy_tenant_boundary.gen1`

## Layer stack (MVC + DRY)

```
pages/components → hooks (useModalForm, useTenantRefresh)
                → tenantApi barrel
                → tenantActions (writes) · tenantRest (reads)
                → tenantCore (tenantMcp, tenantFetch)
                → @agentstack/hosted-wire (hostedWireCore.ts)
```

**Never in `pages/` or `components/`:** `hostedMcpExecute`, `hostedAuthFetch`, `platform.esm.js`, `checklist.list`.

## SDK / wire helpers (reuse)

```typescript
import {
  resolveSessionBearerToken,
  resolveTenantProjectId,
  storeVerticalSession,
  remintWorkspaceBearer,
} from '@agentstack/hosted-wire';

import { createDeal, fetchBoard, fetchChecklistProgress } from './lib/tenantApi';
```

Monorepo alias: `hosted-sdk-cdn/src/shared/hostedWireCore.ts` (vite/vitest `@agentstack/hosted-wire`).

## MCP hot paths (flagship tenant plane)

| Need | Action | Notes |
|------|--------|-------|
| Bootstrap workspace | `vertical_workspace.bootstrap` | After project + persona leaf |
| Demo seed | `vertical_demo.seed_apply` | First-login banner |
| CRM write | `crm.create_deal`, `crm.move_deal_stage`, … | Via `tenantMutate` |
| Checklist | `checklist.get` | **Not** `checklist.list` |
| Publish static bucket | `hosting.deploy_files` | `publish_hosted_vertical.py` (or editflow wrapper) |
| Key2Unity auth portal | Prompt `agentstack_key2unity_site` · recipe `mcp_key2unity_auth_portal` | CRM bootstrap |
| Bot identity (web_link+email) | `bots.update` + `identity` object | `bots.patch_spec` (not in catalog) |
| Persona / nav DNA | `projects.patch_data` leaf + `generation.*` | Never full-blob `data=` |

Recipe start: **`mcp_hosted_vertical_bootstrap`** (workspace) · **`mcp_key2unity_auth_portal`** (auth portal) · Prompt: **`agentstack_hosted_vertical`** / **`agentstack_key2unity_site`**

## New feature checklist (agent)

1. **Gap?** Missing MCP → extend platform Core MCP catalog first (`GET /mcp/actions`).
2. **Write** → add to `tenantActions.ts` with cache keys; export from `tenantApi.ts`.
3. **Read** → `tenantRest.ts` or existing hook (`useWorkspaceSnapshot`).
4. **UI** → `useModalForm` + `ModalFormFooter`; ESC via `useEscapeClose`.
5. **CI** → `npm run audit:hosted-workspace-wire` · `npm run test --prefix hosted-vertical`.

## Publish (tenant — not VPS deploy)

```bash
npm run build --prefix hosted-sdk-cdn
# EDITFLOW workspace:
VERTICAL_BASE=/s/{PID}/editflow/ npm run build --prefix hosted-vertical
npm run publish:editflow-hosted   # monorepo root — EDITFLOW workspace smoke publish
# Key2Unity auth portal (1444): monorepo publish_hosted_vertical with --boot-profile key2unity
```

Platform VPS (core/nginx/CDN): Lance `deploy-from-windows.ps1` — not tenant scripts.

## Anti-patterns

| Wrong | Right |
|-------|-------|
| `hostedMcpExecute` in page | `tenantActions` + `tenantApi` |
| Bearer = `hybrid_key` string | `resolveSessionBearerToken(data)` JWT only |
| REST `/api/projects/1483/…` on EDITFLOW | `resolveTenantProjectId()` → flagship |
| Tenant heal in `deploy.full` | Manual tenant ops + generation promote |
| Trust `primary_bucket_id` for named bucket publish | `hosting.site.resolve` with explicit `bucket_name` |
| `bots.patch_spec` for identity | `bots.update` with `identity` object |
| New backend `editflow_service.py` | Generic MCP tissue |

## References

- Genes: `frontend.hosted.vertical.gen1` · `frontend.hosted.vertical.tenant_build.gen1`
- Agent: `@agentstack-tenant-builder` (consumer 8DNA supply)
- CI: `scripts/check-hosted-workspace-wire.mjs` · `npm run test:e2e:editflow`
- ADR: `docs/adr/HOSTED_WORKSPACE_APP.md`
