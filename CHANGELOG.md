# Changelog

All notable changes to the AgentStack Cursor plugin are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.4.18] - 2026-08-17

### Added

- **Plugin MCP in the panel:** `plugin.json` `mcpServers: "./mcp.json"` (Figma-style path string) plus URL-only `plugins/agentstack/mcp.json` (no `Authorization`). Click **Connect** — G-A174 login on prod. Device Code still writes `~/.cursor/mcp.json` for hooks.

### Fixed

- MCP absent from the plugin package (0.4.17 over-corrected G-A162). Empty `${AGENTSTACK_ACCESS_TOKEN}` remains forbidden.

### Changed

- Validators / diagnose / refresh require OAuth-safe plugin MCP; `--fix` syncs `mcp.json` instead of deleting it.

## [Unreleased]

### Added

- **`/agentstack-authorize`:** one-shot Device Code sign-in (no API key, default full scopes). Cursor plugins have no webview Connect button; this slash command is the auth control.
- **`sessionStart` additional_context:** when unsigned, placeholder token, or `service_caps=null`, inject `/agentstack-authorize` into the conversation. Hook stdout is now a single JSON object (logs on stderr) so Cursor can apply the context.
- **sessionStart auto Device Code:** Cursor hook (`--from-hook`) spawns `device-code.mjs` when the auth gate needs login. Single-flight lock `~/.cursor/agentstack-device.lock`. Tests/diagnose do not pass `--from-hook`. Opt out: `AGENTSTACK_DISABLE_AUTO_LOGIN=1`.
- **Tenant pin file is live:** `~/.cursor/agentstack-project` is read by Device Code and sessionStart (`readPinnedTenantProjectId`). Ecosystem `1` is ignored.
- **Normalize scrubs ecosystem `X-Project-ID=1`** (same helper as Device Code Bearer apply). `agentstackAuthHeaders` no longer forwards pid `1`.
- **`refresh-cursor-runtime --fix` syncs the auth slice** (hooks + Device Code + kernel) into Cursor marketplace cache so auto-login is not stuck on 0.4.16.
- **Capability snapshot SoT:** Device Code, sessionStart, capability-refresh, and diagnose `--seed-snapshot` share `writeTenantCapabilitySnapshot` in plugin-kernel (no per-hook JSON shape).

### Fixed

- **Diagnose was green while execute was dead (G-A171):** `tools/list` is public-shaped; prod still rejects JWT `service_caps=null` on `tools/call`. Diagnose now peeks JWT caps (no secret), probes `system.ping`, and prints the MCP error text. Device Code no longer overwrites a tenant `X-Project-ID` with ecosystem `1`.
- **Scope-map test** pointed at the pre-2.6 `hooks/scripts/device-code.mjs` path (file gone). Atlas gene `repo.plugins.oauth_device_code.gen1` now runs `test_device_code_scope_map.py`.
- **`test-device-code.ps1`** used the same stale plugin-root `hooks/` path; Device Code e2e script now runs `plugins/agentstack/hooks/scripts/device-code.mjs`. Token grant is a long-lived PAT (no `refresh_token`) — FLOW.md matches.

## [0.4.17] - 2026-08-13

### Fixed

- **Plugin MCP shadowed user key (G-A162):** Cursor auto-registers `plugins/agentstack/mcp.json` as `plugin-agentstack-*` with empty `${AGENTSTACK_ACCESS_TOKEN}`. `discovery.list` worked; `projects.get_projects` returned unauthorized even when `~/.cursor/mcp.json` had a valid Bearer/PAT. Removed shipped `mcp.json`; example lives at `mcp.example.json`. Reload Window after update — keep **one** AgentStack MCP from `~/.cursor/mcp.json`.
- **OAuth refresh skipped `client_secret` (G-A163):** `session-start.mjs` posted refresh with only `client_id`; prod requires the confidential secret from env or `~/.cursor/agentstack-oauth-client.json`. Shared `loadConfidentialClient` in plugin-kernel; Device Code and session-start both send it.
- **Public plugin Device Code (G-A164):** `cursor-plugin` (and sibling IDE clients) are RFC 8628 public clients — `device/authorize` + token poll/refresh work without `client_secret`. Default client is builtin public (DCR json only if `AGENTSTACK_OAUTH_USE_DCR=1`). `diagnose-local` / `refresh-cursor-runtime --fix` treat cached plugin `mcp.json` as a fail (G-A162).

### Changed

- Validate gate: fail if the plugin package ships `mcp.json` (auto-register trap).

## [0.4.16] - 2026-08-07

### Fixed

- **Duplicate MCP tools in Cursor:** stop registering a plugin-level MCP server (`mcpServers` in `plugin.json`). Auth + MCP config stay in `~/.cursor/mcp.json` from Device Code only — avoids `plugin-agentstack-*` + `user-agentstack` double registration.
- **Backend `tools/list`:** return one tool (`agentstack.execute`) instead of dot + underscore aliases. Cursor normalizes both to `agentstack_execute`, which looked like two identical tools. `tools/call` still accepts `agentstack_execute`.

### Changed

- README / maintainer docs: Cursor 2.6+ layout (`plugins/agentstack/`), accurate layer counts, MCP dedupe contract, docs map.
## [0.4.15] - 2026-08-06

> Fix Cursor plugin load failure ("Unsupported plugin manifest $schema version") and align with current Cursor manifest contract.

### Fixed

- **Plugin load blocker:** remove `$schema` from `plugin.json`, `marketplace.json`, and `hooks.json`. Current Cursor builds whitelist only internal schema IDs; raw GitHub schema URLs cause hard load failures.
- `agentstack-guidance` skill: inline frontmatter `description` (folded YAML broke validator word count); remove `docs/operations/` tenant-forbidden path; add live `GET /mcp/actions` catalog pointer.
- Backend router: add `agentstack-openapi` row.

