# Cursor Marketplace — form fields (ready to paste)

**Version:** 0.4.16 · **Repo:** https://github.com/agentstacktech/cursor-plugin  
**Submit URL:** https://cursor.com/marketplace/publish  
**SoT:** `plugins/agentstack/.cursor-plugin/plugin.json` + `.cursor-plugin/listing.json` · philosophy: Creation over Conflict (offer value, no competitor attacks)

---

## What to put in **Description** (main form field)

### Recommended — paste this (live-catalog, no stale action counts)

```
AgentStack's control plane is the Work Graph. After the project is bound, call agents.work_next (recipe mcp_work_loop_v1) before catalog search. If next_action is set, call it.

The same agentstack.execute tool also publishes HTML or ZIP to a live /s/ URL, stores project files, and runs the live catalog (GET /mcp/actions) for 8DNA, auth, logic, payments, RAG, and CRM.

Install with OAuth Device Code in about 30 seconds (/agentstack-init).

Homepage: https://agentstack.tech · Privacy: https://agentstack.tech/privacy · Terms: https://agentstack.tech/terms · Support: support@agentstack.tech
```

**Why this text:** matches marketplace review expectations (clear purpose, install path, privacy/support), uses **live catalog** wording (never pin a fixed action total that drifts every sprint — see monorepo `docs/plugins/CANONICAL_COPY.md`).

### If the form has a **short** description (~200 chars)

```
Work Graph control plane: agents.work_next via one MCP tool (agentstack.execute). Also host sites and store files. OAuth install in ~30s.
```

### If the form asks for a **tagline** / subtitle (≤80 chars)

```
Work Graph control plane: agents.work_next, one MCP
```
*(52 characters — same as `listing.json` tagline)*

### Optional marketing shorthand (only if the form insists on a number)

Do **not** paste action-count shorthand into this plugin tree. Copy numbers from monorepo
`docs/plugins/PUBLISHER_COPY.md` (Message House) into the **Cursor web form only**, then prefer
the live-catalog description above for the official listing text.

---

## Full form checklist

| Field | Paste |
|-------|--------|
| **Plugin name / display name** | `AgentStack — Work Graph MCP` |
| **Repository URL** | `https://github.com/agentstacktech/cursor-plugin` |
| **Description** | Use **Recommended** block above |
| **Category** | `Productivity` (or `AI` / `Backend` if offered) |
| **Keywords** | `work-graph, mcp, agents, hosting, backend, static-site, 8dna, rag, payments, storage, publish, agentstack` |
| **Homepage** | `https://agentstack.tech` |
| **Docs** | `https://github.com/agentstacktech/cursor-plugin#readme` |
| **Privacy** | `https://agentstack.tech/privacy` |
| **Terms** | `https://agentstack.tech/terms` |
| **Support email** | `support@agentstack.tech` |
| **Support URL** | `https://agentstack.tech/support` |
| **Pricing** | `Plugin free on Cursor Marketplace. Optional AgentStack platform account (freemium): https://agentstack.tech/pricing` |
| **License** | MIT |
| **Screenshots** | `plugins/agentstack/assets/screenshots/01`–`05` (1920×1200); alts in that folder’s README — label mocks as illustrative if not live captures |
| **Demo script** | [MARKETPLACE_DEMO.md](MARKETPLACE_DEMO.md) |
| **Publisher Terms** | https://cursor.com/marketplace-publisher-terms · internal check: [PUBLISHER_TERMS_CHECK.md](PUBLISHER_TERMS_CHECK.md) |

---

## Do / Don't (reviewers + Publisher Terms)

**Do:** plugin free on Marketplace (§3.1); privacy/terms/support links (§4.2); accurate live-catalog copy (§4.5); say **“Cursor”** not “Cursor AI” (§4.6); opt-in telemetry only.  
**Don't:** charge for the Marketplace plugin; imply Cursor/Anysphere endorsement; “better than X”; unverified SLA; “unlimited free hosting”; sell Plugin Data; train models on Plugin Data (§6.3).

---

## After submit

1. Push `master` + tag `v0.4.16` if not already on GitHub.  
2. Wait for Cursor manual review.  
3. Monorepo: `docs/plugins/CURSOR_PLUGIN_POST_RELEASE_STATUS.md` (or post-release checklist if present).
