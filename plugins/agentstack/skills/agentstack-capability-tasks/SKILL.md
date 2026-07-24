---
name: agentstack-capability-tasks
description: Use when the user mentions comfort tasks, hub slots, capability atoms, delegateToTaskId, or platform task manifests in the dual-shell UI. Prefer PTC manifests over duplicating nav entries.
---

# Platform Task Capability Atoms (PTC)

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "add task to hub" | `frontend.platform.capability_tasks.gen1` manifests | New sidebar link only |
| "inline task on route" | RSK `delegateToTaskId` | Copy-paste wizard steps |

## References

- ADR: public docs — Platform Task Capability Atoms (`docs.agentstack.tech`)
- Discover hub tasks via Compass / `guidance.*` MCP when available

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
