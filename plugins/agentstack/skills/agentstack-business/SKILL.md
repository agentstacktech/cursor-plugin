---
name: agentstack-business
description: Use when the user manages a Business Organism — business head project, organ children (CRM, storefront, bots, support), command center snapshot, tariff templates, or composite provisioning. Prefer business.* MCP and /api/business/* REST.
---

# AgentStack Business Organism

**Gene:** `core.business.organism.gen1` · UI: `/dev/projects/{head_id}/business` (command center)

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "create business with organs" / greenfield | `business.create_composite` | Multiple `projects.create` + manual attach |
| "command center" / head dashboard | `business.command_snapshot` | Scattered finance + CRM REST |
| "attach CRM/storefront organ" | `business.attach_child` | Anonymous `POST /projects/{id}/attach` |
| "link existing project as organ" | `business.link_child` | `attach_child` (creates new project) |
| "list organs" / org tree | `business.get_org`, `business.list_children` | Raw DNA `config.org` reads |
| "apply tariff" / seat limits | `business.apply_tariff`, `business.list_tariff_templates` | Hand-rolled quota tables |
| "detach organ" | `business.detach_child` | Delete child project |

## Prefer-over

- **DO NOT** model multi-project orgs as flat `projects.*` lists — use **business head + organ children**.
- **DO NOT** use `POST /projects/{id}/attach` for adoption — use **`business.link_child`** with admin on head and child.
- Treasury reads compose from finance facades — no parallel ledger SQL.

## Example — `business.create_composite`

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      {
        "action": "business.create_composite",
        "params": {
          "name": "Acme Studio",
          "organs": ["crm", "storefront", "bots", "support"],
          "tariff_template_id": "starter"
        }
      }
    ]
  }
}
```

Returns head `project_id`, attached child project ids, and org index. Idempotent replays are safe when the platform returns the existing head.

## Example — `business.command_snapshot`

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      {
        "action": "business.command_snapshot",
        "params": {
          "project_id": "{{head_project_id}}",
          "include_integrations": true
        }
      }
    ]
  }
}
```

Aggregate: org children, treasury (`business_treasury`), CRM summary, integration health. Read-only — use `business.patch_org_settings` / organ-specific domains to mutate.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `unauthorized` / `forbidden` | Actor not head admin | `projects.update_user_role` → owner/admin on head |
| `child_already_attached` | Organ linked to another head | `business.detach_child` on other head or pick standalone child |
| `organ_slot_denied` | Tariff seat limit | `business.list_tariff_templates` → `business.apply_tariff` upgrade |
| `link_child` rejected | Child is a head with organs | Detach children first or link a standalone project |
| Empty treasury in snapshot | Child wallets not ensured | Open project wallet segment or `wallets.create` on organ projects |
| Duplicate composite | Retry with same name | Check `business.get_org`; composite is not always idempotent by name alone |

## References

- ADR: `docs/adr/BUSINESS_PROJECT_LIFECYCLE.md`, `docs/adr/BUSINESS_ORGANISM_ARCHITECTURE.md`
- Live catalog: `GET /mcp/actions` — filter `business.*`
- Related: `./../agentstack-project-wallet/SKILL.md` (treasury), `./../agentstack-crm/SKILL.md` (CRM organ)

## Triggers

business organism, business head, organ child, command center, composite business, attach organ, link project, tariff template, multi-project org, business treasury
