#!/usr/bin/env node
/**
 * Remove the local Cursor plugin link created by install-local.mjs.
 * Only removes ~/.cursor/plugins/local/agentstack (link/junction), never the SoT tree.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const LINK_PATH = path.join(os.homedir(), '.cursor', 'plugins', 'local', 'agentstack');

if (!fs.existsSync(LINK_PATH)) {
  console.log('Nothing to uninstall (no local agentstack link).');
  process.exit(0);
}

try {
  const st = fs.lstatSync(LINK_PATH);
  // Prefer removing the link/junction without deleting SoT contents
  if (st.isSymbolicLink() || process.platform === 'win32') {
    fs.rmSync(LINK_PATH, { recursive: true, force: true });
  } else if (st.isDirectory()) {
    console.error(`Refusing to delete real directory (not a link): ${LINK_PATH}`);
    console.error('Remove manually if this was a full copy install.');
    process.exit(1);
  } else {
    fs.unlinkSync(LINK_PATH);
  }
  console.log('Removed', LINK_PATH);
  console.log('Reload Cursor window to drop the local plugin.');
} catch (e) {
  console.error('Uninstall failed:', e.message);
  process.exit(1);
}
