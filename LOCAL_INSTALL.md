# Local install & verify (Cursor)

**Audience:** maintainers testing gen3 before Marketplace submit.  
**Gene:** `repo.plugins.cursor.gen3`

## One-command install

From this repo (`provided_plugins/cursor-plugin/`):

```bash
node scripts/install-local.mjs
```

Copies the repo into `~/.cursor/plugins/local/.agentstack-tree` and junctions **`plugins/agentstack/`** at `~/.cursor/plugins/local/agentstack`.

Cursor rejects a junction whose real path is **outside** `plugins/local` (`symlink target … is outside`). Linking the git checkout directly never registers MCP. The hidden tree stays inside `plugins/local` (dot-prefix, not loaded as its own plugin) so `../../../../scripts` imports still resolve.

Repo root also has `.cursor-plugin/marketplace.json` for **Add marketplace** from GitHub (`pluginRoot: plugins`, `source: agentstack`). Local link tests the package itself; GitHub add uses the marketplace index.

Replace existing link:

```bash
node scripts/install-local.mjs --force
```

### Maintainer overlay (platform engineers)

Copy platform-only agents from `../cursor-plugin-maintainer/`:

```bash
node scripts/install-local.mjs --maintainer
```

See [`../cursor-plugin-maintainer/README.md`](../cursor-plugin-maintainer/README.md). Not published to Marketplace.

Check / uninstall:

```bash
node scripts/install-local.mjs --check
node scripts/uninstall-local.mjs
```

## Verify in Cursor (5 minutes)

0. Optional offline health: `node scripts/diagnose-local.mjs` (add `--fix` to strip stale `tools` on mcp entry; `--seed-snapshot` to pull flat catalog with current auth).
0b. If you still see **`$schema` load error**: `node scripts/refresh-cursor-runtime.mjs --fix` (marketplace cache), then Reload.
1. **Reload:** Command Palette → `Developer: Reload Window`
2. Confirm plugin loads (rules/skills appear; or run a slash command).
3. **Auth:** `/agentstack-authorize` (or `/agentstack-init`)  
   - Requires **Node on PATH**  
   - Browser → `https://agentstack.tech/activate`  
   - Prefer Device Code over a lone `X-API-Key` (refresh + snapshot stay in sync).
   - Writes Bearer → `~/.cursor/mcp.json`
4. **Smoke:** `/agentstack-diagnose` then `/agentstack-capability-matrix`
5. Optional host: `/agentstack-host-site`

Offline preflight (no Cursor UI):

```bash
node scripts/validate-plugin.mjs --strict-screenshots
node scripts/test-hooks-contract.mjs
pwsh scripts/smoke-local.ps1
# or: node scripts/smoke-local.mjs
```

## Data flow reminder

See [FLOW.md](FLOW.md). After init you should have:

- `~/.cursor/mcp.json` — `mcpServers.agentstack` Bearer
- `~/.cursor/agentstack-refresh` — refresh token
- `~/.cursor/agentstack-capabilities.json` — **flat** `actions[]` snapshot

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| **`Error loading plugin` / `Failed to resolve git ref "HEAD"` / `spawn git ENOENT`** | The **Private** row is a `file://` folder (for example `file:///d:/cursor-plugin-master/...`). Cursor runs `git ls-remote` to pin `HEAD`. **ENOENT** means that process cannot find `git`. Remove that Private marketplace. Install with `node scripts/install-local.mjs --force` (directory copy under `~/.cursor/plugins/local/agentstack`) and **Reload Window**, or add `https://github.com/agentstacktech/cursor-plugin`. A zip folder without `.git` cannot satisfy that git pin. |
| **`Unsupported plugin manifest $schema version`** | Cursor is loading a **stale marketplace cache** (often 0.4.14). Local link can already be clean. Run `node scripts/refresh-cursor-runtime.mjs --fix`, then **Reload Window**. If it persists: `--purge` and re-add the marketplace. |
| **Installed but empty `plugins/cache/agentstack`** | Marketplace registered the plugin before files extracted (or failed fetch). Run `node scripts/diagnose-local.mjs`, then `node scripts/refresh-cursor-runtime.mjs --purge`, **Reload Window**, re-add marketplace or `install-local.mjs --force`. Click **Connect** on plugin MCP (G-A174) — skills need OAuth, not an empty cache dir alone. |
| Plugin not listed after install | Reload Window; confirm `install-local.mjs --check` |
| `ERR_MODULE_NOT_FOUND` on device-code | Run from synced tree with `lib/plugin-kernel/`; re-run `sync-plugin-kernel.mjs` in monorepo |
| Device Code hangs then fails immediately | Ensure kernel poll handles 400 `authorization_pending` (0.4.14+) |
| Two identical `agentstack_execute` tools | Deploy core 0.4.16; `diagnose-local.mjs` probes tools/list |
| Two MCP servers in Cursor | Plugin 0.4.18+ uses URL-only plugin `mcp.json` + user `~/.cursor/mcp.json`; `refresh-cursor-runtime.mjs --fix`; Reload. Agents: namespace **`user-agentstack`**, tool **`agentstack.execute`**. |
| Local plugin missing after install | Cursor dropped a junction. `node scripts/install-local.mjs --force` writes a real directory, then Reload Window |

### Stale cache locations (Windows)

Cursor may keep a snapshot under:

- `%USERPROFILE%\.cursor\plugins\cache\agentstack\…`
- `%USERPROFILE%\.cursor\plugins\marketplaces\…`

`diagnose-local.mjs` fails closed if any of those still ship `$schema`.

### Migration from pre-0.4.16 (operator runbook)

| Step | Action |
|------|--------|
| 1 | Upgrade local plugin tree to **0.4.16+** (`git pull` or marketplace refresh) |
| 2 | `node scripts/refresh-cursor-runtime.mjs --fix` — sync OAuth-safe plugin `mcp.json` |
| 3 | **Reload Window** in Cursor |
| 4 | Confirm plugin panel shows AgentStack MCP — click **Connect**. Device Code `user-agentstack` may also be present |
| 5 | `node scripts/diagnose-local.mjs` — must pass `mcpServers=./mcp.json` and OAuth-safe plugin mcp.json |
| 6 | After **core** deploy: `POST /mcp/cache/clear`; `tools/list` must return 1 tool |
| 7 | If prod still lists 2 tools, core is not on 0.4.16 yet — wait for deploy before re-testing Cursor |

Backward compat: existing clients may still call `tools/call` with `agentstack_execute`; only `tools/list` is single-name.

## Uninstall marketplace vs local

Local link does **not** remove Marketplace installs. Uninstall local with `uninstall-local.mjs` only.
Refresh marketplace/cache manifests with `refresh-cursor-runtime.mjs --fix`.
