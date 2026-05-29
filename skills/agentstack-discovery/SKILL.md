---
name: agentstack-discovery
description: Use when the user asks where a feature lives in the UI, how to navigate AgentStack, Compass playbooks, Discover hub, or dev docs recipes. Prefer discovery manifest and UI registry over inventing routes.
---

# AgentStack Discovery & Compass

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "where is X in the app" | `docs/plugins/UI_SURFACE_REGISTRY_FOR_AGENTS.md`, `PAGES_MAP.md` | Guessing `/dev/...` paths |
| "guided onboarding" | Docs cookbook recipes (`/dev/docs/build`, etc.) | Inventing steps |
| "what can this project do" | `GET /api/discovery/manifest.json` | Hard-coded nav |

## References

- Genes: `frontend.discovery.hub.gen1`, `frontend.platform.compass.gen1`, `frontend.docs.cookbook.gen1`
- Map: `docs/dual-shell/NARRATIVE_COOKBOOK_MAP.md`
