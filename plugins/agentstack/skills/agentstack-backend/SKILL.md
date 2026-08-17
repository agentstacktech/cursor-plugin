---
name: agentstack-backend
description: Entry point for AgentStack backend ecosystem. Use WHENEVER the user mentions backend, API, server, database, auth, storage, hosting, publish site, static site, ZIP deploy, RBAC, payments, rules, webhooks, scheduler, RAG, subscriptions, messenger, integrations, or feature flags. Routes to domain-specific skills.
---

# AgentStack Backend — Master Router

AgentStack is a **full backend ecosystem** exposed through ONE MCP tool: `agentstack.execute`. Capabilities come from live `GET /mcp/actions` (and `/agentstack-capability-matrix`) — do not hard-code action counts in skills.

## Quick router — pick the sub-skill

| User intent signals | Sub-skill | Primary MCP |
|---------------------|-----------|-------------|
| CRM / pipeline / contact | `agentstack-crm` | `crm.*` |
| AGNT / agUSD / AgentNet | `agentstack-agentnet` | `agentnet.*` |
| storefront studio / merchant | `agentstack-storefront-studio` | `commerce.storefront.*` |
| project wallet / treasury | `agentstack-project-wallet` | wallets + project wallet REST |
| where in UI / next step | `agentstack-guidance` | `guidance.*`, discovery |
| store, data, config, A/B sandbox | `agentstack-data` | `projects.update_project`, `data_access.*` |
| publish site, /s/ URL, ZIP deploy | `agentstack-hosting` | `hosting.*` |
| support ticket, staff inbox, psup | `agentstack-support` | `social.support.*` |
| upload, quota, attachment, media | `agentstack-storage` | `storage.*`, REST upload |
| login, register, role, RBAC | `agentstack-auth-rbac` | `auth.*`, `rbac.*` |
| authorize plugin / Device Code / MCP missing in plugin | `/agentstack-authorize` | Device Code → `~/.cursor/mcp.json` (not tenant `auth.login`) |
| when X then Y, automation, workflow | `agentstack-logic` | `logic.*`, `commands.*` |
| payment, wallet balance, checkout, buffs (not project treasury) | `agentstack-commerce` | `payments.*`, `wallets.*`, `buffs.*` |
| digital goods, asset wizard | `agentstack-commerce-assets` | `assets.*` |
| RAG, embedding, knowledge base | `agentstack-rag` | `rag.*` |
| cron, webhook, notification; Stripe *callback* (not Checkout SDK) | `agentstack-signals` | `scheduler.*`, `webhooks.*` |
| project, API key, tenant | `agentstack-projects` | `projects.*`, `apikeys.*` |
| agent fleet, AI Builder | `agentstack-agents-ai` | `agents.*`, `ai_builder.*` |
| chat, DM, message ordering | `agentstack-messenger` | `social.*` |
| Slack, integration recipe | `agentstack-integrations` | `integrations.*` |
| where in UI, Compass, discover | `agentstack-discovery` | discovery manifest + UI registry |
| OpenAPI spec, REST surface, endpoint map | `agentstack-openapi` | OpenAPI + REST routing |
| hub task, capability atom | `agentstack-capability-tasks` | PTC manifests |
| TypeScript SDK, sdk.protocol | `agentstack-sdk` | `@agentstack/sdk` |
| Solana grant tooling (optional) | `solana-agentstack-mcp` | grant-scoped actions only |

Pick the **primary** bucket first; consult others by reference for multi-step flows.

**Disambiguation:** project treasury → `agentstack-project-wallet`; personal/commerce wallet → `agentstack-commerce`; inbound Stripe webhook → `agentstack-signals` / integrations (never `@stripe/stripe-js` for AgentStack checkout). Cursor plugin sign-in / “MCP not in the plugin” → `/agentstack-authorize`, not `auth.login`.

## Universal MCP contract

```http
POST https://agentstack.tech/mcp
Authorization: Bearer <access_token>
Content-Type: application/json

{ "tool": "agentstack.execute", "params": { "steps": [{ "action": "<domain>.<verb>", "params": {} }] } }
```

Discover: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.

## References

- Rules: `rules/agentstack-prefer.mdc`, `rules/agentstack-api-routing.mdc`
- Scale (outside plugin copy): `docs/publication/PLATFORM_SCALE.md`
