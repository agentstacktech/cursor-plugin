#!/usr/bin/env node
// hooks/scripts/device-code.mjs
// RFC 8628 OAuth 2.1 Device Authorization Grant for cursor-plugin.

import { writeFile, readFile, mkdir, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { exec } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pollDeviceToken } from '../../lib/plugin-kernel/deviceCodeClient.mjs';
import { flattenMcpActionsCatalog } from '../../lib/plugin-kernel/mcpActionsCatalog.mjs';
import { applyAgentstackMcpBearer } from '../../lib/plugin-kernel/mcpConfig.mjs';

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
const SNAPSHOT_PATH = join(CURSOR_DIR, 'agentstack-capabilities.json');

function parseArgs(argv) {
  const out = { scopes: DEFAULT_SCOPES };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--scopes=')) out.scopes = a.slice('--scopes='.length).replace(/^"|"$/g, '');
    else if (a.startsWith('--scope-preset=')) {
      const preset = a.slice('--scope-preset='.length);
      if (!SCOPE_PRESETS[preset]) throw new Error(`Unknown scope preset "${preset}". Use readonly, builder, or full.`);
      out.scopes = SCOPE_PRESETS[preset];
    } else if (a === '--headless') out.headless = true;
  }
  return out;
}

function printHelp() {
  console.log(`Usage: node hooks/scripts/device-code.mjs [options]

RFC 8628 Device Code login for AgentStack Cursor plugin.

Options:
  --help                 Show this help and exit 0
  --headless             Do not open a browser
  --scope-preset=NAME    readonly | builder | full (default)
  --scopes="a b c"       Explicit space-separated scopes

Env:
  AGENTSTACK_BASE_URL    Default https://agentstack.tech

Writes:
  ~/.cursor/mcp.json              Bearer for mcpServers.agentstack
  ~/.cursor/agentstack-refresh    Refresh token (0600 when supported)
  ~/.cursor/agentstack-capabilities.json  Flat action snapshot
`);
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
  applyAgentstackMcpBearer(cfg, { accessToken, baseUrl: BASE_URL });
  await mkdir(CURSOR_DIR, { recursive: true });
  await writeFile(MCP_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

async function writeRefreshToken(refreshToken, token) {
  if (!refreshToken) return;
  await mkdir(CURSOR_DIR, { recursive: true });
  await writeFile(REFRESH_PATH, JSON.stringify({
    refresh_token: refreshToken,
    scope: token.scope || null,
    token_type: token.token_type || 'Bearer',
    obtained_at: new Date().toISOString(),
  }, null, 2), 'utf8');
  try { await chmod(REFRESH_PATH, 0o600); } catch { /* Windows */ }
}

async function clearMcpCache(accessToken, traceId) {
  try {
    await fetch(`${BASE_URL}/mcp/cache/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Trace-Id': traceId },
    });
  } catch { /* best effort */ }
}

async function seedCapabilitySnapshot(accessToken) {
  try {
    const res = await fetch(`${BASE_URL}/mcp/actions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return;
    const catalog = await res.json();
    const actions = flattenMcpActionsCatalog(catalog);
    await mkdir(CURSOR_DIR, { recursive: true });
    await writeFile(
      SNAPSHOT_PATH,
      JSON.stringify({
        fetched_at: Date.now(),
        total_actions: catalog.total_actions || actions.length,
        actions,
      }, null, 2),
      'utf8',
    );
  } catch { /* next sessionStart */ }
}

async function main() {
  const { scopes, headless, help } = parseArgs(process.argv);
  if (help) {
    printHelp();
    process.exit(0);
  }

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
  await seedCapabilitySnapshot(token.access_token);

  const scope = token.scope || scopes;
  const expiresIn = token.expires_in || 'unknown';
  console.log(`\n  AgentStack MCP connected.`);
  console.log(`  Scope:   ${scope}`);
  console.log(`  Trace:   ${traceId}`);
  console.log(`  Expires: in ${expiresIn}s (hook 'session-start.mjs' refreshes automatically)`);
  console.log(`  Config:  ${MCP_PATH}\n`);
  console.log('  Next: whoami smoke + /agentstack-capability-matrix (see /agentstack-init).\n');
  console.log('  Restart Cursor if the MCP server does not auto-reload.\n');
}

main().catch((err) => {
  console.error('\nAgentStack device code flow failed:\n  ' + err.message);
  console.error('\nFallback: follow the manual X-API-Key instructions in MCP_QUICKSTART.md.\n');
  process.exit(1);
});
