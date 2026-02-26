---
name: agentstack-projects
description: Creates and manages AgentStack projects and API keys via MCP (projects.*). Use when the user wants to create a project, get an API key, list or inspect projects, get stats, manage users or settings, or attach an anonymous project to an account.
---

# AgentStack Projects & MCP

Enables creating and managing AgentStack projects and API keys from Cursor via MCP tools under `projects.*`.

**What this skill covers:** Full lifecycle of projects (create, read, update, delete), anonymous try-it flow and attaching to an account, project statistics and activity, user and API key management, and project settings (config). All tools are scoped by `project_id`; use the returned API keys for subsequent MCP calls.

## When to use

- User says: "Create a project in AgentStack", "Get an AgentStack API key", "List my projects", "Stats for project X".
- User wants to try AgentStack without signup (anonymous project).
- User wants to attach an anonymous project to their account, manage project users, or manage API keys and settings.

## Capabilities (MCP tools)

| Tool | Purpose | Returns / notes |
|------|--------|-----------------|
| `projects.create_project_anonymous` | Create project and get API key without login. | `project_id`, `project_api_key`, `user_api_key`, `auth_key`; use one of the keys as `X-API-Key` for MCP. |
| `projects.create_project` | Create project (authenticated user). | Project object and keys. |
| `projects.get_projects` | List projects for the current context. | Array of projects (id, name, etc.). |
| `projects.get_project` | Get one project by id. | Full project object. |
| `projects.update_project` | Update name, description, config, data, is_active. | Updated project. |
| `projects.delete_project` | Delete project (irreversible). | Success/failure. |
| `projects.get_stats` | Project statistics (usage, users, activity metrics). | Stats object for dashboards and limits. |
| `projects.get_users` | List users in the project (with optional role/active filters). | List of users and roles. |
| `projects.add_user` | Add user to project (Professional tier). | — |
| `projects.remove_user` | Remove user from project (Professional tier). | — |
| `projects.update_user_role` | Change a user's role in the project. | — |
| `projects.attach_to_user` | Attach anonymous project to a user; pass `auth_key` from anonymous creation. | Converts anonymous to full account; user keeps project. |
| `projects.get_api_keys` | List API keys (values masked). | Key names and ids. |
| `projects.create_api_key` | Create API key; value shown once only. | New key — save immediately. |
| `projects.delete_api_key` | Revoke an API key. | — |
| `projects.get_settings` | Get project settings (config). | Current config. |
| `projects.update_settings` | Update project settings. | Updated config. |
| `projects.get_activity` | Get project activity log (events, calls). | Recent events; use `limit` for pagination. |

## Instructions

1. **First-time / try it:** Call `projects.create_project_anonymous` with `params: { "name": "My Project" }`. Use `project_api_key` or `user_api_key` as `X-API-Key` in Cursor MCP config so the agent can call other tools for this project.
2. **List or inspect:** Use `projects.get_projects` or `projects.get_project`; for full context use `projects.get_stats`, `projects.get_users`, `projects.get_settings`, `projects.get_activity` as needed.
3. **Attach anonymous to user:** Call `projects.attach_to_user` with `project_id` and `auth_key` from the anonymous creation response (user must be authenticated).
4. **API keys:** Use `projects.create_api_key` to create a key (display once); use `projects.get_api_keys` to list (values masked); use `projects.delete_api_key` to revoke.

## Examples (natural language → tool)

- "Create an AgentStack project called Test App" → `projects.create_project_anonymous` with `name: "Test App"`.
- "What's the stats for project 1025?" → `projects.get_stats` with `project_id: 1025`.
- "List my AgentStack projects" → `projects.get_projects`.
- "Attach this project to my account" → `projects.attach_to_user` with `project_id` and `auth_key` from creation.
- "Create a new API key for project 1025 named Production" → `projects.create_api_key` with `project_id: 1025`, `name: "Production"`.
- "Show last 20 events for project 1025" → `projects.get_activity` with `project_id: 1025`, `limit: 20`.

## Tips

- Anonymous tier: one project, one API key, lower limits; attach to an account or create while signed in for full limits.
- `projects.add_user` / `projects.remove_user` require Professional subscription.
- Save API keys when created; they are shown only once.

## References

- **MCP_SERVER_CAPABILITIES** — full list of MCP tools (projects, auth, payments, scheduler, analytics, rules, webhooks, notifications, wallets, buffs, logic, etc.). See repo docs/MCP_SERVER_CAPABILITIES.md.
- **MCP_QUICKSTART.md** (plugin root) — how to get an API key and add MCP in Cursor.
