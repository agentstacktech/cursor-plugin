# AgentStack MCP — Quick Start

Get the AgentStack MCP server working in Cursor in under 2 minutes.

## Step 1: Get an API key

**Option A — No account (try first):**

1. Call the MCP endpoint once (e.g. with curl or from another tool) to create an anonymous project and get keys:

```bash
curl -X POST https://agentstack.tech/mcp/tools/projects.create_project_anonymous \
  -H "Content-Type: application/json" \
  -d '{"tool": "projects.create_project_anonymous", "params": {"name": "My Cursor Project"}}'
```

2. From the response, copy `project_api_key` or `user_api_key` — use it as your API key in Cursor.

**Option B — With account:**

1. Sign in at [AgentStack](https://agentstack.tech) and create a project.
2. In the project settings, create an API key.
3. Use that key as `X-API-Key` below.

## Step 2: Add MCP server in Cursor

1. Open **Cursor Settings** → **Features** → **Model Context Protocol** (or **MCP Servers**).
2. Click **Add Server** (or edit your MCP config file).
3. Use the config from `mcp.json` in this repo:
   - **Name:** `agentstack`
   - **Type:** `HTTP`
   - **Base URL:** `https://agentstack.tech/mcp`
   - **Headers:** Add header `X-API-Key` with your API key.

**Config file locations:**

- **Windows:** `%APPDATA%\Cursor\User\globalStorage\mcp-config.json`
- **macOS:** `~/Library/Application Support/Cursor/User/globalStorage/mcp-config.json`
- **Linux:** `~/.config/Cursor/User/globalStorage/mcp-config.json`

Example snippet for your MCP config:

```json
{
  "mcpServers": {
    "agentstack": {
      "type": "http",
      "baseUrl": "https://agentstack.tech/mcp",
      "headers": {
        "X-API-Key": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

4. Restart Cursor if the server does not appear.

## Step 3: Use in chat

In Cursor Chat you can say:

- "Create a new project called Test via AgentStack MCP"
- "List my AgentStack projects"
- "Get stats for project 1025"

The agent will call tools like `projects.create_project_anonymous`, `projects.get_projects`, `projects.get_stats`, etc.

## If MCP doesn’t show up or tools don’t run

- **Check API key** — valid key from AgentStack, no extra spaces in the header value.
- **Check Base URL** — must be `https://agentstack.tech/mcp`.
- **Restart Cursor** after changing MCP config.

## Full tool list and docs

For all 60+ tools (Auth, Payments, Projects, Scheduler, Analytics, Rules, Webhooks, Notifications, Wallets), see the main docs:

- [MCP Server Capabilities](https://github.com/agentstack/agentstack/blob/main/docs/MCP_SERVER_CAPABILITIES.md) (in the AgentStack repo)

