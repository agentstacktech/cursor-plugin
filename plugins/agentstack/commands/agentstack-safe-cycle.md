---
name: agentstack-safe-cycle
description: Master tenant safe project cycle — sandbox fork, diff, gates, promote via MCP generation plane.
---

# /agentstack-safe-cycle

**Master safe project cycle** — work on tenant project data through sandbox generations via **any MCP-capable AI** (ChatGPT, Cursor, Claude, Gemini, VS Code, CLI) — not prod scripts or new backend code.

## When to use

- Any tenant config change (8DNA, bots, knowledge, logic, integrations, CRM, hosting)
- After session setup, before first mutation
- When unsure whether to diagnose vs promote

## Playbook (fetch first)

```
GET /mcp/prompts/get?name=agentstack_safe_project_cycle&project_id=<PID>
```

Monorepo SoT: Ecosystem safe project cycle runbook (platform maintainers)

## Eight phases

| # | Phase | Key |
|---|-------|-----|
| 0 | Session | `agentstack_session_setup` · `context.project_id` |
| 1 | Intent | Diagnose (`UF_DIAGNOSE`) vs change (`UF_F1_ROUTINE`) |
| 2 | Preflight | Recipe `mcp_universal_safe_change` step 1 |
| 3 | Mutate | Domain MCP action (leaf writes only) |
| 4 | Verify sandbox | `logic.dry_run` / `bots.simulate` / `knowledge.playground` — **one heavy per batch** |
| 5 | Review | `generation.diff_vs_prod` |
| 6 | Gates | `generation.gates` |
| 7 | Promote | `generation.promote` (`require_gates_passed: true`) |
| 8 | Post-verify | Read-only prod checks |

## Domain quick map

| User wants | Mutate | Verify |
|------------|--------|--------|
| Config leaf | `projects.patch_data` | `projects.get_data` |
| Mentor / KB | `knowledge.config.patch` | `knowledge.playground` |
| Bot menu | `bots.ensure_mentor_commands` | `bots.simulate` |
| Rule | `logic.create` | `logic.dry_run` |
| Webhook recipe | `integrations.install_recipe` | dry-run |

## Specialized

- Mentor fleet heal: `/agentstack-tenant-ops` · `UF_BOTS_HEAL`
- Generation supply detail: prompt `agentstack_tenant_8dna_supply`

## Do not

- Full-blob `data=` writes
- Tenant heal in platform deploy
- Two heavy LLM steps in one sync batch
- Promote from diagnose-only runs

## Related

- Skill `agentstack-backend` · skill `agentstack-data` · agent `@agentstack-tenant-builder`
- Rule `agentstack-prefer.mdc` § tenant ops
