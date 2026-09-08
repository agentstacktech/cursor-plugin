---
name: agentstack-backend
description: Entry point for AgentStack backend ecosystem. Use WHENEVER the user mentions backend, API, server, database, auth, storage, hosting, publish site, static site, ZIP deploy, RBAC, payments, rules, webhooks, scheduler, RAG, subscriptions, messenger, integrations, or feature flags. Routes to domain-specific skills.
---

# AgentStack Backend — Master Router

AgentStack is a **full backend ecosystem** exposed through ONE MCP tool: `agentstack.execute`. Capabilities come from live `GET /mcp/actions` (and `/agentstack-capability-matrix`) — do not hard-code action counts in skills.

## Quick router — pick the sub-skill

| User intent signals | Sub-skill | Primary MCP |
|---------------------|-----------|-------------|
| CRM / pipeline / contact | `agentstack-crm` | `crm.*` |
| business head / organ / command center | `agentstack-business` | `business.*` |
| AGNT / agUSD / AgentNet | `agentstack-agentnet` | `agentnet.*` |
| storefront studio / merchant | `agentstack-storefront-studio` | `commerce.storefront.*` |
| activate selling / first sale / seller onboarding | `agentstack-commerce` | `commerce.sell.activate` |
| project wallet / treasury | `agentstack-project-wallet` | `finance.project.*` + project wallet REST |
| professional services / hire studio /services | `agentstack-services` | REST `/api/public/services/*` (no MCP) |
| where in UI / next step | `agentstack-guidance` | `guidance.*`, discovery |
| store, data, config, 8DNA leaves | `agentstack-data` | `projects.patch_data`, `data_access.*` |
| sandbox / canary / generation fork / X-AgentStack-Env | `agentstack-data` | `generation.*` |
| publish site, /s/ URL, ZIP deploy | `agentstack-hosting` | `hosting.*` |
| support ticket, staff inbox, psup | `agentstack-support` | `social.support.*` |
| upload, quota, attachment, media | `agentstack-storage` | `storage.*`, REST upload |
| login, register, role, RBAC | `agentstack-auth-rbac` | `auth.*`, `rbac.*` |
| authorize plugin / Device Code / MCP missing in plugin | Connect on plugin MCP or `/agentstack-authorize` | Plugin `mcp.json` (OAuth) + Device Code → `~/.cursor/mcp.json` |
| when X then Y, automation, workflow | `agentstack-logic` | `logic.*`, `commands.*` |
| payment, wallet balance, checkout, buffs (not project treasury) | `agentstack-commerce` | `payments.*`, `wallets.*`, `buffs.*` |
| digital goods, asset wizard | `agentstack-commerce-assets` | `assets.*` |
| RAG, embedding, knowledge base | `agentstack-rag` | `rag.*`, `knowledge.policy_templates.*` |
| cron, webhook, notification; Stripe *callback* (not Checkout SDK) | `agentstack-signals` | `scheduler.*`, `webhooks.*` |
| project, API key, tenant | `agentstack-projects` | `projects.*`, `apikeys.*` |
| agent fleet, AI Builder | `agentstack-agents-ai` | `agents.*`, `ai_builder.*` |
| chat, DM, message ordering | `agentstack-messenger` | `social.*` |
| Slack, integration recipe | `agentstack-integrations` | `integrations.*` |
| where in UI, Compass, discover | `agentstack-discovery` | discovery manifest + UI registry |
| OpenAPI spec, REST surface, endpoint map | `agentstack-openapi` | OpenAPI + REST routing |
| hub task, capability atom | `agentstack-capability-tasks` | PTC manifests |
| TypeScript SDK, sdk.protocol | `agentstack-sdk` | `@agentstack/sdk` |
| Solana grant tooling (optional) | `solana-agentstack-mcp` | grant-scoped actions only |

Pick the **primary** bucket first; consult others by reference for multi-step flows.

**Disambiguation:** project treasury → `agentstack-project-wallet`; personal/commerce wallet → `agentstack-commerce`; inbound Stripe webhook → `agentstack-signals` / integrations (never `@stripe/stripe-js` for AgentStack checkout). Cursor plugin sign-in / “MCP not in the plugin” → `/agentstack-authorize`, not `auth.login`.

## User request → action (hot paths)

