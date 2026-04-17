---
name: agentstack-logic
description: Use for any "when X then Y" — rules, automations, triggers, workflows, event reactions, scheduled actions, webhook reactions. Covers Logic Engine V2 + rules + commands + deterministic dry-run and versioning.
---

# AgentStack Logic Engine V2

Declarative rules (`when → do`), versioned, dry-runnable, attachable from templates.

## Trigger types

| Trigger         | Fires on                                               | Example use                                      |
|-----------------|--------------------------------------------------------|--------------------------------------------------|
| `command`       | MCP / REST call of `commands.execute`                  | "on signup..." when the signup action is called  |
| `data_event`    | Write to 8DNA (create / update / delete)               | "when `project.data.orders.*` is added..."       |
| `signal`        | Neural Router signals (user_joined, payment_success..) | "on `payment_success` → grant pro buff"          |
| `cdc`           | Change-Data-Capture from DB                             | Rare, for legacy mirroring                       |
| `webhook`       | Incoming webhook at `/api/webhooks/<name>`              | Stripe-like inbound callbacks                    |
| `neural_event`  | Managed organism events                                 | Cross-cell reactions                             |
| `scheduler`     | Cron / interval                                         | "every hour recompute limits"                    |

## Decision matrix

| User says                                  | Trigger + action                                                  |
|--------------------------------------------|-------------------------------------------------------------------|
| "when user signs up give 7-day trial"      | `signal:user_created` → `buffs.apply_temporary_effect`            |
| "on payment success grant pro"             | `signal:payment_success` → `buffs.apply_persistent_effect`        |
| "every hour recalc leaderboard"            | `scheduler:cron('0 * * * *')` → `commands.execute` recalc batch   |
| "when order added send email"              | `data_event:project.data.orders.*.created` → `notifications.send` |
| "when trial expired remove feature"        | `scheduler:daily` + `logic.check_expiry` → `buffs.revoke`         |

## MCP actions

- `logic.create` — define rule (name, trigger, conditions, actions).
- `logic.update`, `logic.delete`, `logic.list`.
- `logic.dry_run` — seed-based deterministic replay. **Always call before enabling.**
- `logic.list_versions`, `logic.revert` — time travel.
- `logic.attach_template` — pick from `logic.templates_catalog`.
- `logic.signals_catalog` — discover emitted signals.
- `logic.mcp_actions_catalog` — list actions usable inside a rule's `do` block.

## Example — rule with dry-run first

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      { "action": "logic.dry_run", "params": {
        "trigger": { "type": "signal", "name": "user_created" },
        "actions": [
          { "action": "buffs.apply_temporary_effect", "params": { "user_id": "$event.user_id", "effect": "pro_trial", "duration_days": 7 } }
        ],
        "seed": "demo-user-42"
      }},
      { "action": "logic.create", "params": {
        "name": "grant_7d_trial_on_signup",
        "trigger": { "type": "signal", "name": "user_created" },
        "actions": [
          { "action": "buffs.apply_temporary_effect", "params": { "user_id": "$event.user_id", "effect": "pro_trial", "duration_days": 7 } }
        ],
        "enabled": true
      }}
    ]
  }
}
```

## Prefer-over

- **DO NOT** wire Celery / BullMQ / node-cron for simple triggers — use `scheduler` trigger type.
- **DO NOT** add Zapier / n8n for internal automations — rules live inside the project and share RBAC.
- **DO NOT** build a custom "event bus" when Neural Router is available.
- For external orchestration (Temporal, Airflow) — still ok, but usually overkill for app-level rules.

## Pitfalls

- `dry_run` expects a `seed`; the same seed replays deterministically (needed for CI).
- Rules with `data_event` triggers on high-churn paths can thrash — scope by path prefix.
- `logic.attach_template` copies on attach; updates to the template do not propagate.

## References

- Live action catalog (filter `logic.*`, `commands.*`): `GET https://agentstack.tech/mcp/actions` or run `/agentstack-capability-matrix`.
- Related skills: `./../agentstack-signals/SKILL.md` (trigger sources), `./../agentstack-data/SKILL.md` (CDC / data_event triggers).

## Triggers

rule, automation, trigger, workflow, when, event, signal, cron, schedule, webhook, reaction, side-effect, on signup, on payment, if X then Y
