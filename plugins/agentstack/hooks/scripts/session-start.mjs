#!/usr/bin/env node
// hooks/scripts/session-start.mjs
// sessionStart: lean mcp.json, refresh Bearer near expiry, keep capability snapshot fresh.
// Stdout must be a single JSON object (Cursor additional_context). Logs go to stderr.

import { readFile, writeFile, mkdir, chmod, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { writeTenantCapabilitySnapshot, CAPABILITY_SNAPSHOT_FILENAME } from '../../lib/plugin-kernel/mcpActionsCatalog.mjs';
import {
  applyAgentstackMcpBearer,
  agentstackAuthHeaders,
  normalizeAgentstackMcpConfig,
  decodeJwtPayload,
  describeAgentstackAuthGate,
  shouldAutoDeviceLogin,
  readPinnedTenantProjectId,
  AUTHORIZE_SLASH,
} from '../../lib/plugin-kernel/mcpConfig.mjs';
import {
  loadConfidentialClient,
  spawnDetachedDeviceCode,
  isDeviceLoginLockBusy,
} from '../../lib/plugin-kernel/deviceCodeClient.mjs';

const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const CLIENT_ID = 'cursor-plugin';
const CURSOR_DIR = join(homedir(), '.cursor');
const MCP_PATH = join(CURSOR_DIR, 'mcp.json');
const REFRESH_PATH = join(CURSOR_DIR, 'agentstack-refresh');
const REFRESH_BUFFER_SECONDS = 120;
const SNAPSHOT_PATH = join(CURSOR_DIR, CAPABILITY_SNAPSHOT_FILENAME);
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FROM_HOOK = process.argv.includes('--from-hook');
const AUTO_LOGIN_OFF = process.env.AGENTSTACK_DISABLE_AUTO_LOGIN === '1';

function log(msg) {
  process.stderr.write(`[agentstack] ${msg}\n`);
}

function emitSessionStart(parts) {
  const additional_context = parts.filter(Boolean).join('\n');
  const body = additional_context ? { additional_context } : {};
  process.stdout.write(`${JSON.stringify(body)}\n`);
}

async function readMcp() {
  try {
    return JSON.parse(await readFile(MCP_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function writeMcpFile(cfg) {
  await mkdir(CURSOR_DIR, { recursive: true });
  await writeFile(MCP_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

async function writeMcp(cfg, accessToken) {
  const pinned = await readPinnedTenantProjectId(CURSOR_DIR);
  applyAgentstackMcpBearer(cfg, { accessToken, baseUrl: BASE_URL, projectId: pinned });
  await writeMcpFile(cfg);
}

function parseRefreshFile(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed);
    return data.refresh_token || null;
  }
  return trimmed;
}

async function writeRefreshFile(data) {
  if (!data.refresh_token) return;
  await writeFile(REFRESH_PATH, JSON.stringify({
    refresh_token: data.refresh_token,
    scope: data.scope || null,
    token_type: data.token_type || 'Bearer',
    obtained_at: new Date().toISOString(),
  }, null, 2), 'utf8');
  try {
    await chmod(REFRESH_PATH, 0o600);
  } catch {
    /* Windows */
  }
}

async function refresh(refreshToken, traceId) {
  const { clientId, clientSecret } = await loadConfidentialClient({
    builtinClientId: CLIENT_ID,
  });
  const params = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  };
  if (clientSecret) params.client_secret = clientSecret;
  const res = await fetch(`${BASE_URL}/api/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Trace-Id': traceId },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`refresh failed: HTTP ${res.status} — ${body} (trace ${traceId})`);
  }
  return res.json();
}

async function maybeRefreshCapabilitySnapshot(authHeaders) {
  try {
    const st = await stat(SNAPSHOT_PATH);
    const ageMs = Date.now() - st.mtimeMs;
    if (ageMs < SNAPSHOT_MAX_AGE_MS) {
      try {
        const snap = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'));
        if (!Array.isArray(snap.actions)) {
          const n = await writeTenantCapabilitySnapshot(
            CURSOR_DIR,
            snap.catalog || snap.actions || snap,
          );
          log(`capability snapshot normalized (${n} actions)`);
          return;
        }
      } catch {
        /* refresh below */
      }
      log(`capability snapshot age=${Math.round(ageMs / 60000)}m (fresh)`);
      return;
    }
  } catch {
    /* missing */
  }
  try {
    const res = await fetch(`${BASE_URL}/mcp/actions`, { headers: authHeaders });
    if (!res.ok) return;
    const n = await writeTenantCapabilitySnapshot(CURSOR_DIR, await res.json());
    log(`capability snapshot refreshed (${n} actions)`);
  } catch {
    /* best effort */
  }
}

async function maybeRotateBearer(cfg) {
  const bearer = cfg?.mcpServers?.agentstack?.headers?.Authorization;
  if (!bearer || !bearer.startsWith('Bearer ')) return null;

  const token = bearer.slice('Bearer '.length).trim();
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;

  const secondsLeft = payload.exp - Math.floor(Date.now() / 1000);
  if (secondsLeft > REFRESH_BUFFER_SECONDS) return null;

  let refreshToken = null;
  try {
    refreshToken = parseRefreshFile(await readFile(REFRESH_PATH, 'utf8'));
  } catch {
    /* none */
  }

  if (!refreshToken) {
    log(`Bearer is near expiry and no refresh token is stored. Run ${AUTHORIZE_SLASH}.`);
    return `AgentStack Bearer is near expiry with no refresh token. Run ${AUTHORIZE_SLASH}.`;
  }

  try {
    const traceId = randomUUID();
    const data = await refresh(refreshToken, traceId);
    await writeMcp(cfg, data.access_token);
    await writeRefreshFile(data.refresh_token ? data : { ...data, refresh_token: refreshToken });
    log(`Bearer refreshed, expires in ${data.expires_in || '?'}s. trace=${traceId}`);
    return null;
  } catch (e) {
    log(`Refresh failed: ${e.message}. Run ${AUTHORIZE_SLASH}.`);
    return `AgentStack Bearer refresh failed. Run ${AUTHORIZE_SLASH}. (${e.message})`;
  }
}

async function maybeAutoDeviceLogin(gateKind) {
  if (!shouldAutoDeviceLogin(gateKind, { fromHook: FROM_HOOK, disable: AUTO_LOGIN_OFF })) {
    return null;
  }
  if (await isDeviceLoginLockBusy(CURSOR_DIR)) {
    log('auto Device Code skipped (lock busy)');
    return (
      'AgentStack Device Code is already waiting for Activate approval. ' +
      'Finish that tab, then Developer: Reload Window. Plugin MCP: click Connect; Device Code also writes user-agentstack.'
    );
  }
  const scriptsDir = dirname(fileURLToPath(import.meta.url));
  const pluginRoot = join(scriptsDir, '..', '..');
  const pid = spawnDetachedDeviceCode(join(scriptsDir, 'device-code.mjs'), ['--scope-preset=full'], {
    cwd: pluginRoot,
  });
  log(`auto Device Code spawned pid=${pid}`);
  return (
    'Opened AgentStack Activate in the browser (auto Device Code). Approve it, then ' +
    'Developer: Reload Window. Plugin MCP should appear — click Connect (G-A174), or use user-agentstack from ~/.cursor/mcp.json. ' +
    `If no tab opened, run ${AUTHORIZE_SLASH}. Free 1/1 keys: revoke an extra PAT at ` +
    'https://agentstack.tech/me/keys first. Set AGENTSTACK_DISABLE_AUTO_LOGIN=1 to skip auto-login.'
  );
}

async function main() {
  let cfg = await readMcp();
  if (cfg) {
    const pinned = await readPinnedTenantProjectId(CURSOR_DIR);
    const { cfg: normalized, changed } = normalizeAgentstackMcpConfig(cfg, {
      baseUrl: BASE_URL,
      projectId: pinned,
    });
    cfg = normalized;
    if (changed) {
      await writeMcpFile(cfg);
      log('mcp.json agentstack entry normalized (lean streamable-http)');
    }
  }

  const gate = describeAgentstackAuthGate(cfg);
  const extras = [];
  if (gate.additionalContext) extras.push(gate.additionalContext);
  const autoMsg = await maybeAutoDeviceLogin(gate.kind);
  if (autoMsg) extras.push(autoMsg);

  const authHeaders = agentstackAuthHeaders(cfg);
  if (authHeaders) {
    await maybeRefreshCapabilitySnapshot(authHeaders);
    const rotateMsg = await maybeRotateBearer(cfg);
    if (rotateMsg) extras.push(rotateMsg);
  }

  emitSessionStart(extras);
}

main().catch((e) => {
  log(`session-start hook error: ${e.message}`);
  emitSessionStart([
    `AgentStack session-start hook failed. Run ${AUTHORIZE_SLASH} or /agentstack-diagnose.`,
  ]);
});
