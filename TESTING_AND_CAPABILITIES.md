# Testing & Capabilities — AgentStack Cursor Plugin v0.4.16 (gen3)

Live catalogue: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.

**MCP dedupe (0.4.17):** plugin package must **not** include `mcp.json` or `plugin.json` `mcpServers`. Device Code writes `~/.cursor/mcp.json` only. After Reload Window expect **one** Cursor MCP server (`agentstack` from user config) and **one** `agentstack_execute` tool. A `plugin-agentstack-*` server with empty token is the G-A162 trap.

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
| MCP template | `mcp.example.json` | Lean streamable-http example for `~/.cursor/mcp.json` (not shipped in plugin package) |

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
