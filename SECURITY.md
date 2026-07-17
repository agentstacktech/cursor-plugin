# Security Policy

Report vulnerabilities to **support@agentstack.tech** (preferred) or via GitHub Security Advisories on [agentstacktech/cursor-plugin](https://github.com/agentstacktech/cursor-plugin).

## What this plugin does

- Ships Markdown rules/skills/commands (non-executing guidance) plus local Node hooks.
- Connects Cursor to `https://agentstack.tech/mcp` via OAuth 2.1 Device Code (`/agentstack-init`).
- Access tokens are stored in `~/.cursor/mcp.json` (Cursor MCP config). Refresh token file: `~/.cursor/agentstack-refresh` (mode 0600 where supported).
- Telemetry is **opt-in** (`agentstack.sendTelemetry: true`). No prompt text is uploaded.

## Shared machines

Bearer tokens in plaintext config are a Cursor platform constraint. On shared OS accounts, log out / clear MCP auth when done. Windows: `chmod` may be a no-op — rely on NTFS ACLs for your user profile.

See `docs/plugins/CURSOR_PLUGIN_SECURITY_REVIEW_PREP.md` in the AgentStack monorepo for reviewer facts.
