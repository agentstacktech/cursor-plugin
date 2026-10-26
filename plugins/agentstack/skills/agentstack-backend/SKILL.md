---
name: agentstack-backend
description: "One-shot domain router after agents.work_next names a domain action (auth, storage, payments, rules, RAG, hosting). Ongoing work, plans, and the agent loop use agentstack-work-graph first."
---

# AgentStack Backend — Master Router

AgentStack is a **full backend ecosystem** exposed through ONE MCP tool: `agentstack.execute`. Capabilities come from live `GET /mcp/actions` (and `/agentstack-capability-matrix`) — do not hard-code action counts in skills.

## Quick router — pick the sub-skill

| User intent signals | Sub-skill | Primary MCP |
|---------------------|-----------|-------------|
| ongoing work / next step / plan / claim / agent loop | `agentstack-work-graph` | `agents.work_next` |
| CRM / pipeline / contact | `agentstack-crm` | `crm.*` |
| business head / organ / command center | `agentstack-business` | `business.*` |
| AGNT / agUSD / AgentNet | `agentstack-agentnet` | `agentnet.*` |
| storefront studio / merchant | `agentstack-storefront-studio` | `commerce.storefront.*` |
| activate selling / first sale / seller onboarding | `agentstack-commerce` | `commerce.sell.activate` |
| project wallet / treasury | `agentstack-project-wallet` | `finance.project.*` + project wallet REST |
| professional services / hire studio /services | `agentstack-services` | REST `/api/public/services/*` (no MCP) |
| /showcase gallery card / featured demo / catalog drift | `agentstack-showcase` | `showcase.catalog.*` on **pid=1** only — tenant DNA → safe cycle |
| Compass playbook / what next / start_path | `agentstack-guidance` | `guidance.*` — never static route guessing |
| where in UI / PAGES_MAP / Discover hub | `agentstack-discovery` | UI manifest — never `guidance.start_path` |
| store, data, config, 8DNA leaves | `agentstack-data` | `projects.patch_data`, `data_access.*` |
| sandbox / canary / generation fork / X-AgentStack-Env | `agentstack-data` | `generation.*` |
| publish site, /s/ URL, ZIP deploy | `agentstack-hosting` | `hosting.*` |
| edit one file on live /s/ site (CSS/HTML/JS) | `agentstack-hosting` | `hosting.bucket.file.patch` (`search_replace`) — **not** `storage.upload` or `projects.patch_data` |
| EDITFLOW / hosted vertical / workspace SaaS / `/s/*/editflow/` | `agentstack-hosted-vertical` | `@agentstack/hosted-wire` + `tenantApi` — not custom backend |
| support ticket, staff inbox, psup | `agentstack-support` | `social.support.*` |
| upload, quota, attachment, media | `agentstack-storage` | `storage.*`, REST upload |
| login, register, role, RBAC | `agentstack-auth-rbac` | `auth.*`, `rbac.*` |
| authorize plugin / Device Code / MCP missing in plugin | Connect on plugin MCP or `/agentstack-authorize` | Plugin `mcp.json` (OAuth) + Device Code → `~/.cursor/mcp.json` |
| when X then Y, automation, workflow | `agentstack-logic` | `logic.*`, `commands.*` |
| StackScript / server-side TS sandbox | `agentstack-stackscript` | `script.*` |
| payment, wallet balance, checkout, buffs (not project treasury) | `agentstack-commerce` | `payments.*`, `wallets.*`, `buffs.*` |
| digital goods, asset wizard | `agentstack-commerce-assets` | `assets.*` |
| RAG, embedding, knowledge base | `agentstack-rag` | `rag.*`, `knowledge.policy_templates.*` |
| cron, scheduled job, in-app / push notify | `agentstack-signals` | `scheduler.*`, `notifications.send_push` |
| Mail Hub / Resend / SMTP / confirm email / reset mail | `agentstack-messaging` | `messaging.*` |
| inbound webhook, Stripe *callback*, integration recipe | `agentstack-integrations` | `integrations.*` |
| project, API key, tenant | `agentstack-projects` | `projects.*`, `apikeys.*` |
| agent fleet, AI Builder, orchestrator | `agentstack-agents-ai` | `agents.*`, `ai_builder.*`, `projects.orchestrator.*` |
| telegram / whatsapp / bot studio | `agentstack-bots` | `bots.*` — not Agents Fleet |
| mentor / KB ingest / knowledge.playground | `agentstack-knowledge` | `knowledge.*` — not generic `rag.*` |
| chat, DM, message ordering | `agentstack-messenger` | `social.chat.*` |
| Slack, integration recipe, inbound webhook | `agentstack-integrations` | `integrations.*` |
| OpenAPI spec, REST surface, endpoint map | `agentstack-openapi` | OpenAPI + REST routing |
| hub task, capability atom | `agentstack-capability-tasks` | PTC manifests |
| TypeScript SDK, sdk.protocol | `agentstack-sdk` | `@agentstack/sdk` |
| Solana grant tooling (optional) | `solana-agentstack-mcp` | grant-scoped actions only |

