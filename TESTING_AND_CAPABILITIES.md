# Testing & Capabilities — AgentStack Cursor Plugin v0.4.15 (gen3)

Live catalogue: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.

## Structure

| Layer | Path | Purpose |
|-------|------|---------|
| Manifest | `.cursor-plugin/plugin.json` | schema-valid gen3 manifest |
| Listing | `.cursor-plugin/listing.json` | publisher copy + screenshots |
| Rules | `rules/*.mdc` | T0 alwaysApply + T1 globs + T3 monorepo (9) |
| Skills | `skills/<domain>/SKILL.md` | 24 domains + optional `solana` |
| Commands | `commands/*.md` | 13 slash workflows |
| Agents | `agents/*.md` | 5 presets (non-overlap below) |
| Hooks | `hooks/hooks.json` + scripts | Lifecycle + policy + contract tests |
| Kernel | `lib/plugin-kernel/` | Vendored Device Code client |
| MCP | `mcp.json` | streamable-http + Bearer placeholder |

## Skills (gen3)

| Skill | Domain |
|-------|--------|
| agentstack-backend | Meta-router |
| agentstack-data | 8DNA, FAP |
| agentstack-hosting | hosting.* |
| agentstack-support | social.support.* |
| agentstack-storage | storage.* |
| agentstack-auth-rbac | auth.*, rbac.* |
| agentstack-logic | logic.* |
| agentstack-commerce | payments, wallets, buffs |
| agentstack-commerce-assets | assets.* |
| agentstack-rag | rag.* |
| agentstack-signals | scheduler, webhooks |
| agentstack-projects | projects, apikeys |
| agentstack-agents-ai | agents, ai_builder |
| agentstack-messenger | social chat / ordering |
| agentstack-integrations | integrations hub |
| agentstack-discovery | UI + compass |
| agentstack-capability-tasks | PTC |
| agentstack-sdk | @agentstack/sdk |
| agentstack-crm | crm.* |
| agentstack-agentnet | AGNT / agUSD |
| agentstack-guidance | guidance.* / where-to-click |
| agentstack-project-wallet | project treasury |
| agentstack-storefront-studio | storefront studio |
| solana | Grant-only |

## Agents (role matrix)

| Agent | Owns | Does not own |
|-------|------|--------------|
| architect | Multi-domain greenfield from product spec | Day-2 ops runbooks |
| migrator | Cutover from Supabase/Firebase/Auth0/etc. | Fleet promote/trace |
| oncall | Diagnose → runbooks | Long greenfield builds |
| fleet-operator | Agents Fleet run/promote/trace/caps | Tenant canary product UX |
| tenant-builder | Tenant apps; sandbox/canary when user asks | Platform monorepo founder path |

## Automated checks

```bash
node scripts/validate-plugin.mjs
node scripts/validate-plugin.mjs --strict-screenshots
node scripts/test-hooks-contract.mjs
node scripts/run-intent-eval.mjs
node ../../scripts/audit-cursor-plugin.mjs
```
