---
name: agentstack-showcase
description: Use when editing the public showcase gallery, ecosystem catalog on project 1, gallery health probes, or showcase.catalog MCP actions.
---

# AgentStack Showcase catalog (ecosystem)

Use when editing the public `/showcase` gallery, ecosystem catalog DNA on **project_id=1**, or gallery health probes.

## MCP (ecosystem owner)

- `showcase.catalog.get` — merged catalog + settings + `catalog_revision`
- `showcase.catalog.diff_vs_fixture` / `export_fixture` — drift vs git fixture
- `showcase.catalog.patch_entry` — partial edit (title, `hosting_bucket`, status) without deploy
- `showcase.tenant.register` — **new independent_tenant card** on pid=1 (no SPA deploy); response includes `agent_next` (heal dry_run, health probe, canonical order)
- `showcase.catalog.upsert_entry` / `delete_entry` / `reorder` / `showcase.settings.patch`
- `showcase.catalog.sync_fixture` — `mode`: `missing` | `align` | `align_and_prune` (+ `dry_run`; align applies canonical game-first order)
- `showcase.catalog.apply_canonical_order` — DNA `entry_order` TailRush-first without editing cards
- `showcase.project.heal_gallery_marks` — seed tenant `showcase.icon_url` via BFF candidate order (`dry_run` first)
- Runtime monograms: `GET /api/public/showcase/icons/{id}.svg` when static `public/showcase/icons/` missing
- `showcase.health.probe` — stamp `data.showcase.health`
- Gallery logos SoT: tenant `showcase.icon_url` / `showcase.logo_url` (or catalog `icon_path` URL override); use `showcase.project.heal_gallery_marks` (`dry_run` first) for BFF candidate order
- Prompt: `agentstack_showcase_ops` · Recipe: `mcp_showcase_catalog_safe` · Flow: `UF_SHOWCASE_CATALOG`

## Boundaries

| Work | Where |
|------|--------|
| Gallery card metadata (title, tagline, featured, order) | pid=1 showcase tools |
| Tenant hosting bytes, bots, KB, commerce | `agentstack_safe_project_cycle` on **tenant** `project_id` |
| Platform proof sites (1438–1443) | VPS sync + `hosting.site.build` / `showcase.build.republish_entry` — **not** `generation.promote` |
| Portfolio tenants (1472, 1444, …) | `agentstack_safe_project_cycle` on tenant `project_id` |

Prompts: `agentstack_showcase_ops` (gallery DNA) · `agentstack_showcase_vps_ops` (proof publish loop).

Catalog ids are **kebab-case** (`helpdesk-bot`, not `helpdesk_bot`).

## References

- Live catalog: `GET /mcp/actions` — filter `showcase.*`
