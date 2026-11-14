#!/usr/bin/env node
/**
 * Install this plugin into Cursor's local plugin directory.
 *
 * Cursor rejects a junction whose real path is outside ~/.cursor/plugins/local
 * (`loadUserLocalPlugin … symlink target … is outside`), so the git checkout
 * cannot be linked directly. This copies the repo to
 * ~/.cursor/plugins/local/.agentstack-tree (dot-prefix: not scanned as a plugin)
 * and junctions ~/.cursor/plugins/local/agentstack at the copy's plugins/agentstack.
 * That real path stays inside plugins/local, and ../../../../scripts imports still resolve.
 *
 * Usage:
 *   node scripts/install-local.mjs
 *   node scripts/install-local.mjs --force
 *   node scripts/install-local.mjs --check
 *   node scripts/install-local.mjs --repair   # overlay copy + junction; no tree delete (Cursor lock-safe)
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PLUGIN_ROOT = path.join(REPO_ROOT, 'plugins', 'agentstack');
const LOCAL_ROOT = path.join(os.homedir(), '.cursor', 'plugins', 'local');
const TREE_PATH = path.join(LOCAL_ROOT, '.agentstack-tree');
const LINK_PATH = path.join(LOCAL_ROOT, 'agentstack');
const PLUGIN_IN_TREE = path.join(TREE_PATH, 'plugins', 'agentstack');
const maintainer = process.argv.includes('--maintainer');
const force = process.argv.includes('--force');
const checkOnly = process.argv.includes('--check');
const repair = process.argv.includes('--repair');
const MAINTAINER_ROOT = path.resolve(__dirname, '..', '..', 'cursor-plugin-maintainer');

function samePath(a, b) {
  const na = path.resolve(a).replace(/\\/g, '/').toLowerCase();
  const nb = path.resolve(b).replace(/\\/g, '/').toLowerCase();
  return na === nb;
}

function insideLocal(p) {
  const rel = path.relative(path.resolve(LOCAL_ROOT), path.resolve(p));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** True when Cursor's loadUserLocalPlugin will reject this entry. */
function cursorWouldReject(p) {
  try {
    const st = fs.lstatSync(p);
    if (!st.isSymbolicLink()) {
      const real = fs.realpathSync(p);
      return !samePath(real, p) && !insideLocal(real);
    }
    const real = fs.realpathSync(p);
    return !insideLocal(real);
  } catch {
    return false;
  }
}

function removePath(p) {
  let st;
  try {
    st = fs.lstatSync(p);
  } catch {
    return;
  }
  const linkLike = st.isSymbolicLink() || !samePath(fs.realpathSync(p), p);
  if (linkLike) {
    if (process.platform === 'win32') {
      const r = spawnSync('cmd.exe', ['/d', '/c', 'rmdir', p], { encoding: 'utf8' });
      if ((r.status ?? 1) !== 0 && fs.existsSync(p)) {
        throw new Error((r.stderr || r.stdout || 'rmdir junction failed').trim());
      }
    } else {
      fs.unlinkSync(p);
    }
    return;
  }
  fs.rmSync(p, { recursive: true, force: true });
}

function localCopyReady() {
  if (!fs.existsSync(path.join(LINK_PATH, '.cursor-plugin', 'plugin.json'))) return false;
  if (!fs.existsSync(path.join(LINK_PATH, 'mcp.json'))) return false;
  if (cursorWouldReject(LINK_PATH)) return false;
  const hook = path.join(TREE_PATH, 'scripts', 'lib', 'docAudienceInfer.mjs');
  return fs.existsSync(hook);
}

function copyRepoIntoTree() {
  fs.cpSync(REPO_ROOT, TREE_PATH, {
    recursive: true,
    dereference: true,
    filter: (src) => {
      const base = path.basename(src);
      return base !== '.git' && base !== 'node_modules';
    },
  });
  ensureGitHeadInTree();
}

function ensureLocalJunction() {
  if (fs.existsSync(LINK_PATH)) {
    try {
      if (!cursorWouldReject(LINK_PATH)) {
        const real = fs.realpathSync(LINK_PATH);
        if (samePath(real, path.resolve(PLUGIN_IN_TREE))) return;
      }
    } catch {
      /* recreate */
    }
    removePath(LINK_PATH);
  }
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(PLUGIN_IN_TREE, LINK_PATH, type);
  console.log('Installed (copy + in-folder junction — Cursor accepts this path)');
  console.log(`  ${LINK_PATH}`);
  console.log(`  → ${PLUGIN_IN_TREE}`);
}

