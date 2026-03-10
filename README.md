# AgentStack — Full Backend Ecosystem (Cursor Plugin)

Plugin for [Cursor](https://cursor.com) that adds **AgentStack** as a full backend ecosystem: 8DNA hierarchical data, Rules Engine, Buffs (trials/subscriptions), Payments, and **60+ MCP tools** for Projects, Auth, Scheduler, Analytics, Webhooks, Notifications, and Wallets.

JSON-based data store (8DNA: JSON+ with built-in variants, e.g. A/B tests) and server-side logic without boilerplate.

## What this plugin includes

| Component | Description |
|-----------|-------------|
| **MCP server config** | Connect Cursor to the AgentStack MCP. |
| **Skills** | 8DNA, Projects, Rules Engine, **Assets**, **RBAC**, **Buffs** (trials, subscriptions), **Payments** (payments, wallets), **Auth** (login, profile) — so the agent knows when and how to use AgentStack. |
| **Rules** | Coding patterns for DNA/config and HTTP API usage (/api/projects, /api/logic, etc.). |

## Quick Start

**Installing the plugin:** From [Cursor Marketplace](https://cursor.com/marketplace) or add from folder for local use — [Cursor Docs → Plugins](https://cursor.com/docs/plugins).

**Flow:** Create an anonymous project (no account) → get API key → add key in Cursor → use 60+ tools in chat. See [MCP_QUICKSTART.md](MCP_QUICKSTART.md).

1. **Get an API key**  
   Create an anonymous project (no signup) via curl or use your existing project key. See [MCP_QUICKSTART.md](MCP_QUICKSTART.md).

2. **Add MCP in Cursor**  
   In Cursor: **Settings → MCP** (or **Features → Model Context Protocol**). Add a server with:
   - **Name:** `agentstack`
   - **Type:** HTTP
   - **Base URL:** `https://agentstack.tech/mcp`
   - **Header:** `X-API-Key` = your API key  

   Full example is in [mcp.json](mcp.json).

3. **Use in chat**  
   Ask Cursor to create a project, list projects, get stats, or use other AgentStack tools. The agent will use the MCP tools automatically.

## What you can do

Once MCP is connected, use 60+ tools from chat. Example prompts by domain:

| Domain | Example prompts |
|--------|-----------------|
| **Projects** | "List my projects", "Get stats for my project", "Create a project named Test" |
| **8DNA / Data** | "Store project data at key config.theme", "Read user data" |
| **Rules Engine** | "Create a rule when user signs up", "List logic rules" |
| **Buffs** | "Give user a 7-day trial", "List active buffs" |
| **Payments** | "Create a payment", "Get wallet balance" |
| **Auth** | "Get my profile", "Quick auth with email" |
| **Scheduler, Analytics, Webhooks, Notifications, Wallets** | "Schedule a task", "Get analytics", "List webhooks" |

**Full tool list and parameters:** [MCP_SERVER_CAPABILITIES](https://github.com/agentstacktech/AgentStack/blob/main/docs/MCP_SERVER_CAPABILITIES.md). **When to use which tool:** [CONTEXT_FOR_AI](https://github.com/agentstacktech/AgentStack/blob/main/docs/plugins/CONTEXT_FOR_AI.md) in the AgentStack repo.

## AgentStack vs “just a database”

| Capability | AgentStack | Typical DB-only (e.g. Supabase-style) |
|------------|------------|----------------------------------------|
| **Data model** | 8DNA (JSON+): structured JSON; key-value store (`project.data`, `user.data`); built-in support for variants (e.g. A/B tests) | Flat tables, relations |
| **Server logic** | Rules Engine (when/do, no code) | Triggers / custom backend |
| **Trials & subscriptions** | Buffs (temporary/persistent effects) | Custom logic or 3rd party |
| **Payments** | Built-in gateway (Stripe, Tochka, etc.) | Separate integration |
| **API surface** | 60+ MCP tools + /api/projects, /api/logic, /api/neural, /api/buffs, etc. | CRUD + auth |

AgentStack is a full backend platform with a JSON-based data store (8DNA = JSON+ with built-in support for variants, e.g. A/B tests); this plugin brings it into Cursor so the AI can create projects, manage keys, use the Rules Engine, and work with the data store.

## Plugin structure

```
.cursor-plugin/plugin.json   # Manifest
mcp.json                     # MCP config reference
MCP_QUICKSTART.md            # Get API key + connect Cursor
skills/
  agentstack-8dna/          # 8DNA (JSON+, data store, variants/A/B)
  agentstack-projects/      # Projects & MCP tools
  agentstack-rules-engine/  # Rules Engine usage
  agentstack-assets/        # Assets (trading, games, inventory)
  agentstack-rbac/          # RBAC (roles, permissions)
  agentstack-buffs/         # Buffs (trials, subscriptions, effects)
  agentstack-payments/      # Payments & wallets
  agentstack-auth/          # Auth (login, register, profile)
rules/
  agentstack-dna-patterns.mdc   # data/config/protected patterns
  agentstack-json-config.mdc   # HTTP API paths (/api/*), JSON usage
```

## Documentation

- **This plugin:** [github.com/agentstacktech/cursor-plugin](https://github.com/agentstacktech/cursor-plugin)
- **Quick Start:** [MCP_QUICKSTART.md](MCP_QUICKSTART.md) — API key and MCP setup in a few steps.
- **Full MCP tool list:** [MCP_SERVER_CAPABILITIES](https://github.com/agentstacktech/AgentStack/blob/main/docs/MCP_SERVER_CAPABILITIES.md) in the AgentStack repo.
- **Plugins index (Cursor, Claude, GPT, VS Code):** [docs/plugins/README.md](https://github.com/agentstacktech/AgentStack/blob/main/docs/plugins/README.md).

## Links

- **AgentStack:** [agentstack.tech](https://agentstack.tech)
- **LinkedIn:** [linkedin.com/company/agentstacktech](https://www.linkedin.com/company/agentstacktech/)
- **GitHub:** [github.com/agentstacktech](https://github.com/agentstacktech)

*For maintainers:* [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md), [TESTING_AND_CAPABILITIES.md](TESTING_AND_CAPABILITIES.md).

## License

MIT. See [LICENSE](LICENSE).
