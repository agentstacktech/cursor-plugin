---
name: agentstack-rules-engine
description: Configures server-side logic without code using AgentStack Logic Engine and Rules (when/do, processors, commands). Use when the user wants event-driven rules, triggers, automations, or "when X then Y" behavior.
---

# AgentStack Rules Engine

Enables server-side logic without writing code: event-driven rules (when/do), processors, and commands via the Logic Engine and MCP.

## When to use

- User wants "when [event], then [action]" or "trigger on event".
- User asks for automations, workflows, or reactive logic that run on the server.
- User prefers configuring rules over maintaining custom backend code for the same behavior.

## Capabilities

- **Logic Engine** (`/api/logic`): Create, update, list, execute rules; discover processors and commands.
- **MCP tools:** `logic.*` (create, update, delete, get, list, execute, get_processors, get_commands, flush_batch) and `rules.*` (create_rules, list_rules, update_rules, delete_rules, activate_rules, test_rules).
- **Commands & processors:** Run actions from rules via `commands.execute` / `commands.execute_batch` and `processors.execute` (when available in the MCP instance).

## Core idea

Define **when** (conditions / events) and **do** (actions: processors, commands). The Logic Engine evaluates rules when events occur and runs the configured actions. From Cursor, use MCP `logic.*` and `rules.*` to create, list, and run rules.

## MCP tools

| Tool | Purpose |
|------|--------|
| `logic.create` | Create a Logic Engine rule. |
| `logic.update` | Update a rule. |
| `logic.delete` | Delete a rule. |
| `logic.get` | Get rule details. |
| `logic.list` | List rules for a project. |
| `logic.execute` | Execute a rule immediately. |
| `logic.get_processors` | List available processors. |
| `logic.get_commands` | List available commands. |
| `logic.flush_batch` | Flush logic batch (save accumulated rules). |
| `rules.create_rules` | Create rule (when/do). |
| `rules.list_rules` | List rules. |
| `rules.update_rules` | Update a rule. |
| `rules.delete_rules` | Delete a rule. |
| `rules.activate_rules` | Activate a rule. |
| `rules.test_rules` | Test a rule with sample data. |

## Instructions

1. Prefer Logic Engine / Rules over new custom backend code when the logic is event-driven and fits when/do.
2. **Workflow for a new rule:** (1) Identify event/trigger → (2) Call `logic.get_processors` and `logic.get_commands` to discover actions → (3) Create rule via `logic.create` or `rules.create_rules` with event type and actions → (4) Test with `rules.test_rules` or `logic.execute` before relying on automatic execution.
3. Combine with **buffs** for trials and effects: e.g. rule triggers on signup → `buffs.apply_temporary_effect` for a 7-day trial.

## Flow

1. **Events** are emitted by the app or other services (e.g. via `/api/neural` or internal triggers); the Logic Engine evaluates rules when events occur.
2. **Rules** match on events and run their **do** (processors, commands).
3. From Cursor, use MCP `logic.*` and `rules.*` to create, list, test, and run rules.

## Examples (natural language → approach)

- "When a user signs up, give them a 7-day trial" → Create a logic rule that triggers on signup and applies a trial (e.g. `buffs.apply_temporary_effect` with duration 7 days).
- "When payment succeeds, send a notification" → Create a rule on payment success; action: send notification (notifications MCP or command).
- "I want to add a when/then rule but don't know which actions exist" → Call `logic.get_commands` and `logic.get_processors`, then create rule with chosen action via `logic.create` or `rules.create_rules`.
- "Run rule X with this test payload" → `rules.test_rules` or `logic.execute` with the rule id and test data.

## References

- **Backend API:** Logic Engine at `/api/logic`; events at `/api/neural`. See backend routes in the AgentStack repo.
- **MCP:** `logic.*`, `rules.*`, `commands.*`, `processors.*` in **MCP_SERVER_CAPABILITIES** (repo docs/MCP_SERVER_CAPABILITIES.md).
- **Buffs:** Use `buffs.*` tools for trials, subscriptions, and effects triggered by rules.
