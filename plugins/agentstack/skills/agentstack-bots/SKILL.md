---
name: agentstack-bots
description: Use when the user mentions telegram bot, whatsapp bot, instagram bot, bot studio, inbound message handler, bots.simulate, mentor menu heal, TG MAX parity, or bots.go_live. Not Agents Fleet (agents.*) or in-app messenger (social.chat.*).
---

# AgentStack Bots — channel bots + Bot Studio

## MCP-first tenant ops (mentor fleet)

**Before writing code or running local scripts** for tenant bot menu drift:

1. Prompt: `GET /mcp/prompts/get?name=agentstack_tenant_ops_mcp_first`
2. Recipe: `mcp_tenant_bots_heal_verify`
3. Monorepo playbook: Tenant ops MCP-first (platform documentation — maintainers)

| Step | MCP action |
|------|------------|
| Diagnose | `bots.list` → `bots.get` (compare `/start` button payloads) |
| Heal | `bots.ensure_mentor_commands` (`mentor_telegram@v1` / `mentor_max@v1`) |
| Trim drift | `bots.update` + `write_mode=delete` |
| Edit one cmd | `bots.commands.upsert` |
| Verify | `bots.simulate` · `knowledge.playground` (staff, `principal_user_id: 1`) |
| Ship | `generation.diff_vs_prod` → `generation.gates` → `generation.promote` |

**Heavy LLM:** at most **one** `bots.simulate` or `knowledge.playground` per sync `agentstack.execute` batch.

Script fallback (MCP blocked): `unity_apply_mentor_copy_1444.py --force` — still promote when `auto_generation_mode` on.

## Decision matrix

| Intent signal | Prefer | Over |
|---------------|--------|------|
| Telegram / WhatsApp / channel bot | `bots.create`, `bots.attach_channel`, `bots.go_live` | Custom webhook server |
| Test bot reply (LLM) | `bots.simulate` | Hand-rolled OpenAI call in app |
| Mentor menu heal / TG↔MAX parity | `bots.ensure_mentor_commands` + promote | New Python patch scripts |
| Bot brain / fleet agent | `bots.set_brain` + `agents.*` | Duplicate agent runtime |
| In-app DM / channels UI | `agentstack-messenger` | `bots.*` |

## Prefer-over

- **One heavy step per sync batch:** `bots.simulate` / `knowledge.playground` — max one per `agentstack.execute`.
- **Inbound callbacks** → `integrations.install_recipe`, not a second HTTP stack.
- **Not** Agents Fleet — `agents.run` is project agents; `bots.*` is channel connectors.

## MCP recipes

- `mcp_bots_simulate` — list + simulate smoke
- `mcp_tenant_bots_heal_verify` — mentor heal + generation promote ladder
- Prompt: `agentstack_bots_studio` · `agentstack_tenant_ops_mcp_first`

## Showcase reference

Live demo: `/showcase` → `helpdesk_bot` — see `docs/PRODUCT_BUILD_FLOW.pointer.md` (showcase keys).

## References

- [CAPABILITY_MATRIX.md](../../../../docs/CAPABILITY_MATRIX.md) — filter `bots.*`
- Related: `../agentstack-agents-ai/SKILL.md`, `../agentstack-data/SKILL.md`, `../agentstack-integrations/SKILL.md`