Pick the **primary** bucket first; consult others by reference for multi-step flows.

**Disambiguation:** project treasury → `agentstack-project-wallet`; personal/commerce wallet → `agentstack-commerce`; inbound Stripe webhook → `agentstack-integrations` (never `@stripe/stripe-js` for AgentStack checkout); **SMTP/Resend email** → `agentstack-messaging` (`messaging.*`); in-app/Web Push → `agentstack-signals` (`notifications.send_push`). Cursor plugin sign-in → `/agentstack-authorize`, not `auth.login`. **Claude asks for scoped API key first** → stop — use MCP Connect (web) or Device Code `--scope-preset=full` per `auth.get_profile.auth_surface.client_auth_ladder`; scoped keys are for CI/automation (`apikeys.create` preset `agent_runner`) only. Product archetype first → `/agentstack-product-flow` or `docs/plugins/PRODUCT_BUILD_FLOW.md`.

## User request → action (hot paths)

**Canonical SoT:** `docs/plugins/CONTEXT_FOR_AI_MCP.md` — edit the table there; run `node provided_plugins/scripts/sync-mcp-hot-path-skill.mjs`.

<!-- BEGIN:AUTOGEN-HOT-PATH-TABLE -->
| User request (example) | Domain | action(s) | Notes |
|------------------------|--------|-----------|--------|
| Create a project | Projects | `projects.create_project` (signed-in) or `projects.create_project_anonymous` (no key yet) | **Cursor plugin:** `/agentstack-authorize` or Connect — not anonymous. Anonymous returns `user_api_key` / `session_token` + neutral `bootstrap` metadata once; configure client headers (see § Anonymous bootstrap). Then `p1.result.project_id` in later steps. |
| List my projects | Projects | `projects.get_projects` | params: `{}` or `{ "limit": 50 }`. |
| Get one project / project stats | Projects | `projects.get_project`, `projects.get_stats` | Need `project_id` (literal or from previous step). |
| Read/write project config (8DNA) | Projects | `projects.get_data`, `projects.patch_data` | **Leaf paths only** — never full-blob `data=` writes. |
| Tenant sandbox / promote | Generation | **Prompt:** `agentstack_tenant_8dna_supply` · `generation.fork`, `generation.diff_vs_prod`, `generation.gates`, `generation.promote`, `generation.realign_to_prod` | Safe cycle default for paid tenants; strategy from `auto_promote_strategy`; not deploy scripts. |
| Give user a 7-day trial | Buffs | `buffs.apply_temporary_effect` | Params: project_id, user_id, effect id/code, duration. |
| List active subscriptions / buffs | Buffs | `buffs.list_active_buffs`, `buffs.get_effective_limits` | project_id, optional user_id. |
| Grant platform tier (ecosystem op) | Buffs | `buffs.grant_subscription` | Prompt `agentstack_platform_subscription_grant` · PID=1 · personal premium/vip or project launch/business/scale. |
| Grant tenant subscription (support/comp) | Buffs | `buffs.grant_tenant_subscription` | Prompt `agentstack_tenant_buff_grant` · recipe `mcp_tenant_manual_entitlement_grant` · tenant PID>1, project write. |
| Grant tenant inventory (digital goods) | Commerce | `commerce.participant.grant_holding` | Pair with subscription grant when SKU is inventory-backed. |
| Sell tenant subscription (paid checkout) | Commerce + Buffs | `buffs.create_buff` → `commerce.sell.activate` → `payments.create` | Auto-grant via webhook (`recipient_project_id`) or C24 — not manual `apply_buff`. Prompt `agentstack_tenant_subscription_monetization`. |
| Create payment / check status / refund | Payments | `payments.create`, `payments.get`, `payments.refund` | AgentPay — **not** Stripe SDK. Balance: `payments.get_balance`. |
| Wallets (personal / commerce) | Wallets | `wallets.list`, `wallets.deposit`, `wallets.transfer` | User/commerce balances — not project treasury (`finance.project.*`). |
| Project wallet / treasury | Finance | `finance.project.portfolio`, `finance.project.fund`, `finance.project.contribute` | Project-scoped treasury segments; pair with `commerce.sell.activate` payouts. |
| Publish site / get /s/ URL | Hosting | `hosting.site.quick_start`, `hosting.deploy_files`, `hosting.release.promote` | Buckets + releases on one `project_id` — not Vercel/Netlify. **Greenfield** → recipe `mcp_hosting_quickstart`. |
| Edit existing /s/ site (rollback path) | Hosting | `hosting.release.snapshot`, `hosting.deploy_files`, `hosting.release.promote` | Recipe **`mcp_hosting_edit_site_safe`** · prompt `agentstack_hosting_edit_site` — **not** quickstart. **One CSS/HTML line** → recipe `mcp_hosting_edit_text_file_v1` (`hosting.bucket.file.patch` `search_replace` only — **no** prior `file.get`; server refreshes `.gz` + `cache_bust`). |
| TypeScript / SDK / OpenAPI | SDK + MCP | `GET /mcp/actions`, `sdk.protocol`, `getCapabilityMatrix()` | Operator scripts: `@agentstack/sdk`. Hosted page: import map `/sdk/v…` + cookie `/s/{pid}/mcp`. Contract: `/openapi-mcp.json` + `/openapi.json` — not raw fetch sprawl. |
| CRM contact / deal pipeline | CRM | `crm.upsert_contact`, `crm.list_contacts`, `crm.create_deal`, `crm.move_deal_stage` | Contact 360: `crm.get_contact_360`; CSV: `crm.import_contacts`. |
| Run project agent / fleet | Agents | `agents.list`, `agents.run`, `agents.create_from_template` | One heavy `agents.run` (`wait=true`) per sync `agentstack.execute` batch. |
| Closed-loop autonomy (plan + verify + teams) | Agents / Discovery / Projects | `discovery.search`, `agents.plan_get`, `agents.work_next`, `agents.ensure_agent`, `agents.plan_claim`, `agents.plan_execute`, `agents.plan_propose`, `agents.plan_apply_proposal`, `agents.plan_recovery_scan`, `agents.orchestrate`, `agents.team.create` | Prompt **`agentstack_closed_loop_autonomy`** · ladder `closed_loop_ladder`. Spine: **`work_next` → `ensure_agent` (provision) → `plan_claim` → `plan_execute`**. Thread same **`env_uuid`** on sandbox forks. Blocked: `diagnostics.harness_state` + `recovery.next_actions` (not `missing_roles`). Plan patch requires `if_match_revision`. Team goals: prefer routed `agents.team.create` over `integrations.*`. |
| Project AI orchestrator (copilot / support / bot brain) | Agents / Projects | `agents.orchestrate`, `projects.orchestrator.get`, `projects.orchestrator.patch` | **Single SoT:** DNA leaf config.project_orchestrator.agent_uuid. Workspace → channel=workspace; messenger support → channel=messenger + conversation_id=psup_p{pid}_u{uid}; bot → channel=bot + bot_uuid. Memory thread via `rag.memory_*` on memory_session_id from run input. Recipes: `mcp_project_operator_session`, `mcp_orchestrator_memory_bootstrap`, `mcp_project_faq_bootstrap`. Link: **closed loop** prompt above for multi-step copilot goals. |
| Import orchestrator marketplace pack | Projects / Assets | `projects.orchestrator.import_from_asset`, preset `project_orchestrator_pack_v2` | Post-deal fulfillment or `orchestrator.importPack` post-create action — not manual DNA blob replace. |
| Bot channel / simulate | Bots | `bots.create`, `bots.set_brain`, `bots.simulate`, `bots.go_live` | `bots.simulate` is heavy LLM — one per batch; channels via `bots.attach_channel`. Lifecycle: `bots.get` returns `lifecycle` (`draft` \| `active` \| `paused` \| `archived`) and `cleanup_action` (`bots.archive` when retiring). **Canonical retire:** `bots.archive` — not ad-hoc deletes. |
| Activate seller / storefront | Commerce | `commerce.sell.activate`, `commerce.storefront.seed_plan`, `commerce.storefront.hosted_publish` | Seller onboarding + hosted vitrine — distinct from marketplace REST (`commerce_rest`). |
| Business head / organ projects | Business | `business.create_composite`, `business.command_snapshot`, `business.list_children` | Multi-project organism — distinct from `generation.*` 8DNA sandbox lineage. **Self-service:** each organ project runs the same closed loop (route/plan/execute/verify) with `context.project_id` = child id. Prompt: `agentstack_business_organism` + `agentstack_closed_loop_autonomy`. |
| Mentor / knowledge KB | Knowledge | `knowledge.kb.ingest`, `knowledge.playground`, `knowledge.config.patch` | Tenant KB + mentor simulate; `knowledge.playground` heavy — one per batch. **Index heal:** `knowledge.kb.heal_index` — not deprecated alias `knowledge.reindex`. Runbook: MCP prompts `agentstack_knowledge_*` + `/agentstack-safe-cycle`. |
| AgentNet proofs / economy | AgentNet | `agentnet.bnb.proof_bundle_for_run`, `agentnet.genome.verify` | AGNT / agUSD rails — never legacy AGC ticker in new integrations. |
| Compass / guided path | Guidance | `guidance.start_path`, `guidance.complete_step`, `guidance.match_playbook` | Platform Compass playbooks — not docs-nav `docs_nav.*`. |
| Field-level data policy (FAP) | Data access | `data_access.set_policy`, `data_access.get_policy` | Prefer FAP over scattered RBAC `if role` checks in app code. |
| AI Builder manifest | AI Builder | `ai_builder.manifest.get`, `ai_builder.compose.preview` | UAM manifest validate before fleet promote or hosted publish. |
| RAG / semantic search / memory | RAG | `rag.collection_create`, `rag.document_add`, `rag.search`, `rag.memory_add` | Tenant KB vs per-session memory — see `rag.memory_search`. |
| Rules / automations | Logic | `logic.create`, `logic.list`, `logic.execute` | No `rules.*` domain — Logic Engine only. |
| Schedule cron job | Scheduler | `scheduler.create_task`, `scheduler.list_tasks`, `scheduler.cancel_task` | |
| Upload files / quota | Storage | `storage.get_quota`, `storage.list_files` + REST `POST /api/storage/upload` | Binary via REST upload endpoint. |
| Marketplace / auction / exchange | REST (same Core) | `GET /mcp/actions` domain **`commerce_rest`** (path hints only) | Not valid `step.action` — use HTTP `/api/marketplace/*`, `/api/exchange/*`. See [MCP_AND_ECOSYSTEM.md](../MCP_AND_ECOSYSTEM.md). |
| Login / register / get profile | Auth | `auth.login`, `auth.register`, `auth.get_profile`, `auth.update_profile` | Session probe: `auth.get_profile` accepts aliases **`auth.me`**, **`auth.profile`**, `auth.status`, `auth.whoami` (same as REST `GET /api/auth/me`). Health: `discovery.health` → `system.ping`. Catalog: `discovery.list_actions` → `discovery.list`. Device Code via plugin OAuth — not a separate MCP action. |
| Assets / inventory | Assets | `assets.create`, `assets.list` | project_id in params. |
| Analytics / dashboard KPIs | Analytics | `analytics.project_snapshot` | Unified snapshot (activity, finance, CRM, product events). Use `include=` for optional slices. Legacy: `analytics.get_usage` (activity slice only), `analytics.get_metrics` (custom DNA counters `data.metrics[]` — not performance KPIs). set_budget is not in the catalog. |
| API keys (project) | API Keys | `apikeys.list`, `apikeys.create`, `apikeys.delete` | Always set `service_caps` on keys for AI agents. Legacy projects API-key aliases are not in catalog. |
| Webhooks / integration recipes | Integrations / notifications | `integrations.list_recipes`, `integrations.connector_schema`, `integrations.install_recipe`, `integrations.test_hook` | Recipe `mcp_integrations_universal_connect_v1`. Missing connection → **`connection_not_found`**; missing scenario → **`scenario_not_found`** (`list_scenarios`). Legacy `webhooks.*` MCP removed. |
| RBAC / permissions | RBAC | `rbac.check_permission`, `rbac.assign_role`, `rbac.get_roles` | Prefer FAP `data_access.set_policy` for field-level gates. |
| In-app messenger | Social | `social.chat.post`, `social.chat.history` | Project-scoped chat — not a second WebSocket stack. |
| Support staff inbox | Social / support | `social.support.inbox`, `social.support.history` | Staff plane — user channel uses `social.chat.*`. |
| Transactional email (Mail Hub) | Messaging | `messaging.send_email`, `messaging.get_config` | Ecosystem email templates — skill `agentstack-messaging`. Admin ops (`messaging.send_test_email`, etc.) are operator-only. |
| Hosted vertical workspace | Vertical workspace | `vertical_workspace.bootstrap`, `checklist.get` | EDITFLOW / Key2Unity — skill `agentstack-hosted-vertical`; `POST /mcp` + flagship `X-Project-ID`. |
| Tenant safe cycle | Generation | `generation.diff_vs_prod`, `generation.gates`, `generation.promote` | Command `/agentstack-safe-cycle` · prompt `agentstack_safe_project_cycle` — sandbox before prod DNA. |
<!-- END:AUTOGEN-HOT-PATH-TABLE -->

