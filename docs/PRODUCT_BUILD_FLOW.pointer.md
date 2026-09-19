# Product build flow (pointer)

**Full narrative (monorepo):** `docs/plugins/PRODUCT_BUILD_FLOW.md` · **Machine SoT:** `mcp_agent_instruction_index.json` → `product_archetypes`

## Premise

AgentStack **is** the backend. Tenant apps use MCP + `@agentstack/sdk` + 8DNA — not Prisma, Express, or Stripe Checkout SDK.

## Archetypes (pick one)

<!-- BEGIN:AUTOGEN-ARCHETYPE-COMPACT -->
| id | MCP recipe | SDK hint |
|----|------------|----------|
| game | card_game_basic | — |
| saas | saas_trial_system | sdk.platform.auth |
| ecommerce | mcp_hosting_quickstart | sdk.commerce |
| social | mcp_bots_simulate | — |
| backend_api | mcp_session_setup | sdk.protocol |
| project_setup | mcp_read_bootstrap | getCapabilityMatrix |
| static_site | mcp_hosting_quickstart | sdk.hosting.quickStart |
| bot_channel | mcp_bots_simulate | — |
| migrate_legacy | mcp_session_setup | sdk.protocol |
| hosted_vertical_saas | mcp_hosted_vertical_bootstrap | @agentstack/hosted-wire |
| key2unity_auth_portal | mcp_key2unity_auth_portal | @agentstack/hosted-wire/activateSession |
<!-- END:AUTOGEN-ARCHETYPE-COMPACT -->

Command: `/agentstack-product-flow` · Full table: `skills/agentstack-backend/SKILL.md` (`AUTOGEN-PRODUCT-ARCHETYPES`).

## Bootstrap

1. Authenticate (Connect or `/agentstack-authorize`)
2. `projects.get_projects` → `context.project_id`
3. Recipe `mcp_session_setup`
4. Domain actions

Live actions: `GET https://agentstack.tech/mcp/actions`

## Showcase gallery

<!-- BEGIN:AUTOGEN-SHOWCASE-GALLERY -->
Public `/showcase` demos (reference only): `course_academy` (saas), `collectibles_bazaar` (ecommerce), `helpdesk_bot` (social), `creator_portfolio` (static_site), `key2unity` (key2unity_auth_portal).
<!-- END:AUTOGEN-SHOWCASE-GALLERY -->
