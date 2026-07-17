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

## References

- Gene: `core.social.support.gen1` — `support_channel_service.py`, runbooks in `docs/operations/`.
- Messenger ordering: `core.social.chat.ordering.gen1` when merging thread history.

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