## Discovery ladder (when unsure)

<!-- BEGIN:AUTOGEN-DISCOVERY-LADDER -->
0. **Session probe:** `/mcp/prompts/get?name=agentstack_session_setup` (GET)
1. **Work Graph default (bound project):** `agents.work_next` (MCP)
2. **Registry status:** `discovery.status` (MCP)
3. **Schema lookup only — prefer packet.next_action:** `discovery.search` (MCP)
4. **Describe chosen action:** `discovery.describe` (MCP)
5. **Preflight then execute:** `preflight.check` (MCP)
<!-- END:AUTOGEN-DISCOVERY-LADDER -->

Catalog rows expose `when_to_use`, `instruction_hint`, and `capability_descriptor` — prefer those over raw summaries when disambiguating similar tools.

## Product archetypes (pick one first)

<!-- BEGIN:AUTOGEN-PRODUCT-ARCHETYPES -->
| Archetype | MCP recipe | Prompt | SDK hint | flow_id |
|-----------|------------|--------|----------|---------|
| game | card_game_basic | agentstack_use_case_game | — | — |
| saas | saas_trial_system | agentstack_use_case_saas | sdk.platform.auth | create_project_value |
| ecommerce | mcp_hosting_quickstart | agentstack_use_case_ecommerce | sdk.commerce | host_then_sell |
| social | mcp_bots_simulate | agentstack_use_case_social | — | messenger_dm |
| backend_api | mcp_session_setup | agentstack_use_case_backend_api | sdk.protocol | connect_api_key_60s |
| project_setup | mcp_read_bootstrap | agentstack_use_case_project_setup | getCapabilityMatrix | — |
| static_site | mcp_hosting_quickstart | agentstack_hosting_storefront | sdk.hosting.quickStart | hosting_deploy_publish |
| hosted_site_edit | mcp_hosting_edit_site_safe | agentstack_hosting_edit_site | sdk.hosting.quickStart | hosting_edit_site_safe |
| bot_channel | mcp_bots_simulate | agentstack_bots_studio | — | bot_go_live |
| showcase_portfolio_storefront | mcp_universal_safe_change | agentstack_safe_project_cycle | sdk.protocol | UF_F1_ROUTINE |
| migrate_legacy | mcp_session_setup | — | sdk.protocol | — |
| hosted_vertical_saas | mcp_hosted_vertical_bootstrap | agentstack_hosted_vertical | @agentstack/hosted-wire | — |
| service_business | mcp_read_bootstrap | agentstack_crm_workspace | — | crm |
| ai_product | mcp_knowledge_ingest | agentstack_knowledge_mentor | — | knowledge |
| marketplace | mcp_session_setup | agentstack_commerce_flows | — | payments |
| internal_tool | mcp_session_setup | agentstack_session_setup | — | session |
| community | mcp_session_setup | agentstack_social_messenger | — | — |
| key2unity_auth_portal | mcp_key2unity_auth_portal | agentstack_key2unity_site | @agentstack/hosted-wire/activateSession | — |
| support_bot | mcp_bots_simulate | agentstack_bots_studio | — | — |
| knowledge_assistant | mcp_knowledge_ingest | agentstack_knowledge_mentor | — | — |
| agency | mcp_crm_contact_deal | agentstack_crm_workspace | — | — |
| freelancer | mcp_hosted_vertical_bootstrap | agentstack_hosted_vertical | — | — |
| content_site | mcp_hosting_quickstart | agentstack_hosting_static_landing | — | — |
<!-- END:AUTOGEN-PRODUCT-ARCHETYPES -->

