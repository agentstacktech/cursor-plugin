---
name: agentstack-scaffold-backend
description: Generate a full-stack AgentStack skeleton — auth + RBAC middleware + buffs tier gates + AgentPay widget + admin panel — on top of an existing Next.js / Vite / Express project.
---

# /agentstack-scaffold-backend

Builds on top of `/agentstack-scaffold-auth`. Assumes auth is already scaffolded (run it first if not).

## What it generates

### Roles & middleware

- `src/lib/rbac.ts` — `requireRole(role)` and `checkPermission(permission)` helpers using `rbac.check_permission`.
- Next.js: `src/app/admin/layout.tsx` — redirects non-admins.
- Express: `middleware/requireRole.ts`.

### Tier gates (buffs)

- `src/lib/buffs.ts` — `useEffectiveLimits()` hook wrapping `buffs.get_effective_limits`.
- Example gate component: `src/components/UpgradePrompt.tsx` + usage in a feature page.

### AgentPay widget (payments)

- `src/components/AgentPay.tsx` — wraps `<AgentPay>` from `@agentstack/react`.
- `src/app/billing/page.tsx` — pricing table, calls `payments.create` on purchase.
- Monetization setup (not auto-created): paid checkout rail — `buffs.create_buff` → `commerce.sell.activate` → `payments.create` → webhook/C24 auto-grant (prompt `agentstack_tenant_subscription_monetization`). Support/comp: `buffs.grant_tenant_subscription` (prompt `agentstack_tenant_buff_grant`). Do not suggest `grant_*_on_payment_success` rules calling `apply_buff` / `apply_persistent_effect`.

### Admin panel

- `src/app/admin/page.tsx` — dashboard:
  - `projects.get_stats` → usage cards.
  - `projects.get_users` → member list.
  - `apikeys.list` → key management.
- Uses `@agentstack/react` `<RequireCapability permission="admin">`.

## Execution plan (interactive)

1. Detect framework (reuse detection from `/agentstack-scaffold-auth`).
2. Verify auth is scaffolded; if not, run `/agentstack-scaffold-auth` first.
3. Present a tree of files that will be created; ask for approval.
4. Write files in one batch (controlled change protocol — no bulk scripts; each file is a reviewable patch).
5. Print the rule suggestions (user runs `/` commands or pastes MCP calls).
6. Run linter; fix trivial issues.
7. Print next steps: start dev server → login → visit `/admin` → visit `/billing`.

## Prefer-over

- Do NOT scaffold Stripe SDK — `<AgentPay>` + `payments.create` handle it.
- Do NOT write a `subscriptions` table — buffs do it.
- Do NOT write a `roles` table — `rbac.*` + `projects.update_user_role` do it.
