---
name: agentstack-agents-ai
description: "Bound project: agents.work_next (recipe mcp_work_loop_v1) before catalog search. discovery.search is fallback only. Also when the user mentions Agents Fleet, agent templates, agent runs, promotion gates, traces, AI Builder, UAM manifests, generation, media creation, or app composition. Routes to agents.*, ai_builder.*, generation.*, and media actions."
---

# AgentStack Agents + AI Builder

Use this skill for autonomous agents and generated application surfaces. Keep the flow decision-first: discover available actions, preview when possible, then run the smallest mutation.

## Decision matrix

| User says | MCP action family |
|-----------|-------------------|
| "create an agent" / "agent template" | `agents.templates_list`, `agents.template_preview`, `agents.create_from_template`, `agents.create` |
| "run this agent" / "stop it" | `agents.run`, `agents.stop`, `agents.traces` |
| "project plan" / "goals tree" / "task list" | `agents.plan_get`, `agents.work_next`, `agents.plan_patch`, `agents.plan_refresh_affinities`, `agents.plan_claim`, `agents.plan_execute`, `agents.ensure_agent`, `agents.orchestrate` — MCP prompt `agentstack_plan_graph`; closed loop § below; flow `UF_PLAN_GRAPH_ROUTINE` |

### Plan graph quick rules

- Merge by stable node `id`; use `if_match_revision` on conflict.
- `skill_ids` / `meta.gene_tags` = pinned; `meta.suggested_*` = hints (refresh without LLM).
- Runtime skills still come from playbook + `resolve_run_skills` — suggestions are not exclusive.
- Tenant prod: `UF_PLAN_GRAPH_ROUTINE` (sandbox → diff `ecosystem.orchestrator.task_list` → promote).
| "promote / gates / rollout" | `agents.gates`, `agents.promote`, `agents.rollout_advance` |
| "compose an app" / "validate UAM" | `ai_builder.manifest.get`, `ai_builder.manifest.validate`, `ai_builder.compose.preview` |
| "create react app" / "app studio blueprint" / PT `criar aplicativo react` | `mcp_app_studio_create_v1` → `ai_builder.compose.apply` |
| "edit react source" / "patch component" / PT `editar código fonte` | `mcp_app_studio_edit_v1` → `ai_builder.source.get` (view=skeleton or `symbol` on recovery) → `ai_builder.source.patch` (replacements or `symbol_name`+`symbol_body`) |
| "build vite" / "compile app" / PT `compilar aplicativo` | `mcp_app_studio_build_v1` → `ai_builder.build.enqueue` → `ai_builder.build.status` (omit build_uuid) |
| "publish react app" | `mcp_app_studio_publish_v1` only when user asks |
| "generate image/media/content" | `generation.*` or `media.*` from the live capability catalog |

### App Studio agent loop (gene: `core.app_studio.pipeline.gen1`)

- Phase recipes only — `mcp_app_studio_v1` is a template (`executable: false`).
- Page UI → `src/routes/Route0.tsx` `@slot:page` … `@endslot`; keep `App.tsx` thin.
- Protected (never patch): `vite.config.ts`, `package.json`, `index.html`, `src/main.tsx`, `src/styles/app.css`.
- On `ai_builder.build.status` failed: `error_code` `syntax_error` or `dependency_error` + `errors[{file,line,message}]` → `ai_builder.source.get` that file → `ai_builder.source.patch` once → `ai_builder.build.enqueue`. Browserslist/caniuse warnings are **not** failures.
- `digest_mismatch` → re-read `sha256` from `ai_builder.source.get` before patch.
- Prompt: `agentstack_app_studio`.

## Rules