## Closed-loop autonomy (projects + business)

<!-- BEGIN:AUTOGEN-CLOSED-LOOP -->
After `context.project_id` is set, multi-step goals use **harness v2 closed loop** — prompt `agentstack_closed_loop_autonomy` · genes `core.agents.work_graph.gen1` · `core.mcp.instruction_plane.gen1` · `repo.ops.closed_loop.harness.gen1`.

**Durable work:** Durable work (more than one read) enters the Work Graph: agents.plan_propose (create_plan or decompose_node), agents.plan_apply_proposal when validation.safe_to_auto_apply, then agents.work_next following next_action until state=idle, blocked, or recoverable. A single domain call (one CRM write, one file upload, discovery.search, auth.get_profile) stays a direct MCP action. Do not mark a node complete from prose — attach meta.verify_after_write_action evidence. Idle with an empty graph is valid.

**Spine:** `agents.work_next` → `agents.ensure_agent` (when provision_required) → `agents.plan_claim` → `agents.plan_execute`.

- **blocked_reason:** blocked_work[].blocked_reason is canonical (block_reason.REASON_PRIORITY); use recovery.next_actions — not validation.missing_roles.
- **H5 parity:** agents.ensure_agent preview template_id must match agents.work_next top compatible_templates[0] for the same node (harness H5 / resolver_parity_v1).

