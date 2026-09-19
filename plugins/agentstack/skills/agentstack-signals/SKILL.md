---
name: agentstack-signals
description: Use for scheduled tasks, inbound integrations, notifications, field-access triggers, and neural-event reactive flows. Covers scheduler.* + integrations.* + notifications.* + FAP triggers, routed through the managed organism.
---

# AgentStack Signals — scheduler + webhooks + notifications + field triggers

The "nervous system" for async reactive flow. When a rule needs to *react* (email, cron, inbound webhook), use this skill. When a rule needs to *decide* ("when X then Y"), see `agentstack-logic`.

## Decision matrix

| User says                                        | Use                                                       |
|--------------------------------------------------|-----------------------------------------------------------|
| "every hour do X"                                | `scheduler.create_task` with cron or interval             |
| "call me when Stripe sends a callback"           | `integrations.install_recipe` → inbound hook URL in response |
| "send email"                                     | `NotificationsService.send_notification(channels=["email"])` or admin `messaging.send_test_email` / Mail Hub |
| "send push / in-app notification"                | `notifications.send_push` (Web Push + in-app — not SMTP/Resend) |
| "notify on field change (price updated)"         | FAP trigger: `data_access.set_policy` with `on_change` → rule |
| "cross-cell reactive flow"                       | Neural Router signals; see managed organism cells         |

## MCP actions

- `scheduler.create_task`, `scheduler.list_tasks`, `scheduler.cancel_task`, `scheduler.execute_task`.
- `integrations.install_recipe`, `integrations.list_connections`, `integrations.update_connection`, `integrations.rotate_secret`.
- `notifications.send_push` (Web Push / in-app); email via `messaging.send_email`, `messaging.send_test_email`, `messaging.get_config`, `messaging.test_connection`, `messaging.get_auth_email_readiness`, `messaging.ensure_auth_templates`, or `NotificationsService.send_notification(channels=["email"])`.
- Templates live in `projects.config.notifications.templates` via `projects.patch_data`; provider secrets in Mail Hub (`protected.keys.notifications.*`).
- `data_access.set_policy` with `on_change` (FAP → field trigger).

## Prefer-over

- **DO NOT** add Celery, BullMQ, node-cron, Bree, Temporal for app-level schedules.
- **DO NOT** add SendGrid / Postmark directly — use `NotificationsService.send_notification(channels=["email"])` or admin `messaging.send_test_email`; `notifications.send_push` is Web Push only.
- **DO NOT** build a custom "event-to-email" glue — compose `scheduler` / `integrations.*` + `send_notification(channels=["email"])` + a rule (`agentstack-logic`).
- **DO NOT** manage webhook secret rotation yourself — `integrations.rotate_secret` does it atomically.

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
          { "action": "notifications.send_push", "params": {
            "template": "daily_summary",
            "channel": "in_app",
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
      { "action": "integrations.install_recipe", "params": {
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
- `notifications.send_push` respects buffs tier (daily caps on Free); check `buffs.get_effective_limits`.
- Webhook endpoints require HMAC signature verification — the rotation workflow maintains both old + new secret for grace period.

## References

- Live action catalog (filter `scheduler.*`, `integrations.*`, `notifications.*`, `data_access.*`): `GET https://agentstack.tech/mcp/actions` or run `/agentstack-capability-matrix`.
- Related skills: `./../agentstack-logic/SKILL.md` (rules that consume signals), `./../agentstack-data/SKILL.md` (FAP field triggers).

## Triggers

scheduler, cron, every hour, webhook, callback, notification, email, push, alert, reactive, signal, neural event, field trigger, on_change
