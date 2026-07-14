# AgentNet PTR on Solana

Use when integrating Solana devnet attestation with Fleet runs.

## Flow

1. Postgres L0 receipt is financial SoT — never claim SPL treasury on Solana.
2. `ptr_post_commit_hook` after Fleet commit when `ptr_anchor_policy` includes `solana_devnet`.
3. MCP: `agentnet.solana.status`, `register_identity`, `proof_bundle_for_run`, `submit_validation`.
4. Public bundle: `GET /api/agentnet/proof-bundle/{hash}`.

## Env

- `AGENTNET_SOL_PORT_MODE=stub` — CI/UI without live RPC
- `AGENTNET_SOL_ENABLED=1` + `AGENTNET_SOL_RPC_URL` — live devnet

## Docs

- `docs/grants/ptr/AI_INDEX.md`
- `docs/grants/solana-v2/SOLANA_GRANT_V2_SCOPE.md`
