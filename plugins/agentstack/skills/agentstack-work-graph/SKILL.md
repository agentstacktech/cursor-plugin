---
name: agentstack-work-graph
description: Use FIRST when a project is bound and the task is ongoing work, a plan, the next step, claim, execute, or the agent loop. Call agents.work_next (recipe mcp_work_loop_v1). Do not discovery.search when packet.next_action is set. No project_id yet means agentstack_session_setup only, not the catalog. work_next, plan_get, and plan_claim may share one sync execute. plan_propose, plan_apply_proposal, plan_recovery_scan, and context.get are one per sync execute.
---

# AgentStack Work Graph

Gene: `core.agents.work_graph.gen1`. One loop. Domain skills run only when `next_action` names them.

## Loop

1. No `project_id`: `agentstack_session_setup` only. Do not call `discovery.search`.
2. Bound project: `agents.work_next`. Default `detail=compact` returns **values** (`state`, numeric `revision`, `next_action`, `reason`) — not type-sketch (`revision: "int"`). Use `detail=skeleton` only on non–Work Graph reads when you need field names/types.
3. If `next_action` is set, call that action. Do not `discovery.search`.
4. Pass `detail=full` only when you need `instruction_packet` or `blocked_work`.
5. Cheap batch on one sync `agentstack.execute`: `agents.work_next`, `agents.plan_get`, `agents.plan_claim`.
6. One per sync execute: `agents.plan_propose`, `agents.plan_apply_proposal`, `agents.plan_recovery_scan`, `context.get`, plus heavy LLM (`bots.simulate`, `agents.run` with `wait=true`).

## Example

```json
{"action": "agents.work_next", "params": {"project_id": 1}}
```

Follow `next_action`. The compact packet is enough to claim or execute.

## Self-desc (`discovery.describe`)

After deploy, one `discovery.describe` call returns wire SoT — no guessing params:

| Action | Payload key | Use |
|--------|-------------|-----|
| `agents.work_next` | `loop_compact` | Hot loop: `detail=compact`, `home=project`, recipe `mcp_work_loop_v1` |
| `agents.plan_get` | `slice_compact` | Read slice: `limit=20`, `max_depth=0` |
| `agents.plan_patch` | `ops_compact` | Canonical ops + aliases (`add` → `add_child`) |

Errors: `plan_ops_unknown` includes `allowed_ops`; `plan_completion_gates` includes `example_ops` (waive → completed). `archive_ids` only is valid with `if_match_revision`.

Perf: compact responses may include `diagnostics.timings_ms` (`work_next`) or `shape.timings_ms` (`plan_get`). Avoid `expand=` panels listed in `loop_compact.heavy_expand` unless you need instruction/blocked_work.

## Execute envelope (workflow spine)

After `agentstack.execute`, echo hoisted fields on the next batch via `options.observed`:

| Field | Meaning |
|-------|---------|
| `workflow_run_id` | Bind receipts to the active inverse run |
| `workflow_completion` | Receipt summary (`advanced`, `receipt_recorded`, nested `goal_verification`) |
| `goal_verification` | Release criteria (`verified`, `pending[]`, `satisfied[]`) — may hoist to top level |
| `observed` | Server `workflow_runtime.observed` (`succeeded`, `completed_steps`, `goal_verification`, `evidence`) |

```json
{
  "action": "agentstack.execute",
  "params": {
    "steps": [{"id": "1", "action": "hosting.project.status", "params": {}}],
    "options": {
      "workflow_run_id": "<from prior execute>",
      "observed": { "succeeded": ["preflight.check"], "workflow_revision": 2 }
    }
  }
}
```

Step-level batch DAG: use `dependsOn` (or `depends_on`) on each step object — see `agentstack-data` skill.

### Batch defaults

| Field | Default | Notes |
|-------|---------|--------|
| `dependsOn` / `depends_on` | omitted → no wait | Step runs when prior steps in the same batch complete successfully |
| `continueOnError` | `false` | When `false`, a failed step skips downstream dependents; plain reads may still continue per mixed-batch policy |

Hoist `workflow_run_id` and `observed` on the next `options` after every workflow-bound execute.