- First call discovery (`GET /mcp/actions` or `/agentstack-capability-matrix`) if an exact action name is uncertain.
- Prefer preview actions before persistence: `agents.template_preview`, `ai_builder.compose.preview`.
- For destructive lifecycle changes (`agents.delete`, `agents.kill`), ask for confirmation and surface the trace id.
- Do not invent agent metrics or run status. Use `agents.metrics` and `agents.traces`.
- `agents.run` with `wait=true` is **heavy_llm** (same 60s sync-batch rule as `bots.simulate`, `knowledge.playground`) — one per sync `agentstack.execute`. Do not wait on several runs in one batch; prefer `options.async=true` then poll `discovery.job_status` or `agents.run_get` (see `async_execute` on `discovery.list` rows).

## Example

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      { "action": "agents.templates_list", "params": {} },
      { "action": "agents.create_from_template", "params": { "template_id": "support_triage", "project_id": 1025 } },
      { "action": "agents.run", "params": { "agent_uuid": "{{agent_uuid}}", "input": { "ticket_id": "T-123" } } }
    ]
  }
}
```

### Inverse orchestration (bounded MCP steps)

Reuse the same `workflow_run_id` for every step in one session. Honor `allowed_actions` from the instruction packet; on violation read `orchestration_step_violation` and resume — do not mint a new run id per retry.

```json
{
  "tool": "agentstack.execute",
  "params": {
    "context": { "project_id": 1025 },
    "steps": [
      {
        "action": "guidance.start_path",
        "params": { "playbook_id": "inverse_ops_v1", "workflow_run_id": "wr-abc-001" }
      },
      {
        "action": "agents.run",
        "params": {
          "agent_uuid": "{{agent_uuid}}",
          "input": { "inverse": { "workflow_run_id": "wr-abc-001", "step_index": 0 } }
        }
      }
    ]
  }
}
```

## Work graph plane chooser

<!-- BEGIN:AUTOGEN-PLANE-CHOOSER-AGENTS-AI -->
Plan graph: agents.plan_get with project_id. Next leaf: agents.work_next — read dependency_ready vs execution_ready separately. dependency_ready=false means wait on deps; execution_ready=false with dependency_ready=true means fleet/provision. Draft changes: agents.plan_propose then agents.plan_apply_proposal (same env_uuid). Claim: agents.plan_claim with if_match_revision from plan_get. Blocked with templates: agents.ensure_agent (preferred) then agents.create_from_template — not a second custom resolver.

**Discovery rank:** Team-create goals (agents.team.create): discovery rank demotes integrations.* — prefer agents.team.create / agents.orchestrate / agents.plan_* over integrations.oauth_begin.
<!-- END:AUTOGEN-PLANE-CHOOSER-AGENTS-AI -->

## Closed-loop harness v2

<!-- BEGIN:AUTOGEN-CLOSED-LOOP-AGENTS-AI -->
Multi-step project goals: prompt `agentstack_closed_loop_autonomy` · genes `core.agents.work_graph.gen1` · `core.mcp.instruction_plane.gen1` · `repo.ops.closed_loop.harness.gen1`.

**Durable work:** Durable work (more than one read) enters the Work Graph: agents.plan_propose (create_plan or decompose_node), agents.plan_apply_proposal when validation.safe_to_auto_apply, then agents.work_next following next_action until state=idle, blocked, or recoverable. A single domain call (one CRM write, one file upload, discovery.search, auth.get_profile) stays a direct MCP action. Do not mark a node complete from prose — attach meta.verify_after_write_action evidence. Idle with an empty graph is valid.

**Compass playbook (before ladder):** `guidance.list` → confirm `work-graph-agent-loop` in catalog → `guidance.match_playbook` (closed-loop goal_text) → `guidance.start_path` with `catalog_entry.id` from match.

**Execution spine:** `agents.plan_get` → **`agents.work_next`** → **`agents.ensure_agent`** (when `provision_required` + `fully_provisionable`) → **`agents.plan_claim`** → **`agents.plan_execute`**. Decompose on the same `env_uuid`: `agents.plan_propose` → `agents.plan_apply_proposal`.

1. **`agents.work_next`** — read `dependency_ready` (structural) vs `execution_ready` (fleet) separately; `dependency_ready=false` → wait on deps; `execution_ready=false` with deps ok → provision before claim.
2. **Blocked** → `blocked_work[].blocked_reason` + `recovery.next_actions` / packet `next_actions` — canonical (`WG_BLOCKED_REASON`; not legacy `missing_roles`).
3. **`agents.ensure_agent`** — preview `template_id` must match `work_next` top `compatible_templates[0]` (**H5** / `resolver_parity_v1`); saga **H7**: `create=false` then `create=true`; rollback on `created_agent_not_eligible`.
4. **`agents.plan_claim`** (CAS `if_match_revision`; mismatch → `work_next handoff=true`) → **`agents.plan_execute`** — claim before execute (`WG_CLAIM_BEFORE_EXECUTE`).
5. **Plan-only decompose:** `agents.plan_propose` with `validation_mode=persist_unexecutable` when fleet gaps expected (**H8** backlog = planner plane; **H9** facet_repair; **H10** skip `planning_artifact`).
6. **Dev gate:** closed-loop harness `doctor --full` (gene `repo.ops.closed_loop.harness.gen1`) · `npm run audit:closed-loop-harness`.

**Harness invariants (H6–H10):**
- **H6** required_capabilities are mandatory — capability_mismatch blocks claim; route agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan; not handoff (capability_hard_gate_v1).
- **H7** Commit-last provision: work_next blocked → ensure_agent create=false (H5 template_id) → create=true provisions with bind_node=False → eligibility gate → rollback on created_agent_not_eligible → next_action agents.plan_claim (bind+lease, if_match_revision); idempotent_replay when bound eligible agent exists.
- **H8** Backlog scan uses planner eligibility (decomposition_status=needed) — not execution_ready; validation_ok reflects plan_valid (structural+semantic), not fleet gaps.
- **H9** plan_propose runs ensure_proposal_facet_coverage (facet_repair, max 2 passes) after enrich for create_plan and decompose_node (including from_draft_tree meta under create_plan) — do not hand-patch semantic facet children; for facet gaps after other modes use mode=repair_plan.
- **H10** meta.planning_artifact nodes are evidence-only (resolution=non_executable_artifact) — attach evidence on parent; plan_process_backlog and claim skip them for execution.
- **H11** node.agent_id binding ≠ active claim lease — already_claimed requires status=in_progress with non-expired lease meta; bound agent on ready/pending is not already_claimed; retry ensure_agent idempotent_replay or plan_claim with if_match_revision.

**`agents.work_next` when_blocked:**
| Signal | Route |
|--------|-------|
| `membership_required` | Open community hub: call projects.join on context.project_id, then agents.work_next with home=project_self (recipe mcp_community_hub_v1). |
| `join_not_allowed` | Project is not open-join — request invite or projects.add_user from an owner. |
| `provision_required` | ensure_agent create=false (H5) then create=true then plan_claim |
| `no_compatible_agent` | agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan |
| `planning_required` | agents.plan_propose mode=create_plan or decompose_node — strategic/decomposition node, not execution |
| `planning_blocked` | agents.plan_propose mode=decompose_node or plan_process_backlog — finish planner plane first |
| `dependency_blocked` | agents.plan_get to inspect upstream deps; do not ensure_agent; do not claim |
| `checklist_gate_open` | Complete checklist gates on meta.checklist_gates (plan_node entity); agents.plan_get node_id=… — do not patch description as a blocker |
| `claim_empty` | agents.work_next handoff=true — no nodes claimed; refresh claimable set |
| `node_not_found` | agents.plan_get include_claimable=true — node_id absent from graph slice |
| `node_not_eligible` | agents.plan_get on the same home — node failed evaluate_work_eligibility; agents.work_next handoff=true and follow recovery.next_actions |
| `plan_claim_owner_conflict` | agents.work_next handoff=true — another operator holds the lease |
| `role_mismatch` | work_next handoff=true node_id=… — do not retry same agent |
| `specialization_mismatch` | work_next handoff=true — follow recovery.next_actions |
| `capability_mismatch` | agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan |
| `verification_failed` | agents.plan_recovery_scan → plan_propose mode=repair_plan |
| `fully_provisionable` | ensure_agent create=false (H5) then create=true (preferred over create_from_template) |
| `generation_fork_required` | auto_generation_mode on — call generation.fork (or omit env_uuid for MCP auto-fork), then retry with env_uuid from receipt on home=project |
| `supersede_in_progress` | agents.plan_get then wait/retry — in-progress node cannot be superseded without options.force_supersede_in_progress (retryable) |
| `unknown_skill_id` | Fix node skill_ids to ecosystem catalog (agents.skills_list); use rag.retrieval / rag.ingest_acceptance — not MCP action names; re-run plan_propose after enrich |
| `missing_required_dependency` | agents.plan_propose mode=decompose_node or repair_plan — facet DAG edge missing (storage→knowledge, logic→scheduler); inspect dependencies_to_add |
| `planner_duplicate_children` | agents.plan_get — semantic facet children already exist; re-propose is a no-op or use mode=replan_subtree |
| `plan_revision_conflict` | agents.plan_get reload if_match_revision; retry claim/apply (retryable) |
| `invalid_state_transition` | agents.plan_get node status — legal FSM only; completed↔cancelled retries are no-ops |
| `plan_patch_ops_limit` | Too many ops[] in one plan_patch — split batches; plan_get between writes (max 50) |
| `plan_patch_inline_body_spill` | Inline prose exceeds chunk seal — agents.graph_file_put; follow spill recovery in error data |
| `wire_budget_exceeded` | Slice too large — narrow node_id, max_depth, or use detail=cards (detail=body|full past wire budget) |
| `invalid_detail` | detail/projection/limit validation — see problem.field in error payload |
| `text_revision_conflict` | patch_text — re-read the field from plan_get; refresh expected_text_sha256 |
| `ambiguous_anchor` | patch_text search_replace — longer find, set count, or graph_file_get text window |
| `expired_claim` | agents.plan_reclaim_stale — lease expired; do not treat as dependency_blocked |
| `wip_full` | Agent WIP cap reached — agents.plan_get then complete/release in_progress claims; retry plan_claim |
| `plan_graph_load_failed` | DNA/graph slice failed to load — plan_get (compact) then retry. If patch used a long title (>256), use patch_text or shorten title; see validation_error + field=title instead of this code when preflight maps PGVE. |
| `pin_inventory_full` | Goal pin inventory at active_max — unpin a slot (plan affinity) then retry agents.plan_claim |
| `pin_slot_not_found` | No matching goal pin slot for skill_id and agent_id — agents.plan_get pin_slots then retry |
| `claim_heartbeat_failed` | No active in_progress lease for node_id — plan_claim the node before heartbeat_only pin ops |
| `session_user_required` | Personal or session-scoped home needs a signed-in operator user_id in MCP context (or principal_user_id on the tool). |
| `permission_denied` | Project RBAC denied — rbac.check_permission, confirm membership, or dev-operator persona for platform substrate tools. |
| `plan_graph_private` | Orchestrator graph is private — sign in (user_id in MCP context) or set orchestrator public_read; project API keys must include created_by user. |
| `not_authenticated` | No MCP operator session — auth.get_profile first. Cursor plugin: Connect (G-A174) or Device Code /agentstack-authorize; do not call mcp_auth from the agent. |
| `relogin_required` | Session invalidated (deploy, eviction, or X-Session-Action: relogin_required) — re-authenticate: auth.get_profile or hosted remint; do not retry the same Bearer in a loop. |
| `unauthorized` | Same as auth_required — OAuth Connect, Device Code, or Bearer from profile API key; then agentstack_session_setup and context.project_id. |
| `auth_required` | Authenticate before work-graph spine — auth.get_profile → context.project_id → agents.work_next (not discovery.search). |
| `service_caps_required_in_prod` | Project API key has no L1 service_caps — recreate with admin permissions (auto agents_autonomous_loop in prod) or user.apikeys.create preset agents_autonomous_loop / full_project; pass context.project_id=1 for ecosystem graph. |
| `service_cap_denied` | Key lacks required L1 cap (often mcp_read or project_admin for plan_patch). Widen via apikeys.create (full_project) or reconnect MCP with full OAuth scope. If project role is owner/admin, MCP widens caps for execute project_id — call auth.get_profile (credential_plane) to confirm key_preview and caps; align context.project_id with the tenant before agents.plan_get / plan_patch. |
| `run_not_found` | No run row for run_id in this project — verify run_id from agents.run or traces. |
| `run_not_waiting_for_approval` | agents.run_get — run is not waiting_for_approval; poll status before approve_run |
| `approval_hash_mismatch` | agents.run_get — approval_artifact_hash must match pending tool call on the run |
| `import_pack_personal_home_unsupported` | Orchestrator import pack requires home=project; personal session graphs use export/read paths only. |
| `terminal` | agents.work_next — skip terminal node; pick another leaf (completed/cancelled not claimable) |
| `waiting_input` | agents.work_next — ask_user recovery; do not plan_claim until operator input arrives |
| `waiting_approval` | agents.work_next — wait approval gate; agents.plan_get to inspect approval meta |
| `decomposition_blocked` | agents.plan_propose mode=decompose_node — parent has open decomposition children |
| `already_claimed` | agents.work_next — check in_progress lease (H11); handoff if wrong agent; plan_reclaim_stale if stale |
| `not_executable` | kind note and catalog are memory, not work. Do not plan_claim them. Claim a task, step, or issue on the same home. |
| `status_not_claimable` | agents.plan_get on the same home. Claim only pending or ready nodes, or an in_progress node whose lease has expired. |
| `skill_mismatch` | agents.work_next handoff=true — skill_ids mismatch; follow recovery.next_actions |
| `missing_capability` | agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan |
| `internal_execution_error` | agents.plan_recovery_scan → plan_propose mode=repair_plan; retry after catalog refresh |
| `created_agent_not_eligible` | Provision rolled back — plan_propose mode=repair_plan or pick template with matching caps (H5) |
| `ensure_agent_stamp_mismatch` | Replay create=false preview; create=true must match preview_template_id + graph_revision |
| `plan_claim_required` | agents.plan_claim if_match_revision — in_progress lease before agents.plan_execute |
| `plan_completion_blocked` | Attach completion_predicates evidence; do not retry agents.plan_execute until allowed |
| `run_failed` | agents.work_next detail=compact — inspect run traces; repair_plan or reclaim before retry |
| `plan_focus_invalid` | agents.work_next detail=compact — refresh focus_node_id from packet next_action |
| `orchestrator_binding_stale` | agents.reconcile_binding repair=true |
| `invalid_channel` | channel must be workspace, messenger, bot, mcp, or api — retry agents.orchestrate with a supported surface |
| `orchestrator_agent_missing` | projects.orchestrator.get then projects.orchestrator.patch (or owner/agents_admin auto-provision on prod); sandbox env_uuid cannot provision — bind on prod and reconcile before sandbox orchestrate |
| `orchestrate_failed` | resolve_and_run failed — read data.error_code; agents.fleet_diagnostics, agents.reconcile_binding, or agents.run_get when run_uuid is present |
| `invalid_parameters` | project_id and run_id required — agent_id is optional when run_id is supplied. |
| `batch_semantic_anchor_conflict` | Align step NL with batch goal anchor — use one goal_text for the batch or split batches |
| `conflicting_semantic_anchor` | Same as batch_semantic_anchor_conflict — per-step NL vs batch semantic_contract |
| `batch_semantic_anchor_required` | Batch includes a mutating or non-plain-read step: set options.execution_intent=direct for authorized CRUD, or options.goal, focus_node_id, or plan_execute_mode for workflow. Plain reads and validate_only (e.g. script.put) may run without goal. Use preflight.check simulate_batch_actions + simulate_batch_params (or execution_intent) to preview anchor. |
| `dependency_error` | Batch only — DAG: a prior step failed or was skipped; fix the first failed step_id. Standalone notifications.deliver / channels.deliver use channel_not_linked or channels.create_bind_link, not dependency_error. |
| `template_not_found` | agents.templates_list — template_id missing from catalog; agents.template_preview before create=true |
| `provisioning_failed` | create_from_template or bind failed — retry agents.ensure_agent create=false (H5) then create=true |
| `validation_error` | Re-run agents.plan_propose; inspect validation.errors — agents.plan_get before plan_apply_proposal |
| `mode_not_implemented` | Use create_plan | decompose_node | replan_subtree | repair_plan | optimize_plan — discovery.describe agents.plan_propose |
| `node_already_atomic` | Complexity too low to decompose — agents.work_next or agents.plan_get for another leaf |
| `replan_budget_exceeded` | Max replans per node exceeded — agents.plan_propose mode=repair_plan on parent or escalation |
| `forbidden` | Project write or project_admin required — rbac.check_permission before agents.reconcile_binding repair=true |
| `env_uuid_project_only` | Omit env_uuid or set home=project and retry. self and project_self are the session row and cannot take a sandbox slice. |
| `graph_home_unknown` | home must be project, self, or project_self. Retry agents.plan_get or agents.plan_patch with one of those values. |
| `graph_home_address_required` | Personal home needs a resolved session address. Pass home on the tool and ensure the operator session has user_id before patch. |
| `plan_ops_parent_missing` | add_child parent_id is not in the graph — create the parent first or fix parent_id. |
| `plan_graph_children_exceeded` | Direct children per parent are capped (32). Flat parent_id storage counts siblings under each parent_id — not total graph nodes. Split into sub-groups or use agents.plan_propose decompose_node. |
| `plan_graph_too_large` | The merged graph does not fit the JSON leaf (see graph_limits.inline_write_hard_limit_bytes, typically 512 KiB). Bodies spill near chunk_spill_target_bytes (~400 KiB). For huge prose use node.prompt/detail (not only meta.description), append_storage_ref (stubs inline text), reorder_children {parent_id,child_ids}, or storage file maps in meta.storage_refs. Cards keep ~200-char stubs after spill. Read one node with plan_get detail=body and node_id. Archive completed nodes (op archive) if titles/meta still overflow. Do not retry the same blob. |
| `plan_patch_nodes_missing_from_changed` | Revision moved but new node ids are absent on plan_get — align generation_env_uuid on context and tool params; deploy compaction protect_ids (undated completed purge); run prelude bucket parents before child ingest batches. |
| `run_mismatch` | run_id does not belong to the supplied agent_id — omit agent_id or fix the pair. |
| `agent_not_found` | agent_id not in project fleet — use agents.team or plan_get before run_get. |
| `waiting_for_approval` | Run status waiting_for_approval — agents.approve_run with approval_artifact_hash from run_detail. |
| `batch_project_scope_leak` | A failed MCP batch step with params.project_id does not retarget later steps — only auth.switch_project may promote batch context.project_id. Re-bind context.project_id before mutations if a step used a probe pid. |
| `workflow_batch_bind_failed` | agents.reconcile_binding repair=true — guidance bind failed; check member row / session |
| `workflow_batch_context_bind_failed` | agents.reconcile_binding repair=true — batch context bind failed |
| `workflow_state_key_stamp_failed` | agents.reconcile_binding repair=true — workflow_state_key stamp failed |
| `workflow_inverse_sync_failed` | agents.reconcile_binding repair=true — inverse session sync failed |
| `workflow_batch_receipt_failed` | Step succeeded but receipt stamp failed — agents.reconcile_binding repair=true; retry read-only agents.plan_get before mutating |
| `workflow_receipt_context_missing` | Active workflow receipt missing workflow_run_id or step_id — agents.reconcile_binding repair=true; agents.work_next handoff=true detail=compact |
| `workflow_receipt_unbound` | Workflow receipt not bound to session — agents.reconcile_binding repair=true |
| `orchestration_step_violation` | Action outside current workflow step — follow packet next_action / inverse_resume; do not mutate graph until step advances. For notifications.deliver inside a playbook: run preflight.check first or use packet.next_action — not a raw deliver outside the step allow-list. |
| `discovery_search_recursion` | Run one discovery.search with a concrete q=, then discovery.describe on canonical action ids. Do not chain or batch many discovery.search steps. |
| `workflow_batch_bind_skipped` | Binding skipped (read-only batch or missing workflow_run_id) — agents.work_next handoff=true if follow-up work is expected |
| `work_next_enrich_failed` | agents.work_next handoff=true detail=compact |
| `work_next_repeat_reconcile_failed` | agents.reconcile_binding repair=true |
| `guidance_user_row_not_found` | auth.get_profile then agents.work_next handoff=true |
| `dependency_failed` | Prerequisite batch step did not succeed — fix or remove dependsOn; poll verification_action before retrying dependent step |
| `graph_storage_empty` | Prod task_list leaf is empty at revision 0 — restore via generation supply and agents.plan_patch; do not empty-overwrite revision 0. |
- **env_uuid:** Thread the same env_uuid across plan_get, plan_propose, plan_apply_proposal, plan_process_backlog, plan_recovery_scan, and work_next on sandbox forks.
- **handoff:** role_mismatch / specialization_mismatch after claim → work_next handoff=true node_id=… — follow recovery.next_actions, do not retry same agent. capability_mismatch is missing required_capabilities: repair_plan or ensure_agent, not handoff.

**Ladder detail:**
- **Pick next work:** agents.work_next — read dependency_ready (structural) vs execution_ready (fleet) separately; blocked_work.execution_summary + instruction_packet.execution_summary; dependency_ready=false → wait deps; execution_ready=false with deps ok → provision before claim
- **Draft / decompose (optional):** agents.plan_propose → validation.plan_valid + execution.execution_summary → agents.plan_apply_proposal (same env_uuid and validation_mode); persist_unexecutable for intake-only (H8); plan_process_backlog auto_apply=off; facet_repair bounded max 2 (H9); planning_artifact evidence-only (H10)
- **Claim + execute:** agents.plan_claim — CAS revision; role_mismatch → handoff not retry loop → agents.plan_execute — only after claim; attach evidence for completion_predicates; ensure_agent create=false then create=true when provision_required (H5/H7)
- **Verify + recover:** completion not_evaluable ≠ passed; verification_failed → agents.plan_recovery_scan — verification_failed candidates + stale claims; optional env_uuid; agents.plan_propose mode=repair_plan — target node_id; allow_generic_acceptance repair-only; agents.plan_apply_proposal — same env_uuid as propose on sandbox forks; agents.work_next handoff=true node_id=… — re-resolve after repair or provision; diagnostics reconcile
<!-- END:AUTOGEN-CLOSED-LOOP-AGENTS-AI -->

## MCP guidance

- **Catalog:** `GET https://agentstack.tech/mcp/actions` — filter `agents.*`, `ai_builder.*`, `generation.*`.
- **Heavy runs:** `agents.run` (`wait=true`) — one **heavy_llm** per sync execute; `options.async=true` → `discovery.job_status` or `agents.run_get` (catalog `async_execute` on `discovery.list` rows). Same async pattern for `knowledge.playground` / `bots.simulate` when batched with fleet work — see `agentstack_execute_budget`.
- **Prompts:** `agentstack_agents_fleet` via `GET /mcp/prompts/get`.

## References

- Live action catalog: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.
- Genetic tags: `core.agents.fleet.gen1` · `core.agents.work_graph.gen1` · `repo.ops.closed_loop.harness.gen1` · `frontend.agents.surfaces.gen1`

## Triggers

agent, agents fleet, template, run, trace, promotion, rollout, gates, AI Builder, UAM, compose, generation, media
