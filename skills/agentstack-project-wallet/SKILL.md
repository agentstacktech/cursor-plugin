---
name: agentstack-project-wallet
description: Use when the user manages project treasury, project wallet segments, payouts, or project-scoped balances. Prefer project wallet REST and wallet-related MCP domains.
---

# Project wallet

## Rules

- UI: `/dev/projects/{id}/wallet` or `/user/projects/{id}/wallet`
- Distinct from personal wallet and AgentNet vault — project operational balances.
- Use live catalog for wallet/payments actions; link commerce + AgentNet docs for settlement flows.

## References

- `project-wallet/README.md`

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
