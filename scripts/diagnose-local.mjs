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
  describeAgentstackMcpAuth,
  describeAgentstackAuthGate,
  pluginMcpOAuthError,
  pluginMcpPointerError,
  AUTHORIZE_SLASH,
  isTenantProjectId,
  formatAgentstackStatusCard,
  fetchAuthMeBrief,
  readPinnedTenantProjectId,
} from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';
import {
  evaluateSingleToolSurface,
  postToolsList,
  postToolsCallExecuteAlias,
} from '../plugins/agentstack/lib/plugin-kernel/mcpSurfaceProbe.mjs';
import {
  writeTenantCapabilitySnapshot,
  CAPABILITY_SNAPSHOT_FILENAME,
} from '../plugins/agentstack/lib/plugin-kernel/mcpActionsCatalog.mjs';
import { readDeviceLoginLock } from '../plugins/agentstack/lib/plugin-kernel/deviceCodeClient.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(ROOT, 'plugins', 'agentstack');
const LINK = path.join(os.homedir(), '.cursor', 'plugins', 'local', 'agentstack');
const MCP = path.join(os.homedir(), '.cursor', 'mcp.json');
const SNAP = path.join(os.homedir(), '.cursor', CAPABILITY_SNAPSHOT_FILENAME);
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
    plugin_version: '0.4.18',
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
  const ptrErr = pluginMcpPointerError(pj);
  if (ptrErr) fail(`plugin.json: ${ptrErr}`);
  else ok(`plugin.json mcpServers=${pj.mcpServers}`);
}

const repoMcp = path.join(PLUGIN, 'mcp.json');
if (!fs.existsSync(repoMcp)) {
  fail('plugins/agentstack/mcp.json missing (plugin Connect)');
} else {
  const mcpErr = pluginMcpOAuthError(JSON.parse(fs.readFileSync(repoMcp, 'utf8')));
  if (mcpErr) fail(`plugins/agentstack/mcp.json: ${mcpErr}`);
  else ok('repo plugin mcp.json is OAuth URL-only');
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
  if (!fs.existsSync(linkedMcp)) {
    fail('linked mcp.json missing — run install-local --force');
  } else {
    const mcpErr = pluginMcpOAuthError(JSON.parse(fs.readFileSync(linkedMcp, 'utf8')));
    if (mcpErr) fail(`linked mcp.json: ${mcpErr}`);
    else ok('linked plugin mcp.json is OAuth URL-only');
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
    let bad = 0;
    for (const p of cachedMcp) {
      const mcpErr = pluginMcpOAuthError(JSON.parse(fs.readFileSync(p, 'utf8')));
      if (mcpErr) {
        fail(`${p}: ${mcpErr}`);
        bad += 1;
      }
    }
    if (!bad) ok(`cached plugin mcp.json (${cachedMcp.length}) OAuth-safe`);
  } else {
    warn('no mcp.json in marketplace plugin cache yet (Reload Window after install)');
  }
}

const dlock = await readDeviceLoginLock(path.dirname(MCP));
if (dlock?.user_code || dlock?.pid) {
  warn(
    `Device Code lock pid=${dlock.pid || '?'} code=${dlock.user_code || 'pending'} ` +
      (dlock.verification_uri || ''),
  );
}
const pinPath = path.join(os.homedir(), '.cursor', 'agentstack-project');
if (fs.existsSync(pinPath)) {
  const pinRaw = fs.readFileSync(pinPath, 'utf8').trim();
  if (isTenantProjectId(pinRaw)) ok(`agentstack-project tenant pin=${pinRaw}`);
  else warn(`agentstack-project=${pinRaw || '(empty)'} is not a tenant workspace — pin e.g. 1444, not 1`);
}

// mcp.json
if (!fs.existsSync(MCP)) {
  fail('~/.cursor/mcp.json missing — run /agentstack-authorize');
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
    const gate = describeAgentstackAuthGate(cfg);
    if (gate.kind === 'unsigned') fail(`no Bearer and no X-API-Key — run ${AUTHORIZE_SLASH}`);
    else if (gate.kind === 'placeholder') {
      fail('user mcp.json Authorization is a placeholder — run /agentstack-authorize');
    } else if (auth?.Authorization) ok('auth=Bearer (Device Code path)');
    else ok(`auth=X-API-Key (legacy/CI path; prefer ${AUTHORIZE_SLASH} for Device Code)`);
    const claims = describeAgentstackMcpAuth(cfg);
    if (claims.jwtType) {
      ok(
        `jwt type=${claims.jwtType} uid=${claims.userId} caps=${claims.serviceCaps} ` +
          `project=${claims.projectHeader || 'unset'} exp_in=${claims.expInSec}s`,
      );
    }
    const pin = await readPinnedTenantProjectId(path.dirname(MCP));
    const profile =
      auth && gate.kind === 'ok' ? await fetchAuthMeBrief(auth, { baseUrl: BASE_URL }) : null;
    console.log(
      formatAgentstackStatusCard({
        gateKind: gate.kind,
        additionalContext: gate.additionalContext,
        auth: claims,
        pin,
        profile,
      }),
    );
    if (gate.kind === 'null_caps' && /agentstack\.tech/i.test(String(cur.url || ''))) {
      fail(
        'Bearer JWT has service_caps=null — prod MCP rejects unrestricted tenant keys ' +
          `(service_caps_required_in_prod). Run ${AUTHORIZE_SLASH} (Device Code), or deploy shared+core G-A169/170.`,
      );
    }
    if (String(claims.projectHeader || '') === '1') {
      warn(
        'X-Project-ID=1 is identity home, not a workspace. Pin tenant project ' +
          '(AGENTSTACK_PROJECT_ID or mcp.json) e.g. 1444.',
      );
    }
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
      try {
        await postToolsCallExecuteAlias(BASE_URL, auth);
        ok('tools/call transport (system.ping) OK — not a catalog check');
      } catch (e) {
        fail(`tools/call execute failed: ${e.message}`);
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
      const n = await writeTenantCapabilitySnapshot(
        path.join(os.homedir(), '.cursor'),
        await res.json(),
      );
      ok(`seeded flat snapshot actions=${n}`);
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
  2. Reload Window — plugin MCP should appear; click Connect or /agentstack-authorize
  3. Pin tenant X-Project-ID (not 1), then Reload Window
  4. /agentstack-status  (or /agentstack-diagnose)
`);
process.exit(fails ? 1 : 0);
