---
name: agentstack-openapi
description: Use when the user asks about OpenAPI, Swagger, /docs, /api-docs, REST vs MCP channel choice, operationIds, or regenerating the Core OpenAPI bundle. Prefer MCP for new integrations; use OpenAPI for contract/codegen/explorer.
---

# AgentStack OpenAPI

**Genetic tag:** `docs.api.specs.gen1`

## When to use OpenAPI vs MCP

| User intent | Prefer | Why |
|-------------|--------|-----|
| "call an action / tool / agentstack.execute" | **MCP** | Live catalog, caps, discovery |
| "store project/user data" | **8DNA** `/api/dna/data` or MCP | Universal channel |
| "codegen / Postman / contract test / swagger" | **OpenAPI** | `/openapi.json`, published OpenAPI bundle in public docs |
| "SPA already uses this REST path" | **REST compat** | Documented with `x-channel: rest_compat` |

Do **not** invent a second hand-maintained API SoT. Use the published OpenAPI export and MCP discovery:

- Live MCP catalog: `GET https://agentstack.tech/mcp/actions`
- Public docs: `https://docs.agentstack.tech` (OpenAPI + MCP reference)

## Key paths (integrators)

- REST explorer: `/api-docs`, live `/docs`, `/redoc` on your AgentStack deployment
- Prefer MCP `agentstack.execute` for new agent integrations

## Vendor extensions

`x-visibility`, `x-channel`, `x-mcp-action`, `x-capability-id`, `x-idempotency-exempt`, `x-sunset-date` — see public OpenAPI vendor extension docs.

## Live catalog

`GET https://agentstack.tech/openapi.json` · MCP: `GET https://agentstack.tech/mcp/actions`
