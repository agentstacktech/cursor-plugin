#!/usr/bin/env node
/**
 * Post-install / pre-auth health for local Cursor plugin.
 *
 * Usage:
 *   node scripts/diagnose-local.mjs
 *   node scripts/diagnose-local.mjs --fix   # strip mcpServers.agentstack.tools extras
 *   node scripts/diagnose-local.mjs --seed-snapshot  # GET /mcp/actions with current auth
 *   node scripts/diagnose-local.mjs --quick          # layout + JWT gate only (no network)
 *   node scripts/diagnose-local.mjs --sync-runtime   # refresh-cursor-runtime --fix (also with --fix)
 *   node scripts/diagnose-local.mjs --audit-catalog  # GET /mcp/actions effect parity (heavy)
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
  profileBriefFromJwt,
  readPinnedTenantProjectId,
  describeMcpWriteCapGap,
} from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';
import {
  pluginMcpRuntimeCacheError,
  syncPluginRuntimeMcpBearerFromUser,
  pluginCacheBearerDrifted,
  resetPluginCacheMcpToOAuthOnly,
} from '../plugins/agentstack/lib/plugin-kernel/pluginMcpRuntimeSync.mjs';
import {
  evaluateSingleToolSurface,
  postToolsList,
  postToolsCallAuthGetProfile,
  postToolsCallExecuteAlias,
  probePluginCacheToolsList,
} from './lib/mcpSurfaceProbe.mjs';
import {
  writeTenantCapabilitySnapshot,
  CAPABILITY_SNAPSHOT_FILENAME,
  flattenMcpActionsCatalog,
} from '../plugins/agentstack/lib/plugin-kernel/mcpActionsCatalog.mjs';
import { readDeviceLoginLock } from '../plugins/agentstack/lib/plugin-kernel/deviceCodeClient.mjs';
import { scanCatalogEffectParityMismatches } from './lib/mcpEffectParity.mjs';

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
const wantQuick = process.argv.includes('--quick');
const wantAuditCatalog = process.argv.includes('--audit-catalog');
const wantSyncRuntime =
  process.argv.includes('--sync-runtime') || wantFix;

let fails = 0;
/** @type {string[]} */
const zeroToolsHints = [];
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
    plugin_version: JSON.parse(fs.readFileSync(path.join(PLUGIN, '.cursor-plugin/plugin.json'), 'utf8')).version,
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
  let userCfgForCacheProbe = null;
  if (fs.existsSync(MCP)) {
    try {
      userCfgForCacheProbe = JSON.parse(fs.readFileSync(MCP, 'utf8'));
    } catch {
      /* probe later with user mcp section */
    }
  }
  const userGate = userCfgForCacheProbe ? describeAgentstackAuthGate(userCfgForCacheProbe) : null;
  const userAuth = userCfgForCacheProbe ? agentstackAuthHeaders(userCfgForCacheProbe) : null;
  if (cachedMcp.length) {
    let bad = 0;
    let oauthOnlyInCache = 0;
    for (const p of cachedMcp) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
      const hasBearer = Boolean(parsed?.mcpServers?.agentstack?.headers?.Authorization);
      if (!hasBearer) oauthOnlyInCache += 1;
      const mcpErr = hasBearer
        ? pluginMcpRuntimeCacheError(parsed)
        : pluginMcpOAuthError(parsed);
      if (hasBearer && mcpErr && userGate?.kind === 'null_caps') {
        fail(`${p}: ${mcpErr} (stale mirror of session JWT — run diagnose --fix)`);
        bad += 1;
        continue;
      }
      if (mcpErr) {
        fail(`${p}: ${mcpErr}`);
        bad += 1;
      }
    }
    if (!bad) ok(`cached plugin mcp.json (${cachedMcp.length}) shape OK`);
    if (
      userGate?.kind === 'ok' &&
      userGate?.authMode === 'bearer_pat' &&
      userAuth?.Authorization &&
      oauthOnlyInCache > 0 &&
      (await pluginCacheBearerDrifted(userCfgForCacheProbe, { baseUrl: BASE_URL }))
    ) {
      fail(
        `plugin cache mcp.json unsigned (OAuth-only) while ~/.cursor/mcp.json has Device Code Bearer — ` +
          'plugin-agentstack-* may show 0 tools. Run: node scripts/refresh-cursor-runtime.mjs --fix ' +
          'or open a new chat (sessionStart bearer-sync), then Reload Window; or Connect (G-A174).',
      );
    } else if (!bad && oauthOnlyInCache === 0) {
      ok('cached plugin mcp.json bearer-mirrored');
    }
    if (oauthOnlyInCache > 0 && userGate?.kind !== 'ok') {
      zeroToolsHints.push(
        'plugin-agentstack-* shows 0 tools: plugin cache mcp.json is OAuth-only (unsigned). ' +
          'VPS/core deploy does not sign plugin MCP — Connect (G-A174) or Device Code PAT + refresh-cursor-runtime --fix.',
      );
    }
    if (oauthOnlyInCache > 0 && userGate?.authMode === 'bearer_pat') {
      zeroToolsHints.push(
        'PAT in ~/.cursor/mcp.json but plugin cache OAuth-only — run refresh-cursor-runtime.mjs --fix + Reload Window.',
      );
    }
    if (!wantQuick && cachedMcp.length) {
      for (const p of cachedMcp) {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
        const probe = await probePluginCacheToolsList(parsed, { fallbackBaseUrl: BASE_URL });
        const tag = path.basename(path.dirname(p));
        if (probe.cursorLikelyZeroTools) {
          fail(`plugin cache tools/list @ ${tag}: ${probe.cursorReason}`);
          if (!zeroToolsHints.includes(probe.cursorReason)) zeroToolsHints.push(probe.cursorReason);
        } else if (probe.surface.ok) {
          ok(`plugin cache tools/list @ ${tag}: 1 tool (signed mirror)`);
        } else {
          warn(`plugin cache tools/list @ ${tag}: ${probe.surface.reason}`);
        }
      }
    }
    if (wantFix) {
      const sync = await syncPluginRuntimeMcpBearerFromUser({ baseUrl: BASE_URL, force: true });
      if (sync.updated.length) {
        ok(`plugin cache bearer-sync (${sync.updated.length}) — Reload Window for plugin-agentstack-*`);
      }
    }
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
  const serverKeys = Object.keys(cfg.mcpServers || {});
  const agentstackKeys = serverKeys.filter((k) => /^agentstack/i.test(k));
  if (agentstackKeys.length > 1) {
    const bearerOk = agentstackKeys.filter((k) => {
      const h = cfg.mcpServers[k]?.headers || {};
      const auth = String(h.Authorization || '');
      return auth.startsWith('Bearer ') && !auth.includes('${') && !/placeholder/i.test(auth);
    });
    if (bearerOk.length !== 1) {
      fail(
        `multiple agentstack MCP servers (${agentstackKeys.join(', ')}) — ` +
          'keep exactly one with a real Device Code Bearer (mcpServers.agentstack); ' +
          'remove agentstack-dev or duplicate entries, then Reload Window',
      );
    } else {
      warn(
        `multiple agentstack* keys (${agentstackKeys.join(', ')}) — only ${bearerOk[0]} has Bearer; ` +
          'consider removing dev-only servers to avoid Cursor shadowing',
      );
    }
  }
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
    }     else if (gate.authMode === 'api_key' && auth?.['X-API-Key']) {
      ok('auth=X-API-Key (integration / admin key — hooks & mcp-execute; plugin MCP → Connect)');
      if (gate.additionalContext) warn(gate.additionalContext);
    } else if (auth?.Authorization && gate.kind === 'ok') ok('auth=Bearer (integration PAT)');
    else if (auth?.Authorization) fail(`auth=Bearer but gate=${gate.kind} — run ${AUTHORIZE_SLASH} or X-API-Key`);
    else ok(`auth=X-API-Key — run ${AUTHORIZE_SLASH} if you need Device Code instead`);
    const claims = describeAgentstackMcpAuth(cfg);
    if (claims.jwtType) {
      ok(
        `jwt type=${claims.jwtType} uid=${claims.userId} caps=${claims.serviceCaps} ` +
          `project=${claims.projectHeader || 'unset'} exp_in=${claims.expInSec}s`,
      );
    }
    const pin = await readPinnedTenantProjectId(path.dirname(MCP));
    const profile =
      auth && gate.kind === 'ok' ? profileBriefFromJwt(auth) : null;
    const dualSurface =
      gate.kind === 'ok' &&
      claims.jwtType === 'user_api_key';
    if (dualSurface) {
      warn(
        'DUAL_SURFACE: ~/.cursor/mcp.json Bearer is OK for user-agentstack / mcp-execute, ' +
          'but plugin-agentstack-* stays unsigned until Connect (G-A174). ' +
          'Agents should use mcp-execute.mjs or you Connect on plugin MCP + Reload Window.',
      );
    }
    console.log(
      formatAgentstackStatusCard({
        gateKind: gate.kind,
        additionalContext: gate.additionalContext,
        auth: claims,
        pin,
        profile,
        transportRecommended: dualSurface ? 'connect' : gate.kind === 'ok' ? 'ok' : undefined,
        namespaceHint: dualSurface
          ? 'DUAL_SURFACE: Connect plugin MCP for CallDynamicTool plugin-agentstack-*'
          : undefined,
      }),
    );
    if (gate.kind === 'null_caps') {
      if (wantFix) {
        const cleared = await resetPluginCacheMcpToOAuthOnly({ baseUrl: BASE_URL });
        if (cleared.length) {
          ok(`cleared invalid Bearer from plugin cache (${cleared.length}) — use Connect or ${AUTHORIZE_SLASH}`);
        }
        // Do not re-mirror user Bearer here — invalid PAT would repopulate cache (0-tools trap).
      }
      fail(
        'Invalid MCP Bearer (user_token or service_caps=null) — plugin cache may show 0 tools. ' +
          `Run ${AUTHORIZE_SLASH} (Device Code PAT only), then refresh-cursor-runtime.mjs --fix and Reload Window. ` +
          'Do not paste profile API keys or use switch-project session JWT.',
      );
    }
    if (gate.kind === 'unsigned') {
      warn(
        'Plugin MCP (plugin-agentstack-*) shows 0 tools until Connect (G-A174) or Device Code + cache bearer-sync.',
      );
    }
    if (String(claims.projectHeader || '') === '1') {
      warn(
        'X-Project-ID=1 is identity home, not a workspace. Pin tenant project ' +
          '(AGENTSTACK_PROJECT_ID or mcp.json) e.g. 1444.',
      );
    }
    if (auth && !wantQuick) {
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
        await postToolsCallAuthGetProfile(BASE_URL, auth);
        ok('tools/call auth.get_profile — MCP operator session OK');
        const capGap = describeMcpWriteCapGap(cfg);
        if (capGap.missing && capGap.reason) {
          warn(capGap.reason);
        }
      } catch (e) {
        fail(`MCP session probe failed (auth.get_profile): ${e.message}`);
      }
      const bridgeScript = path.join(ROOT, 'scripts', 'mcp-execute.mjs');
      if (fs.existsSync(bridgeScript)) {
        const bridge = spawnSync(
          process.execPath,
          [bridgeScript, 'auth.get_profile'],
          { cwd: ROOT, encoding: 'utf8', timeout: 45_000 },
        );
        if ((bridge.status ?? 1) === 0) {
          ok('mcp-execute auth.get_profile — Bearer HTTP bridge OK');
        } else {
          warn(
            `mcp-execute bridge failed (exit ${bridge.status}) — ${(bridge.stderr || bridge.stdout || '').trim().slice(0, 200)}`,
          );
        }
      } else {
        warn('scripts/mcp-execute.mjs missing — skip Bearer bridge probe');
      }
      try {
        await postToolsCallExecuteAlias(BASE_URL, auth);
        ok('tools/call transport (discovery.list alias) OK — not a session check');
      } catch (e) {
        warn(`tools/call alias probe: ${e.message}`);
      }
      if (wantAuditCatalog) {
        try {
          const catalogRes = await fetch(`${BASE_URL}/mcp/actions`, { headers: auth });
          if (!catalogRes.ok) {
            warn(`GET /mcp/actions HTTP ${catalogRes.status} — skip effect parity`);
          } else {
            const catalog = await catalogRes.json();
            const actions = flattenMcpActionsCatalog(catalog);
            const mismatches = scanCatalogEffectParityMismatches(actions);
            if (!mismatches.length) {
              ok(`catalog effect parity OK (${actions.length} actions)`);
            } else {
              for (const row of mismatches) {
                warn(`effect parity: ${row.action} — ${row.issue}`);
              }
              fail('catalog effect.kind mismatches read_only_hint / preflight read set');
            }
          }
        } catch (e) {
          warn(`catalog effect parity probe failed: ${e.message}`);
        }
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

if (!wantQuick) {
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
}

const runtimeArgs = wantSyncRuntime
  ? ['scripts/refresh-cursor-runtime.mjs', '--fix']
  : ['scripts/refresh-cursor-runtime.mjs'];
const runtimeScan = spawnSync(process.execPath, runtimeArgs, {
  cwd: ROOT,
  encoding: 'utf8',
});
process.stdout.write(runtimeScan.stdout || '');
process.stderr.write(runtimeScan.stderr || '');
if ((runtimeScan.status ?? 1) !== 0) {
  fail(
    wantSyncRuntime
      ? 'Cursor runtime cache drift — run: node scripts/refresh-cursor-runtime.mjs --fix (or --purge then Reload Window)'
      : 'Cursor runtime cache check failed — run diagnose with --sync-runtime or --fix',
  );
} else if (wantSyncRuntime) {
  ok('Cursor runtime cache synced (manifests + package mirror)');
} else {
  ok('Cursor runtime cache check (read-only; use --sync-runtime to apply --fix)');
}

if (zeroToolsHints.length) {
  console.log('\n--- plugin MCP: 0 tools (root cause) ---');
  for (const line of zeroToolsHints) {
    console.log(`RCA  ${line}`);
  }
  console.log('RCA  user-agentstack / mcp-execute can work while plugin-agentstack-* shows 0 until Connect or PAT mirror.');
  console.log(
    'RCA  Plan: AgentStack monorepo docs/plans/CURSOR_PLUGIN_ZERO_TOOLS_DECOMPOSITION_2026-10-25.md § Phase 0',
  );
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
