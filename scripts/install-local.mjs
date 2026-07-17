#!/usr/bin/env node
/**
 * Install this plugin into Cursor's local plugin directory for live testing.
 *
 * Target: ~/.cursor/plugins/local/agentstack
 * Windows: directory junction (no admin). Unix: symlink.
 *
 * Usage:
 *   node scripts/install-local.mjs
 *   node scripts/install-local.mjs --force
 *   node scripts/install-local.mjs --check
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '..', 'plugins', 'agentstack');
const LOCAL_ROOT = path.join(os.homedir(), '.cursor', 'plugins', 'local');
const LINK_PATH = path.join(LOCAL_ROOT, 'agentstack');
const force = process.argv.includes('--force');
const checkOnly = process.argv.includes('--check');

function resolveLinkTarget(p) {
  try {
    if (!fs.existsSync(p)) return null;
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) return path.resolve(path.dirname(p), fs.readlinkSync(p));
    // Junctions on Windows often appear as directories; readlink still works for junctions
    try {
      return path.resolve(path.dirname(p), fs.readlinkSync(p));
    } catch {
      return path.resolve(p);
    }
  } catch {
    return null;
  }
}

function samePath(a, b) {
  const na = path.resolve(a).replace(/\\/g, '/').toLowerCase();
  const nb = path.resolve(b).replace(/\\/g, '/').toLowerCase();
  return na === nb;
}

function printStatus() {
  const target = resolveLinkTarget(LINK_PATH);
  console.log('Plugin SoT:  ', PLUGIN_ROOT);
  console.log('Local link:  ', LINK_PATH);
  if (!fs.existsSync(LINK_PATH)) {
    console.log('Status:       NOT INSTALLED');
    return false;
  }
  console.log('Points to:   ', target || '(unresolved)');
  const ok = target && samePath(target, PLUGIN_ROOT);
  console.log('Status:      ', ok ? 'OK (linked to this tree)' : 'MISMATCH / foreign install');
  return ok;
}

if (checkOnly) {
  process.exit(printStatus() ? 0 : 1);
}

fs.mkdirSync(LOCAL_ROOT, { recursive: true });

if (fs.existsSync(LINK_PATH)) {
  const current = resolveLinkTarget(LINK_PATH);
  if (current && samePath(current, PLUGIN_ROOT) && !force) {
    console.log('Already installed →', LINK_PATH);
    printStatus();
  } else if (!force) {
    console.error(`Refusing to overwrite existing ${LINK_PATH}`);
    console.error(`  current → ${current || '(unknown)'}`);
    console.error('Re-run with --force to replace.');
    process.exit(1);
  } else {
    fs.rmSync(LINK_PATH, { recursive: true, force: true });
  }
}

if (!fs.existsSync(LINK_PATH)) {
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(PLUGIN_ROOT, LINK_PATH, type);
  console.log(`Installed (${type})`);
  console.log(`  ${LINK_PATH}`);
  console.log(`  → ${PLUGIN_ROOT}`);
}

// Post-install smoke from the linked path (what Cursor will load)
const help = spawnSync(
  process.execPath,
  [path.join(LINK_PATH, 'hooks/scripts/device-code.mjs'), '--help'],
  { encoding: 'utf8' },
);
if (help.status !== 0 || !/Usage:/.test(help.stdout || '')) {
  console.error('FAIL post-install: device-code --help via link');
  console.error(help.stderr || help.stdout);
  process.exit(1);
}
console.log('OK   device-code --help via local link');

const kernel = path.join(LINK_PATH, 'lib/plugin-kernel/deviceCodeClient.mjs');
if (!fs.existsSync(kernel)) {
  console.error('FAIL missing vendored kernel at', kernel);
  process.exit(1);
}
console.log('OK   lib/plugin-kernel present via link');

console.log(`
Next steps:
  1. Cursor → Developer: Reload Window
  2. Chat: /agentstack-init  (Node must be on PATH)
  3. Approve at https://agentstack.tech/activate
  4. /agentstack-diagnose then /agentstack-capability-matrix

Uninstall: node scripts/uninstall-local.mjs
Verify:    node scripts/install-local.mjs --check
`);
