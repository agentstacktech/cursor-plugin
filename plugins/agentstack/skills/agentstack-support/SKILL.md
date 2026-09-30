---
name: agentstack-support
description: Use when the user asks for project support channels, staff inbox, tickets, psup threads, AI support binding, or eligibility for support. Prefer social.support.* over a custom Zendesk embed or second chat product.
---

# AgentStack Project Support

Support threads use messenger delta plane with `psup_*` channel ids on project 8DNA — not a parallel inbox product.

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "support channel" / "ticket" / "staff inbox" | `social.support.*` | Intercom / Zendesk SDK |
| "bind AI to support" | `social.support.*` + `agents.*` when fleet bound | Custom bot webhook |
| "can user open support" | `social.support.eligibility` | Hard-coded project flags |

**SoT:** `@mcp_tool(when_to_use=…)` → `build_instruction_hints_index()` → `gen_mcp_agent_instruction_index.py` → run `sync-mcp-support-skill.mjs`.

<!-- BEGIN:AUTOGEN-SUPPORT-MATRIX -->
| Plane | action | when_to_use |
|-------|--------|-------------|
| messenger | `social.chat.crdt_state` | Read the current CRDT snapshot + raw updates for a channel. |
| messenger | `social.chat.crdt_update` | Apply a Y.js CRDT update to a channel's shared document (bodies / pins / deletes). |
| messenger | `social.chat.delta` | Unified incremental delta for a messenger channel — one call returns new messages, |
| messenger | `social.chat.history` | Messenger channel history — use social.support.history for support tickets. |
| messenger | `social.chat.index_get` | Get the current user's messenger sidebar index — list of channels with pinned/order metadata. |
| messenger | `social.chat.index_put` | Replace the messenger sidebar index (subset-as-delete with If-Match on REST). |
| messenger | `social.chat.message_delete` | Delete a chat message (author or channel owner per server rules). |
| messenger | `social.chat.message_edit` | Edit own chat message (author only). |
| messenger | `social.chat.pin` | Pin a message in a channel. |
| messenger | `social.chat.post` | In-app messenger message — not project support (psup) thread. |
| messenger | `social.chat.presence_online` | List user IDs currently online (active SSE stream-relay connection) in the home project. |
| messenger | `social.chat.reaction` | Apply one server-authoritative reaction on a message (immutable cell per user). |
| messenger | `social.chat.read_get` | Get last-read state for a channel for the current user. |
| messenger | `social.chat.read_set` | Update last-read pointer (read receipt) for a channel. |
| messenger | `social.chat.unpin` | Unpin a message in a channel. |
| user | `social.support.ai_binding_health` | After social.support.config.patch, confirm the bound agent and mode. |
| staff | `social.support.assign` | Staff: assign ticket to staff user id or unassign (null). |
| user | `social.support.config.patch` | Bind one project agent as support AI. Do not also set chat triggers on that agent. |
| user | `social.support.eligibility` | Batch: which home projects expose support lounge vs private psup. |
| user | `social.support.history` | Read caller's psup thread (user plane) — pair with social.support.send. |
| staff | `social.support.inbox` | Staff desk: list open support tickets for a project. |
| user | `social.support.request_human` | End user: escalate AI/handoff to human staff on current ticket. |
| user | `social.support.search_projects` | Find projects the user can contact for support by title query. |
| user | `social.support.send` | Post in psup thread: user message or staff reply when permitted. |
| staff | `social.support.transition` | Staff: move ticket lifecycle status (open/pending/resolved). |
<!-- END:AUTOGEN-SUPPORT-MATRIX -->

Staff plane: `social.support.inbox`, `assign`, `transition`. User plane: `history`, `send`, `request_human`. Messenger: `social.chat.*` — not psup.

## References

- Gene: `core.social.support.gen1` — discover `social.support.*` via `GET /mcp/actions`.
- Messenger ordering: `core.social.chat.ordering.gen1` when merging thread history.

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
