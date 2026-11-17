---
name: agentstack-agentcrush-remediation
description: AgentCrush tenant (pid 894280) — safe cycle, StackScript batch, gates, human-gated promote.
---

# /agentstack-agentcrush-remediation

Playbook: `GET /mcp/prompts/get?name=agentstack_agentcrush_remediation_v1&project_id=894280`

1. Bind `context.project_id=894280`.
2. Run safe cycle: fork → single `env_uuid` batch for `script.*` → diff with active scripts → gates → promote (human gate).
3. Platform doctor: `/agentstack-diagnose` or `platform_tooling.py ecosystem doctor --json --project-id 894280` when you have a platform checkout.
4. UI wire: tenant App Studio DNA via MCP `ai_builder.source.patch` (see hosted-vertical integrator docs).

Do **not** promote without Lance approval (`generation.promote` on prod).