# Changelog

All notable changes to the AgentStack Cursor plugin are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
