# Changelog

All notable changes to the AgentStack Cursor plugin are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.4.9] - 2026-04-17

> **Clean break from 0.4.x.** Older installations are not backward compatible — re-run `/agentstack-init` to upgrade. Gen2 of the plugin redesigns onboarding around OAuth 2.1 Device Code and restructures the content into a 5-layer architecture so Cursor's AI reliably prefers AgentStack MCP over writing custom backend.

### Breaking

- **Drop manual `X-API-Key` as the primary install.** OAuth 2.1 Device Code is the default. Manual `X-API-Key` is a fallback only.
- **Plugin layout refactored.** Old skills (`agentstack-8dna`, `agentstack-rules-engine`, `agentstack-projects`) are removed; content migrated into 8 decision-first skills (`agentstack-backend`, `agentstack-data`, `agentstack-auth-rbac`, `agentstack-logic`, `agentstack-commerce`, `agentstack-rag`, `agentstack-signals`, `agentstack-projects`).
- **Manifest reshaped.** `plugin.json` now declares explicit `rules/`, `skills/`, `commands/`, `agents/`, `hooks/hooks.json`, `mcpServers: mcp.json` paths. `engines.cursor: ">=0.45.0"`.
- **`mcp.json` is now `streamable-http`** with `Authorization: Bearer ${AGENTSTACK_ACCESS_TOKEN}` as the primary header.

### Added

1. **`/agentstack-init`** — 30-second OAuth Device Code install, project bootstrap, SDK scaffold, capability matrix print.
2. **`/agentstack-login`**, **`/agentstack-scaffold-auth`**, **`/agentstack-scaffold-backend`**, **`/agentstack-sync-schema`**, **`/agentstack-diagnose`**, **`/agentstack-capability-matrix`**, **`/agentstack-index-docs`** (markdown/text only — source code is intentionally kept local to Cursor).
3. **Hooks layer**: `hooks/hooks.json` wires `sessionStart` → Bearer auto-refresh, `beforeShellExecution` → secret-leak guard, `postToolUse` → opt-in telemetry, `afterFileEdit` → discovery cache refresh.
4. **Agents layer**: `agentstack-architect` (full backend from spec), `agentstack-migrator` (Supabase/Firebase/Auth0/Stripe → AgentStack).
5. **`alwaysApply: true` rule** `agentstack-prefer.mdc` — 10 decision rules that stop Cursor from writing boilerplate when MCP already solves it.
6. **OAuth Device Code scripts** — `hooks/scripts/device-code.mjs` (install) + `session-start.mjs` (refresh) + auto-browser open + scope→service_caps mapping.
7. **Brand assets** — `assets/logo.svg`, `assets/logo-dark.svg`, marketplace manifest with screenshots.
8. **Validators** — `scripts/validate-plugin.mjs` covers hooks + frontmatter + streamable-http + trigger keywords. `scripts/smoke-local.ps1` runs 3-layer checks from the maintainer's machine (validator + `node --check` + optional curl contract checks against the cloud API — AgentStack is cloud-only, there is no local backend to run). `scripts/test-device-code.ps1` is an E2E smoke test for the Device Code path against the same cloud API.

### Backend surface this release depends on

- `POST /api/oauth2/device/authorize`, `GET /api/oauth2/device/info`, `POST /api/oauth2/device/approve`, `POST /api/oauth2/device/deny`, `POST /api/oauth2/token` — OAuth 2.1 Device Code endpoints with scope → service_caps mapping.
- `POST /api/telemetry/plugin` — opt-in telemetry ingest.
- `https://agentstack.tech/activate` — consent page that drives the Device Code flow.
- `GET https://agentstack.tech/mcp/actions` — live capability catalogue (single source of truth).

### Removed

- `skills/agentstack-8dna/`, `skills/agentstack-rules-engine/`, legacy single-purpose rules (`agentstack-json-config.mdc`). Their content is in the new router skills.
- Manual `X-API-Key` placeholder in `mcp.json` as the primary header.

## [0.4.0] - 2026-02-23

- Version aligned to global AgentStack 0.4.0.

## [0.1.0] - 2026-02-22

- Initial release with 3 skills (`agentstack-8dna`, `agentstack-projects`, `agentstack-rules-engine`), 2 rules, manual API key install.
