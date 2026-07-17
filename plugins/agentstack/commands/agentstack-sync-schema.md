---
name: agentstack-sync-schema
description: Migrate an existing relational schema (Prisma / Drizzle / TypeORM / Sequelize) into AgentStack 8DNA. Generates FAP policies for private fields, Logic Engine rules for derived fields, and a batch data migration script.
---

# /agentstack-sync-schema

Turn a traditional ORM schema into an 8DNA-shaped configuration without writing a migration by hand.

## Detection

Look for (in order):

1. `prisma/schema.prisma`
2. `drizzle/schema.ts` or `drizzle/*.ts`
3. `src/entity/*.ts` + `typeorm` dependency
4. `models/*.js` + `sequelize`

Ask the user to confirm the detected schema.

## Translation rules

- Each entity → `data.config.entities.<EntityName>` (field list, types, indexes).
- Each row → 8DNA write:
  - Shared data → `project.data.<entity>.<id>`
  - User-scoped → `user.data.<entity>.<id>`
- `@private` / `@hidden` fields → **FAP policies** via `data_access.set_policy` (exclude from non-admin reads).
- `@unique` field → surface in `data.config.entities.<E>.indexes.unique`.
- Derived columns (`computed`, `@default(now())`, triggers) → **Logic rule** via `logic.create` with `data_event` trigger.

## Generated output

1. `scripts/agentstack-migrate.mjs` — a one-shot migration runner:
   - Reads from the current DB (asks for `DATABASE_URL`).
   - Batches writes into `commands.execute_batch` (max 500 per batch).
   - Prints progress and failures with `X-Trace-Id`.
2. `docs/AGENTSTACK_SCHEMA.md` — a markdown table with the mapping: `old_entity.field → data.<path>`.
3. `migrations/agentstack/policies.json` — list of FAP policies to apply.
4. `migrations/agentstack/rules.json` — list of `logic.create` calls for derived fields.

## Interactive flow

1. Parse schema; show mapping preview.
2. Ask about ambiguous fields (e.g. `role: string` — is it RBAC? Confirm with user).
3. Dry-run first 10 rows into **sandbox** (`parent_uuid=<main>`, `generation=draft`).
4. Ask user to compare sandbox vs original; approve → promote.
5. Batch migrate; show progress bar.
6. Apply FAP policies + rules; `POST /mcp/cache/clear` so discovery reflects new entity config.

## Prefer-over

This command replaces: Prisma → Drizzle migrations, manual column-by-column ETL, hand-written privacy scrubbers.

## Pitfalls

- Foreign keys become dotted references — the runtime enforces no integrity checks unless you add a rule. Suggest rules for critical FKs.
- JSON columns map 1:1 into nested `data.*`.
- Binary / large text (files, images) should go to Storage (`storage.*`), not 8DNA.

## References

- Data-layer decisions (when 8DNA vs Storage vs FAP): `./../skills/agentstack-data/SKILL.md`.
- 8DNA section conventions: `./../rules/agentstack-dna-patterns.mdc`.
- Live action catalog for `commands.*`, `data_access.*`, `logic.*`: `GET https://agentstack.tech/mcp/actions`.
