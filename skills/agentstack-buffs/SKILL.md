---
name: agentstack-buffs
description: Manages trials, subscriptions, and temporary or persistent effects in AgentStack via MCP (buffs.*). Use when the user asks about trials, promos, subscriptions, purchases, limits, applying effects, or giving N days of premium.
---

# AgentStack Buffs — Trials, Subscriptions, Effects

Enables managing **buffs** (temporary and persistent effects) via MCP tools under `buffs.*`: trials, promos, subscriptions, one-time purchases, and effective limits — without custom backend logic.

## When to use

- User asks for "trial", "subscription", "promo", "purchase", "limits", "effect", "buff", or "give 7 days premium".
- User wants to grant a time-limited or permanent effect to a user or project (e.g. extra API calls, feature flag).
- User needs to list active buffs or get effective limits after all buffs are applied.
- User wants to automate "on signup give trial" or "on payment apply subscription" (combine with Rules Engine).

## Why buffs matter

- **Temporary effects** (trial, promo) expire and revert automatically; no manual cleanup.
- **Persistent effects** (subscription, one-time purchase) stay until cancelled; use for subscriptions and lifetime upgrades.
- **One domain:** no custom trial/subscription tables; combine with **Rules Engine** so a rule on an event (e.g. signup, payment) calls `buffs.apply_temporary_effect` or `buffs.apply_buff`.

## Capabilities (MCP tools)

| Tool | Purpose |
|------|--------|
| `buffs.create_buff` | Create a buff template (PENDING). Type: trial, promo, subscription, purchase. |
| `buffs.apply_buff` | Activate a PENDING buff for an entity. |
| `buffs.extend_buff` | Extend an active buff (additional days). |
| `buffs.revert_buff` | Revert an active buff (validates resources can be restored). |
| `buffs.cancel_buff` | Cancel a buff in any state (for ACTIVE, revert then remove). |
| `buffs.get_buff` | Get buff details (state, effects, expiry). |
| `buffs.list_active_buffs` | List active buffs for entity (optional category filter). |
| `buffs.get_effective_limits` | Get effective limits after all active buffs. |
| `buffs.apply_temporary_effect` | Apply a temporary effect in one step (create + apply). |
| `buffs.apply_persistent_effect` | Apply a persistent effect in one step (create + apply). |

For full parameters, see **MCP_SERVER_CAPABILITIES** (repo docs).

## Instructions

1. **Trial for N days:** Use `buffs.apply_temporary_effect` with entity_id, entity_kind (user/project), name, duration_days, effects; or create_buff (type trial) + apply_buff.
2. **Subscription or permanent effect:** Use `buffs.apply_persistent_effect` or create_buff (type subscription/purchase) + apply_buff.
3. **Current limits with buffs:** Use `buffs.get_effective_limits` (entity_id, entity_kind, project_id).
4. **Combine with Rules:** On event (signup, payment), call buffs.* from a rule or processor (e.g. `buffs.apply_temporary_effect` for 7-day trial).

## Examples (natural language → tool)

- "Give user 123 a 7-day trial" → `buffs.apply_temporary_effect` with entity_id 123, entity_kind "user", name (e.g. "7-Day Trial"), duration_days 7, effects (e.g. data.limits.api_calls).
- "List active subscriptions for user 123" → `buffs.list_active_buffs` with entity_id 123, entity_kind "user", category "subscription", project_id as needed.
- "What are effective limits for user 123?" → `buffs.get_effective_limits` with entity_id 123, entity_kind "user", project_id.
- "Apply lifetime premium to user 123" → `buffs.apply_persistent_effect` with entity_id 123, entity_kind "user", name, effects.

## References

- **MCP_SERVER_CAPABILITIES** — full list of buffs.* tools and parameters. See repo docs/MCP_SERVER_CAPABILITIES.md.
- **Rules Engine skill** — use when/then rules to trigger buffs on events (e.g. signup → apply_temporary_effect).
- **MCP_QUICKSTART.md** (plugin root) — how to get an API key and add MCP in Cursor.
