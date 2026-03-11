# AgentStack plugin testing and capabilities

## Preparation for testing

Before manual testing, run the checklist and automatic validation:

- **[VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md)** — step-by-step checklist: structure validation, install, MCP setup, chat scenarios.
- **Structure validation:** from plugin root: `node scripts/validate-plugin.mjs`
- **MCP endpoint check (optional):** `.\scripts\test-mcp-endpoint.ps1` (PowerShell) or see "MCP check" block in the checklist.

---

## How to verify the plugin works

### 1. Install the plugin

**Option A: from Marketplace (after publish)**  
- Cursor → Settings → Plugins (or Marketplace) → search "AgentStack" → Install.

**Option B: locally (before publish)**  
- Copy folder `provided_plugins/cursor-plugin` (or open the AgentStack project) to where Cursor loads plugins, or open the repo that contains the plugin.  
- Or add the plugin via Cursor UI if there is an "Add plugin from folder" option.

Current way to install a local plugin: [Cursor Docs — Plugins](https://cursor.com/docs/plugins).

### 2. MCP connection (required for calling tools)

The plugin provides Skills and Rules, but **calls to projects, logic, buffs, etc. go through MCP**. Without MCP configured, tools will not be called.

1. **Get an API key**  
   - Via curl (anonymous project):
     ```bash
     curl -X POST https://agentstack.tech/mcp/tools/projects.create_project_anonymous \
       -H "Content-Type: application/json" \
       -d '{"tool": "projects.create_project_anonymous", "params": {"name": "Test"}}'
     ```
   - From the response take `project_api_key` or `user_api_key`.

2. **Add MCP server in Cursor**  
   - **Settings** → **Features** → **Model Context Protocol** (or **MCP Servers**).  
   - Add Server: **Name** `agentstack`, **Type** `HTTP`, **Base URL** `https://agentstack.tech/mcp`.  
   - In headers set `X-API-Key` = your key.

3. **Restart Cursor** (if MCP did not appear).

Details: [MCP_QUICKSTART.md](MCP_QUICKSTART.md).

### 3. Testing in chat

In Cursor chat ask the agent:

- "Create a project in AgentStack named Test Project"  
  → Expected: call to `projects.create_project_anonymous` (or `projects.create_project` when authenticated).
- "Show my AgentStack projects"  
  → Expected: `projects.get_projects`.
- "Get stats for project &lt;project_id&gt;"  
  → Expected: `projects.get_stats`.

If the agent calls MCP tools and returns a sensible answer — the plugin and MCP are working.

### 4. Checking Skills and Rules

- **Skills** are picked up by Cursor and used when choosing "how to do" (8DNA, projects, Rules Engine). In logs/agent behavior you can confirm it follows Skill instructions (e.g. creates a project via MCP instead of writing its own HTTP client).
- **Rules** (.mdc) apply to files by globs (e.g. when working with `**/api/**` or `*.py`). Code the agent suggests for AgentStack should follow the rules (data/config/protected structure, use of `/api/*`).

### 5. Common issues

| Symptom | What to check |
|--------|----------------|
| Agent does not call MCP | MCP added in Settings, correct Base URL and `X-API-Key`, Cursor restarted. |
| 401 / 403 on call | Key is valid, not expired; some operations require a subscription (e.g. Professional for add_user). |
| "Tool not found" | Tool name matches documentation (e.g. `projects.create_project_anonymous`). Check list: `GET https://agentstack.tech/mcp/tools` (with `X-API-Key` header). |
| Skills not triggering | Ensure plugin is installed and the skill description has the right trigger phrases (projects, 8DNA, rules, etc.). |

---

## Plugin capabilities

### What the plugin includes

| Component | Purpose |
|-----------|------------|
| **Manifest** (`.cursor-plugin/plugin.json`) | Name, description, keywords for Marketplace and Cursor. |
| **MCP config** (`mcp.json`) | Example AgentStack MCP server config (URL, API key header). |
| **Skills** (3) | Teach the agent *when* and *how* to use AgentStack: 8DNA, projects, Rules Engine. |
| **Rules** (2 .mdc files) | Code guidelines: data/config/protected structure and HTTP API usage (`/api/*`). |
| **Documentation** | README, MCP_QUICKSTART, this file. |

### Capabilities via MCP (after MCP setup)

The plugin does not call the backend itself — the **AgentStack MCP server** does. After adding MCP in Cursor the agent gets access to tools such as:

- **Projects:** create (including anonymous), list, details, update, delete, stats, users, settings, activity, API keys, attach anonymous project to user.
- **Logic and rules:** create/update/delete rules, list, execute, processors, commands.
- **Buffs:** create, apply, extend, rollback, cancel, list active, effective limits, temporary and persistent effects.
- **Payments:** create, status, refund, list transactions, balance.
- **Auth:** quick sign-in, create user, assign role, profile.
- **Scheduler:** create/cancel/get/list tasks, etc.
- **Analytics:** usage, metrics.
- **API keys:** create, list, revoke, etc.
- **Webhooks, notifications, wallets** — as implemented on backend and in MCP.

Full tool list and parameters: **MCP_SERVER_CAPABILITIES** in the AgentStack repo or `GET https://agentstack.tech/mcp/tools` (with `X-API-Key`).

### Skills capabilities

- **agentstack-8dna:** design and query data with hierarchy (`parent_uuid`) and evolution (`generation`), work with `data`/`config`/`protected` structure and genetic coding.
- **agentstack-projects:** create and manage projects and API keys via MCP, anonymous projects, attach to user.
- **agentstack-rules-engine:** configure server logic without code (when/do), use Logic Engine and rules via MCP, link with buffs and commands.

### Rules capabilities (.mdc)

- **agentstack-dna-patterns:** consistent patterns for `data`, `config`, `protected` structure and key naming when using AgentStack in code.
- **agentstack-json-config:** when and how to use HTTP API (`/api/projects`, `/api/logic`, `/api/neural`, `/api/buffs`, etc.) and MCP.

### Summary

- **Testing:** install plugin → configure MCP with API key → in chat ask to create/list projects and verify MCP calls; optionally verify Skills and Rules from behavior and code.
- **Capabilities:** access to 60+ AgentStack MCP tools (projects, logic, buffs, payments, auth, scheduler, analytics, etc.), plus three Skills and two Rules for consistent use of 8DNA, projects, and Rules Engine.