**Canonical SoT:** `docs/plugins/CONTEXT_FOR_AI_MCP.md` — edit the table there; run `node provided_plugins/scripts/sync-mcp-hot-path-skill.mjs`.

<!-- BEGIN:AUTOGEN-HOT-PATH-TABLE -->
| User request (example) | Domain | action(s) | Notes |
|------------------------|--------|-----------|--------|
| Create a project | Projects | `projects.create_project` (signed-in) or `projects.create_project_anonymous` (no key yet) | **Cursor plugin:** `/agentstack-authorize` or Connect — not anonymous. Anonymous returns `user_api_key` / `session_token` + neutral `bootstrap` metadata once; configure client headers (see § Anonymous bootstrap). Then `p1.result.project_id` in later steps. |
| List my projects | Projects | `projects.get_projects` | params: `{}` or `{ "limit": 50 }`. |
| Get one project / project stats | Projects | `projects.get_project`, `projects.get_stats` | Need `project_id` (literal or from previous step). |
| Read/write project config (8DNA) | Projects | `projects.get_data`, `projects.patch_data` | **Leaf paths only** — never full-blob `data=` writes. |
| Tenant sandbox / promote | Generation | `generation.fork`, `generation.diff_vs_prod`, `generation.gates`, `generation.promote` | Strategy from project `auto_promote_strategy`; not deploy scripts. |
| Give user a 7-day trial | Buffs | `buffs.apply_temporary_effect` | Params: project_id, user_id, effect id/code, duration. |
| List active subscriptions / buffs | Buffs | `buffs.list_active_buffs`, `buffs.get_effective_limits` | project_id, optional user_id. |
| Create payment / check status / refund | Payments | `payments.create`, `payments.get`, `payments.refund` | AgentPay — **not** Stripe SDK. Balance: `payments.get_balance`. |
| Wallets (personal / commerce) | Wallets | `wallets.list`, `wallets.deposit`, `wallets.transfer` | User/commerce balances — not project treasury (`finance.project.*`). |
| Project wallet / treasury | Finance | `finance.project.portfolio`, `finance.project.fund`, `finance.project.contribute` | Project-scoped treasury segments; pair with `commerce.sell.activate` payouts. |
| Publish site / get /s/ URL | Hosting | `hosting.site.quick_start`, `hosting.deploy_files`, `hosting.release.promote` | Buckets + releases on one `project_id` — not Vercel/Netlify. |
| CRM contact / deal pipeline | CRM | `crm.upsert_contact`, `crm.list_contacts`, `crm.create_deal`, `crm.move_deal_stage` | Contact 360: `crm.get_contact_360`; CSV: `crm.import_contacts`. |
| Run project agent / fleet | Agents | `agents.list`, `agents.run`, `agents.create_from_template` | One heavy `agents.run` (`wait=true`) per sync `agentstack.execute` batch. |
| Bot channel / simulate | Bots | `bots.create`, `bots.set_brain`, `bots.simulate`, `bots.go_live` | `bots.simulate` is heavy LLM — one per batch; channels via `bots.attach_channel`. |
| Activate seller / storefront | Commerce | `commerce.sell.activate`, `commerce.storefront.seed_plan`, `commerce.storefront.hosted_publish` | Seller onboarding + hosted vitrine — distinct from marketplace REST (`commerce_rest`). |
| Business head / organ projects | Business | `business.create_composite`, `business.command_snapshot`, `business.list_children` | Multi-project organism — distinct from `generation.*` 8DNA sandbox lineage. |
| Mentor / knowledge KB | Knowledge | `knowledge.kb.ingest`, `knowledge.playground`, `knowledge.config.patch` | Tenant KB + mentor simulate; `knowledge.playground` heavy — one per batch. |
| AgentNet proofs / economy | AgentNet | `agentnet.bnb.proof_bundle_for_run`, `agentnet.genome.verify` | AGNT / agUSD rails — never legacy AGC ticker in new integrations. |
| Compass / guided path | Guidance | `guidance.start_path`, `guidance.complete_step`, `guidance.match_playbook` | Platform Compass playbooks — not docs-nav `docs_nav.*`. |
| Field-level data policy (FAP) | Data access | `data_access.set_policy`, `data_access.get_policy` | Prefer FAP over scattered RBAC `if role` checks in app code. |
| AI Builder manifest | AI Builder | `ai_builder.manifest.get`, `ai_builder.compose.preview` | UAM manifest validate before fleet promote or hosted publish. |
| RAG / semantic search / memory | RAG | `rag.collection_create`, `rag.document_add`, `rag.search`, `rag.memory_add` | Tenant KB vs per-session memory — see `rag.memory_search`. |
| Rules / automations | Logic | `logic.create`, `logic.list`, `logic.execute` | No `rules.*` domain — Logic Engine only. |
| Schedule cron job | Scheduler | `scheduler.create_task`, `scheduler.list_tasks`, `scheduler.cancel_task` | |
| Upload files / quota | Storage | `storage.get_quota`, `storage.list_files` + REST `POST /api/storage/upload` | Binary via REST upload endpoint. |
| Marketplace / auction / exchange | REST (same Core) | `GET /mcp/actions` domain **`commerce_rest`** (path hints only) | Not valid `step.action` — use HTTP `/api/marketplace/*`, `/api/exchange/*`. See [MCP_OVERVIEW.md](../MCP_OVERVIEW.md). |
| Login / register / get profile | Auth | `auth.login`, `auth.register`, `auth.get_profile`, `auth.update_profile` | Session/identity. Device Code via plugin OAuth — not a separate MCP action. |
| Assets / inventory | Assets | `assets.create`, `assets.list` | project_id in params. |
| Analytics / usage / metrics | Analytics | `analytics.get_usage`, `analytics.get_metrics` | set_budget is not in the catalog. |
| API keys (project) | API Keys | `apikeys.list`, `apikeys.create`, `apikeys.delete` | Always set `service_caps` on keys for AI agents. Legacy projects API-key aliases are not in catalog. |
| Webhooks / integration recipes | Integrations / notifications | `integrations.list_recipes`, `integrations.install_recipe`, `notifications.send_push` | Inbound Stripe/callback → Integration Hub — not Checkout SDK. `notifications.send` deprecated — use send_push. |
| RBAC / permissions | RBAC | `rbac.check_permission`, `rbac.assign_role`, `rbac.get_roles` | Prefer FAP `data_access.set_policy` for field-level gates. |
| In-app messenger | Social | `social.chat.post`, `social.chat.history` | Project-scoped chat — not a second WebSocket stack. |
| Support staff inbox | Social / support | `social.support.inbox`, `social.support.history` | Staff plane — user channel uses `social.chat.*`. |
<!-- END:AUTOGEN-HOT-PATH-TABLE -->

