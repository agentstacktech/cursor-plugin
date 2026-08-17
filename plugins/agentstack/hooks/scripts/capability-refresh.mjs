#!/usr/bin/env node
// hooks/scripts/capability-refresh.mjs
// afterFileEdit matcher mcp.json$ — clear MCP cache + refresh flat capability snapshot.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { writeTenantCapabilitySnapshot } from '../../lib/plugin-kernel/mcpActionsCatalog.mjs';
import { agentstackAuthHeaders } from '../../lib/plugin-kernel/mcpConfig.mjs';

const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const CURSOR_DIR = join(homedir(), '.cursor');
const MCP_PATH = join(CURSOR_DIR, 'mcp.json');

async function getAuthHeaders() {
  try {
    const cfg = JSON.parse(await readFile(MCP_PATH, 'utf8'));
    return agentstackAuthHeaders(cfg);
  } catch {
    return null;
  }
}

async function main() {
  const auth = await getAuthHeaders();
  if (!auth) return;

  try {
    await fetch(`${BASE_URL}/mcp/cache/clear`, { method: 'POST', headers: { ...auth } });
  } catch {
    /* best effort */
  }

  try {
    const res = await fetch(`${BASE_URL}/mcp/actions`, { headers: { ...auth } });
    if (!res.ok) return;
    await writeTenantCapabilitySnapshot(CURSOR_DIR, await res.json());
  } catch {
    /* next time */
  }
}

main().catch(() => process.exit(0));
