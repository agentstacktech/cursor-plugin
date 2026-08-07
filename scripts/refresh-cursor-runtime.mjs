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
 *   node scripts/refresh-cursor-runtime.mjs --fix    # strip $schema + sync manifests
 *   node scripts/refresh-cursor-runtime.mjs --purge   # delete agentstack cache dirs
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(ROOT, 'plugins', 'agentstack');
const SOT_PLUGIN_JSON = path.join(PLUGIN, '.cursor-plugin', 'plugin.json');
const SOT_MARKETPLACE = path.join(ROOT, '.cursor-plugin', 'marketplace.json');
const SOT_HOOKS = path.join(PLUGIN, 'hooks', 'hooks.json');
const CURSOR_PLUGINS = path.join(os.homedir(), '.cursor', 'plugins');

const fix = process.argv.includes('--fix');
const purge = process.argv.includes('--purge');

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
    } else if (j?.mcpServers) {
      fail(`local plugin.json still has mcpServers (${local}) — upgrade to 0.4.16+`);
      if (fix) stripSchemaWrite(local, SOT_PLUGIN_JSON);
    } else if (j?.version) {
      ok(`local plugin.json version=${j.version} (no $schema, no mcpServers)`);
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
    } else if (path.basename(file) === 'plugin.json' && j.mcpServers) {
      fail(`${rel}: has mcpServers (forbidden 0.4.16+)`);
      if (fix) stripSchemaWrite(file, SOT_PLUGIN_JSON);
    } else if (path.basename(file) === 'plugin.json') {
      ok(`clean plugin.json version=${j.version || '?'} @ ${rel}`);
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
  2. Confirm plugin shows 0.4.15 without "$schema" error
  3. /agentstack-diagnose
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
