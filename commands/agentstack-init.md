---
name: agentstack-init
description: Bootstrap AgentStack in this project — OAuth Device Code login, create project, inject Bearer into Cursor MCP settings, scaffold client SDK, print capability matrix, offer next commands.
---

# /agentstack-init

Run **in this order** — do not skip steps. Recover from errors in-place.

## 1. Check existing auth

Read `~/.cursor/mcp.json`. If `mcpServers.agentstack.headers.Authorization` is present **and** `GET https://agentstack.tech/api/auth/whoami` returns 200 with that Bearer, skip to step 4.

If instead `X-API-Key` is present, ask the user: "Upgrade to OAuth Device Code (recommended)? Y/N". If N — skip to step 4 with existing key. If Y — continue.

## 2. Device Code login

Run the helper hook:

```bash
node ./hooks/scripts/device-code.mjs
```

The script will:

1. `POST /api/oauth2/device/authorize` with `client_id=cursor-plugin` and requested scopes.
2. Print `verification_uri_complete` and `user_code` to the terminal.
3. Attempt to open the browser automatically (`start` / `open` / `xdg-open`).
4. Poll `POST /api/oauth2/token` every `interval` seconds until `access_token` + `refresh_token` arrive.

User approves in the browser at `https://agentstack.tech/activate`.

**Recovery:**
- `authorization_pending` — keep polling (not an error).
- `expired_token` or user closed the window — restart step 2.
- Network error — retry once, then advise manual fallback via `MCP_QUICKSTART.md`.

## 3. Persist scoped API key

After the token exchange succeeds, `device-code.mjs` writes:

- `~/.cursor/mcp.json` → `mcpServers.agentstack.headers.Authorization = "Bearer <access_token>"` (short-lived; hook `session-start.mjs` refreshes ahead of expiry).
- `~/.cursor/agentstack-refresh` (mode 0600) — refresh token fallback if OS keyring is unavailable.

Optionally issue a long-lived scoped API key for CI (user choice):

```json
{
  "tool": "agentstack.execute",
  "params": {
    "steps": [
      { "action": "apikeys.create", "params": {
        "label": "cursor-plugin-ci",
        "service_caps": [
          "projects.read","projects.write",
          "8dna.read","8dna.write",
          "logic.write","logic.dry_run",
          "rag.read","rag.write",
          "buffs.read",
          "apikeys.read"
        ],
        "ttl_days": 90
      } }
    ]
  }
}
```

## 4. Install `@agentstack/sdk` (if applicable)

- If a `package.json` exists — run `npm install @agentstack/sdk` (or the user's package manager: pnpm / yarn / bun).
- Create `src/lib/agentstack.ts` (or equivalent for the framework):

```ts
import { createSDK } from '@agentstack/sdk';

export const as = createSDK({
  baseUrl: 'https://agentstack.tech',
  apiKey: process.env.AGENTSTACK_API_KEY, // only for server-side; browser uses Bearer from session
});
```

- For Python projects — note the SDK is TS-only; Python clients use MCP directly via `agentstack.execute`.

## 5. Print capability matrix summary

Call discovery:

```bash
curl https://agentstack.tech/mcp/actions -H "Authorization: Bearer <token>"
```

Group by category, show top 5 actions per category as a Markdown table. For the full list, suggest `/agentstack-capability-matrix`.

## 6. Offer next commands

Print:

```
Ready. Next commands:
  /agentstack-scaffold-auth      — generate login + register UI
  /agentstack-scaffold-backend   — full stack (roles + buffs + payments)
  /agentstack-sync-schema        — migrate existing Prisma/Drizzle → 8DNA
  /agentstack-index-docs         — RAG-index this project's markdown docs
  /agentstack-capability-matrix  — browse all 80+ MCP actions
  /agentstack-diagnose           — health check
```

## Philosophy

This command embodies **Creation over Conflict**: the class of problem "copy-paste API key manually" does not exist in this world.
