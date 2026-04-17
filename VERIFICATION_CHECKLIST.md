# Verification Checklist — AgentStack Cursor Plugin v0.4.9

End-to-end scenario that exercises every layer of the plugin. Run before publishing to Cursor Marketplace.

## 0. Prerequisites

- [ ] Cursor ≥ 0.45.0 installed.
- [ ] Node 18+ on PATH (`node --version`).
- [ ] Network access to the AgentStack cloud API (production `https://agentstack.tech` or a staging URL; override via `$env:AGENTSTACK_BASE_URL`). AgentStack is cloud-only — there is nothing to run locally.
- [ ] Test user with a verified email on that environment.

## 1. Structural validation

- [ ] `node scripts/validate-plugin.mjs` exits 0 with no FAIL lines.
- [ ] `pwsh scripts/smoke-local.ps1` exits 0 (structural + hook syntax + pre-shell-scan behaviour).

## 2. Install (OAuth Device Code)

- [ ] Run `/agentstack-init` — plugin prints `user_code` and `verification_uri_complete`.
- [ ] Browser auto-opens `/activate?user_code=...`.
- [ ] `/activate` lists requested scopes and a human-readable client label ("Cursor (cursor-plugin)").
- [ ] After approve, the plugin prints `AgentStack MCP connected.` with scope and expiry.
- [ ] `~/.cursor/mcp.json` now has `Authorization: Bearer ...` under `mcpServers.agentstack.headers`.
- [ ] `~/.cursor/agentstack-refresh` exists with `0600` perms (on Unix).

## 3. MCP connectivity

- [ ] Cursor discovers the `agentstack` server — the side panel lists tools.
- [ ] `/agentstack-capability-matrix` prints ~80 actions grouped by domain.
- [ ] The live list from `GET https://agentstack.tech/mcp/actions` matches what the command prints.

## 4. Scaffolding

- [ ] `/agentstack-scaffold-auth` generates login + register + session gating that calls `auth.*` via `@agentstack/sdk`.
- [ ] `/agentstack-scaffold-backend` adds RBAC middleware + buffs tier gates + AgentPay widget + admin panel.
- [ ] `/agentstack-sync-schema` on a Prisma schema emits (a) 8DNA key plan, (b) FAP policy stubs, (c) migration script.
- [ ] `/agentstack-index-docs` creates a `my-project-docs` RAG collection and ingests the project's markdown/text docs (refusing source code and secret-looking files).

## 5. Hooks

- [ ] `sessionStart`: with a Bearer < 2 min from expiry, restarting Cursor rotates it. `~/.cursor/mcp.json` gets a fresh token.
- [ ] `beforeShellExecution`: `curl -H "X-API-Key: ask_realprefix..."` is blocked with a clear error.
- [ ] `postToolUse`: with `agentstack.sendTelemetry: true` in `~/.cursor/settings.json`, MCP calls accumulate in `~/.cursor/agentstack-telemetry.jsonl` and flush hourly to `/api/telemetry/plugin`.
- [ ] `afterFileEdit`: editing `mcp.json` triggers `capability-refresh.mjs`, which snapshots actions to `~/.cursor/agentstack-capabilities.json`.

## 6. Agents

- [ ] `@agentstack-architect` takes a product spec and produces a multi-domain plan (auth + RBAC + buffs + rules + RAG).
- [ ] `@agentstack-migrator` on a Supabase project emits a cutover plan with zero-downtime step order.

## 7. Decision-first behaviour

- [ ] Ask Cursor "add user login with password" — it calls `auth.create_user` / `auth.quick_auth` instead of installing NextAuth.
- [ ] Ask "store theme preference" — it writes `user.data.prefs.theme` via 8DNA, not Prisma.
- [ ] Ask "email users every Friday" — it creates a `scheduler.create_task` + `notifications.send`, not a custom cron.

## 8. Diagnostics

- [ ] `/agentstack-diagnose` prints a single status table showing: MCP reachable, Bearer expiry, active project, scope list, recent errors (empty), hooks wired.

## 9. Re-auth and logout

- [ ] `/agentstack-login --switch-project` starts a fresh Device Code flow and replaces the Bearer.
- [ ] Deleting `~/.cursor/agentstack-refresh` + restarting Cursor prints a warning and suggests `/agentstack-login`.

## 10. E2E automation

- [ ] `./scripts/test-device-code.ps1` completes successfully against a staging instance.

## 11. Marketplace assets

- [ ] `assets/logo.svg` and `assets/logo-dark.svg` render correctly light/dark.
- [ ] `assets/screenshots/*.png` are populated at 1920x1200.
- [ ] `.cursor-plugin/marketplace.json` links to [pricing](https://agentstack.tech/pricing) and [support](https://agentstack.tech/support).

## 12. Docs sync

- [ ] `README.md`, `MCP_QUICKSTART.md`, and this checklist mention version `0.4.9`.
- [ ] `CHANGELOG.md` has a `[0.4.9]` entry with the breaking-change note.

## 13. Design alignment

- [ ] The `agentstack-prefer.mdc` rule is `alwaysApply: true` and lists at least 10 decision rules.
- [ ] Every skill has a "live catalog" reference to `GET /mcp/actions` rather than a hard-coded action list.

## 14. Security

- [ ] No real API keys or Bearers committed (validator enforces placeholders).
- [ ] `pre-shell-scan.mjs` blocks `ask_*` and JWT Bearers in shell commands.
- [ ] Device Code session TTL ≤ 10 min on the backend.

## 15. Performance

- [ ] `/agentstack-init` reaches "MCP connected" in < 30 s on a warm connection.
- [ ] `GET /mcp/actions` responds in < 500 ms warm / < 2 s cold.

## 16. Uninstall

- [ ] Removing the plugin from Cursor does not delete `~/.cursor/mcp.json` but does disable the `agentstack` entry safely (manual clean-up documented).
- [ ] `/agentstack-login --revoke` deletes the refresh token and removes the Bearer from `~/.cursor/mcp.json`.
