#!/usr/bin/env node
/**
 * Refresh / sanitize Cursor runtime copies of AgentStack plugin.
 *
 * Cursor can load a marketplace *cache* (0.4.14 with $schema) even when
 * ~/.cursor/plugins/local/agentstack already points at a fixed tree.
 * That produces: Unsupported plugin manifest $schema version: …
 *
 * Usage:
 *   node scripts/refresh-cursor-runtime.mjs           # diagnose
 *   node scripts/refresh-cursor-runtime.mjs --fix    # sync manifests + full package mirror when stale
 *   node scripts/refresh-cursor-runtime.mjs --purge   # delete agentstack cache dirs
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { pluginMcpOAuthError, pluginMcpPointerError } from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(ROOT, 'plugins', 'agentstack');
const SOT_PLUGIN_JSON = path.join(PLUGIN, '.cursor-plugin', 'plugin.json');
const SOT_MARKETPLACE = path.join(ROOT, '.cursor-plugin', 'marketplace.json');
const SOT_HOOKS = path.join(PLUGIN, 'hooks', 'hooks.json');
const SOT_MCP = path.join(PLUGIN, 'mcp.json');
const CURSOR_PLUGINS = path.join(os.homedir(), '.cursor', 'plugins');

/** Auth/MCP slice Cursor cache often keeps from marketplace 0.4.16 while local is newer. */
const AUTH_SLICE = [
  'hooks/hooks.json',
  'hooks/scripts/session-start.mjs',
  'hooks/scripts/device-code.mjs',
  'lib/plugin-kernel/mcpConfig.mjs',
  'lib/plugin-kernel/deviceCodeClient.mjs',
  'mcp.json',
  '.cursor-plugin/plugin.json',
  'assets/logo.png',
  'commands/agentstack-authorize.md',
  'rules/agentstack-prefer.mdc',
  'skills/agentstack-auth-rbac/SKILL.md',
];

const fix = process.argv.includes('--fix');
const purge = process.argv.includes('--purge');
const COPY_SKIP = new Set(['.git', 'node_modules']);

let fails = 0;
let fixed = 0;

function ok(m) {
  console.log(`OK   ${m}`);
}
function warn(m) {
  console.warn(`WARN ${m}`);
}
function fail(m) {
  console.error(`FAIL ${m}`);
  fails += 1;
}

