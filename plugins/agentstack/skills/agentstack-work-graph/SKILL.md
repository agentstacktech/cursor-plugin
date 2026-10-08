---
name: agentstack-work-graph
description: Use FIRST when a project is bound and the task is ongoing work, a plan, the next step, claim, execute, or the agent loop. Call agents.work_next (recipe mcp_work_loop_v1). Do not discovery.search when packet.next_action is set. No project_id yet means agentstack_session_setup only, not the catalog. work_next, plan_get, and plan_claim may share one sync execute. plan_propose, plan_apply_proposal, plan_recovery_scan, and context.get are one per sync execute.
---

# AgentStack Work Graph

Gene: `core.agents.work_graph.gen1`. One loop. Domain skills run only when `next_action` names them.

## Loop

1. No `project_id`: `agentstack_session_setup` only. Do not call `discovery.search`.
2. Bound project: `agents.work_next`. Default `detail=compact` returns `state`, `next_action`, `reason`, `revision`.
3. If `next_action` is set, call that action. Do not `discovery.search`.
4. Pass `detail=full` only when you need `instruction_packet` or `blocked_work`.
5. Cheap batch on one sync `agentstack.execute`: `agents.work_next`, `agents.plan_get`, `agents.plan_claim`.
6. One per sync execute: `agents.plan_propose`, `agents.plan_apply_proposal`, `agents.plan_recovery_scan`, `context.get`, plus heavy LLM (`bots.simulate`, `agents.run` with `wait=true`).

## Example

```json
{"action": "agents.work_next", "params": {"project_id": 1}}
```

Follow `next_action`. The compact packet is enough to claim or execute.
