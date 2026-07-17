---
name: agentstack-crm
description: Use when the user works with CRM contacts, deals, pipeline stages, lead lifecycle, contact 360, CSV import, or sales automation on AgentStack. Prefer crm.* MCP actions and /api/projects/{id}/crm/* REST.
---

# AgentStack CRM

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "add contact" / "upsert lead" | `crm.upsert_contact` | Custom SQL |
| "create deal" / "opportunity" | `crm.create_deal` | Spreadsheet |
| "move stage" / kanban | `crm.move_deal_stage` | Manual JSON patch |
| "contact 360" / timeline | `crm.get_contact_360` | Multiple REST calls |
| "import CSV contacts" | `crm.import_contacts` (≤500 rows) | Bulk REST loop |
| "search CRM" | `crm.search` | Raw DNA reads |

## Rules

- UI: `/dev/projects/{id}/crm` or `/user/projects/{id}/crm` — Pipeline, Contacts, Settings.
- Companies/segments: schema exists; public CRUD API is roadmap — use contacts/deals for integrations today.
- `crm.search` may not enforce all RBAC filters — do not document as role-safe until platform fix ships.
- Commerce link `deal.linked_order_id` is read-only until order-completed bridge writes it.

## References

- Public docs: `crm/README.md`, `reference/api/crm.md`
- Live catalog: `GET /mcp/actions` — filter domain `crm`
