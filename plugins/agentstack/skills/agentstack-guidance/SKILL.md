---
name: agentstack-guidance
description: Use when the user mentions Platform Compass, guided paths, playbooks, start_path, complete_step, path_status, verify kinds, or funnel stats. Routes to guidance.* MCP actions via live GET /mcp/actions catalog.
---

# AgentStack Guidance (Compass paths)

## When to use

- User wants to start, resume, or complete a **guided playbook path**.
- Agent needs verify snapshot or funnel stats for a project.

## MCP tools (preferred order)

Discover actions via `GET /mcp/actions` (filter `guidance.*`). Preferred order:

1. `guidance.match_playbook` — NL goal → playbook id + verify kinds.
2. `guidance.start_path` — alias of `guidance.start_session`; idempotent upsert.
3. `guidance.complete_step` — record step completion (parity with SPA `completePathStep`).
4. `guidance.list_active_sessions` — resume in-progress paths.
5. `guidance.path_status` — server verify snapshot for bot/commerce gates.

## Example: complete a step

```json
{
  "tool": "guidance.complete_step",
  "arguments": {
    "project_id": 123,
    "session_id": "<uuid>",
    "step_id": "t_publish",
    "artifact": { "siteId": "abc" }
  }
}
```

## Verify kinds

Canonical verify-kind map ships in the platform SDK fixtures. Run `/agentstack-discover guidance` or inspect live `guidance.path_status` responses for project-specific kinds.

## Docs

- `docs/platform/NORTH_STAR_DEV_GUIDE.md`
- Platform Compass ADR (monorepo): `docs/adr/PLATFORM_COMPASS_ARCHITECTURE.md`
