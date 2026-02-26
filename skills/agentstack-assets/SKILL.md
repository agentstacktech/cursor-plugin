---
name: agentstack-assets
description: Manages AgentStack assets (create, get, list, update) via MCP (assets.*). Use when the user needs in-game items, tradable assets, inventory, digital goods, or project-specific asset catalogs for games, marketplaces, or other applications.
---

# AgentStack Assets & Trading

Enables creating and managing **assets** (digital goods, in-game items, tradable entities) via MCP tools under `assets.*`. Assets are project-scoped and can power **trading**, **inventories**, **games**, and **marketplaces** without custom backend tables.

## When to use

- User asks for "assets", "inventory", "items", "tradable", "in-game items", "digital goods", or "catalog".
- User wants to build a game economy, marketplace, or reward system.
- User needs CRUD over project-owned entities that represent things users can own or trade (not just config).

## Why assets matter

- **Trading:** Assets can represent goods that move between users or wallets; combine with **wallets** (real money) or **buffs** (rewards) for full economy.
- **Games:** In-game items, skins, currency, loot — store as assets; grant/revoke via Logic Engine rules or commands.
- **Other projects:** Catalogs, NFTs metadata, tickets, badges — any project-specific "thing" with identity and optional metadata.

## Capabilities (MCP tools)

| Tool | Purpose |
|------|--------|
| `assets.create` | Create an asset in the project. Returns asset id and metadata. |
| `assets.get` | Get one asset by id. |
| `assets.list` | List assets (filter by project, type, or other criteria as supported). |
| `assets.update` | Update asset metadata or state. |

For full parameters and response shapes, see **MCP_SERVER_CAPABILITIES** (repo docs).

## Instructions

1. **Create assets:** Use `assets.create` with project_id and required fields (name, type, etc. as per API). Store returned id for later reference.
2. **List or inspect:** Use `assets.list` for catalog or inventory views; use `assets.get` for a single asset.
3. **Update:** Use `assets.update` when asset state or metadata changes (e.g. after a trade or use).
4. **Combine with:** Use **wallets** for real-money balance; **buffs** for temporary rewards; **logic/rules** to automate granting/transferring assets on events.

## Examples (natural language → tool)

- "Create an asset 'Gold Coin' for project 1025" → `assets.create` with `project_id: 1025`, name and type as required.
- "List all assets for project 1025" → `assets.list` with `project_id: 1025`.
- "Get asset abc-123" → `assets.get` with asset id.
- "Update asset abc-123 after trade" → `assets.update` with asset id and new metadata/state.

## References

- **MCP_SERVER_CAPABILITIES** — full list of MCP tools including `assets.*`, `wallets.*`, `buffs.*`, `logic.*`. See repo docs/MCP_SERVER_CAPABILITIES.md.
- **Wallets** — real-money balance and transactions; use with assets for paid marketplaces.
- **MCP_QUICKSTART.md** (plugin root) — how to get an API key and add MCP in Cursor.
