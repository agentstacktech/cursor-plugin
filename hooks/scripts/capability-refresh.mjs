#!/usr/bin/env node
// hooks/scripts/capability-refresh.mjs
// afterFileEdit matcher mcp.json$ — clear MCP cache + refresh flat capability snapshot.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { flattenMcpActionsCatalog } from '../../lib/plugin-kernel/mcpActionsCatalog.mjs';

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
  } catch {
    /* none */
  }
  return null;
}

async function main() {
  const auth = await getAuthHeader();
  if (!auth) return;

  try {
    await fetch(`${BASE_URL}/mcp/cache/clear`, { method: 'POST', headers: { ...auth } });
  } catch {
    /* best effort */
  }

  try {
    const res = await fetch(`${BASE_URL}/mcp/actions`, { headers: { ...auth } });
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
  } catch {
    /* next time */
  }
}

main().catch(() => process.exit(0));