**Harness invariants (H6–H10):**
- **H6** required_capabilities are mandatory — capability_mismatch blocks claim; route agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan; not handoff (capability_hard_gate_v1).
- **H7** Commit-last provision: work_next blocked → ensure_agent create=false (H5 template_id) → create=true provisions with bind_node=False → eligibility gate → rollback on created_agent_not_eligible → next_action agents.plan_claim (bind+lease, if_match_revision); idempotent_replay when bound eligible agent exists.
- **H8** Backlog scan uses planner eligibility (decomposition_status=needed) — not execution_ready; validation_ok reflects plan_valid (structural+semantic), not fleet gaps.
- **H9** plan_propose runs ensure_proposal_facet_coverage (facet_repair, max 2 passes) after enrich for create_plan and decompose_node (including from_draft_tree meta under create_plan) — do not hand-patch semantic facet children; for facet gaps after other modes use mode=repair_plan.
- **H10** meta.planning_artifact nodes are evidence-only (resolution=non_executable_artifact) — attach evidence on parent; plan_process_backlog and claim skip them for execution.
- **H11** node.agent_id binding ≠ active claim lease — already_claimed requires status=in_progress with non-expired lease meta; bound agent on ready/pending is not already_claimed; retry ensure_agent idempotent_replay or plan_claim with if_match_revision.

