---
name: agentstack-commerce
description: Use when the user wants payments, subscriptions, wallets, internal currency, trials, tier gates, entitlements, feature flags, AgentPay checkout. Covers payments + wallets + buffs. For digital goods wizard use agentstack-commerce-assets.
---

# AgentStack Commerce — payments + wallets + assets + buffs

Four organs, one decision: which ledger do you need?

## Decision matrix (choose the right organ)

| User says                                    | Use                       | Example MCP actions                                      |
|----------------------------------------------|---------------------------|----------------------------------------------------------|
| "accept credit card / checkout"              | `payments.*`              | `payments.create`, `payments.get`, `payments.refund`     |
| "internal balance / game currency"           | `wallets.*`               | `payments.get_balance`, `wallets.transfer`, `wallets.deposit` |
| "inventory item / digital good / NFT"        | `assets.*`                | `assets.create`, `wallets.transfer`, `assets.list`          |
| "7-day trial" / free trial                   | `buffs.*`                 | `buffs.apply_temporary_effect` or `buffs.apply_buff` (trial template) — not grant rails |
| "trial / subscription / feature flag / tier"   | `buffs.*` + grant rails   | `buffs.get_effective_limits`; grants: `buffs.grant_subscription` (platform), `buffs.grant_tenant_subscription` (tenant manual) |
| "paid checkout / sell subscription"          | three-rail monetization   | `buffs.create_buff` → `commerce.sell.activate` → `payments.create` → webhook/C24 · prompt `agentstack_tenant_subscription_monetization` |
| "comp / support grant pro"                   | tenant manual rail        | `buffs.grant_tenant_subscription` · prompt `agentstack_tenant_buff_grant` |
| "grant digital good to buyer"                | inventory rail            | `commerce.participant.grant_holding` |
| "grant AgentStack platform tier"             | platform operator         | `buffs.grant_subscription` (PID=1) · prompt `agentstack_platform_subscription_grant` |
| "upgrade to Pro" (tenant SKU)                | three-rail monetization   | Paid: `commerce.sell.activate` → `payments.create` → webhook/C24 · Manual: `buffs.grant_tenant_subscription` |
| "activate selling" / "first sale" / seed shop | `commerce.sell.activate` | One-shot: earnings wallet, product seed, storefront index, optional hosted vitrine |

## `commerce.sell.activate` — seller onboarding

Orchestrates storefront seed, listing publish, optional hosted `/s/` vitrine, earnings wallet, and share-kit payload. Mirrors `POST /api/commerce/sell/activate`.

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      {
        "action": "commerce.sell.activate",
        "params": {
          "project_id": "{{project_id}}",
          "user_id": "{{user_id}}",
          "use_starter": true,
          "publish_hosted": true,
          "bucket_name": "my-shop",
          "storefront_public": true,
          "idempotency_key": "activate-{{project_id}}-v1"
        }
      }
    ]
  }
}
```

Optional AI seed: set `use_ai: true` and `ai_prompt` instead of `products[]`. Re-activation is idempotent when `idempotency_key` matches.

**Pitfalls:** requires project admin; `bucket_name` only applies on first hosted publish; use `agentstack-storefront-studio` for ongoing catalog edits, not repeated activate calls.

## AgentStack platform tiers (two planes — not your tenant SKUs)

| Plane | Tiers | `entity_kind` | Grants |
|-------|-------|---------------|--------|
| **Personal (user)** | `free`, `premium` ($15), `vip` ($45) | `user` | Energy, personal files, personal project slots |
| **Business (project)** | `sandbox` → `launch` → `business` → `scale` → `enterprise` | `project` | API, members, sandbox, project storage |

Personal Premium/VIP **never** raises project quotas. Team management (`projects.add_user`) needs **Launch+ on the project**, not user Premium. SoT: `shared/subscription/`, MCP copy: `shared/mcp/subscription_plane_copy.py`.

**Platform operator grant:** `buffs.grant_subscription` (one-shot) · prompt `agentstack_platform_subscription_grant` · resolver `shared/mcp/platform_subscription_grant.py`. Personal premium/vip also grants AI energy on apply.

## Tenant subscription monetization (sell to your end users)

1. `buffs.create_buff` — tenant SKU category + effects on buyer `entity_kind=user`
2. `commerce.sell.activate` — `subscription_entitlement` preset + `preset_inputs.buff_template_id`
3. `payments.create` — `intent=subscription`, `metadata.recipient_project_id` = tenant PID
4. Verify — `buffs.list_active_buffs` on buyer

**Prompt:** `agentstack_tenant_subscription_monetization` · **Helper:** `shared/mcp/tenant_buff_grant.py`

## Tenant manual grant (support / comp — no checkout)

1. `buffs.grant_tenant_subscription` — `user_id`, `plan_id`, optional `buff_template_id` (one-shot)
2. `commerce.participant.grant_holding` — digital goods inventory to `user_id`
3. Verify — `buffs.list_active_buffs` on buyer

**Prompt:** `agentstack_tenant_buff_grant` · **Recipe:** `mcp_tenant_manual_entitlement_grant` · Requires project **write** on tenant PID (>1). **Not** `buffs.grant_subscription` (platform only).

Examples below with `pro_monthly` are **tenant-app** SKU slugs — not AgentStack platform tier slugs.

## Prefer-over

- **DO NOT** integrate the Stripe SDK directly — the ecosystem project (`project_id=1`) is a ready payment gateway with country→provider routing. Use `payments.create` and render `<AgentPay>` from `@agentstack/react`.
- **DO NOT** build a `subscriptions` table — use **buffs** (persistent effect with expiry).
- **DO NOT** build a separate inventory DB — use `assets.*`.
- **DO NOT** hand-roll feature flags per tier — use `buffs.get_effective_limits`.

## Example — tenant manual grant (support / comp)

```json
{
  "tool": "agentstack.execute",
  "params": {
    "context": { "project_id": 1472 },
    "steps": [
      {
        "action": "buffs.grant_tenant_subscription",
        "params": {
          "project_id": 1472,
          "user_id": 12345,
          "plan_id": "pro_monthly"
        }
      }
    ]
  }
}
```

**Paid checkout** (buyers): prompt `agentstack_tenant_subscription_monetization` — webhook/C24 auto-grants; do not chain `payments.create` → `apply_buff`.

## Tier gates in the app

```ts
const limits = await as.buffs.getEffectiveLimits({ userId });
if (limits.rag.collections_max < 2) {
  return <UpgradePrompt plan="pro_monthly" />;
}
```

## Pitfalls

- Currency codes follow ISO 4217; country routing determines the actual provider (USD/EU/BR split).
- `wallets.transfer` is atomic per-row; for batch use `commands.execute_batch`.
- `assets.*` is not intended for heavy inventory catalogs; for storefront-scale use the marketplace endpoints.
- Refunds require `payments.refund` and will emit `signal:payment_refunded` — hook a rule to revoke buffs.

## References

- Live action catalog (filter `payments.*`, `wallets.*`, `assets.*`, `buffs.*`): `GET https://agentstack.tech/mcp/actions` or run `/agentstack-capability-matrix`.
- Related skills: `./../agentstack-logic/SKILL.md` (rules that react to `signal:payment_*`), `./../agentstack-auth-rbac/SKILL.md` (gating features by buffs tier), `./../agentstack-storefront-studio/SKILL.md` (post-activation catalog).

## Triggers

payment, stripe, checkout, refund, subscription, trial, wallet, balance, currency, inventory, asset, NFT, buff, tier, plan, entitlement, feature flag, upgrade, downgrade