/** Cursor resolves local marketplace plugins via `git rev-parse HEAD` — copy omits .git by design. */
function ensureGitHeadInTree() {
  const gitOpts = { encoding: 'utf8', shell: false };
  const head = spawnSync('git', ['-C', TREE_PATH, 'rev-parse', 'HEAD'], gitOpts);
  if (head.status === 0) return;
  const init = spawnSync('git', ['-C', TREE_PATH, 'init', '-b', 'main'], gitOpts);
  if ((init.status ?? 1) !== 0) {
    console.warn('WARN git init in local tree failed — Private file:// marketplace may still error');
    return;
  }
  spawnSync('git', ['-C', TREE_PATH, 'config', 'user.email', 'agentstack-local@agentstack.tech'], gitOpts);
  spawnSync('git', ['-C', TREE_PATH, 'config', 'user.name', 'AgentStack Local Install'], gitOpts);
  spawnSync('git', ['-C', TREE_PATH, 'add', '-A'], gitOpts);
  const commit = spawnSync(
    'git',
    ['-C', TREE_PATH, 'commit', '-m', 'AgentStack cursor-plugin local install', '--no-gpg-sign'],
    gitOpts,
  );
  if ((commit.status ?? 1) === 0) {
    console.log('OK   git HEAD in local tree (Cursor marketplace HEAD resolve)');
  } else {
    console.warn('WARN git commit in local tree failed:', (commit.stderr || commit.stdout || '').trim());
  }
}

function printStatus() {
  console.log('Plugin SoT:  ', PLUGIN_ROOT);
  console.log('Local tree:  ', TREE_PATH);
  console.log('Local entry: ', LINK_PATH);
  if (!fs.existsSync(LINK_PATH)) {
    console.log('Status:       NOT INSTALLED');
    return false;
  }
  if (cursorWouldReject(LINK_PATH)) {
    console.log('Status:       REJECTED (target is outside plugins/local — Cursor will not register MCP)');
    return false;
  }
  const ok = localCopyReady();
  console.log('Status:      ', ok ? 'OK (junction inside plugins/local)' : 'INCOMPLETE');
  return ok;
}

if (checkOnly) {
  process.exit(printStatus() ? 0 : 1);
}

fs.mkdirSync(LOCAL_ROOT, { recursive: true });

if (localCopyReady() && !force && !repair) {
  console.log('Already installed →', LINK_PATH);
  printStatus();
  process.exit(0);
}

if (!force && !repair && fs.existsSync(LINK_PATH) && !cursorWouldReject(LINK_PATH) && localCopyReady()) {
  console.error(`Refusing to overwrite existing ${LINK_PATH}`);
  console.error('Re-run with --force to replace.');
  process.exit(1);
}

if (force && !repair) {
  if (fs.existsSync(LINK_PATH)) removePath(LINK_PATH);
  if (fs.existsSync(TREE_PATH)) {
    try {
      fs.rmSync(TREE_PATH, { recursive: true, force: true });
    } catch (e) {
      console.error('FAIL could not remove local tree (close Cursor and retry, or use --repair)');
      console.error(String(e?.message || e));
      process.exit(1);
    }
  }
}

if (repair || (!force && fs.existsSync(TREE_PATH))) {
  if (fs.existsSync(LINK_PATH)) removePath(LINK_PATH);
  console.log(repair ? 'Repair: overlay copy into local tree (no delete)' : 'Refresh: overlay copy into existing tree');
  copyRepoIntoTree();
  ensureLocalJunction();
} else if (!fs.existsSync(TREE_PATH)) {
  copyRepoIntoTree();
  ensureLocalJunction();
} else if (!fs.existsSync(LINK_PATH)) {
  copyRepoIntoTree();
  ensureLocalJunction();
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

const refresh = spawnSync(process.execPath, ['scripts/refresh-cursor-runtime.mjs', '--fix'], {
  cwd: path.resolve(__dirname, '..'),
  encoding: 'utf8',
});
if (refresh.stdout) process.stdout.write(refresh.stdout);
if (refresh.stderr) process.stderr.write(refresh.stderr);
if ((refresh.status ?? 1) !== 0) {
  console.error('WARN refresh-cursor-runtime --fix failed — run manually before Reload Window');
} else {
  console.log('OK   Cursor runtime cache synced (refresh --fix)');
}

if (maintainer) {
  const agentsSrc = path.join(MAINTAINER_ROOT, 'agents');
  const agentsDest = path.join(LINK_PATH, 'agents');
  if (!fs.existsSync(agentsSrc)) {
    console.error('FAIL maintainer overlay missing:', agentsSrc);
    process.exit(1);
  }
  fs.mkdirSync(agentsDest, { recursive: true });
  for (const name of fs.readdirSync(agentsSrc)) {
    if (!name.endsWith('.md')) continue;
    fs.copyFileSync(path.join(agentsSrc, name), path.join(agentsDest, name));
  }
  console.log('OK   maintainer agents overlay copied');
}

console.log(`
Next steps:
  1. node scripts/refresh-cursor-runtime.mjs --fix
  2. Cursor → Developer: Reload Window
  3. Plugin MCP should appear — click Connect (or /agentstack-authorize)
  4. /agentstack-diagnose then /agentstack-capability-matrix

Uninstall: node scripts/uninstall-local.mjs
Verify:    node scripts/install-local.mjs --check
Runtime:   node scripts/refresh-cursor-runtime.mjs
`);
