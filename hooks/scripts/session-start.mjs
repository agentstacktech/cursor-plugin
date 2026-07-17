#!/usr/bin/env node
// hooks/scripts/session-start.mjs
// Runs at Cursor sessionStart.
// Refreshes the Bearer if it is < REFRESH_BUFFER_SECONDS from expiry.
// If refresh fails, prints a hint to run /agentstack-login.

import { readFile, writeFile, mkdir, chmod, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const CLIENT_ID = 'cursor-plugin';
const CURSOR_DIR = join(homedir(), '.cursor');
const MCP_PATH = join(CURSOR_DIR, 'mcp.json');
const REFRESH_PATH = join(CURSOR_DIR, 'agentstack-refresh');
const REFRESH_BUFFER_SECONDS = 120;
const SNAPSHOT_PATH = join(CURSOR_DIR, 'agentstack-capabilities.json');
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const pad = '='.repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch { return null; }
}

async function readMcp() {
  try { return JSON.parse(await readFile(MCP_PATH, 'utf8')); } catch { return null; }
}

async function writeMcp(cfg, accessToken) {
  cfg.mcpServers = cfg.mcpServers || {};
  cfg.mcpServers.agentstack = cfg.mcpServers.agentstack || {
    type: 'streamable-http',
    url: `${BASE_URL}/mcp`,
  };
  cfg.mcpServers.agentstack.headers = cfg.mcpServers.agentstack.headers || {};
  cfg.mcpServers.agentstack.headers['Authorization'] = `Bearer ${accessToken}`;
  delete cfg.mcpServers.agentstack.headers['X-API-Key'];
  await mkdir(CURSOR_DIR, { recursive: true });
  await writeFile(MCP_PATH, JSON.stringify(cfg, null, 2), 'utf8');
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
  try { await chmod(REFRESH_PATH, 0o600); } catch { /* Windows: ignore */ }
}

async function refresh(refreshToken, traceId) {
  const res = await fetch(`${BASE_URL}/api/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Trace-Id': traceId },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`refresh failed: HTTP ${res.status} — ${body} (trace ${traceId})`);
  }
  return res.json();
}

async function maybeRefreshCapabilitySnapshot(authHeader) {
  let ageMs = null;
  try {
    const st = await stat(SNAPSHOT_PATH);
    ageMs = Date.now() - st.mtimeMs;
    if (ageMs < SNAPSHOT_MAX_AGE_MS) {
      console.log(`[agentstack] capability snapshot age=${Math.round(ageMs / 60000)}m (fresh)`);
      return;
    }
  } catch { /* missing or stale */ }
  try {
    const res = await fetch(`${BASE_URL}/mcp/actions`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return;
    const actions = await res.json();
    await mkdir(CURSOR_DIR, { recursive: true });
    await writeFile(SNAPSHOT_PATH, JSON.stringify({ fetched_at: Date.now(), actions }, null, 2), 'utf8');
    console.log('[agentstack] capability snapshot refreshed');
  } catch { /* best effort */ }
}

async function main() {
  const cfg = await readMcp();
  const auth = cfg?.mcpServers?.agentstack?.headers?.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return; // X-API-Key fallback or not installed — nothing to refresh.

  await maybeRefreshCapabilitySnapshot(auth);

  const token = auth.slice('Bearer '.length).trim();
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return;

  const secondsLeft = payload.exp - Math.floor(Date.now() / 1000);
  if (secondsLeft > REFRESH_BUFFER_SECONDS) return; // still fresh

  let refreshToken = null;
  try { refreshToken = parseRefreshFile(await readFile(REFRESH_PATH, 'utf8')); } catch { /* no refresh token */ }

  if (!refreshToken) {
    console.warn('[agentstack] Bearer is near expiry and no refresh token is stored. Run /agentstack-login.');
    return;
  }

  try {
    const traceId = randomUUID();
    const data = await refresh(refreshToken, traceId);
    await writeMcp(cfg, data.access_token);
    await writeRefreshFile(data.refresh_token ? data : { ...data, refresh_token: refreshToken });
    console.log('[agentstack] Bearer refreshed, expires in ' + (data.expires_in || '?') + 's. trace=' + traceId);
  } catch (e) {
    console.warn('[agentstack] Refresh failed: ' + e.message + '. Run /agentstack-login.');
  }
}

main().catch(e => {
  console.warn('[agentstack] session-start hook error: ' + e.message);
});