- **Session + project:** /mcp/prompts/get?name=agentstack_session_setup — bind context.project_id
- **Route goal:** Cold start: no project_id → agentstack_session_setup only. Do not discovery.search until context.project_id is set. Bound project: agents.work_next first; discovery.search only when packet.next_action is absent. Status-only poll → agents.work_status (no claim params).
- **Plan read + sandbox:** agents.plan_get — include_execution_eligibility=true; optional env_uuid for sandbox slice
- **Pick next work:** agents.work_next — read dependency_ready (structural) vs execution_ready (fleet) separately; blocked_work.execution_summary + instruction_packet.execution_summary; dependency_ready=false → wait deps; execution_ready=false with deps ok → provision before claim
- **Draft / decompose (optional):** agents.plan_propose → validation.plan_valid + execution.execution_summary → agents.plan_apply_proposal (same env_uuid and validation_mode); persist_unexecutable for intake-only (H8); plan_process_backlog auto_apply=off; facet_repair bounded max 2 (H9); planning_artifact evidence-only (H10)
- **Claim + execute:** agents.plan_claim — CAS revision; role_mismatch → handoff not retry loop → agents.plan_execute — only after claim; attach evidence for completion_predicates; ensure_agent create=false then create=true when provision_required (H5/H7)
- **Verify + recover:** completion not_evaluable ≠ passed; verification_failed → agents.plan_compaction_preview → agents.plan_heal_leaf (dry_run then apply) — spill_incomplete or plan_graph_too_large; agents.plan_recovery_scan — verification_failed candidates + stale claims; optional env_uuid; agents.plan_propose mode=repair_plan — target node_id; allow_generic_acceptance repair-only; agents.plan_apply_proposal — same env_uuid as propose on sandbox forks; agents.work_next handoff=true node_id=… — re-resolve after repair or provision; diagnostics reconcile
- **Business / team (optional):** /mcp/prompts/get?name=agentstack_business_organism for head+organs; agents.team.create + templates for specialist fleet

