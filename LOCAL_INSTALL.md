# Local install & verify (Cursor)

**Audience:** maintainers testing gen3 before Marketplace submit.  
**Gene:** `repo.plugins.cursor.gen3`

## One-command install

From this repo (`provided_plugins/cursor-plugin/`):

```bash
node scripts/install-local.mjs
```

Creates a link to **`plugins/agentstack/`** (the Cursor plugin package):

| OS | Mechanism | Path |
|----|-----------|------|
| Windows | directory **junction** (no admin) | `%USERPROFILE%\.cursor\plugins\local\agentstack` |
| macOS / Linux | **symlink** | `~/.cursor/plugins/local/agentstack` |

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
3. **Auth:** `/agentstack-init`  
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
| **`Unsupported plugin manifest $schema version`** | Cursor is loading a **stale marketplace cache** (often 0.4.14). Local link can already be clean. Run `node scripts/refresh-cursor-runtime.mjs --fix`, then **Reload Window**. If it persists: `--purge` and re-add the marketplace. |
| Plugin not listed after install | Reload Window; confirm `install-local.mjs --check` |
| `ERR_MODULE_NOT_FOUND` on device-code | Run from synced tree with `lib/plugin-kernel/`; re-run `sync-plugin-kernel.mjs` in monorepo |
| Device Code hangs then fails immediately | Ensure kernel poll handles 400 `authorization_pending` (0.4.14+) |
| Junction needs elevation | Use install-local (junction, not symlink); avoid copying the folder |

### Stale cache locations (Windows)

Cursor may keep a snapshot under:

- `%USERPROFILE%\.cursor\plugins\cache\agentstack\…`
- `%USERPROFILE%\.cursor\plugins\marketplaces\…`

`diagnose-local.mjs` fails closed if any of those still ship `$schema`.

## Uninstall marketplace vs local

Local link does **not** remove Marketplace installs. Uninstall local with `uninstall-local.mjs` only.
Refresh marketplace/cache manifests with `refresh-cursor-runtime.mjs --fix`.
