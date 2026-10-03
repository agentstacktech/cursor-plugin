---
name: agentstack-agents-ai
description: Use when the user mentions Agents Fleet, agent templates, agent runs, promotion gates, traces, AI Builder, UAM manifests, generation, media creation, or app composition. Routes to agents.*, ai_builder.*, generation.*, and media actions.
---

# AgentStack Agents + AI Builder

Use this skill for autonomous agents and generated application surfaces. Keep the flow decision-first: discover available actions, preview when possible, then run the smallest mutation.

## Decision matrix

| User says | MCP action family |
|-----------|-------------------|
| "create an agent" / "agent template" | `agents.templates_list`, `agents.template_preview`, `agents.create_from_template`, `agents.create` |
| "run this agent" / "stop it" | `agents.run`, `agents.stop`, `agents.traces` |
| "project plan" / "goals tree" / "task list" | `agents.plan_get`, `agents.plan_patch`, `agents.plan_refresh_affinities`, `agents.plan_claim`, `agents.orchestrate` — MCP prompt `agentstack_plan_graph`; flow `UF_PLAN_GRAPH_ROUTINE` |

### Plan graph quick rules

- Merge by stable node `id`; use `if_match_revision` on conflict.
- `skill_ids` / `meta.gene_tags` = pinned; `meta.suggested_*` = hints (refresh without LLM).
- Runtime skills still come from playbook + `resolve_run_skills` — suggestions are not exclusive.
- Tenant prod: `UF_PLAN_GRAPH_ROUTINE` (sandbox → diff `ecosystem.orchestrator.task_list` → promote).
| "promote / gates / rollout" | `agents.gates`, `agents.promote`, `agents.rollout_advance` |
| "compose an app" / "validate UAM" | `ai_builder.manifest.get`, `ai_builder.manifest.validate`, `ai_builder.compose.preview` |
| "generate image/media/content" | `generation.*` or `media.*` from the live capability catalog |

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

## MCP guidance

- **Catalog:** `GET https://agentstack.tech/mcp/actions` — filter `agents.*`, `ai_builder.*`, `generation.*`.
- **Heavy runs:** `agents.run` with `wait=true` counts as one heavy LLM step per sync execute (see `agentstack_execute_budget`).
- **Prompts:** `agentstack_agents_fleet` via `GET /mcp/prompts/get`.

## References

- Live action catalog: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.
- Genetic tag: `core.agents.fleet.gen1` · `frontend.agents.surfaces.gen1`

## Triggers

agent, agents fleet, template, run, trace, promotion, rollout, gates, AI Builder, UAM, compose, generation, media
