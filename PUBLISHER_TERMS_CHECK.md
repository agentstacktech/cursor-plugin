# Cursor Marketplace Publisher Terms — compliance check

**Source:** https://cursor.com/marketplace-publisher-terms (Anysphere, Inc.)  
**Plugin:** AgentStack Cursor plugin `0.4.15` · repo `agentstacktech/cursor-plugin`  
**Checked:** 2026-07-17  
**Verdict:** No clear hard violation found. Address the **§3.1 freemium wording** and **§4.5 screenshot honesty** items below before submit.

This is an engineering compliance review against published terms, not legal advice.

---

## Pass (aligned)

| Clause | Requirement | Our status |
|--------|-------------|------------|
| **3.1** | Plugin via Marketplace at **no cost** | Plugin is MIT; install free. Platform SaaS is separate — clarify in listing (see Fix). |
| **3.3** | Permissive OSS only (MIT/BSD/Apache); no GPL/AGPL/LGPL | `LICENSE` = MIT; vendored kernel is ours/MIT path |
| **4.2** | ToS + privacy visible on Marketplace | `listing.json` → privacy, terms, support URLs |
| **4.3** | Reasonable security; breach notify `legal@cursor.com` | Device Code, no hardcoded secrets, shell secret scan; SECURITY.md |
| **4.4** | Publisher provides end-user support | `support@agentstack.tech` + support URL |
| **4.5** | Accurate, not misleading metadata | Live-catalog copy; no “Cursor endorsement”; avoid stale action counts |
| **4.6** | Call product **“Cursor”** (not “Cursor AI” / “Cursor Code”) | No banned variants found in plugin tree |
| **4.7(a–b)** | No malware / no disruption | Markdown + local Node hooks; MCP to AgentStack HTTPS |
| **4.7(c–d)** | Minimize Plugin Data; no sell/rent of Plugin Data | Telemetry **opt-in**; buffer empty unless enabled |
| **5.3** | No claim of ownership of User Content | We don’t claim user project content |
| **6.3** | No training AI/ML models on Plugin Data / User Content | Telemetry is usage metrics only; no training pipeline in plugin |
| **2.1 / 4.5** | Application info true | Public GitHub SoT; version tagged |

---

## Watch / fix before submit

### 1. §3.1 — “no fees … for access to or use of a Plugin”

**Risk:** Listing field `pricing.model: freemium` can be read as charging for the **Marketplace plugin**.

**Correct framing:**
- **Cursor Marketplace plugin:** free (always).
- **AgentStack cloud / hosting / quotas:** separate product account; freemium platform pricing — **not** a fee to install or run the Cursor plugin listing.

**Do:** On the publish form, if there is a Pricing field, write something like:  
`Plugin free on Marketplace. Optional AgentStack platform account: https://agentstack.tech/pricing`

**Don’t:** Imply users must pay Cursor or Anysphere for this plugin, or pay to unlock the plugin download.

### 2. §4.5 — Accurate descriptions / screenshots

**Risk:** Branded mock screenshots can look like live Cursor captures.

**Do:** Keep alts honest (`assets/screenshots/README.md`); prefer live captures when available; never claim “official Cursor” screenshots.

### 3. §4.2 / Plugin Data disclosures

**Do:** Keep privacy + terms links on the form. Disclose in privacy that OAuth tokens live in `~/.cursor/mcp.json`, optional opt-in telemetry posts to AgentStack only when enabled.

### 4. §4.6 — Brand Guidelines

**Do:** Spot-check https://cursor.com/brand before submit for logo/name misuse. We may say the plugin works **with Cursor**; we must not imply Anysphere/Cursor endorsement (§2.2 already says approval ≠ endorsement).

### 5. Operational (not a code bug)

| Item | Action |
|------|--------|
| §2.3 Ongoing review | Keep public repo; cooperate if Anysphere asks for source |
| §4.3 Incident | Notify `legal@cursor.com` on plugin-related breach |
| §3.1 Updates | After listing changes, request re-index (per §2.1) |
| §12.5 Export/sanctions | Platform/legal ops (outside this repo) |

---

## Explicit non-issues (for reviewers)

- Charging for **AgentStack backend/hosting** after free plugin install is standard SaaS and consistent with “plugin free on Marketplace,” if clearly disclosed.
- Hooks that call AgentStack APIs with user auth are disclosed functionality (§4.7(c)).
- Opt-in telemetry is narrower than always-on collection.

---

## Submit-form reminder

Use [`SUBMIT_FORM.md`](SUBMIT_FORM.md). Pricing line must stress **plugin free**. Do not paste competitor attacks or “better than X.”
