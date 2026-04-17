---
name: agentstack-capability-matrix
description: Print the live AgentStack capability matrix — all MCP actions grouped by domain with required caps and one-liners. Source of truth is GET /mcp/actions.
---

# /agentstack-capability-matrix

Fetch and render the current capability matrix.

## Steps

1. `GET https://agentstack.tech/mcp/actions` with the current Bearer.
2. Group by `category` (auth, rbac, projects, apikeys, 8dna, logic, rag, storage, buffs, payments, wallets, assets, scheduler, webhooks, notifications, data_access, commands, discovery).
3. Render a Markdown table per category:

```
## auth (7 actions)

| Action             | Required cap     | Summary                          |
|--------------------|------------------|----------------------------------|
| auth.quick_auth    | —                | Email+password login, returns token |
| auth.create_user   | —                | Register a new user              |
| ...                |                  |                                  |
```

4. Append totals: `N actions across K categories`.
5. Optionally cache the result to `~/.cursor/agentstack-capabilities.json` (the `capability-refresh` hook already does this when `mcp.json` changes).

## Offline fallback

If `GET /mcp/actions` is unreachable, fall back to the cached snapshot written by the `capability-refresh.mjs` hook at `~/.cursor/agentstack-capabilities.json` (if present). Print a clear "offline snapshot from {timestamp}" header so the user knows it may be stale.

## Why

The live catalog is the **single source of truth**. Skills and commands must derive their action list from here instead of duplicating it — this eliminates the drift class of bugs.
