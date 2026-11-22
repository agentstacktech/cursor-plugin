---
name: agentstack-discovery
description: Use when the user asks where a feature lives in the UI, Discover hub routes, PAGES_MAP, or dev docs cookbook leaves. Prefer discovery manifest and UI registry — not Compass playbooks (see agentstack-guidance).
---

# AgentStack Discovery & Compass

## MCP describe hygiene

| Mistake | Fix |
|---------|-----|
| `discovery.describe` without `action` | `action=agents.plan_get` (or any canonical id) — not `tool` alone |
| Catalog prefix guess | `discovery.list` with `domain=hosting` then describe one row |
| Goal batch + `discovery.search` | Split execute — `batch_semantic_anchor_conflict` |
| Need 3–6 schemas | `discovery.describe_many` + `actions=[...]` |

Prompt **`agentstack_mcp_execute_hygiene`** · recipe **`mcp_operator_execute_hygiene_v1`**.

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "where is X in the app" | `docs/plugins/UI_SURFACE_REGISTRY_FOR_AGENTS.md`, `PAGES_MAP.md` | Guessing `/dev/...` paths |
| "guided onboarding" | Docs cookbook recipes (`/dev/docs/build`, etc.) | Inventing steps |
| "what can this project do" | `GET /api/discovery/manifest.json` | Hard-coded nav |

## References

- Genes: `frontend.discovery.hub.gen1`, `frontend.platform.compass.gen1`, `frontend.docs.cookbook.gen1`
- Map: `docs/dual-shell/NARRATIVE_COOKBOOK_MAP.md`

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
