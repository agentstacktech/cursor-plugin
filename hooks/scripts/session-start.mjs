#!/usr/bin/env node
// hooks/scripts/session-start.mjs
// Runs at Cursor sessionStart.
// Refreshes the Bearer if it is < REFRESH_BUFFER_SECONDS from expiry.
// If refresh fails, prints a hint to run /agentstack-login.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const CLIENT_ID = 'cursor-plugin';
const CURSOR_DIR = join(homedir(), '.cursor');
const MCP_PATH = join(CURSOR_DIR, 'mcp.json');
const REFRESH_PATH = join(CURSOR_DIR, 'agentstack-refresh');
const REFRESH_BUFFER_SECONDS = 120;

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
  cfg.mcpServers.agentstack = cfg.mcpServers.agentstack || { type: 'streamable-http', url: `${BASE_URL}/mcp`, tools: { enabled: true, autoDiscover: true } };
  cfg.mcpServers.agentstack.headers = cfg.mcpServers.agentstack.headers || {};
  cfg.mcpServers.agentstack.headers['Authorization'] = `Bearer ${accessToken}`;
  await mkdir(CURSOR_DIR, { recursive: true });
  await writeFile(MCP_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

async function refresh(refreshToken) {
  const res = await fetch(`${BASE_URL}/api/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`refresh failed: HTTP ${res.status} — ${body}`);
  }
  return res.json();
}

async function main() {
  const cfg = await readMcp();
  const auth = cfg?.mcpServers?.agentstack?.headers?.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return; // X-API-Key fallback or not installed — nothing to refresh.

  const token = auth.slice('Bearer '.length).trim();
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return;

  const secondsLeft = payload.exp - Math.floor(Date.now() / 1000);
  if (secondsLeft > REFRESH_BUFFER_SECONDS) return; // still fresh

  let refreshToken = null;
  try { refreshToken = (await readFile(REFRESH_PATH, 'utf8')).trim(); } catch { /* no refresh token */ }

  if (!refreshToken) {
    console.warn('[agentstack] Bearer is near expiry and no refresh token is stored. Run /agentstack-login.');
    return;
  }

  try {
    const data = await refresh(refreshToken);
    await writeMcp(cfg, data.access_token);
    if (data.refresh_token) {
      await writeFile(REFRESH_PATH, data.refresh_token, 'utf8');
    }
    console.log('[agentstack] Bearer refreshed, expires in ' + (data.expires_in || '?') + 's.');
  } catch (e) {
    console.warn('[agentstack] Refresh failed: ' + e.message + '. Run /agentstack-login.');
  }
}

main().catch(e => {
  console.warn('[agentstack] session-start hook error: ' + e.message);
});
