#!/usr/bin/env node
/**
 * Post-install / pre-auth health for local Cursor plugin.
 *
 * Usage:
 *   node scripts/diagnose-local.mjs
 *   node scripts/diagnose-local.mjs --fix   # strip mcpServers.agentstack.tools extras
 *   node scripts/diagnose-local.mjs --seed-snapshot  # GET /mcp/actions with current auth
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  normalizeAgentstackMcpConfig,
  agentstackAuthHeaders,
} from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';
import {
  evaluateSingleToolSurface,
  postToolsList,
} from '../plugins/agentstack/lib/plugin-kernel/mcpSurfaceProbe.mjs';
import { tenantActionsFromCatalog } from '../plugins/agentstack/lib/plugin-kernel/mcpActionsCatalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(ROOT, 'plugins', 'agentstack');
const LINK = path.join(os.homedir(), '.cursor', 'plugins', 'local', 'agentstack');
const MCP = path.join(os.homedir(), '.cursor', 'mcp.json');
const SNAP = path.join(os.homedir(), '.cursor', 'agentstack-capabilities.json');
const REFRESH = path.join(os.homedir(), '.cursor', 'agentstack-refresh');
const TELEMETRY = path.join(os.homedir(), '.cursor', 'agentstack-telemetry.jsonl');
const SETTINGS = path.join(os.homedir(), '.cursor', 'settings.json');
const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const wantFix = process.argv.includes('--fix');
const wantSeed = process.argv.includes('--seed-snapshot');

let fails = 0;
function ok(msg) {
  console.log(`OK   ${msg}`);
}
function warn(msg) {
  console.warn(`WARN ${msg}`);
}
function fail(msg) {
  console.error(`FAIL ${msg}`);
  fails += 1;
}

/** Opt-in beacon when live tools/list is not single-tool (Wave 7 observability). */
function maybeEmitDuplicateSurfaceBeacon(tools) {
  let optIn = false;
  try {
    if (fs.existsSync(SETTINGS)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
      optIn =
        settings['agentstack.sendTelemetry'] === true ||
        settings.agentstack?.sendTelemetry === true;
    }
  } catch {
    /* ignore */
  }
  if (!optIn) return;
  const row = {
    ts: new Date().toISOString(),
    event: 'plugin_mcp_duplicate_surface',
    tool_count: tools?.length ?? 0,
    tool_names: (tools || []).map((t) => t?.name).filter(Boolean),
    plugin_version: '0.4.17',
    base_url: BASE_URL,
  };
  try {
    fs.appendFileSync(TELEMETRY, `${JSON.stringify(row)}\n`, 'utf8');
    ok('telemetry: plugin_mcp_duplicate_surface (opt-in)');
  } catch (e) {
    warn(`telemetry append failed: ${e.message}`);
  }
}

function resolveLink(p) {
  try {
    if (!fs.existsSync(p)) return null;
    try {
      return path.resolve(path.dirname(p), fs.readlinkSync(p));
    } catch {
      return path.resolve(p);
    }
  } catch {
    return null;
  }
}

console.log('AgentStack Cursor plugin — local diagnose\n');

// Layout
if (!fs.existsSync(path.join(ROOT, '.cursor-plugin/marketplace.json'))) {
  fail('repo missing .cursor-plugin/marketplace.json');
} else {
  ok('marketplace.json present (GitHub Add marketplace)');
}
if (!fs.existsSync(path.join(PLUGIN, '.cursor-plugin/plugin.json'))) {
  fail('plugins/agentstack/.cursor-plugin/plugin.json missing');
} else {
  ok('plugin package plugin.json present');
  const pj = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.cursor-plugin/plugin.json'), 'utf8'));
  if (pj.mcpServers) fail('plugin.json declares mcpServers — forbidden since 0.4.16');
  else ok('plugin.json has no mcpServers (single registration plane)');
}

if (fs.existsSync(path.join(PLUGIN, 'mcp.json'))) {
  fail('plugins/agentstack/mcp.json must not ship (G-A162)');
} else {
  ok('repo plugin package has no mcp.json');
}

const target = resolveLink(LINK);
if (!target) {
  fail(`local link missing: ${LINK} — run: node scripts/install-local.mjs --force`);
} else {
  const norm = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();
  if (norm(target) === norm(PLUGIN)) ok(`local link → plugins/agentstack`);
  else fail(`local link points elsewhere: ${target}`);
}

for (const rel of [
  'hooks/hooks.json',
  'hooks/scripts/device-code.mjs',
  'hooks/scripts/session-start.mjs',
  'lib/plugin-kernel/deviceCodeClient.mjs',
]) {
  if (fs.existsSync(path.join(LINK, rel))) ok(`linked ${rel}`);
  else fail(`linked missing ${rel}`);
}
if (target) {
  const linkedMcp = path.join(LINK, 'mcp.json');
  if (fs.existsSync(linkedMcp)) {
    fail(`linked mcp.json present (G-A162 trap) — delete it; plugin 0.4.17+ must not ship MCP config`);
  } else {
    ok('linked plugin has no mcp.json (MCP via ~/.cursor/mcp.json only)');
  }
}

