---
name: agentstack-tenant-ops
description: MCP-first tenant operations — heal bots, verify sandbox, promote DNA without deploy scripts.
---

# /agentstack-tenant-ops

**MCP-first tenant operations** — heal, verify in sandbox, promote to prod. No local Python unless MCP is blocked.

## When to use

- Mentor bot menu drift (TG vs MAX `/start` buttons)
- Post-deploy tenant DNA parity fail
- Routine tenant config / bot command edits on a **paid** project with `auto_generation_mode`

## Playbook (fetch first)

```
GET /mcp/prompts/get?name=agentstack_tenant_ops_mcp_first&project_id=<PID>
```

Monorepo SoT: Tenant ops MCP-first playbook (platform maintainers)

## Quick ladder

1. **Connect** AgentStack MCP (G-A174) · `auth.get_profile`
2. Set `context.project_id` on every `agentstack.execute`
3. **Diagnose:** `bots.list` → `bots.get` (compare `/start` buttons)
4. **Heal:** `bots.ensure_mentor_commands` per mentor bot (`mentor_telegram@v1` / `mentor_max@v1`)
5. **Verify sandbox:** `bots.simulate` (auth/menu) · `knowledge.playground` (staff links) — **one heavy step per sync batch**
6. **Promote:** `generation.diff_vs_prod` → `generation.gates` → `generation.promote`
7. **Re-check:** `bots.get` parity or operator `unity_post_deploy_verify_1444.py`

## Recipe

`mcp_tenant_bots_heal_verify` — expand via `GET /mcp/recipes`

## Do not

- Add tenant heal to platform deploy
- Write new backend code when MCP actions exist
- Batch two `knowledge.playground` calls in one sync execute (60s limit)

## Related

- `/agentstack-discover` · skill `agentstack-bots` · skill `agentstack-data`
- Prompt `agentstack_tenant_8dna_supply` (generation supply chain)
