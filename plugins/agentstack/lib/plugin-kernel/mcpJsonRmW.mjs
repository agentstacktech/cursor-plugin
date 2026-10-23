/**
 * Serialized read-modify-write for ~/.cursor/mcp.json (device-code vs session-start).
 * Gene: repo.plugins.cursor.gen3 · repo.plugins.oauth_device_code.gen1
 */

import { readFile, writeFile, mkdir, open, unlink } from 'node:fs/promises';
import { join } from 'node:path';

export const MCP_JSON_LOCK_FILE = 'agentstack-mcp.lock';
const LOCK_STALE_MS = 2 * 60 * 1000;

function pidAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

async function readLock(cursorDir) {
  try {
    return JSON.parse(await readFile(join(cursorDir, MCP_JSON_LOCK_FILE), 'utf8'));
  } catch {
    return null;
  }
}

async function acquireLock(cursorDir, pid = process.pid) {
  const lockPath = join(cursorDir, MCP_JSON_LOCK_FILE);
  await mkdir(cursorDir, { recursive: true });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const fh = await open(lockPath, 'wx');
      const rec = { pid, started_at: new Date().toISOString() };
      await fh.writeFile(JSON.stringify(rec), 'utf8');
      await fh.close();
      return true;
    } catch (err) {
      if (err?.code !== 'EEXIST') throw err;
      const existing = await readLock(cursorDir);
      const started = Date.parse(existing?.started_at || '') || 0;
      const stale = !existing || Date.now() - started > LOCK_STALE_MS || !pidAlive(existing?.pid);
      if (stale) {
        try {
          await unlink(lockPath);
        } catch {
          /* race */
        }
        continue;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  return false;
}

async function releaseLock(cursorDir, pid = process.pid) {
  const existing = await readLock(cursorDir);
  if (existing && Number(existing.pid) !== Number(pid)) return;
  try {
    await unlink(join(cursorDir, MCP_JSON_LOCK_FILE));
  } catch {
    /* gone */
  }
}

/**
 * @param {string} cursorDir
 * @param {(cfg: object) => object|Promise<object>} mutate
 * @returns {Promise<object>}
 */
export async function withMcpJsonRmW(cursorDir, mutate) {
  const mcpPath = join(cursorDir, 'mcp.json');
  const ok = await acquireLock(cursorDir);
  if (!ok) {
    throw new Error('agentstack-mcp.lock busy — retry after Device Code or session-start finishes');
  }
  try {
    let cfg = {};
    try {
      cfg = JSON.parse(await readFile(mcpPath, 'utf8'));
    } catch {
      cfg = {};
    }
    const next = await mutate(cfg);
    await mkdir(cursorDir, { recursive: true });
    await writeFile(mcpPath, JSON.stringify(next, null, 2), 'utf8');
    return next;
  } finally {
    await releaseLock(cursorDir);
  }
}
