# Marketplace screenshots (1920×1200)

| File | Alt text | Intended live capture |
|------|----------|------------------------|
| `01-install.png` | AgentStack Device Code install via /agentstack-init | After browser approve on /activate |
| `02-capability-matrix.png` | Live MCP capability matrix in Cursor | `/agentstack-capability-matrix` output |
| `03-scaffold-auth.png` | Auth scaffold generated with AgentStack MCP | `/agentstack-scaffold-auth` diff |
| `04-host-site.png` | Hosted static site publish success | `/agentstack-host-site` with /s/ URL |
| `05-sites-url-card.png` | Hosted site URL card in project UI | Sites / hosting card |

**Locale:** EN listing SoT (RU copy lives in `docs/plugins/PUBLISHER_COPY.md` appendix only).

Generate branded mocks: `node scripts/generate-marketplace-screenshots.mjs`  
Release gate: `node scripts/validate-plugin.mjs --strict-screenshots`

Prefer replacing mocks with live Cursor captures before marketplace submit (same dimensions).
