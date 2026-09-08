---
name: agentstack-project-wallet
description: Use when the user manages project treasury, project wallet segments, payouts, or project-scoped balances. Prefer project wallet REST and wallet-related MCP domains.
---

# Project wallet

## Rules

- UI: `/dev/projects/{id}/wallet` or `/user/projects/{id}/wallet`
- Distinct from personal wallet (`wallets.*`) and AgentNet vault (`agentnet.*`) — project operational balances.
- Prefer **`finance.project.*`** MCP for treasury KPIs and funding; use `wallets.*` for per-wallet deposit/transfer on project rows.

## Example — `finance.project.portfolio`

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      {
        "action": "finance.project.portfolio",
        "params": { "project_id": "{{project_id}}" }
      }
    ]
  }
}
```

Returns operating + treasury + AGNT rail summary (FAP-masked for non-admins).

## Example — `finance.project.fund`

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      {
        "action": "finance.project.fund",
        "params": {
          "project_id": "{{project_id}}",
          "from_wallet_id": "{{ecosystem_usd_wallet_id}}",
          "amount": 100.0,
          "idempotency_key": "fund-{{project_id}}-{{timestamp}}"
        }
      }
    ]
  }
}
```

Admin-only ecosystem USD transfer into project treasury. Member top-ups: `finance.project.contribute` (USD from personal ecosystem wallet on pid=1). History: `finance.project.contributions.list`.

## References

- `project-wallet/README.md`, `docs/design/PROJECT_WALLET_SURFACE_CONTRACT.md`

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
