/**
 * Cursor resolves Private / file:// marketplace plugins via `git rev-parse HEAD`.
 * ENOENT means the IDE cannot spawn `git` (not on PATH for the Cursor process).
 */
import { spawnSync } from 'node:child_process';

/** @returns {boolean} */
export function gitAvailableOnPath() {
  const cmd = process.platform === 'win32' ? 'git.exe' : 'git';
  const r = spawnSync(cmd, ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return r.status === 0;
}

/** @param {string} [repoDir] */
export function gitHeadResolvable(repoDir) {
  if (!repoDir) return null;
  const r = spawnSync('git', ['-C', repoDir, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (r.status === 0) return String(r.stdout || '').trim();
  return null;
}

export const CURSOR_GIT_ENOENT_HINT =
  'Error loading plugin: Failed to resolve git ref "HEAD" … spawn git ENOENT';

export function printGitEnoentRemediation() {
  const lines = [
    'Cursor could not run `git` (ENOENT). Private / file:// marketplace installs need Git on the **system** PATH visible to Cursor — not only your terminal.',
    '',
    'Fix A (recommended): remove the Private file:// marketplace entry in Cursor → Settings → Plugins.',
    '  Then add marketplace: https://github.com/agentstacktech/cursor-plugin',
    '  Or from this repo: node scripts/install-local.mjs --force → Developer: Reload Window',
    '',
    'Fix B: install Git for Windows, add `C:\\Program Files\\Git\\cmd` to **System** Environment PATH,',
    '  fully quit Cursor (tray exit), reopen. Ensure the plugin folder is a git clone (`git init` is not enough for some builds — prefer GitHub or install-local).',
  ];
  return lines.join('\n');
}
