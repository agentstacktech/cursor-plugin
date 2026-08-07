# Security Policy

Report vulnerabilities to **support@agentstack.tech** (preferred) or via GitHub Security Advisories on [agentstacktech/cursor-plugin](https://github.com/agentstacktech/cursor-plugin).

## What this plugin does

- Ships Markdown rules / skills / commands (guidance) plus local Node hooks.
- Connects Cursor to `https://agentstack.tech/mcp` via OAuth 2.1 Device Code (`/agentstack-init`).
- Access tokens live in `~/.cursor/mcp.json` under `mcpServers.agentstack.headers`. Refresh token: `~/.cursor/agentstack-refresh` (mode `0600` where supported).
- MCP registration is **user config only** (no plugin-embedded MCP server since 0.4.16).
- Telemetry is **opt-in** (`agentstack.sendTelemetry: true`). No prompt text is uploaded.

## Shared machines

Bearer tokens in plaintext MCP config are a Cursor platform constraint. On shared OS accounts, clear MCP auth when done. Windows: file mode bits may be a no-op — rely on NTFS ACLs for your user profile.

Shell hook `pre-shell-scan.mjs` blocks obvious secret leaks in shell (e.g. raw API keys in `curl` headers).

Monorepo reviewer facts: `docs/plugins/CURSOR_PLUGIN_SECURITY_REVIEW_PREP.md`.
