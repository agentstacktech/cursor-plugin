---
name: agentstack-integrations
description: Use when the user wants webhooks, integration recipes, Slack, CRM bridges, inbound hooks, or third-party connectors. Prefer integrations.* MCP actions over new FastAPI routes.
---

# AgentStack Integration Hub

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "connect Slack" / "recipe" | `integrations.*` from discovery | Zapier-only glue |
| "inbound webhook" | `webhooks.register` + integrations intake | Raw `app.post('/hook')` |
| "rotate webhook secret" | `webhooks.rotate_secret` | Manual env var rotation |

## References

- Gene: `core.integrations.hub.gen1`
- Parity: `docs/ecosystem/REST_MCP_SDK_PARITY.md`
