---
name: agentstack-commerce-assets
description: Use when the user wants digital goods, asset presets, inventory wizard, marketplace items, or commerce asset catalog. Prefer assets.* and sdk.commerce.assets over custom product tables.
---

# AgentStack Commerce Assets

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "digital item" / "preset" | `assets.*`, fixtures `asset_presets_v1.json` | Custom SKUs table |
| "wizard" / "compose asset" | `@agentstack/sdk/commerce/assets` | Hand-built forms |

## References

- Genes: `sdk.commerce.assets.gen1`, `frontend.commerce.assets.wizard.gen1`
- For payments/wallets see `agentstack-commerce` skill.
