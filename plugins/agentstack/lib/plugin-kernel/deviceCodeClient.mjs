/**
 * RFC 8628 device code poll helpers (shared across plugins).
 * @see repo.plugins.oauth_device_code.gen1
 */

import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';

const DEFAULT_CLIENT_ID = 'cursor-plugin';

/**
 * OAuth client for Device Code + refresh.
 * Default: public builtin `cursor-plugin` (no secret, RFC 8628).
 * Confidential override: env `AGENTSTACK_OAUTH_CLIENT_ID` + `AGENTSTACK_OAUTH_CLIENT_SECRET`.
 * Legacy DCR json: only when `AGENTSTACK_OAUTH_USE_DCR=1`.
 *
 * @param {{ cursorDir?: string, builtinClientId?: string }} [opts]
 * @returns {Promise<{ clientId: string, clientSecret: string|null, source: string }>}
 */
export async function loadConfidentialClient({
  cursorDir = join(homedir(), '.cursor'),
  builtinClientId = DEFAULT_CLIENT_ID,
} = {}) {
  const fromEnvId = process.env.AGENTSTACK_OAUTH_CLIENT_ID;
  const fromEnvSecret = process.env.AGENTSTACK_OAUTH_CLIENT_SECRET;
  if (fromEnvId && fromEnvSecret) {
    return { clientId: fromEnvId, clientSecret: fromEnvSecret, source: 'env' };
  }
  if (process.env.AGENTSTACK_OAUTH_USE_DCR === '1') {
    try {
      const raw = await readFile(join(cursorDir, 'agentstack-oauth-client.json'), 'utf8');
      const j = JSON.parse(raw);
      if (j.client_id && j.client_secret) {
        return {
          clientId: j.client_id,
          clientSecret: j.client_secret,
          source: 'agentstack-oauth-client.json',
        };
      }
    } catch {
      /* optional */
    }
  }
  return {
    clientId: builtinClientId,
    clientSecret: fromEnvSecret || null,
    source: 'builtin',
  };
}

/** Human-facing approve URL (SPA /activate — not POST /api/oauth2/device/verify). */
export function deviceCodeActivateUrl(baseUrl, userCode) {
  const code = String(userCode || '').trim();
  const base = String(baseUrl || 'https://agentstack.tech').replace(/\/$/, '');
  return `${base}/activate?user_code=${encodeURIComponent(code)}`;
}

/**
 * POST application/x-www-form-urlencoded.
 * OAuth token endpoints often return HTTP 400 with `{ error: "authorization_pending" }` —
 * those bodies are returned (not thrown) so the poller can continue.
 */
export async function postForm(url, params, traceId = '') {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(traceId ? { 'X-Trace-Id': traceId } : {}),
    },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (json && typeof json.error === 'string') {
      return json;
    }
    const detail = json.detail ?? json.error_description ?? json.error;
    throw new Error(
      detail
        ? `${typeof detail === 'string' ? detail : JSON.stringify(detail)} (HTTP ${res.status})`
        : `HTTP ${res.status}`,
    );
  }
  return json;
}

export async function pollDeviceToken({
  tokenUrl,
  clientId,
  deviceCode,
  intervalSec = 5,
  expiresInSec = 600,
  traceId = '',
  clientSecret = null,
}) {
  const deadline = Date.now() + expiresInSec * 1000;
  // Prod oauth2_token RL is 5 req/min per IP — stay under that even when server interval=5.
  let waitMs = Math.max(12000, intervalSec * 1000);

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, waitMs));
    const params = {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode,
      client_id: clientId,
    };
    if (clientSecret) params.client_secret = clientSecret;
    let token;
    try {
      token = await postForm(tokenUrl, params, traceId);
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.includes('HTTP 429')) {
        waitMs = Math.min(waitMs + 5000, 30000);
        continue;
      }
      throw err;
    }
    if (token.access_token) return token;
    if (token.error === 'authorization_pending') continue;
    if (token.error === 'slow_down') {
      waitMs = Math.min(waitMs + 5000, 30000);
      continue;
    }
    throw new Error(token.error_description || token.error || 'Device authorization failed');
  }
  throw new Error('Device code expired');
}

export const DEVICE_LOGIN_LOCK_FILE = 'agentstack-device.lock';
const DEVICE_LOCK_STALE_MS = 15 * 60 * 1000;

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

/**
 * @param {string} cursorDir
 * @returns {Promise<object|null>}
 */
export async function readDeviceLoginLock(cursorDir) {
  try {
    return JSON.parse(await readFile(join(cursorDir, DEVICE_LOGIN_LOCK_FILE), 'utf8'));
  } catch {
    return null;
  }
}

/** True when a Device Code poller is still alive (sessionStart must not spawn another). */
export async function isDeviceLoginLockBusy(cursorDir) {
  const existing = await readDeviceLoginLock(cursorDir);
  if (!existing) return false;
  const started = Date.parse(existing.started_at || '') || 0;
  const fresh = Date.now() - started < DEVICE_LOCK_STALE_MS;
  return pidAlive(existing.pid) && fresh;
}

/**
 * Patch lock fields (user_code / Activate URL) after device/authorize.
 * @param {string} cursorDir
 * @param {object} patch
 */
export async function updateDeviceLoginLock(cursorDir, patch) {
  const existing = (await readDeviceLoginLock(cursorDir)) || {};
  await mkdir(cursorDir, { recursive: true });
  await writeFile(
    join(cursorDir, DEVICE_LOGIN_LOCK_FILE),
    JSON.stringify({ ...existing, ...patch }),
    'utf8',
  );
}

/**
 * Single-flight lock so sessionStart does not spawn overlapping Device Code polls.
 * @param {string} cursorDir
 * @param {number} [pid]
 * @returns {Promise<{ ok: true, rec: object } | { ok: false, existing: object }>}
 */
export async function beginDeviceLoginLock(cursorDir, pid = process.pid) {
  if (await isDeviceLoginLockBusy(cursorDir)) {
    return { ok: false, existing: await readDeviceLoginLock(cursorDir) };
  }
  const rec = { pid, started_at: new Date().toISOString() };
  await mkdir(cursorDir, { recursive: true });
  await writeFile(join(cursorDir, DEVICE_LOGIN_LOCK_FILE), JSON.stringify(rec), 'utf8');
  return { ok: true, rec };
}

/**
 * @param {string} cursorDir
 * @param {number} [pid]
 */
export async function endDeviceLoginLock(cursorDir, pid = process.pid) {
  const existing = await readDeviceLoginLock(cursorDir);
  if (existing && Number(existing.pid) !== Number(pid)) return;
  try {
    await unlink(join(cursorDir, DEVICE_LOGIN_LOCK_FILE));
  } catch {
    /* gone */
  }
}

/**
 * Fire-and-forget Device Code poller (sessionStart). ESM imports resolve from the script path.
 * @param {string} scriptPath
 * @param {string[]} [args]
 * @param {{ cwd?: string }} [opts]
 * @returns {number|undefined} child pid
 */
export function spawnDetachedDeviceCode(scriptPath, args = ['--scope-preset=full'], { cwd } = {}) {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: process.env,
  });
  child.unref();
  return child.pid;
}
