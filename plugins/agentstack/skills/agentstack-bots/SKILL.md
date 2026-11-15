---
name: agentstack-bots
description: Use when the user mentions telegram bot, whatsapp bot, instagram bot, bot studio, inbound message handler, bots.simulate, mentor menu heal, TG MAX parity, or bots.go_live. Not Agents Fleet (agents.*) or in-app messenger (social.chat.*).
---

# AgentStack Bots — channel bots + Bot Studio

Live catalog: `GET https://agentstack.tech/mcp/actions` (authoritative action list; do not trust static counts).

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

- **One envelope for media:** `InboundAttachment` on inbound/outbound — no second media bus, no bytes in 8DNA.
- **Agent replies:** brain `output.attachments` + optional text; platform sends via `bots.outbound` — not `bots.staff_reply`.
- **Staff send:** `bots.staff_reply` with optional `attachments` after `storage.upload` (`storage_file_id` + `url`); do not use `notifications.deliver` for chat files.
- **One heavy step per sync batch:** `bots.simulate` / `knowledge.playground` — max one per `agentstack.execute`.
- **Inbound callbacks** → `integrations.install_recipe`, not a second HTTP stack.
- **Not** Agents Fleet — `agents.run` is project agents; `bots.*` is channel connectors.

## Order manager DM (PLAN-1617 — hints are not authority)

- **One runner:** `bots.order_manager_bootstrap` (default `dry_run=true`). Recipe id is `mcp_bot_order_manager_bootstrap_v1` (alias `mcp_order_manager_bootstrap_v1`).
- **Discovery:** `discovery.describe` requires `params.action` (canonical id, e.g. `generation.list`). `generation.list` uses `list_contract=historical_all` — do not rely on UUID-only scoped reads to find sandboxes.
- **Gate A:** Prefer `generation.env_snapshot` with `env_uuid` from `generation.fork` (lightest). `sandbox_gate.next_actions` from the server also route to `generation.env_snapshot` (not list+status+supply). Use `generation.supply_status` (`supply_scope=full`) only when tier/quota/limits matter. Field `sandbox_gate.apply_ready` — **not** top-level `readiness=ready`. When `apply_ready=false`, **STOP apply** — no auto-fork/apply loops. **`bots.order_manager_bootstrap` `dry_run=true` is planning** (`dry_run_planning`) and does not require `apply_ready`; quote `readout.bus_text`.
- **`next_actions` / `recovery_hint`:** navigation hints only — not consent to mutate prod.
- **Comms ≠ config:** `bots.bus.reply` / `staff_reply` success does not mean manager `order_routing_live`.

## MCP recipes

- `mcp_bots_simulate` — list + simulate smoke
- `mcp_tenant_bots_heal_verify` — mentor heal + generation promote ladder
- `mcp_bot_reply_mailbox_v1` — handle.set → inbox → staff_reply → ack
- Prompt: `agentstack_bots_studio` · `agentstack_tenant_ops_mcp_first` · `agentstack_bot_message_bus`

## Agent message bus (owner ↔ agent)

| Step | MCP |
|------|-----|
| Tab badge counts (full index) | `bots.bus.inbox_counts` — **not** `bots.conversations` with `limit=30` |
| Poll mailbox | `bots.bus.inbox` (`handle=` or `source_agent_id=`) |
| Ack read | `bots.bus.ack` (`provider_message_id` preferred) |
| Reply as staff | `bots.staff_reply` |
| Register handle | `bots.bus.handle.set` → `bots.bus.handle.list` |

Do **not** pass `source_agent_id` on `bots.bus.reply` unless the key owns that handle — omit it or use `bots.bus.handle.list` first (`source_agent_forbidden`).

## Group manager (responsible_handle)

The manager is a bus slug, not a grant. Ladder: `bots.bus.handle.list` → `bots.bus.handle.set` only if the slug is missing → `bots.acl.responsible.set` (creates the `by_chat` leaf) → `bots.acl.set_mode` `mode=order`. `bots.acl.grant` is account membership and does not create that leaf. **`routing_gates`** on `bots.acl.list` / REST group-access lists stable `blocker.id` values and machine `gates.*` — use these before guessing. **Declarative manifest (no runner):** `bots.flows.get` / `bots.flows.validate` for `AgentFlowManifestV1`; optional DNA leaf `ecosystem.fleet.agent_flows.defaults.order_manager_v1` — execution stays recipe `mcp_bot_order_manager_bootstrap_v1` or manual MCP steps. Schema: `discovery.describe` with `params.action` (for example `bots.acl.responsible.set`). Do not `discovery.search` `q=group_access` inside a goal-anchored batch. Heal path: MCP prompt **`agentstack_tenant_ops_mcp_first`** · recipe **`mcp_bot_order_manager_bootstrap_v1`** · ADR `docs/adr/GROUP_ACCESS_ROUTING_GATES.md`. Read mode via **`bots.acl.get_mode`** (P0-F removed the old group-access GET alias).

## Showcase reference

Live demo: `/showcase` → `helpdesk_bot` — see `docs/PRODUCT_BUILD_FLOW.pointer.md` (showcase keys).

## References

- [CAPABILITY_MATRIX.md](../../../../docs/CAPABILITY_MATRIX.md) — filter `bots.*`
- Related: `../agentstack-agents-ai/SKILL.md`, `../agentstack-data/SKILL.md`, `../agentstack-integrations/SKILL.md`