Catalog rows expose `when_to_use`, `instruction_hint`, and `capability_descriptor` — prefer those over raw summaries when disambiguating similar tools.

## Universal MCP contract

```http
POST https://agentstack.tech/mcp
Authorization: Bearer <access_token>
Content-Type: application/json

{ "tool": "agentstack.execute", "params": { "steps": [{ "action": "<domain>.<verb>", "params": {} }] } }
```

Discover: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.

Read-only session bootstrap: recipe `mcp_read_bootstrap` (prompt `agentstack_read_bootstrap`) with `continueOnError: true`. Omit `apikeys.list` unless the key has L1 `api_keys`. Do not change the default `stopOnError=true` on money/mutation batches.

## Execute budget (heavy LLM)

Sync `agentstack.execute` is **60s for the whole batch** (`mcp_batch`) — not an RBAC limit. **At most one** heavy LLM action per sync call: `bots.simulate`, `knowledge.playground`, `agents.run` with `wait=true`. Cheap list/get may batch. Mentor CSV / long tests: one simulate per execute (unique `external_user_id`), or `options.async=true` then `discovery.job_status`. Catalog field: `GET /mcp/actions` → `execute_budget`. Prompt: `agentstack_execute_budget`.

## MCP guidance

- **Catalog:** `GET https://agentstack.tech/mcp/actions` (or `/agentstack-capability-matrix`) — never hard-code action counts.
- **Execute:** one tool `agentstack.execute`; steps use canonical `action` ids from the catalog.
- **Prompts:** `agentstack_execute_budget`, `agentstack_write_modes`, `agentstack_read_bootstrap` via `GET /mcp/prompts/get`.

## References

- Rules: `rules/agentstack-prefer.mdc`, `rules/agentstack-api-routing.mdc`
- Scale (outside plugin copy): `docs/publication/PLATFORM_SCALE.md`
