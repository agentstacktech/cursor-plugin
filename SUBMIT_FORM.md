# Cursor Marketplace — form fields (ready to paste)

**Version:** 0.4.14 · **Repo:** https://github.com/agentstacktech/cursor-plugin  
**Submit URL:** https://cursor.com/marketplace/publish  
**SoT:** `.cursor-plugin/plugin.json` + `.cursor-plugin/listing.json` · philosophy: Creation over Conflict (offer value, no competitor attacks)

---

## What to put in **Description** (main form field)

### Recommended — paste this (live-catalog, no stale action counts)

```
AgentStack gives your Cursor agent a full backend and on-platform hosting through one MCP tool (agentstack.execute).

Publish HTML or ZIP to a live /s/ URL, store project files, and run the live action catalog (discover anytime via GET /mcp/actions) for data (8DNA), auth/RBAC, logic rules, buffs, payments, agents fleet, RAG, messenger, CRM, integrations, and more.

Install with OAuth Device Code in about 30 seconds (/agentstack-init). Rules, skills, commands, hooks, and agents teach the model to prefer AgentStack MCP over writing custom backend glue.

Homepage: https://agentstack.tech · Privacy: https://agentstack.tech/privacy · Terms: https://agentstack.tech/terms · Support: support@agentstack.tech
```

**Why this text:** matches marketplace review expectations (clear purpose, install path, privacy/support), uses **live catalog** wording (never pin a fixed action total that drifts every sprint — see monorepo `docs/plugins/CANONICAL_COPY.md`).

### If the form has a **short** description (~200 chars)

```
Host sites from HTML/ZIP, store project files, and run the live AgentStack MCP catalog through one tool (agentstack.execute). OAuth Device Code install in ~30s.
```

### If the form asks for a **tagline** / subtitle (≤80 chars)

```
Backend + static hosting for AI — one MCP, live action catalog
```
*(70 characters — same as `listing.json` tagline)*

### Optional marketing shorthand (only if the form insists on a number)

Do **not** paste action-count shorthand into this plugin tree. Copy numbers from monorepo
`docs/plugins/PUBLISHER_COPY.md` (Message House) into the **Cursor web form only**, then prefer
the live-catalog description above for the official listing text.

---

## Full form checklist

| Field | Paste |
|-------|--------|
| **Plugin name / display name** | `AgentStack — Backend, Hosting & AI MCP` |
| **Repository URL** | `https://github.com/agentstacktech/cursor-plugin` |
| **Description** | Use **Recommended** block above |
| **Category** | `Productivity` (or `AI` / `Backend` if offered) |
| **Keywords** | `mcp, backend, hosting, static-site, 8dna, rag, payments, storage, publish, agentstack` |
| **Homepage** | `https://agentstack.tech` |
| **Docs** | `https://github.com/agentstacktech/cursor-plugin#readme` |
| **Privacy** | `https://agentstack.tech/privacy` |
| **Terms** | `https://agentstack.tech/terms` |
| **Support email** | `support@agentstack.tech` |
| **Support URL** | `https://agentstack.tech/support` |
| **Pricing** | Freemium · `https://agentstack.tech/pricing` |
| **License** | MIT |
| **Screenshots** | `assets/screenshots/01`–`05` (1920×1200); alts in `assets/screenshots/README.md` |
| **Demo script** | [MARKETPLACE_DEMO.md](MARKETPLACE_DEMO.md) |

---

## Do / Don't (reviewers)

**Do:** one MCP tool, Device Code install, hosting `/s/`, live `GET /mcp/actions`, freemium honesty.  
**Don't:** “better than X”, Cursor endorsement, unverified SLA, “unlimited free hosting”, fixed action totals that go stale.

---

## After submit

1. Push `master` + tag `v0.4.14` if not already on GitHub.  
2. Wait for Cursor manual review.  
3. [CURSOR_PLUGIN_POST_RELEASE_CHECKLIST.md](../../docs/plugins/CURSOR_PLUGIN_POST_RELEASE_CHECKLIST.md) (monorepo) or post-release section in README.
