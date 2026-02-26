---
name: agentstack-rbac
description: Manages roles and permissions (RBAC) in AgentStack via MCP and API. Use when the user asks about roles, permissions, access control, who can do what, assigning roles, checking permissions, or project membership and role updates.
---

# AgentStack RBAC — Roles and Permissions

Enables managing **role-based access control** (RBAC) in AgentStack: assigning roles, updating user roles in projects, listing users by role, and understanding permissions. Roles are project-scoped; permissions control what users can do within a project.

## When to use

- User asks for "roles", "permissions", "RBAC", "access control", "who can do X", "assign role", "check permission", or "project member role".
- User wants to give or change a user's role in a project (member, admin, etc.).
- User wants to list project users and their roles or filter by role.
- User needs to enforce "only admins can…" or "members can read, editors can write" style logic.

## Why RBAC matters

- **Project-scoped:** Each project has its own roles and members; same user can have different roles in different projects.
- **Consistent with 8DNA:** Permissions and role metadata can live in project `data` or backend; MCP and API use the same model.
- **Combine with Buffs:** Use buffs for temporary elevation (e.g. trial with extra permissions); use RBAC for stable roles.

## Capabilities (MCP tools relevant to RBAC)

| Tool | Purpose | Returns / notes |
|------|--------|-----------------|
| `auth.assign_role` | Assign a role to a user (optionally scoped to project). | — |
| `projects.get_users` | List users in the project; filter by `role` (e.g. admin, member). | Users and their roles. |
| `projects.add_user` | Add user to project with a **role** (e.g. member; Professional tier). | — |
| `projects.update_user_role` | Change a user's role in the project. | — |
| `projects.remove_user` | Remove user from project (revoke access). | — |

Full RBAC (create_role, list_roles, check_permission) may be available via backend API; see **MCP_SERVER_CAPABILITIES** and RBAC docs in the repo.

## Instructions

1. **Assign or change role:** Use `auth.assign_role` (user_id, role, optional project_id) or `projects.update_user_role` (project_id, user_id, role) for project membership role.
2. **List users by role:** Use `projects.get_users` with `project_id` and optional `role` filter to see who has which role.
3. **Add user to project with role:** Use `projects.add_user` (project_id, role, user_id or email); requires Professional subscription.
4. **Revoke access:** Use `projects.remove_user` (project_id, user_id).
5. **Check permission in code:** Use backend API or SDK (e.g. check_permission, getAvailablePermissions) as documented in the repo; MCP focuses on role assignment and listing.

## Examples (natural language → tool)

- "Assign admin role to user 42 in project 1025" → `projects.update_user_role` with `project_id: 1025`, `user_id: 42`, `role: "admin"` (or `auth.assign_role` with project_id).
- "List all admins in project 1025" → `projects.get_users` with `project_id: 1025`, `role: "admin"`.
- "Add user as member to project 1025" → `projects.add_user` with `project_id: 1025`, `role: "member"`, and user identifier.
- "Change user 42 to editor in project 1025" → `projects.update_user_role` with `project_id: 1025`, `user_id: 42`, `role: "editor"`.
- "Remove user 42 from project 1025" → `projects.remove_user` with `project_id: 1025`, `user_id: 42`.

## Tips

- Default project roles often include owner, admin, member, viewer; exact set depends on project config. Use `projects.get_users` to see current roles.
- `projects.add_user` / `projects.remove_user` require Professional subscription.
- For custom roles and permission checks (create_role, check_permission), use the backend API or SDK; see repo RBAC docs.

## References

- **MCP_SERVER_CAPABILITIES** — auth.*, projects.get_users, projects.add_user, projects.update_user_role, projects.remove_user. See repo docs/MCP_SERVER_CAPABILITIES.md.
- **RBAC / Auth** — Backend API and SDK (create_role, list_roles, check_permission) as documented in the AgentStack repo.
- **MCP_QUICKSTART.md** (plugin root) — how to get an API key and add MCP in Cursor.
