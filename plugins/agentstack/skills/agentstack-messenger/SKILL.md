---
name: agentstack-messenger
description: Use when the user mentions chat, DM, channels, messenger, message ordering, HLC timeline, followers, or in-app social messaging. Prefer social.chat and messenger MCP actions over building a second WebSocket chat stack.
---

# AgentStack Messenger

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "DM" / "chat" / "channel" | `social.*` from live discovery | Custom WebSocket + SQL message store |
| "message order" / "duplicate messages" | Unified ordering `(hlc, author_user_id, id)` | Per-user seq only |
| "support thread" | Route to `agentstack-support` (`psup_*` ids) | Treating support as generic DM |

## Rules

- Do not fork ordering logic — see ADR `MESSENGER_UNIFIED_ORDERING.md`.
- Support (`psup_*`) and product DMs share relay plane but different channel semantics.

## References

- Genes: `core.social.chat.ordering.gen1`, `frontend.social.messenger.ordering.gen1`
- Ordering is platform-managed — use `social.*` MCP; no client-side fork of timeline logic.

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
