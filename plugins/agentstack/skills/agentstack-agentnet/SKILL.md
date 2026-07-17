---
name: agentstack-agentnet
description: Use when the user mentions AGNT, agUSD, AgentNet economy, vault, bridge, genome, compute credits, ledger batches, or on-chain proof rails. Prefer agentnet.* MCP and /api/agentnet/* REST. Never use legacy AGC ticker in new integrations.
---

# AgentStack AgentNet economy

## Decision matrix

| User says | Prefer | Notes |
|-----------|--------|-------|
| "AGNT balance" / credits | `agentnet.balance`, `agentnet.compute_credits.*` | L0 ledger |
| "stable unit" / vault | agUSD narrative + vault REST | Not a second platform ticker |
| "post batch" / ledger write | `agentnet.post_batch` | Idempotent key required |
| "Solana proof" / PTR | `agentnet.solana.*`, grants demo | Grant-scoped |
| "genome" / lineage | `agentnet.genome.*` | LineageRegistry — not a token |

## Rules

- **AGNT** + **agUSD** only — never document legacy AGC/AgentCoin tickers in new integrations.
- Three rails: L0 PostgreSQL ledger, EVM bridge, Solana PTR attestation (public integrator level).
- Do not hard-code action counts — use `GET /mcp/actions`.

## References

- `economy/AGENTNET_INTEGRATOR_GUIDE.md`
- `grants/PTR_AND_PROOF_LAB.md`
