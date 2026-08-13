/**
 * RFC 8628 device code poll helpers (shared across plugins).
 * @see repo.plugins.oauth_device_code.gen1
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

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
    throw new Error(json.error_description || json.error || `HTTP ${res.status}`);
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
