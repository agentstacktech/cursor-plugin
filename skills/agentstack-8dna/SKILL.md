---
name: agentstack-8dna
description: Applies AgentStack 8DNA (JSON+): structured JSON data model with built-in support for variants (e.g. A/B tests). Use when the user mentions data store, database, structured data, A/B tests, experiments, or design of AgentStack data (data/config/protected).
---

# AgentStack 8DNA — JSON+ (Structured JSON and Built-in Variants)

**8DNA is AgentStack’s data model (JSON+):** structured JSON storage with built-in support for organizing data and running variants (e.g. A/B tests). Business data and config live in `data` (and `data.config`); secrets live in `protected`.

**Data store (the “database”):** Yes, there is a data store. Each project and each user has a JSON document. Read/write via the **key-value API** (GET/POST `/data` with keys `project.data.<path>`, `user.data.<path>`) or via **project API** (`projects.get_project` returns project including `data`; `projects.update_project` accepts `data`). See repo **docs/architecture/DNA_KEY_VALUE_API.md**.

**What you can do with JSON+:** Store all business data and public config in `data` (with optional `data.config`); keep secrets in `protected`; use dot-notation keys for consistent access; use built-in support for variants (e.g. A/B tests). APIs and MCP operate on this same structure.

## When to use

- User asks where data is stored or how to use the database.
- User mentions structured data, config, or design of AgentStack `data` / `config` / `protected`.
- User asks about A/B tests, experiments, or variants.
- Design or code reviews of AgentStack data and config structure.

## Capabilities

- **Structure (`data` / `protected`):** All business data and public config in `data` (e.g. `data.config`, `data.system.config`); sensitive data only in `protected` (keys, secrets), never logged or exposed. Dot-notation keys (e.g. `config.webhooks.timeout_ms`, `config.permissions.read`) for consistent access.
- **Built-in variants:** JSON+ supports organizing data and running variants (e.g. A/B tests). For advanced usage see repo docs.

## Core concepts

### Structure: `data` and `protected`

- **`data`:** All business data and public config; may include `data.config`, `data.system.config`.
- **`protected`:** Sensitive data only (keys, secrets); access via backend; never log or expose.
- **Dot-notation keys** for consistent, hierarchical access (e.g. `config.webhooks.timeout_ms`).

## Instructions

1. Store business data and config in `data` (and `data.config`); never put secrets in `data` — use `protected` and documented key paths.
2. Use dot-notation keys in `data` and `config` for consistency.
3. For “where is the database?” or “how do I read/write?”: use key-value API (GET/POST `/data`, keys `project.data.*`, `user.data.*`) or `projects.get_project` / `projects.update_project`.
4. For A/B tests or variants: JSON+ has built-in support; refer the user to repo docs for details.

## Examples

- **“Where is data stored?”** → Project and user each have a JSON document (`project.data`, `user.data`). Read/write via key-value API (GET/POST `/data`) or `projects.get_project` / `projects.update_project`. See DNA_KEY_VALUE_API in repo.
- **“Store project config”** → Use `project.data.config.<path>` via key-value API or `projects.update_project` with `data`.
- **“A/B tests or experiments?”** → JSON+ supports variants (e.g. A/B); for implementation details see repo docs.

## References

- **DNA Key-Value API (data store)** — docs/architecture/DNA_KEY_VALUE_API.md in repo: how to read/write project.data and user.data via GET/POST /data or project API.
- For advanced 8DNA capabilities see repo philosophy/docs.
