---
name: agentstack-discover
description: Rank MCP actions and UI routes for a user intent using live catalog and discovery manifest.
---

# /agentstack-discover

## Discovery ladder (when unsure)

Mirror of `onboarding.discovery_ladder` in `mcp_agent_instruction_index.json` (same as backend SKILL autogen block).

<!-- BEGIN:AUTOGEN-DISCOVERY-LADDER-COMMAND -->
0. `/mcp/prompts/get?name=agentstack_session_setup`
1. `discovery.status`
2. `discovery.search`
3. `discovery.describe`
4. `preflight.check`
<!-- END:AUTOGEN-DISCOVERY-LADDER-COMMAND -->

## Intent routing

1. Ask user for one-line goal.
2. `POST /mcp/discover/by_intent` — prefer over keyword grep on full catalog.
3. Suggest matching skill from `agentstack-backend` router (+ product archetype from `/agentstack-product-flow` when building an app).
4. UI navigation: `agentstack-discovery` skill · `/api/discovery/manifest.json` — not `guidance.start_path`.

Print top 5 actions with `when_to_use` and `required_cap`.
