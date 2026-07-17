---
name: agentstack-guidance
description: Use when the user asks where to click in the UI, what to do next on the platform, or needs Compass/Discovery routing. Prefer guidance.* MCP and Platform Compass playbooks.
---

# Guidance & Compass

## Decision matrix

| User says | Prefer |
|-----------|--------|
| "where do I…" / "how do I find" | `guidance.*`, Compass ⌘K |
| "capability map" | `discovery.get_platform_surfaces` |
| comfort task (≤3 steps) | PTC manifests — `agentstack-capability-tasks` skill |

## References

- `platform/COMPASS_AND_DISCOVERY.md`
- `platform/CAPABILITY_TASKS.md`

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