function walkJson(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walkJson(full, out);
    } else if (entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function samePath(a, b) {
  return path.resolve(a).replace(/\\/g, '/').toLowerCase() === path.resolve(b).replace(/\\/g, '/').toLowerCase();
}

function stripSchemaWrite(filePath, sotPath) {
  const sot = loadJson(sotPath);
  if (!sot) {
    fail(`SoT missing/invalid: ${sotPath}`);
    return false;
  }
  // Prefer full SoT replace for known manifests
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(sot, null, 2)}\n`, 'utf8');
  fixed += 1;
  ok(`wrote SoT → ${filePath}`);
  return true;
}

function countSkillDirs(pluginRoot) {
  const skills = path.join(pluginRoot, 'skills');
  if (!fs.existsSync(skills)) return -1;
  return fs.readdirSync(skills, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
}

function copyPackageRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (COPY_SKIP.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyPackageRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

/** Package roots Cursor may execute (cache extract, marketplace mirror, not SoT link). */
function discoverAgentstackPackageRoots() {
  const roots = new Set();
  if (!fs.existsSync(CURSOR_PLUGINS)) return roots;
  for (const file of walkJson(CURSOR_PLUGINS)) {
    const norm = file.replace(/\\/g, '/');
    if (!norm.toLowerCase().includes('agentstack')) continue;
    if (!norm.endsWith('/.cursor-plugin/plugin.json')) continue;
    roots.add(path.dirname(path.dirname(file)));
  }
  return roots;
}

function mirrorPackageIfStale(pluginRoot) {
  if (samePath(pluginRoot, PLUGIN)) return;
  const sotSkills = countSkillDirs(PLUGIN);
  const destSkills = countSkillDirs(pluginRoot);
  if (sotSkills < 0) return;

  let stale = destSkills !== sotSkills;
  if (!stale) {
    const sotHooks = loadJson(SOT_HOOKS);
    const destHooks = loadJson(path.join(pluginRoot, 'hooks', 'hooks.json'));
    stale = !!(sotHooks && destHooks && JSON.stringify(sotHooks) !== JSON.stringify(destHooks));
  }
  if (!stale) return;

  fail(`${pluginRoot}: package stale (skills ${destSkills}/${sotSkills})`);
  if (!fix) return;
  copyPackageRecursive(PLUGIN, pluginRoot);
  fixed += 1;
  ok(`mirrored full package → ${pluginRoot} (${sotSkills} skills)`);
}

function syncMarketplaceIndexes() {
  const sot = loadJson(SOT_MARKETPLACE);
  if (!sot) return;
  const sotVer = String(sot.metadata?.version || sot.plugins?.[0]?.version || '');
  for (const file of walkJson(CURSOR_PLUGINS)) {
    if (path.basename(file) !== 'marketplace.json') continue;
    const n = file.replace(/\\/g, '/').toLowerCase();
    if (!n.includes('agentstack') && !n.includes('/marketplaces/')) continue;
    const j = loadJson(file);
    if (!j) continue;
    const ver = String(j.metadata?.version || j.plugins?.[0]?.version || '');
    const needsWrite =
      j.$schema !== undefined ||
      (sotVer && ver && ver !== sotVer) ||
      (sot.plugins?.[0]?.logo && j.plugins?.[0]?.logo !== sot.plugins[0].logo);
    if (!needsWrite) {
      ok(`marketplace.json version=${ver || '?'} @ ${file}`);
      continue;
    }
    fail(`${file}: marketplace drift (version=${ver || '?'} SoT=${sotVer})`);
    if (fix) stripSchemaWrite(file, SOT_MARKETPLACE);
  }
}

function syncAuthSlice(pluginRoot) {
  if (samePath(pluginRoot, PLUGIN)) return;
  for (const rel of AUTH_SLICE) {
    const src = path.join(PLUGIN, rel);
    const dest = path.join(pluginRoot, rel);
    if (!fs.existsSync(src)) continue;
    const a = fs.readFileSync(src);
    let b = null;
    try {
      b = fs.readFileSync(dest);
    } catch {
      /* missing in cache */
    }
    if (b && a.equals(b)) continue;
    if (!fix) fail(`${dest}: auth-slice drift (${rel})`);
    if (fix) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, a);
      fixed += 1;
      ok(`synced ${rel} → ${dest}`);
    }
  }
}

function scanAndFix() {
  if (!fs.existsSync(CURSOR_PLUGINS)) {
    fail(`no ${CURSOR_PLUGINS}`);
    return;
  }

  const local = path.join(CURSOR_PLUGINS, 'local', 'agentstack', '.cursor-plugin', 'plugin.json');
  if (fs.existsSync(local)) {
    const j = loadJson(local);
    if (j?.$schema) {
      fail(`local plugin.json still has $schema (${local})`);
      if (fix) stripSchemaWrite(local, SOT_PLUGIN_JSON);
    } else {
      const ptrErr = pluginMcpPointerError(j);
      if (ptrErr) {
        fail(`local plugin.json: ${ptrErr}`);
        if (fix) stripSchemaWrite(local, SOT_PLUGIN_JSON);
      } else if (j?.version) {
        ok(`local plugin.json version=${j.version} mcpServers=${j.mcpServers}`);
      }
    }
  } else {
    warn('local/agentstack not installed — run: node scripts/install-local.mjs');
  }

  const files = walkJson(CURSOR_PLUGINS);
  const interesting = files.filter((f) => {
    const n = f.replace(/\\/g, '/').toLowerCase();
    const base = path.basename(n);
    // AgentStack package + marketplace indexes (repo-root marketplace.json may omit "agentstack" in path)
    if (base === 'marketplace.json' && (n.includes('agentstack') || n.includes('/marketplaces/'))) {
      return true;
    }
    return (
      n.includes('agentstack') &&
      (base === 'plugin.json' || base === 'hooks.json')
    );
  });

  for (const file of interesting) {
    const j = loadJson(file);
    if (!j) continue;
    const rel = file;
    if (j.$schema !== undefined) {
      fail(`${rel}: has $schema = ${j.$schema}`);
      if (fix) {
        const base = path.basename(file);
        if (base === 'plugin.json') stripSchemaWrite(file, SOT_PLUGIN_JSON);
        else if (base === 'marketplace.json') stripSchemaWrite(file, SOT_MARKETPLACE);
        else if (base === 'hooks.json') stripSchemaWrite(file, SOT_HOOKS);
        else {
          delete j.$schema;
          fs.writeFileSync(file, `${JSON.stringify(j, null, 2)}\n`, 'utf8');
          fixed += 1;
          ok(`stripped $schema → ${file}`);
        }
      }
    } else if (path.basename(file) === 'plugin.json') {
      const ptrErr = pluginMcpPointerError(j);
      if (ptrErr) {
        fail(`${rel}: ${ptrErr}`);
        if (fix) stripSchemaWrite(file, SOT_PLUGIN_JSON);
      } else {
        const sotVer = loadJson(SOT_PLUGIN_JSON)?.version;
        if (
          sotVer &&
          j.version &&
          j.version !== sotVer &&
          !samePath(file, SOT_PLUGIN_JSON) &&
          !samePath(file, local)
        ) {
          fail(`${rel}: version=${j.version} != SoT ${sotVer}`);
          if (fix) stripSchemaWrite(file, SOT_PLUGIN_JSON);
        } else {
          ok(`clean plugin.json version=${j.version || '?'} mcpServers=${j.mcpServers} @ ${rel}`);
        }
      }
    }
  }

  const pluginRoots = new Set();
  for (const file of files) {
    const n = file.replace(/\\/g, '/').toLowerCase();
    if (path.basename(n) !== 'hooks.json' || !n.includes('agentstack')) continue;
    pluginRoots.add(path.dirname(path.dirname(file)));
  }
  for (const root of pluginRoots) syncAuthSlice(root);

  syncMarketplaceIndexes();
  for (const root of discoverAgentstackPackageRoots()) {
    mirrorPackageIfStale(root);
  }

  for (const file of walkJson(CURSOR_PLUGINS)) {
    const n = file.replace(/\\/g, '/').toLowerCase();
    if (path.basename(n) !== 'mcp.json') continue;
    if (!n.includes('agentstack')) continue;
    if (samePath(file, SOT_MCP)) continue;
    const cfg = loadJson(file);
    const err = pluginMcpOAuthError(cfg);
    if (err) {
      fail(`${file}: ${err}`);
      if (fix) stripSchemaWrite(file, SOT_MCP);
    } else {
      const sot = loadJson(SOT_MCP);
      if (sot && JSON.stringify(cfg) !== JSON.stringify(sot)) {
        fail(`${file}: plugin mcp.json drift vs SoT`);
        if (fix) stripSchemaWrite(file, SOT_MCP);
      } else {
        ok(`oauth-safe plugin mcp.json @ ${file}`);
      }
    }
  }
}

function purgeCaches() {
  const targets = [
    path.join(CURSOR_PLUGINS, 'cache', 'agentstack'),
  ];
  for (const t of targets) {
    if (!fs.existsSync(t)) {
      ok(`purge skip (missing): ${t}`);
      continue;
    }
    fs.rmSync(t, { recursive: true, force: true });
    ok(`purged ${t}`);
    fixed += 1;
  }
  // Marketplace snapshots under marketplaces/ may be a local-path mirror — patch, don't delete whole tree
  warn('marketplaces/ snapshot left in place; --fix syncs manifests from SoT');
}

console.log('AgentStack Cursor runtime refresh\n');
console.log(`SoT plugin: ${PLUGIN}`);
console.log(`Cursor:     ${CURSOR_PLUGINS}\n`);

if (purge) purgeCaches();
scanAndFix();

console.log(`\nsummary: fails=${fails} fixed=${fixed}`);
if (fix || purge) {
  // Re-scan after writes so exit code reflects remaining issues only
  fails = 0;
  const files = walkJson(CURSOR_PLUGINS);
  for (const file of files) {
    const n = file.replace(/\\/g, '/').toLowerCase();
    const base = path.basename(n);
    const watch =
      (base === 'marketplace.json' && (n.includes('agentstack') || n.includes('/marketplaces/'))) ||
      (n.includes('agentstack') && (base === 'plugin.json' || base === 'hooks.json'));
    if (!watch) continue;
    const j = loadJson(file);
    if (j?.$schema !== undefined) {
      fail(`still has $schema after --fix: ${file}`);
    }
  }
  console.log(`\nrecheck fails=${fails}`);
  console.log(`
Next:
  1. Cursor → Developer: Reload Window
  2. Confirm plugin shows ${loadJson(SOT_PLUGIN_JSON)?.version || 'SoT'} without load errors; MCP appears in the plugin panel
  3. Click Connect on plugin AgentStack MCP, or /agentstack-authorize
`);
  process.exit(fails ? 1 : 0);
}
if (fails) {
  console.log(`
Next:
  node scripts/refresh-cursor-runtime.mjs --fix
  node scripts/install-local.mjs --force
  Then in Cursor: Developer: Reload Window
  (If error persists: --purge then re-add marketplace / reload)
`);
  process.exit(1);
}
process.exit(0);
