---
name: agentstack-sdk
description: Use when the user wants TypeScript SDK setup, sdk.protocol, getCapabilityMatrix, React Query cache invalidation, or client-side AgentStack integration. Prefer @agentstack/sdk over raw fetch to scattered REST endpoints.
---

# AgentStack SDK (TypeScript)

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "typed client" / "SDK" | `@agentstack/sdk`, `sdk.protocol` | Ad-hoc fetch |
| "capability matrix in app" | `getCapabilityMatrix()` | Hard-coded action list |
| "invalidate after mutation" | `cacheInvalidation.ts` patterns | Manual refetch everywhere |

## Rules

- MCP actions with dots may expose `safe_action` alias when a client forbids dots — check discovery.
- Never mix Bearer and `X-API-Key` on one request.

## References

- Gene: `repo.platform.sdk.ai_surface.gen1`, `sdk.protocol`
- Docs: `docs/AGENT_PROTOCOL_QUICKSTART.md`