### Added

- `variables` JSON Schema in `plugin.json` for `${AGENTSTACK_ACCESS_TOKEN}` (Cursor Plugins → Configure contract).
- Shared `extractMcpAction` for hook event shapes (`arguments.params.steps` for `agentstack.execute`).
- Monorepo validators aligned: no `$schema` in shipped manifests; `variables` required.
- **Runtime:** `scripts/refresh-cursor-runtime.mjs` detects/fixes stale Cursor marketplace **cache** still serving 0.4.14 with `$schema` (local link alone was not enough).

## [0.4.14] - 2026-07-17

> Marketplace ship wave — self-contained Device Code, schema-valid manifest, listing SoT, hooks lifecycle.

### Fixed (flow hardening)

- OAuth Device Code poll: treat HTTP 400 `authorization_pending` / `slow_down` as continue (RFC 8628).
- Capability snapshot: flatten `GET /mcp/actions` `{domains}` → `actions[]` for `beforeMCPExecution` cap hints.
- `device-code.mjs --help` exits 0 without starting OAuth (safe smoke).
- Lean MCP write path shared via `mcpConfig.mjs` (no `tools` extras).
- Standalone CI: vendor `scripts/lib/stale-actions.mjs` + `docs/CAPABILITY_MATRIX.md` (validate no longer imports monorepo-only paths).
- Cursor 2.6+ install: restore schema-valid `.cursor-plugin/marketplace.json` + nest package under `plugins/agentstack/` (bare `source`, `pluginRoot: plugins`). Keep `listing.json` as AgentStack publisher SoT.
- Lean MCP config: strip `tools` extras; sessionStart seeds capability snapshot with Bearer **or** `X-API-Key`; `scripts/diagnose-local.mjs` (`--fix`, `--seed-snapshot`).
- Layer audit: `scripts/audit-layers.mjs` (skills/rules/commands/agents/hooks) wired into smoke + CI.

### Added (local verify)

- `scripts/install-local.mjs` / `uninstall-local.mjs` — Windows junction / Unix symlink into `~/.cursor/plugins/local/agentstack`.
- `LOCAL_INSTALL.md`, `FLOW.md`, cross-platform `scripts/smoke-local.mjs`.
- `smoke-local.ps1 -Install` Layer 0.

### Added

- Vendored `lib/plugin-kernel/` (self-contained publish artifact; `sync-plugin-kernel.mjs --check`).
- `.cursor-plugin/listing.json` AgentStack publisher SoT (replaces false Cursor `marketplace.json` schema).
- Hooks: `beforeMCPExecution`, `sessionEnd`, `postToolUseFailure`.
- OSS: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`; publish-repo `.github/workflows/validate.yml`.
- Marketplace screenshots at 1920×1200 + alts; `generate-marketplace-screenshots.mjs`.
- Intent-eval collisions (wallet / Stripe webhook vs SDK); expanded CRM/AgentNet/storefront/guidance coverage.

### Changed

- `plugin.json` sanitized to Cursor schema (`additionalProperties: false`); `$schema` pin to raw `plugin.schema.json`.
- Telemetry: local buffer **only** when `agentstack.sendTelemetry` is true; version read from `plugin.json`.
- T0 `agentstack-prefer` tenant-safe (monorepo/founder language stays in T3 `agentstack-platform-monorepo`).
- Version line **0.4.14**; validators / checklists / diagnose aligned.

### Security

- Documented token storage threat model (Bearer in mcp.json; Windows ACL note).
- Opt-in telemetry honesty for marketplace security review.

## [0.4.13] - 2026-05-29

> **gen3** — catalog plane, skill split, publication CI, platform 0.4.13 alignment.

### Added

- Skills: `agentstack-hosting`, `agentstack-support`, `agentstack-storage` (split from support-storage).
- Skills: `agentstack-messenger`, `agentstack-integrations`, `agentstack-discovery`, `agentstack-commerce-assets`, `agentstack-capability-tasks`, `agentstack-sdk`.
- Rules: platform-monorepo, messenger-tenant, ui-surfaces, agentnet-naming.
- Commands: `/agentstack-host-site`, `/agentstack-support-setup`, `/agentstack-integrations-wizard`, `/agentstack-sdk-surface`, `/agentstack-discover`.
- Agents: `@agentstack-oncall`, `@agentstack-fleet-operator`, `@agentstack-tenant-builder`.
- Hooks: capability snapshot refresh on sessionStart; `pre-mcp-cap-check.mjs` (optional wire); contract tests.
- CI: `audit-cursor-plugin.mjs`, `.github/workflows/plugin-audit.yml`.
- Docs: `CANONICAL_COPY.md`, `PLUGIN_VERSION_POLICY.md`, `CURSOR_PLUGIN_AUDIT_2026-05.md`, ADR gen3.

### Changed

- Version aligned to platform **0.4.13**.
- Marketing copy uses live catalog wording (no hard-coded action counts in plugin tree).
- `agentstack-init` step 3 title: persist tokens (OAuth primary).
- Telemetry batch fields: `plugin_version`, `layer`, `gene_tag`.

### Removed

- `skills/agentstack-support-storage/` (decomposed).

## [0.4.9] - 2026-04-17

> **Clean break from 0.4.x.** OAuth 2.1 Device Code; five-layer architecture. See prior entry in git history.

## [0.4.0] - 2026-02-23

- Version aligned to global AgentStack 0.4.0.

## [0.1.0] - 2026-02-22

- Initial release.
