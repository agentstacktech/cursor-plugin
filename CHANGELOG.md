# Changelog

All notable changes to the AgentStack Cursor plugin are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.4.14] - 2026-07-17

> Marketplace ship wave — self-contained Device Code, schema-valid manifest, listing SoT, hooks lifecycle.

### Fixed (flow hardening)

- OAuth Device Code poll: treat HTTP 400 `authorization_pending` / `slow_down` as continue (RFC 8628).
- Capability snapshot: flatten `GET /mcp/actions` `{domains}` → `actions[]` for `beforeMCPExecution` cap hints.
- `device-code.mjs --help` exits 0 without starting OAuth (safe smoke).
- Lean MCP write path shared via `mcpConfig.mjs` (no `tools` extras).

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
