#!/usr/bin/env node
/**
 * Remove the local Cursor plugin copy created by install-local.mjs.
 * Only removes ~/.cursor/plugins/local/agentstack. Junctions are removed with
 * rmdir (no /s) so the git tree is never deleted.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'node:child_process';

const LOCAL_ROOT = path.join(os.homedir(), '.cursor', 'plugins', 'local');
const LINK_PATH = path.join(LOCAL_ROOT, 'agentstack');
const TREE_PATH = path.join(LOCAL_ROOT, '.agentstack-tree');

if (!fs.existsSync(LINK_PATH)) {
  console.log('Nothing to uninstall (no local agentstack link).');
  process.exit(0);
}

try {
  const st = fs.lstatSync(LINK_PATH);
  const real = fs.realpathSync(LINK_PATH);
  const linkLike = st.isSymbolicLink() || path.resolve(real).toLowerCase() !== path.resolve(LINK_PATH).toLowerCase();
  if (linkLike && process.platform === 'win32') {
    const r = spawnSync('cmd.exe', ['/d', '/c', 'rmdir', LINK_PATH], { encoding: 'utf8' });
    if ((r.status ?? 1) !== 0) {
      console.error((r.stderr || r.stdout || 'rmdir failed').trim());
      process.exit(1);
    }
  } else if (linkLike) {
    fs.unlinkSync(LINK_PATH);
  } else {
    fs.rmSync(LINK_PATH, { recursive: true, force: true });
  }
  console.log('Removed', LINK_PATH);
  if (fs.existsSync(TREE_PATH)) {
    const st = fs.lstatSync(TREE_PATH);
    if (!st.isSymbolicLink()) fs.rmSync(TREE_PATH, { recursive: true, force: true });
    console.log('Removed', TREE_PATH);
  }
  console.log('Reload Cursor window to drop the local plugin.');
} catch (e) {
  console.error('Uninstall failed:', e.message);
  process.exit(1);
}
