---
name: agentstack-showcase
description: Use when editing the public showcase gallery, ecosystem catalog on project 1, gallery health probes, or showcase.catalog MCP actions.
---

# AgentStack Showcase catalog (ecosystem)

Use when editing the public `/showcase` gallery, ecosystem catalog DNA on **project_id=1**, or gallery health probes.

## MCP (ecosystem owner)

- `showcase.catalog.get` — merged catalog + settings + `catalog_revision`
- `showcase.catalog.diff_vs_fixture` / `export_fixture` — drift vs git fixture
- `showcase.catalog.upsert_entry` / `reorder` / `showcase.settings.patch`
- `showcase.health.probe` — stamp `data.showcase.health`
- Prompt: `agentstack_showcase_ops` · Recipe: `mcp_showcase_catalog_safe` · Flow: `UF_SHOWCASE_CATALOG`

## Boundaries

| Work | Where |
|------|--------|
| Gallery card metadata (title, tagline, featured, order) | pid=1 showcase tools |
| Tenant hosting bytes, bots, KB, commerce | `agentstack_safe_project_cycle` on **tenant** `project_id` |
| Platform proof sites (1438–1443) | Bootstrap / republish — not tenant generation F1 |

Catalog ids are **kebab-case** (`helpdesk-bot`, not `helpdesk_bot`).
