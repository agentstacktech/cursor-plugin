---
name: solana-agentstack-mcp
description: Optional grant skill for Solana builders wiring AgentStack MCP and Fleet without a mirror ledger. Use when integrating Solana wallets, grants tooling, proof-to-task, or agent skills with AgentStack.
category: grant
---

# Solana × AgentStack (tooling grant)

## Rules

- Postgres L0 remains SoT — no SPL mirror ledger ([AGENTNET_SOLANA_MIRROR_SPIKE.md](../../../../docs/adr/AGENTNET_SOLANA_MIRROR_SPIKE.md)).
- Use `agentstack.execute` actions; start from [docs/grants/SOLANA_TOOLING_GRANT_SCOPE.md](../../../../docs/grants/SOLANA_TOOLING_GRANT_SCOPE.md).

## Quick steps

1. Open [docs/AI_NAVIGATION_MAP.md](../../../../docs/AI_NAVIGATION_MAP.md) → `core.mcp.tools.gen1`.
2. Call `agents.run` / Fleet via project API key with `agents_run` cap.
3. For finality labels only, see `shared/economy/chain_finality.py` (`SolanaFinalityAdapter`).

## MCP examples

```json
{ "action": "agentnet.proof_to_task", "project_id": 1, "agent_uuid": "…", "run_uuid": "…", "receipt_hash": "…" }
```

Do not implement cross-chain bridge in application code without ADR Accepted.

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
