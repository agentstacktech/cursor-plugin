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
| "promote / gates / rollout" | `agents.gates`, `agents.promote`, `agents.rollout_advance` |
| "compose an app" / "validate UAM" | `ai_builder.manifest.get`, `ai_builder.manifest.validate`, `ai_builder.compose.preview` |
| "generate image/media/content" | `generation.*` or `media.*` from the live capability catalog |

## Rules

- First call discovery (`GET /mcp/actions` or `/agentstack-capability-matrix`) if an exact action name is uncertain.
- Prefer preview actions before persistence: `agents.template_preview`, `ai_builder.compose.preview`.
- For destructive lifecycle changes (`agents.delete`, `agents.kill`), ask for confirmation and surface the trace id.
- Do not invent agent metrics or run status. Use `agents.metrics` and `agents.traces`.

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

## References

- Live action catalog: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.
- Backend index: `agentstack-core/services/AI_INDEX.md` (`core.agents.fleet.gen1`).
- AI Builder index: `agentstack-core/ai_builder/INDEX.md`.

## Triggers

agent, agents fleet, template, run, trace, promotion, rollout, gates, AI Builder, UAM, compose, generation, media
