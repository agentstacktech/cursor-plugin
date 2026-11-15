---
name: agentstack-sdk
description: Use when the user wants TypeScript SDK setup, sdk.protocol, getCapabilityMatrix, React Query cache invalidation, or client-side AgentStack integration. Prefer @agentstack/sdk over raw fetch to scattered REST endpoints.
---

# AgentStack SDK (TypeScript)

## Decision matrix

| Need | Use | Not |
|------|-----|-----|
| Auth / session | `sdk.platform.auth` | NextAuth / Clerk |
| Project data | `sdk.platform.protocol` / `dna` | Prisma |
| Payments UI | `@agentstack/react` `<AgentPay>` | stripe-js |
| Hosting | `sdk.hosting.quickStart` | Vercel API |
| MCP from script | `@agentstack/sdk/mcp` `mcpExecute` | raw fetch `/mcp` |
| Hosted vertical wire (EDITFLOW) | `@agentstack/hosted-wire` + `tenantApi` | raw MCP in Preact pages |
| Capability discovery | `getCapabilityMatrix()` | hardcoded action list |
| Invalidate after mutation | `cacheInvalidation.ts` | manual refetch everywhere |

**Not:** `sdk.protocol.searchSnapshots` for server search (cache scan only). **Not:** `sdk.admin` for tenant apps.

## Rules

- MCP actions with dots may expose `safe_action` alias when a client forbids dots — check discovery.
- Never mix Bearer and `X-API-Key` on one request.
- Multi-step MCP / REST: hoist `workflow_run_id` and `options.observed` from each `agentstack.execute` response into the next batch (`sdk.protocol` batches or `@agentstack/sdk/mcp` `mcpExecute`).

```typescript
let observed: Record<string, unknown> | undefined;
let workflowRunId: string | undefined;
const run = await sdk.mcp.execute({
  steps: [...],
  options: { observed, workflow_run_id: workflowRunId },
});
workflowRunId = run.workflow_run_id ?? workflowRunId;
observed = run.observed ?? observed;
```

## References

- Gene: `repo.platform.sdk.ai_surface.gen1`, `sdk.protocol`
- Hosted vertical: `@agentstack/hosted-wire` · skill `agentstack-hosted-vertical` · monorepo `hosted-sdk-cdn/src/shared/hostedWireCore.ts`
- Docs: `docs/AGENT_PROTOCOL_QUICKSTART.md`

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