Dev gate: doctor --full (repo.ops.closed_loop.harness.gen1); key suites: ensure_agent_provision_e2e_v2, ensure_agent_idempotent_retry_v1, bind_vs_claim_semantics_v1, persist_unexecutable_v1, mcp_structured_domain_error_v1, resolver_parity_v1, instruction_plane_dry_v2, planner_runtime_parity_v3. · `npm run audit:closed-loop-harness`.
<!-- END:AUTOGEN-CLOSED-LOOP -->

## Operator admin BFF (ecosystem diagnostics)

When triaging platform health or admin hub latency, prefer REST BFF patterns — not full composes on every tab load:

- **DIAG_HUB_ETAG:** `GET /api/admin/hub-snapshot` — weak ETag + `If-None-Match` for 304; `source=shell` counts-only vs `source=full` legacy DNA totals.
- **DIAG_CAPABILITIES_SPLIT:** lightweight `GET /api/diagnostics/capabilities/flags` vs heatmap `/capabilities/observability?since=` — avoid monolithic GET `/capabilities` on hub tabs.
- **DIAG_PROBLEMS_CACHE:** prefer hub `problems_summary` (30s TTL aligned with hub); full `GET /api/diagnostics/problems` only on expand.
- **DIAG_HUB_PHASES:** shellBeacons `admin_hub_phase_start` / `admin_hub_phase_done` with `duration_ms` for phased fetch triage.
- **DIAG_SHOWCASE_WARM:** showcase-excl count projector warms at startup (300s TTL); commerce T0 KPI warm pairs with hub cold path.

Genetic tags: `shared.diagnostics.unified.gen1` · `repo.platform.perf.batch.gen1`.

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

Sync `agentstack.execute` is **60s for the whole batch** (`mcp_batch`) — not an RBAC limit. Cheap list/get may batch. Prompt: `agentstack_execute_budget` · rollup: `GET /mcp/actions` → `execute_budget`.

**Heavy LLM (one per sync execute):** prefer `options.async=true` on the step, then poll — do not stack multiple heavy steps in one sync batch.

- **`knowledge.playground`** — mentor simulate; poll `discovery.job_status` after async enqueue.
- **`bots.simulate`** — dry-run bot brain; suites: one simulate per execute (unique `external_user_id`), or async + poll.
- **`agents.run`** with `wait=true` — poll `discovery.job_status` **or** `agents.run_get` for run-specific status.

**Catalog (W9):** `discovery.list` / `discovery.list_actions` rows include **`async_execute`** when an action supports async enqueue — use before assuming sync-only. Same hint on `discovery.describe` for a single action.

## MCP guidance

- **Catalog:** `GET https://agentstack.tech/mcp/actions` (or `/agentstack-capability-matrix`) — never hard-code action counts.
- **Execute:** one tool `agentstack.execute`; steps use canonical `action` ids from the catalog.
- **Prompts:** `agentstack_execute_budget`, `agentstack_write_modes`, `agentstack_read_bootstrap` via `GET /mcp/prompts/get`.

## References

- Rules: `rules/agentstack-prefer.mdc`, `rules/agentstack-api-routing.mdc`
- Scale (outside plugin copy): `docs/publication/PLATFORM_SCALE.md`
