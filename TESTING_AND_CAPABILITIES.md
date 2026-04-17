# Testing & Capabilities — AgentStack Cursor Plugin v0.4.9

How to verify each layer of the plugin and what each piece does. For the live MCP action catalogue, call `GET https://agentstack.tech/mcp/actions` or run `/agentstack-capability-matrix`.

## Structure

| Layer | Path | Purpose |
|-------|------|---------|
| Manifest | `.cursor-plugin/plugin.json`, `.cursor-plugin/marketplace.json` | Declares paths, name, version, engines, listing metadata |
| Rules | `rules/*.mdc` | `alwaysApply: true` guard rails that bias Cursor towards MCP |
| Skills | `skills/<domain>/SKILL.md` | Decision-first routers per domain (8 total) |
| Commands | `commands/*.md` | `/`-invoked workflows (`/agentstack-init`, etc.) |
| Agents | `agents/*.md` | Long-running preset agents (architect, migrator) |
| Hooks | `hooks/hooks.json` + `hooks/scripts/*.mjs` | Event-driven automation (sessionStart, beforeShell, postTool, afterFileEdit) |
| MCP | `mcp.json` | Streamable-HTTP MCP server config (Bearer primary) |
| Scripts | `scripts/validate-plugin.mjs`, `scripts/test-device-code.ps1` | Structure validation + E2E smoke test |

## What each skill decides

| Skill | Intent signals (trigger keywords) | Primary MCP actions |
|-------|-----------------------------------|---------------------|
| `agentstack-backend` | backend, API, server, DB, microservice, monolith | Routes to other skills |
| `agentstack-data` | store, save, config, file, upload, variant, A/B, sandbox | `projects.update_project`, `storage.*`, FAP |
| `agentstack-auth-rbac` | login, register, session, profile, role, admin, permission | `auth.*`, `rbac.*`, `projects.update_user_role` |
| `agentstack-logic` | when X then Y, rule, automation, trigger, workflow, on signup | `logic.*`, `commands.execute` |
| `agentstack-commerce` | payment, subscription, trial, wallet, inventory, tier gate | `payments.*`, `wallets.*`, `buffs.*`, `assets.*` |
| `agentstack-rag` | vector, semantic, embedding, knowledge base, memory | `rag.collection_*`, `rag.search`, `rag.memory_*` |
| `agentstack-signals` | cron, schedule, webhook, notification, field trigger | `scheduler.*`, `webhooks.*`, `notifications.*` |
| `agentstack-projects` | workspace, tenant, API key, stats, service caps | `projects.*`, `apikeys.*` |

## Manual test matrix

### 1. Install
```text
/agentstack-init
```
Expected: OAuth Device Code flow completes in under 30 s, Bearer written to `~/.cursor/mcp.json`.

### 2. Capability discovery
```text
/agentstack-capability-matrix
```
Expected: 80+ actions grouped by domain.

### 3. Auth scaffolding
```text
/agentstack-scaffold-auth
```
Expected: Login / register components that call `auth.quick_auth` / `auth.create_user` through `@agentstack/sdk`.

### 4. Rule creation
Ask Cursor:
> "When a user registers, give them a 7-day pro trial."

Expected: a call to `logic.create` with a `when` of `user.registered` and a `do` step of `buffs.apply_temporary_effect`. Dry-run before enabling.

### 5. Payment flow
Ask:
> "Add a one-time $9 purchase of `plan.pro`."

Expected: `payments.create` + `<AgentPay>` widget, no direct Stripe SDK.

### 6. RAG
```text
/agentstack-index-docs
```
Expected: collection `my-project-docs` populated from the project's markdown/text docs (README, ADRs, `docs/**`); follow-up asks like "what is our auth model?" return `rag.search` hits grounded in your docs. Source code is intentionally **not** indexed — Cursor handles code search locally.

### 7. Diagnose
```text
/agentstack-diagnose
```
Expected: a single status table — MCP reachable, token fresh, project set, scope list, no errors.

### 8. Automated checks
```bash
node scripts/validate-plugin.mjs
pwsh ./scripts/smoke-local.ps1           # structural + hook syntax + behaviour
pwsh ./scripts/test-device-code.ps1      # E2E Device Code (needs AGENTSTACK_TEST_COOKIE)
```

## Telemetry (opt-in)

Add to `~/.cursor/settings.json`:

```json
{ "agentstack.sendTelemetry": true }
```

The `postToolUse` hook batches MCP usage events into `~/.cursor/agentstack-telemetry.jsonl` and flushes hourly to `POST /api/telemetry/plugin`. Data points: tool name, action, success, duration, `trace_id`. Never includes request bodies.

## CI recipe

```yaml
- name: Validate plugin structure
  run: node scripts/validate-plugin.mjs
  working-directory: ./cursor-plugin

- name: Layered smoke test (no backend)
  run: pwsh scripts/smoke-local.ps1 -Quick
  working-directory: ./cursor-plugin

- name: Device Code smoke test (staging)
  if: secrets.AGENTSTACK_TEST_COOKIE
  run: pwsh scripts/test-device-code.ps1
  working-directory: ./cursor-plugin
  env:
    AGENTSTACK_BASE_URL: https://staging.agentstack.tech
    AGENTSTACK_TEST_COOKIE: ${{ secrets.AGENTSTACK_TEST_COOKIE }}
```

## References

- Plugin structure rationale: this file + `./README.md` + `./CHANGELOG.md`.
- Decision-first rules: `./rules/*.mdc`.
- Domain skills: `./skills/*/SKILL.md`.
- Live MCP action catalogue: `GET https://agentstack.tech/mcp/actions` (or `/agentstack-capability-matrix`).
