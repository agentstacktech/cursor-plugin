# Testing & Capabilities — AgentStack Cursor Plugin v0.4.16 (gen3)

Live catalogue: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.

**MCP (0.4.18):** plugin ships URL-only `mcp.json` (`plugin.json` `mcpServers: "./mcp.json"`). After Reload, click **Connect** on plugin AgentStack MCP. Empty `${AGENTSTACK_ACCESS_TOKEN}` is still the G-A162 trap. Device Code writes `~/.cursor/mcp.json` (`user-agentstack`) for hooks. Expect **one** `agentstack.execute` tool per server.

```bash
node scripts/diagnose-local.mjs --seed-snapshot
node scripts/verify-mcp-surface-e2e.mjs
```

## Structure (paths under `plugins/agentstack/`)

| Layer | Path | Purpose |
|-------|------|---------|
| Manifest | `.cursor-plugin/plugin.json` | Cursor-schema-valid gen3 manifest (no `$schema`) |
| Listing (repo) | `../../.cursor-plugin/listing.json` | Publisher copy + screenshots |
| Marketplace (repo) | `../../.cursor-plugin/marketplace.json` | GitHub / Add marketplace index |
| Rules | `rules/*.mdc` | T0 alwaysApply + T1 globs + T3 monorepo (**9**) |
| Skills | `skills/<domain>/SKILL.md` | **24** domains + optional `solana` |
| Commands | `commands/*.md` | **13** slash workflows |
| Agents | `agents/*.md` | **3** marketplace presets (see matrix) |
| Hooks | `hooks/hooks.json` + `hooks/scripts/` | Lifecycle + policy + contract fixtures |
| Kernel | `lib/plugin-kernel/` | Vendored Device Code + MCP config/probes |
| MCP | `mcp.json` | URL-only plugin MCP (Connect). User Device Code template: `mcp.example.json` |

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
| agentstack-openapi | OpenAPI / API topology |
| agentstack-crm | crm.* |
| agentstack-agentnet | AGNT / agUSD |
| agentstack-guidance | guidance.* / where-to-click |
| agentstack-project-wallet | project treasury |
| agentstack-storefront-studio | storefront studio |
| solana | Grant-only (optional) |

## Agents (role matrix)

Marketplace ships **three** agents. Platform oncall / fleet-operator live in the **maintainer overlay** (`cursor-plugin-maintainer/`, local install only).

| Agent | Owns | Does not own |
|-------|------|--------------|
| architect | Multi-domain greenfield from product spec | Day-2 ops runbooks |
| migrator | Cutover from Supabase/Firebase/Auth0/etc. | Fleet promote/trace |
| tenant-builder | Tenant apps; sandbox/canary when user asks | Platform monorepo founder path |

## Automated checks

```bash
node scripts/validate-plugin.mjs
node scripts/validate-plugin.mjs --strict-screenshots
node scripts/test-hooks-contract.mjs
node scripts/test-kernel-catalog.mjs
node scripts/run-intent-eval.mjs
node scripts/verify-mcp-surface-e2e.mjs
node scripts/smoke-local.mjs
# From monorepo root:
node provided_plugins/scripts/audit-cursor-plugin.mjs
```
