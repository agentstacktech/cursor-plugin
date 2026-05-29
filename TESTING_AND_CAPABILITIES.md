# Testing & Capabilities — AgentStack Cursor Plugin v0.4.13 (gen3)

Live catalogue: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.

## Structure

| Layer | Path | Purpose |
|-------|------|---------|
| Manifest | `.cursor-plugin/plugin.json` | gen3 manifest |
| Rules | `rules/*.mdc` | T0 alwaysApply + T1 globs |
| Skills | `skills/<domain>/SKILL.md` | 18 domains + optional `solana` grant |
| Commands | `commands/*.md` | 13 slash workflows |
| Agents | `agents/*.md` | 5 presets |
| Hooks | `hooks/hooks.json` + scripts | Lifecycle + contract tests |
| MCP | `mcp.json` | streamable-http + Bearer |

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
| solana | Grant-only |

## Automated checks

```bash
node scripts/validate-plugin.mjs
node scripts/test-hooks-contract.mjs
node ../../scripts/audit-cursor-plugin.mjs   # from repo root
pwsh scripts/smoke-local.ps1
```
