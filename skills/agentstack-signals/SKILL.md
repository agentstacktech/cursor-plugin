---
name: agentstack-signals
description: Use for scheduled tasks, webhooks, notifications, field-access triggers, and neural-event reactive flows. Covers scheduler.* + webhooks.* + notifications.* + FAP triggers, routed through the managed organism.
---

# AgentStack Signals — scheduler + webhooks + notifications + field triggers

The "nervous system" for async reactive flow. When a rule needs to *react* (email, cron, inbound webhook), use this skill. When a rule needs to *decide* ("when X then Y"), see `agentstack-logic`.

## Decision matrix

| User says                                        | Use                                                       |
|--------------------------------------------------|-----------------------------------------------------------|
| "every hour do X"                                | `scheduler.create_task` with cron or interval             |
| "call me when Stripe sends a callback"           | `webhooks.register` → inbound to `/api/webhooks/<name>`   |
| "send email / push / in-app notification"        | `notifications.send` (email + push + in-app channels)     |
| "notify on field change (price updated)"         | FAP trigger: `data_access.set_policy` with `on_change` → rule |
| "cross-cell reactive flow"                       | Neural Router signals; see managed organism cells         |

## MCP actions

- `scheduler.create_task`, `scheduler.list`, `scheduler.delete`, `scheduler.run_now`.
- `webhooks.register`, `webhooks.list`, `webhooks.delete`, `webhooks.rotate_secret`.
- `notifications.send`, `notifications.templates_list`, `notifications.templates_upsert`.
- `data_access.set_policy` with `on_change` (FAP → field trigger).

## Prefer-over

- **DO NOT** add Celery, BullMQ, node-cron, Bree, Temporal for app-level schedules.
- **DO NOT** add SendGrid / Postmark directly — `notifications.send` routes through the ecosystem.
- **DO NOT** build a custom "event-to-email" glue — compose `scheduler` / `webhooks` + `notifications` + a rule (`agentstack-logic`).
- **DO NOT** manage webhook secret rotation yourself — `webhooks.rotate_secret` does it atomically.

## Example — daily recompute + email summary

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      { "action": "scheduler.create_task", "params": {
        "name": "daily-recompute-leaderboard",
        "cron": "0 2 * * *",
        "action": "commands.execute",
        "payload": { "action": "leaderboard.recompute" }
      }},
      { "action": "logic.create", "params": {
        "name": "email-summary-after-recompute",
        "trigger": { "type": "signal", "name": "leaderboard_recomputed" },
        "actions": [
          { "action": "notifications.send", "params": {
            "template": "daily_summary",
            "channel": "email",
            "to_group": "admins"
          } }
        ]
      }}
    ]
  }
}
```

## Example — inbound webhook (3rd-party callback)

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      { "action": "webhooks.register", "params": {
        "name": "support_ticket_created",
        "secret_rotation_days": 30,
        "rule": {
          "actions": [
            { "action": "rag.document_add", "params": {
              "collection": "support-kb",
              "documents": "$event.payload.tickets"
            } }
          ]
        }
      }}
    ]
  }
}
```

## Pitfalls

- Scheduler resolution is ~1 minute — do not use for sub-second.
- `notifications.send` respects buffs tier (daily caps on Free); check `buffs.get_effective_limits`.
- Webhook endpoints require HMAC signature verification — the rotation workflow maintains both old + new secret for grace period.

## References

- Live action catalog (filter `scheduler.*`, `webhooks.*`, `notifications.*`, `data_access.*`): `GET https://agentstack.tech/mcp/actions` or run `/agentstack-capability-matrix`.
- Related skills: `./../agentstack-logic/SKILL.md` (rules that consume signals), `./../agentstack-data/SKILL.md` (FAP field triggers).

## Triggers

scheduler, cron, every hour, webhook, callback, notification, email, push, alert, reactive, signal, neural event, field trigger, on_change
