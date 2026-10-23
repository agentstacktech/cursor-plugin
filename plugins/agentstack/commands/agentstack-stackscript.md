---
name: agentstack-stackscript
description: StackScript MCP ladder — put, dry_run, publish, fuel, sandbox generation.
---

# /agentstack-stackscript

Operator playbook for **StackScript** (`script.*`, `stackscript.fuel.*`) on a bound project.

## Fetch prompt

```
GET /mcp/prompts/get?name=agentstack_stackscript&project_id=<PID>
```

## Safe tenant writes

When `auto_generation_mode` is on: bind `generation_env_uuid` (fork) before `script.put` / `publish`, then `generation.diff_vs_prod` → `generation.promote`. Recipes: `mcp_stackscript_sandbox_v1`, `mcp_stackscript_promote_v1` (UF_STACKSCRIPT_SANDBOX / UF_STACKSCRIPT_PROMOTE).

## Fuel

Monthly **StackScript fuel** is not AGNT compute credits. Quote/purchase: `stackscript.fuel.quote` → `finance.pay` intent `stackscript_fuel_pack` → `stackscript.fuel.purchase`.

## Docs

- `script.docs` topics: `overview`, `host`, `syntax`, `migration`
- Repo: `docs/sdk/STACKSCRIPT_MCP_AGENT_GUIDE.md`
- Wire returns: CI **stackscript wire schema** check — bare `return a > 3` marshals bool; ternary int arms stay JSON numbers.
