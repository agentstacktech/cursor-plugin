---
name: agentstack-discover
description: Rank MCP actions and UI routes for a user intent using live catalog and discovery manifest.
---

# /agentstack-discover

1. Ask user for one-line goal.
2. `GET /mcp/actions` — filter by keyword in `summary` / `action`.
3. Suggest matching skill from `agentstack-backend` router.
4. If UI navigation: cite `docs/plugins/UI_SURFACE_REGISTRY_FOR_AGENTS.md` and `/api/discovery/manifest.json`.

Print top 5 actions with `required_cap`.