const cacheRoot = path.join(os.homedir(), '.cursor', 'plugins', 'cache', 'agentstack');
if (fs.existsSync(cacheRoot)) {
  const cachedMcp = [];
  const stack = [cacheRoot];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === 'mcp.json') cachedMcp.push(full);
    }
  }
  if (cachedMcp.length) {
    fail(`cached plugin mcp.json (${cachedMcp.length}) — run: node scripts/refresh-cursor-runtime.mjs --fix`);
  } else {
    ok('no mcp.json in marketplace plugin cache');
  }
}

// mcp.json
if (!fs.existsSync(MCP)) {
  fail('~/.cursor/mcp.json missing — run /agentstack-init');
} else {
  let cfg = JSON.parse(fs.readFileSync(MCP, 'utf8'));
  const entry = cfg.mcpServers?.agentstack;
  if (!entry) fail('mcpServers.agentstack missing');
  else {
    if (wantFix) {
      const { cfg: next, changed } = normalizeAgentstackMcpConfig(cfg, { baseUrl: BASE_URL });
      if (changed) {
        fs.writeFileSync(MCP, JSON.stringify(next, null, 2), 'utf8');
        ok('wrote lean mcpServers.agentstack (--fix)');
        cfg = next;
      } else {
        ok('mcp already lean (--fix no-op)');
      }
    }
    const cur = cfg.mcpServers.agentstack;
    ok(`mcp type=${cur.type} url=${cur.url}`);
    if (cur.tools !== undefined) {
      warn('mcpServers.agentstack.tools present (non-lean) — run with --fix');
    } else {
      ok('mcp entry lean (no tools key)');
    }
    const auth = agentstackAuthHeaders(cfg);
    if (!auth) fail('no Bearer and no X-API-Key — run /agentstack-init');
    else if (auth.Authorization) {
      if (auth.Authorization.includes('${') || /AGENTSTACK_ACCESS_TOKEN/i.test(auth.Authorization)) {
        fail('mcp.json Authorization is a placeholder — plugin MCP shadowed user config (G-A162). Upgrade 0.4.17 + Reload Window.');
      } else {
        ok('auth=Bearer (Device Code path)');
      }
    }
    else ok('auth=X-API-Key (legacy/CI path; prefer /agentstack-init for Device Code)');
    if (auth) {
      try {
        const tools = await postToolsList(BASE_URL, auth);
        const verdict = evaluateSingleToolSurface(tools);
        if (verdict.ok) ok('tools/list returns 1 tool (agentstack.execute)');
        else {
          warn(`tools/list: ${verdict.reason} — deploy core 0.4.16 if >1`);
          maybeEmitDuplicateSurfaceBeacon(tools);
        }
      } catch (e) {
        warn(`tools/list probe failed: ${e.message}`);
      }
    }
  }
}

// refresh / snapshot
if (fs.existsSync(REFRESH)) ok('refresh token file present');
else warn('no ~/.cursor/agentstack-refresh — expected after Device Code login');

if (fs.existsSync(SNAP)) {
  const snap = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  if (Array.isArray(snap.actions)) {
    ok(`capability snapshot flat actions=${snap.actions.length} total=${snap.total_actions || '?'}`);
  } else {
    fail('capability snapshot is not flat actions[] — re-seed with --seed-snapshot');
  }
} else {
  warn('no capability snapshot — sessionStart or --seed-snapshot');
}

if (wantSeed) {
  const cfg = fs.existsSync(MCP) ? JSON.parse(fs.readFileSync(MCP, 'utf8')) : null;
  const headers = agentstackAuthHeaders(cfg);
  if (!headers) {
    fail('cannot --seed-snapshot without auth');
  } else {
    const res = await fetch(`${BASE_URL}/mcp/actions`, { headers });
    if (!res.ok) {
      fail(`GET /mcp/actions HTTP ${res.status}`);
    } else {
      const catalog = await res.json();
      const actions = tenantActionsFromCatalog(catalog);
      fs.writeFileSync(
        SNAP,
        JSON.stringify(
          {
            fetched_at: Date.now(),
            audience: 'tenant',
            total_actions: actions.length,
            actions,
          },
          null,
          2,
        ),
        'utf8',
      );
      ok(`seeded flat snapshot actions=${actions.length}`);
    }
  }
}

// offline gates
const smoke = spawnSync(process.execPath, ['scripts/smoke-local.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
});
if ((smoke.status ?? 1) !== 0) {
  fail('smoke-local failed');
  process.stderr.write(smoke.stderr || smoke.stdout || '');
} else {
  ok('smoke-local passed');
}

// Stale marketplace cache can keep $schema from 0.4.14 even when local link is clean.
const runtimeScan = spawnSync(process.execPath, ['scripts/refresh-cursor-runtime.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
});
process.stdout.write(runtimeScan.stdout || '');
process.stderr.write(runtimeScan.stderr || '');
if ((runtimeScan.status ?? 1) !== 0) {
  fail('stale Cursor runtime cache has $schema — run: node scripts/refresh-cursor-runtime.mjs --fix');
} else {
  ok('Cursor runtime cache: no $schema in agentstack manifests');
}

console.log(`\nsummary: failed=${fails}`);
console.log(`
Next (human):
  1. If $schema error: node scripts/refresh-cursor-runtime.mjs --fix && Reload Window
  2. /agentstack-init   (Device Code — recommended over X-API-Key alone)
  3. /agentstack-diagnose
  4. /agentstack-capability-matrix
`);
process.exit(fails ? 1 : 0);
