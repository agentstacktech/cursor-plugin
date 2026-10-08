---
name: agentstack-guidance
description: Use when the user mentions Platform Compass playbooks, guided paths, start_path, complete_step, path_status, verify kinds, or what to do next. Routes to guidance.* MCP — not static UI route maps (see agentstack-discovery).
---

# AgentStack Guidance (Compass paths)

## When to use

- User wants to start, resume, or complete a **guided playbook path**.
- Agent needs verify snapshot or funnel stats for a project.

## MCP tools (preferred order)

Discover actions via `GET /mcp/actions` (filter `guidance.*`). Preferred order:

0. `guidance.list` — canonical PlaybookIds for the project (same ids as Compass ranker / REST definitions). Use before match when you need a known id — e.g. `work-graph-agent-loop` for agent closed-loop on the Work Graph.
1. `guidance.match_playbook` — NL goal → playbook id + `catalog_entry` (`GuidanceCatalogEntry`) + `verifyKinds` (enriched `compass_playbooks_intents_v1.json`, 51/51 platform playbooks).
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

## Work-graph closed loop

For backlog / claim / execute agent goals, use playbook id **`work-graph-agent-loop`**. Cross-link: prompt `agentstack_closed_loop_autonomy` · genes `core.agents.work_graph.gen1` · `repo.ops.closed_loop.harness.gen1` · MCP ladder `work_next` → `ensure_agent` → `plan_claim` → `plan_execute`.
