# Cursor Plugin AgentStack — Verification and testing

**Version:** 0.1  
**Date:** 2026-02-23  
**Purpose:** Prepare the plugin for verification and step-by-step testing before release or Marketplace submission.

---

## Part 1. Preparation (before testing)

### 1.1 Automatic structure validation

From the plugin repo root run:

```bash
node scripts/validate-plugin.mjs
```

Or run all plugin checks in one command (structure + MCP):

```powershell
.\scripts\run-all-verification.ps1
# With key: .\scripts\run-all-verification.ps1 -ApiKey "your-key"
```

Expected: all checks pass, exit code 0.

- [ ] Script completed without errors
- [ ] All required files and folders present
- [ ] `plugin.json` and `mcp.json` are valid
- [ ] No hardcoded secrets in repo (placeholders only)

### 1.2 Manual content check

- [ ] **plugin.json:** `name` in kebab-case, `version` in semver format (e.g. 0.4.0)
- [ ] **README.md:** links to MCP_QUICKSTART and TESTING_AND_CAPABILITIES work
- [ ] **mcp.json:** headers use placeholder `<YOUR_API_KEY>` or `YOUR_API_KEY_HERE`, not a real key
- [ ] **Skills:** each `skills/*/` folder has `SKILL.md` with frontmatter `name` and `description`
- [ ] **Rules:** `rules/` contains `.mdc` files with `description` and `globs` if needed

### 1.3 Documentation for review (Security / Marketplace)

- [ ] Read [CURSOR_PLUGIN_SECURITY_REVIEW_PREP.md](../../../docs/plugins/CURSOR_PLUGIN_SECURITY_REVIEW_PREP.md) — answers for reviewers ready
- [ ] CHANGELOG is up to date, latest version matches `plugin.json`

---

## Part 2. Plugin testing

### 2.1 Install the plugin

**Option A — locally (before publish):**

- [ ] Plugin added from folder / repo per [Cursor Docs — Plugins](https://cursor.com/docs/plugins)
- [ ] Cursor shows plugin name (AgentStack — Full Backend Ecosystem) and version

**Option B — from Marketplace (after publish):**

- [ ] Cursor → Settings → Plugins → search "AgentStack" → Install
- [ ] Install completed without errors

### 2.2 MCP setup

- [ ] API key obtained (anonymous project or from AgentStack dashboard). Steps: [MCP_QUICKSTART.md](MCP_QUICKSTART.md)
- [ ] In Cursor: Settings → Features → Model Context Protocol (MCP) → Add Server
- [ ] Filled: Name `agentstack`, Type `HTTP`, Base URL `https://agentstack.tech/mcp`
- [ ] Headers include `X-API-Key` with the key
- [ ] Cursor restarted if needed

### 2.3 MCP check (endpoint availability)

Optional — confirm MCP endpoint responds:

```powershell
# PowerShell: availability check (expect 401 without key or 200 with key)
Invoke-WebRequest -Uri "https://agentstack.tech/mcp/tools" -Method GET -Headers @{"X-API-Key"="YOUR_KEY"} -UseBasicParsing | Select-Object StatusCode
```

Or with curl (if installed):

```bash
curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: YOUR_KEY" https://agentstack.tech/mcp/tools
```

- [ ] Endpoint returns 200 (service available; with key — full access; without key some servers return 200 for GET /tools or 401)

### 2.4 Chat scenarios in Cursor

Run in Cursor chat and confirm the agent calls MCP tools and returns a sensible answer:

| # | Chat request | Expected tool / result |
|---|----------------|----------------------------|
| 1 | "Create a project in AgentStack named Test Verification" | `projects.create_project_anonymous` or similar; response has project_id or key |
| 2 | "Show my AgentStack projects" | `projects.get_projects`, project list (or empty) |
| 3 | "Get stats for project &lt;project_id&gt;" (use ID from step 1) | `projects.get_stats`, project data |

- [ ] Scenario 1 done
- [ ] Scenario 2 done
- [ ] Scenario 3 done

### 2.5 Skills and Rules (quality check)

- [ ] For requests about "projects" or "AgentStack" the agent suggests MCP calls (projects.*), not its own HTTP client
- [ ] When working with code (e.g. files under rules globs) recommendations match DNA patterns and use of `/api/*` (see [TESTING_AND_CAPABILITIES.md](TESTING_AND_CAPABILITIES.md))

### 2.6 Common issues

| Symptom | Action |
|--------|--------|
| Agent does not call MCP | Check MCP in Settings (URL, X-API-Key header), restart Cursor |
| 401 / 403 | Check API key validity, subscription limits |
| "Tool not found" | Match tool name to docs; check list: `GET https://agentstack.tech/mcp/tools` with X-API-Key |
| Skills not triggering | Plugin installed; skill description has trigger phrases (projects, 8DNA, rules) |

---

## Part 3. After testing

- [ ] All items in Part 1 and 2 checked
- [ ] Version in `plugin.json` and CHANGELOG entry updated
- [ ] For Marketplace submission: form filled per [CURSOR_MARKETPLACE_SUBMIT.md](../../../docs/plugins/CURSOR_MARKETPLACE_SUBMIT.md)
- [ ] After publish: run [CURSOR_PLUGIN_POST_RELEASE_CHECKLIST.md](../../../docs/plugins/CURSOR_PLUGIN_POST_RELEASE_CHECKLIST.md)

---

**Links**

- [TESTING_AND_CAPABILITIES.md](TESTING_AND_CAPABILITIES.md) — plugin capabilities and verification details
- [MCP_QUICKSTART.md](MCP_QUICKSTART.md) — API key and MCP setup in Cursor
- [.cursor-plugin/VALIDATION.md](.cursor-plugin/VALIDATION.md) — structure alignment with Cursor plugin building docs
