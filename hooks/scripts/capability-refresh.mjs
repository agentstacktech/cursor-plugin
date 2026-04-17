#!/usr/bin/env node
// hooks/scripts/capability-refresh.mjs
// After an edit of mcp.json (auth change, endpoint change), force the MCP
// discovery cache to clear so the agent sees the correct tool set.
// Also updates a local snapshot at ~/.cursor/agentstack-capabilities.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const CURSOR_DIR = join(homedir(), '.cursor');
const MCP_PATH = join(CURSOR_DIR, 'mcp.json');
const SNAPSHOT_PATH = join(CURSOR_DIR, 'agentstack-capabilities.json');

async function getAuthHeader() {
  try {
    const cfg = JSON.parse(await readFile(MCP_PATH, 'utf8'));
    const h = cfg?.mcpServers?.agentstack?.headers || {};
    if (h.Authorization) return { Authorization: h.Authorization };
    if (h['X-API-Key']) return { 'X-API-Key': h['X-API-Key'] };
  } catch {}
  return null;
}

async function main() {
  const auth = await getAuthHeader();
  if (!auth) return; // not configured yet

  try {
    await fetch(`${BASE_URL}/mcp/cache/clear`, { method: 'POST', headers: { ...auth } });
  } catch { /* best effort */ }

  try {
    const res = await fetch(`${BASE_URL}/mcp/actions`, { headers: { ...auth } });
    if (!res.ok) return;
    const actions = await res.json();
    await mkdir(CURSOR_DIR, { recursive: true });
    await writeFile(SNAPSHOT_PATH, JSON.stringify({ fetched_at: Date.now(), actions }, null, 2), 'utf8');
  } catch { /* next time */ }
}

main().catch(() => process.exit(0));
