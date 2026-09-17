---
name: agentstack-hosted-vertical
description: Hosted vertical SaaS tenant checklist — EDITFLOW wire, tenantApi facades, publish vs deploy boundary.
---

# /agentstack-hosted-vertical

Use for **hosted workspace SaaS** at `/s/{project_id}/{persona}/` (EDITFLOW reference tenant).

## Steps

1. **Archetype** — confirm `hosted_vertical_saas` (signals: editflow, hosted workspace, kanban, `/s/`). Else `/agentstack-product-flow`.

2. **Jurisdiction**
   - **Monorepo** (`AgentStack/`): read `hosted-vertical/AGENTS.md` + build playbook — substrate + static publish only.
   - **Consumer repo**: `@agentstack-tenant-builder` for 8DNA sandbox / generation promote.

3. **Wire contract (non-negotiable)**
   - `@agentstack/hosted-wire` — `resolveSessionBearerToken`, `resolveTenantProjectId`
   - Login body: `{ email, password, p: <flagship_pid> }`
   - MCP: `POST /mcp` — not `/api/mcp/execute`

4. **UI I/O**
   - Import from `tenantApi.ts` — not `hostedMcpExecute` in pages/components
   - Modals: `useModalForm` + `ModalFormFooter`
   - Checklist: `checklist.get` via `fetchChecklistProgress`

5. **Backend gap** — if action missing from catalog → add generic MCP in core (S-wave) before tenant UI wire.

6. **DNA / persona** — flagship PID → `generation.fork` / diff / gates / promote (not deploy scripts).

7. **Publish static** (tenant ops):
   ```bash
   npm run build --prefix hosted-sdk-cdn
   VERTICAL_BASE=/s/{PID}/editflow/ npm run build --prefix hosted-vertical
   npm run publish:editflow-hosted   # monorepo root; pass --project-id {PID} --smoke
   ```

8. **Verify**
   ```bash
   npm run audit:hosted-workspace-wire
   npm run test --prefix hosted-vertical
   ```

## Skill

Full matrix: `skills/agentstack-hosted-vertical/SKILL.md`

## References

- `docs/sdk/HOSTED_VERTICAL_TENANT_BUILD_PLAYBOOK.md`
- `docs/sdk/HOSTED_WORKSPACE_INTEGRATOR.md`
- Gene: `frontend.hosted.vertical.tenant_build.gen1`
