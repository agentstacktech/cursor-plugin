#!/usr/bin/env node
// hooks/scripts/capability-refresh.mjs
// afterFileEdit matcher mcp.json$ — refresh flat capability snapshot when stale (not every edit).

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  refreshTenantCapabilitySnapshotIfStale,
  tenantCapabilitySnapshotFresh,
} from '../../lib/plugin-kernel/mcpActionsCatalog.mjs';
import { agentstackAuthHeaders } from '../../lib/plugin-kernel/mcpConfig.mjs';
import { syncPluginRuntimeMcpBearerFromUser } from '../../lib/plugin-kernel/pluginMcpRuntimeSync.mjs';

const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const CURSOR_DIR = join(homedir(), '.cursor');
const MCP_PATH = join(CURSOR_DIR, 'mcp.json');
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FORCE =
  process.env.AGENTSTACK_CAPABILITY_REFRESH_FORCE === '1' ||
  process.env.AGENTSTACK_MCP_CACHE_CLEAR === '1';

function log(msg) {
  process.stderr.write(`[agentstack] capability-refresh: ${msg}\n`);
}

async function getAuthHeaders() {
  try {
    const cfg = JSON.parse(await readFile(MCP_PATH, 'utf8'));
    return agentstackAuthHeaders(cfg);
  } catch (e) {
    log(`no auth headers (${e.message})`);
    return null;
  }
}

async function clearMcpCache(auth) {
  try {
    await fetch(`${BASE_URL}/mcp/cache/clear`, { method: 'POST', headers: { ...auth } });
  } catch (e) {
    log(`cache/clear skipped (${e.message})`);
  }
}

async function main() {
  const auth = await getAuthHeaders();
  if (!auth) return;

  const fresh = await tenantCapabilitySnapshotFresh(CURSOR_DIR, {
    maxAgeMs: SNAPSHOT_MAX_AGE_MS,
  });
  if (!FORCE && fresh) {
    log('snapshot fresh — skip catalog fetch');
    return;
  }

  let result;
  try {
    result = await refreshTenantCapabilitySnapshotIfStale(CURSOR_DIR, BASE_URL, auth, {
      maxAgeMs: FORCE ? 0 : SNAPSHOT_MAX_AGE_MS,
    });
  } catch (e) {
    log(`snapshot refresh failed (${e.message})`);
    return;
  }

  if (FORCE || result?.refreshed) {
    await clearMcpCache(auth);
  }
  if (result?.reason) {
    log(`${result.reason} (${result.actionCount ?? 0} actions)`);
  }
  try {
    const sync = await syncPluginRuntimeMcpBearerFromUser({ baseUrl: BASE_URL });
    if (sync.updated.length) {
      log(`plugin mcp.json reset to OAuth URL-only (${sync.updated.length} file)`);
    }
  } catch (e) {
    log(`plugin bearer-sync skipped (${e.message})`);
  }
}

main().catch((e) => {
  log(`hook error: ${e.message}`);
  process.exit(0);
});
