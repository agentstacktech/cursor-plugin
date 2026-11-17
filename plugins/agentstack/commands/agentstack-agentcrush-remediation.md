# AgentCrush remediation (894280)

Playbook: `GET /mcp/prompts/get?name=agentstack_agentcrush_remediation_v1&project_id=894280`

1. Bind `context.project_id=894280`.
2. Run safe cycle: fork → single `env_uuid` batch for `script.*` → diff with active scripts → gates → promote (human gate).
3. Platform doctor (local): `python agentstack-core/scripts/platform_tooling.py ecosystem doctor --json --project-id 894280`
4. UI wire: `docs/plans/AGENTCRUSH_UI_HOSTED_WIRE.md` (tenant App Studio DNA via `ai_builder.source.patch`).

Do **not** promote without Lance approval (`generation.promote` on prod).