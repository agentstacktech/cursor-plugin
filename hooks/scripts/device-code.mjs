#!/usr/bin/env node
// hooks/scripts/device-code.mjs
// RFC 8628 OAuth 2.1 Device Authorization Grant for cursor-plugin.
// The user never copies the API key manually — approval happens in the browser.

import { writeFile, readFile, mkdir, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { exec } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pollDeviceToken } from '../../../shared/plugin-kernel/deviceCodeClient.mjs';

const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const CLIENT_ID = 'cursor-plugin';
const DEFAULT_SCOPES = [
  'mcp:execute',
  'projects:read', 'projects:write',
  '8dna:read', '8dna:write',
  'logic:write', 'logic:dry_run',
  'rag:read', 'rag:write',
  'storage:read', 'storage:write',
  'agents:run',
  'support:read',
  'buffs:read',
  'apikeys:write',
].join(' ');
const SCOPE_PRESETS = {
  readonly: ['mcp:execute', 'projects:read', '8dna:read', 'rag:read', 'storage:read', 'buffs:read'].join(' '),
  builder: ['mcp:execute', 'projects:read', 'projects:write', '8dna:read', '8dna:write', 'logic:write', 'logic:dry_run', 'rag:read', 'rag:write', 'storage:read', 'storage:write'].join(' '),
  full: DEFAULT_SCOPES,
};

const CURSOR_DIR = join(homedir(), '.cursor');
const MCP_PATH = join(CURSOR_DIR, 'mcp.json');
const REFRESH_PATH = join(CURSOR_DIR, 'agentstack-refresh');

function parseArgs(argv) {
  const out = { scopes: DEFAULT_SCOPES };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--scopes=')) out.scopes = a.slice('--scopes='.length).replace(/^"|"$/g, '');
    else if (a.startsWith('--scope-preset=')) {
      const preset = a.slice('--scope-preset='.length);
      if (!SCOPE_PRESETS[preset]) throw new Error(`Unknown scope preset "${preset}". Use readonly, builder, or full.`);
      out.scopes = SCOPE_PRESETS[preset];
    }
    else if (a === '--headless') out.headless = true;
  }
  return out;
}

async function openBrowser(url) {
  const cmd = platform() === 'win32' ? `start "" "${url}"` : platform() === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  try { exec(cmd); } catch { /* best effort */ }
}

async function authorize(scopes, traceId) {
  const res = await fetch(`${BASE_URL}/api/oauth2/device/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Trace-Id': traceId },
    body: new URLSearchParams({ client_id: CLIENT_ID, scope: scopes }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`device/authorize failed: HTTP ${res.status} — ${body} (trace ${traceId})`);
  }
  return res.json();
}

async function pollToken({ device_code, interval, expires_in }, traceId) {
  return pollDeviceToken({
    tokenUrl: `${BASE_URL}/api/oauth2/token`,
    clientId: CLIENT_ID,
    deviceCode: device_code,
    intervalSec: interval,
    expiresInSec: expires_in,
    traceId,
  });
}

async function writeMcpJson(accessToken) {
  let cfg = {};
  try { cfg = JSON.parse(await readFile(MCP_PATH, 'utf8')); } catch { /* first install */ }
  cfg.mcpServers = cfg.mcpServers || {};
  const existing = cfg.mcpServers.agentstack || {};
  cfg.mcpServers.agentstack = {
    ...existing,
    type: 'streamable-http',
    url: `${BASE_URL}/mcp`,
    headers: {
      ...(existing.headers || {}),
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    tools: { enabled: true, autoDiscover: true },
  };
  // Remove the manual fallback header if present, primary is now Bearer.
  if (cfg.mcpServers.agentstack.headers['X-API-Key']) {
    delete cfg.mcpServers.agentstack.headers['X-API-Key'];
  }
  await mkdir(CURSOR_DIR, { recursive: true });
  await writeFile(MCP_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

async function writeRefreshToken(refreshToken, token) {
  if (!refreshToken) return;
  // Best-effort fallback: local-only metadata file with restrictive perms.
  // Integrations that can use OS keyring should override this path.
  await mkdir(CURSOR_DIR, { recursive: true });
  await writeFile(REFRESH_PATH, JSON.stringify({
    refresh_token: refreshToken,
    scope: token.scope || null,
    token_type: token.token_type || 'Bearer',
    obtained_at: new Date().toISOString(),
  }, null, 2), 'utf8');
  try { await chmod(REFRESH_PATH, 0o600); } catch { /* Windows: ignore */ }
}

async function clearMcpCache(accessToken, traceId) {
  try {
    await fetch(`${BASE_URL}/mcp/cache/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Trace-Id': traceId },
    });
  } catch { /* best effort */ }
}

async function main() {
  const { scopes, headless } = parseArgs(process.argv);
  const traceId = randomUUID();

  console.log('\nRequesting device code from AgentStack...');
  console.log('  Trace: ' + traceId);
  const init = await authorize(scopes, traceId);

  console.log('\n  Open: ' + (init.verification_uri_complete || init.verification_uri));
  console.log('  Code: ' + init.user_code + '\n');
  console.log('  (Waiting for approval — this will return automatically.)\n');

  if (!headless) await openBrowser(init.verification_uri_complete || init.verification_uri);

  const token = await pollToken(init, traceId);

  await writeMcpJson(token.access_token);
  await writeRefreshToken(token.refresh_token, token);
  await clearMcpCache(token.access_token, traceId);

  const scope = token.scope || scopes;
  const expiresIn = token.expires_in || 'unknown';
  console.log(`\n  AgentStack MCP connected.`);
  console.log(`  Scope:   ${scope}`);
  console.log(`  Trace:   ${traceId}`);
  console.log(`  Expires: in ${expiresIn}s (hook 'session-start.mjs' refreshes automatically)`);
  console.log(`  Config:  ${MCP_PATH}\n`);
  console.log('  Restart Cursor if the MCP server does not auto-reload.\n');
}

main().catch(err => {
  console.error('\nAgentStack device code flow failed:\n  ' + err.message);
  console.error('\nFallback: follow the manual X-API-Key instructions in MCP_QUICKSTART.md.\n');
  process.exit(1);
});
