---
name: agentstack-product-flow
description: Classify product archetype and print MCP/SDK checklist for building on AgentStack — site, SaaS, store, bot, or migration.
---

# /agentstack-product-flow

Interactive checklist: **what are you building?** → archetype → recipe → scaffold links.

## Steps

1. **Infer or ask archetype** from user message (signals from index `product_archetypes`):

<!-- BEGIN:AUTOGEN-ARCHETYPE-INFER-MAP -->
- player_management / game_mechanics / monetization / engagement → `game`
- trials / subscriptions / usage_limits / feature_flags → `saas`
- product_catalog / cart_checkout / inventory / promotions → `ecommerce`
- messenger_polling / friend_requests / channels / public_index → `social`
- rest_crud / webhooks / automation / background_jobs → `backend_api`
- project_bootstrap / economy_setup / buff_templates_library / logic_rules_battery → `project_setup`
- landing / portfolio / html / zip → `static_site`
- telegram / whatsapp / bot studio / inbound message → `bot_channel`
- supabase / firebase / auth0 / stripe migration → `migrate_legacy`
- editflow / hosted workspace / vertical tenant / /s/ → `hosted_vertical_saas`
- key2unity / ключ к единству / auth portal / shell_mode auth_portal → `key2unity_auth_portal`
<!-- END:AUTOGEN-ARCHETYPE-INFER-MAP -->

   - else → show full list from `product_archetypes` in index JSON or backend SKILL autogen table

2. **Session bootstrap** — `GET /mcp/prompts/get?name=agentstack_session_setup` · recipe `mcp_session_setup` · set `context.project_id`.

3. **Print archetype row** — `mcp_recipe_id`, `prompt`, `sdk_hint`, `flow_id` (USER_FLOW_MATRIX playbook when present).

4. **Discovery** — `GET /mcp/ai_prompt?mode=contract` · `POST /mcp/discover/by_intent` if ambiguous.

5. **Deep links** (from index `deep_link`):

<!-- BEGIN:AUTOGEN-ARCHETYPE-DEEP-LINKS -->
- `game` → prompt `agentstack_use_case_game` · recipe `card_game_basic`
- `saas` → `/agentstack-scaffold-auth` → `/agentstack-scaffold-backend`
- `ecommerce` → `/agentstack-host-site` + `agentstack-commerce` skill
- `social` → `agentstack-messenger` skill · `social.chat.*`
- `backend_api` → recipe `mcp_session_setup` · `sdk.protocol`
- `project_setup` → `/agentstack-capability-matrix` · recipe `mcp_read_bootstrap`
- `static_site` → `/agentstack-host-site`
- `bot_channel` → recipe `mcp_bots_simulate` · Bot Studio
- `migrate_legacy` → `agentstack-migrator` agent
- `hosted_vertical_saas` → `agentstack-hosted-vertical` skill · `hosted-vertical/AGENTS.md` · `vertical_workspace.bootstrap` · `publish_editflow_hosted.py`
<!-- END:AUTOGEN-ARCHETYPE-DEEP-LINKS -->

6. **Showcase** (optional) — `/showcase` per pointer `PRODUCT_BUILD_FLOW.pointer.md` (reference only).

## References

- `docs/PRODUCT_BUILD_FLOW.pointer.md` (publish) · monorepo `docs/plugins/PRODUCT_BUILD_FLOW.md`
- `/agentstack-discover` — discovery ladder
- `/agentstack-capability-matrix` — live actions
