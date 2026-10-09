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
- `agents.run` with `wait=true` is a **heavy** MCP step (same 60s sync-batch rule as `bots.simulate`). Do not wait on several runs in one sync execute.

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
6. **Dev gate:** `npm run audit:closed-loop-harness` (monorepo: closed_loop_harness `doctor --full`, gene `repo.ops.closed_loop.harness.gen1`).

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
| `provision_required` | ensure_agent create=false (H5) then create=true then plan_claim |
| `no_compatible_agent` | agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan |
| `planning_required` | agents.plan_propose mode=create_plan or decompose_node — strategic/decomposition node, not execution |
| `planning_blocked` | agents.plan_propose mode=decompose_node or plan_process_backlog — finish planner plane first |
| `dependency_blocked` | dependency_ready=false — wait deps; do not ensure_agent |
| `role_mismatch` | work_next handoff=true node_id=… — do not retry same agent |
| `specialization_mismatch` | work_next handoff=true — follow recovery.next_actions |
| `capability_mismatch` | agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan |
| `verification_failed` | agents.plan_recovery_scan → plan_propose mode=repair_plan |
| `fully_provisionable` | ensure_agent create=false (H5) then create=true (preferred over create_from_template) |
| `supersede_in_progress` | agents.plan_get then wait/retry — in-progress node cannot be superseded without options.force_supersede_in_progress (retryable) |
| `planner_duplicate_children` | agents.plan_get — semantic facet children already exist; re-propose is a no-op or use mode=replan_subtree |
| `plan_revision_conflict` | agents.plan_get reload if_match_revision; retry claim/apply (retryable) |
| `expired_claim` | agents.plan_reclaim_stale — lease expired; do not treat as dependency_blocked |
| `wip_full` | Agent WIP cap reached — agents.plan_get then complete/release in_progress claims; retry plan_claim |
| `terminal` | agents.work_next — skip terminal node; pick another leaf (completed/cancelled not claimable) |
| `waiting_input` | agents.work_next — ask_user recovery; do not plan_claim until operator input arrives |
| `waiting_approval` | agents.work_next — wait approval gate; agents.plan_get to inspect approval meta |
| `decomposition_blocked` | agents.plan_propose mode=decompose_node — parent has open decomposition children |
| `already_claimed` | agents.work_next — check in_progress lease (H11); handoff if wrong agent; plan_reclaim_stale if stale |
| `skill_mismatch` | agents.work_next handoff=true — skill_ids mismatch; follow recovery.next_actions |
| `missing_capability` | agents.ensure_agent create=false (H5) then create=true, or plan_propose mode=repair_plan |
| `internal_execution_error` | agents.plan_recovery_scan → plan_propose mode=repair_plan; retry after catalog refresh |
| `created_agent_not_eligible` | Provision rolled back — plan_propose mode=repair_plan or pick template with matching caps (H5) |
| `ensure_agent_stamp_mismatch` | Replay create=false preview; create=true must match preview_template_id + graph_revision |
| `plan_claim_required` | agents.plan_claim if_match_revision — in_progress lease before agents.plan_execute |
| `plan_completion_blocked` | Attach completion_predicates evidence; do not retry agents.plan_execute until allowed |
| `run_failed` | agents.work_next detail=compact — inspect run traces; repair_plan or reclaim before retry |
| `invalid_parameters` | project_id and run_id required — agent_id is optional when run_id is supplied. |
| `run_not_found` | No run row for run_id in this project — verify run_id from agents.run or traces. |
| `run_mismatch` | run_id does not belong to the supplied agent_id — omit agent_id or fix the pair. |
| `agent_not_found` | agent_id not in project fleet — use agents.team or plan_get before run_get. |
| `waiting_for_approval` | Run status waiting_for_approval — agents.approve_run with approval_artifact_hash from run_detail. |
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
- **Heavy runs:** `agents.run` with `wait=true` counts as one heavy LLM step per sync execute (see `agentstack_execute_budget`).
- **Prompts:** `agentstack_agents_fleet` via `GET /mcp/prompts/get`.

## References

- Live action catalog: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.
- Genetic tags: `core.agents.fleet.gen1` · `core.agents.work_graph.gen1` · `repo.ops.closed_loop.harness.gen1` · `frontend.agents.surfaces.gen1`

## Triggers

agent, agents fleet, template, run, trace, promotion, rollout, gates, AI Builder, UAM, compose, generation, media
