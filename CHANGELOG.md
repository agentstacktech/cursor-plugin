# Changelog

All notable changes to the AgentStack Cursor plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.4.0] - 2026-02-23

### Changed

- Version aligned to global AgentStack 0.4.0.

## [0.1.0] - 2026-02-22

### Added

- Initial release of the AgentStack Cursor plugin.
- **Manifest:** `.cursor-plugin/plugin.json` with name, description, keywords (8dna, rules-engine, payments, mcp, backend, buffs, projects).
- **MCP:** `mcp.json` with cloud config; [MCP_QUICKSTART.md](MCP_QUICKSTART.md) for API key and Cursor setup.
- **Skills:**
  - `agentstack-8dna` — 8DNA hierarchy and evolution (parent_uuid, generation, data/config/protected).
  - `agentstack-projects` — Create/manage projects and API keys via MCP (create_project_anonymous, get_projects, attach_to_user, etc.).
  - `agentstack-rules-engine` — When to use Rules Engine (when/do, events, processors/commands).
- **Rules:**
  - `agentstack-dna-patterns.mdc` — DNA data patterns and genetic coding.
  - `agentstack-json-config.mdc` — HTTP API paths (/api/*) and JSON usage.
- **Docs:** README with Quick Start, comparison table (AgentStack vs “just a database”), and plugin structure.
