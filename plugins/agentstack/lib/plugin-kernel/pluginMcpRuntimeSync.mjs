/**
 * Dual-surface MCP: user ~/.cursor/mcp.json (Device Code Bearer) vs plugin cache mcp.json.
 * Shipped plugin mcp.json stays OAuth URL-only (G-A174); cache copies Bearer so plugin-agentstack-* works.
 * Gene: repo.plugins.oauth_device_code.gen1 · repo.plugins.hooks.contract.gen1
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  agentstackAuthHeaders,
  isDeviceCodeMcpBearer,
  leanAgentstackServer,
  resolveAgentstackProjectPin,
  stampAgentstackProjectHeader,
  stripLeanServerKeys,
} from './mcpConfig.mjs';

export const DEFAULT_BASE_URL = 'https://agentstack.tech';

/** Coalesce multi-hook bearer sync (session-start + capability-refresh) — MCP-5.5 */
const SYNC_DEBOUNCE_MS = 2000;
let _lastSyncFinishedAt = 0;

/**
 * @param {object|null} cfg
 * @param {string} [fallback]
 */
function baseUrlFromCfg(cfg, fallback = DEFAULT_BASE_URL) {
  const url = String(cfg?.mcpServers?.agentstack?.url || '');
  const m = url.match(/^(https?:\/\/[^/]+)/i);
  return m ? m[1] : fallback;
}

/**
 * Plugin-cache shape: streamable-http + Bearer copied from user mcp.json.
 * @param {object} userCfg — ~/.cursor/mcp.json
 * @param {{ baseUrl?: string }} [opts]
 */
export function buildPluginRuntimeMcpConfig(userCfg, { baseUrl } = {}) {
  const root = userCfg && typeof userCfg === 'object' ? userCfg : {};
  const existing = root.mcpServers?.agentstack || {};
  const prevHeaders =
    existing.headers && typeof existing.headers === 'object' ? { ...existing.headers } : {};
  const prevH = existing.headers && typeof existing.headers === 'object' ? existing.headers : {};
  const rawAuth = prevH.Authorization;
  const bearer =
    typeof rawAuth === 'string' && rawAuth.startsWith('Bearer ')
      ? rawAuth.slice('Bearer '.length).trim()
      : '';
  if (!isDeviceCodeMcpBearer(bearer)) {
    throw new Error('buildPluginRuntimeMcpConfig requires Device Code PAT Bearer (not X-API-Key)');
  }
  const url = baseUrl || baseUrlFromCfg(root);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` };
  stampAgentstackProjectHeader(
    headers,
    resolveAgentstackProjectPin(prevHeaders, headers['X-Project-ID']),
  );
  return {
    mcpServers: {
      agentstack: leanAgentstackServer(stripLeanServerKeys(existing), { baseUrl: url, headers }),
    },
  };
}

/**
 * @param {object|null} cfg — plugin cache mcp.json
 * @returns {string|null}
 */
export function pluginMcpRuntimeCacheError(cfg) {
  const entry = cfg?.mcpServers?.agentstack;
  if (!entry || typeof entry !== 'object') return 'missing mcpServers.agentstack';
  const auth = entry.headers?.Authorization || entry.headers?.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ') || auth.includes('${')) {
    return 'plugin cache missing Bearer (run Device Code or refresh-cursor-runtime --fix)';
  }
  const token = auth.slice('Bearer '.length).trim();
  if (!isDeviceCodeMcpBearer(token)) {
    return 'plugin cache Bearer is not a Device Code PAT (user_api_key + service_caps) — run /agentstack-authorize';
  }
  if (!String(entry.url || '').endsWith('/mcp')) return 'url must be AgentStack /mcp endpoint';
  return null;
}

/** OAuth URL-only cache shape — forces Connect (G-A174) when user mcp.json has invalid JWT. */
export function oauthOnlyPluginRuntimeMcpConfig({ baseUrl } = {}) {
  const url = baseUrl || DEFAULT_BASE_URL;
  return {
    mcpServers: {
      agentstack: leanAgentstackServer({}, {
        baseUrl: url,
        headers: { 'Content-Type': 'application/json' },
      }),
    },
  };
}

/**
 * Reset marketplace cache mcp.json to URL-only (no Bearer) so Cursor shows Connect instead of 0 tools.
 */
export async function resetPluginCacheMcpToOAuthOnly(opts = {}) {
  const runtime = oauthOnlyPluginRuntimeMcpConfig({ baseUrl: opts.baseUrl || DEFAULT_BASE_URL });
  const payload = `${JSON.stringify(runtime, null, 2)}\n`;
  const updated = [];
  for (const p of listPluginCacheMcpPaths()) {
    try {
      await fs.writeFile(p, payload, 'utf8');
      updated.push(p);
    } catch {
      /* best effort */
    }
  }
  if (updated.length) _lastSyncFinishedAt = Date.now();
  return updated;
}

const CACHE_PATHS_TTL_MS = 15_000;
let _cachePathsAt = 0;
let _cachePathsMemo = [];

const DRIFT_TTL_MS = 30_000;
let _driftAt = 0;
let _driftMemo = false;

/**
 * @returns {string[]}
 */
function listPluginCacheMcpPaths() {
  if (_cachePathsMemo.length && Date.now() - _cachePathsAt < CACHE_PATHS_TTL_MS) {
    return _cachePathsMemo;
  }
  const cacheRoot = path.join(os.homedir(), '.cursor', 'plugins', 'cache', 'agentstack');
  const out = [];
  if (!fsSync.existsSync(cacheRoot)) return out;
  const stack = [cacheRoot];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === 'mcp.json') out.push(full);
    }
  }
  _cachePathsMemo = out;
  _cachePathsAt = Date.now();
  return out;
}

/**
 * Mirror user Bearer into every agentstack marketplace cache mcp.json.
 * @param {{ baseUrl?: string, userMcpPath?: string }} [opts]
 * @returns {Promise<{ updated: string[], skipped: string[], errors: string[] }>}
 */
export async function syncPluginRuntimeMcpBearerFromUser(opts = {}) {
  const force = opts.force === true;
  if (
    !force &&
    _lastSyncFinishedAt > 0 &&
    Date.now() - _lastSyncFinishedAt < SYNC_DEBOUNCE_MS
  ) {
    return { updated: [], skipped: ['debounced'], errors: [] };
  }
  const userPath = opts.userMcpPath || path.join(os.homedir(), '.cursor', 'mcp.json');
  const updated = [];
  const skipped = [];
  const errors = [];
  let userCfg;
  try {
    userCfg = JSON.parse(await fs.readFile(userPath, 'utf8'));
  } catch {
    return { updated, skipped, errors };
  }
  const rawAuth = userCfg?.mcpServers?.agentstack?.headers?.Authorization;
  const bearer =
    typeof rawAuth === 'string' && rawAuth.startsWith('Bearer ')
      ? rawAuth.slice('Bearer '.length).trim()
      : '';
  if (!bearer) return { updated, skipped, errors };
  if (!isDeviceCodeMcpBearer(bearer)) {
    const cleared = await resetPluginCacheMcpToOAuthOnly({
      baseUrl: opts.baseUrl || baseUrlFromCfg(userCfg),
    });
    if (cleared.length) {
      errors.push(
        'cleared invalid Bearer from plugin cache (session JWT / null caps) — Connect (G-A174) or /agentstack-authorize',
      );
    }
    return { updated: cleared, skipped, errors };
  }

  const runtime = buildPluginRuntimeMcpConfig(userCfg, {
    baseUrl: opts.baseUrl || baseUrlFromCfg(userCfg),
  });
  if (pluginMcpRuntimeCacheError(runtime)) return { updated, skipped, errors };

  const payload = `${JSON.stringify(runtime, null, 2)}\n`;
  for (const p of listPluginCacheMcpPaths()) {
    try {
      const cur = JSON.parse(await fs.readFile(p, 'utf8'));
      if (JSON.stringify(cur) === JSON.stringify(runtime)) {
        skipped.push(p);
        continue;
      }
      await fs.writeFile(p, payload, 'utf8');
      updated.push(p);
    } catch (e) {
      skipped.push(p);
      errors.push(`${p}: ${e?.message || e}`);
    }
  }
  if (updated.length || skipped.length) {
    _lastSyncFinishedAt = Date.now();
  }
  return { updated, skipped, errors };
}

/**
 * True when marketplace plugin cache mcp.json does not match user Bearer mirror (DUAL_SURFACE).
 * @param {object|null} userCfg
 * @param {{ baseUrl?: string }} [opts]
 * @returns {Promise<boolean>}
 */
export async function pluginCacheBearerDrifted(userCfg, opts = {}) {
  if (!opts.force && Date.now() - _driftAt < DRIFT_TTL_MS) {
    return _driftMemo;
  }
  const rawAuth = userCfg?.mcpServers?.agentstack?.headers?.Authorization;
  const bearer =
    typeof rawAuth === 'string' && rawAuth.startsWith('Bearer ')
      ? rawAuth.slice('Bearer '.length).trim()
      : '';
  if (!bearer || !isDeviceCodeMcpBearer(bearer)) {
    _driftMemo = false;
    _driftAt = Date.now();
    return false;
  }
  const runtime = buildPluginRuntimeMcpConfig(userCfg, {
    baseUrl: opts.baseUrl || baseUrlFromCfg(userCfg),
  });
  if (pluginMcpRuntimeCacheError(runtime)) {
    _driftMemo = false;
    _driftAt = Date.now();
    return false;
  }
  const target = JSON.stringify(runtime);
  const paths = listPluginCacheMcpPaths();
  if (!paths.length) {
    _driftMemo = true;
    _driftAt = Date.now();
    return true;
  }
  for (const p of paths) {
    try {
      const cur = JSON.parse(await fs.readFile(p, 'utf8'));
      if (JSON.stringify(cur) !== target) {
        _driftMemo = true;
        _driftAt = Date.now();
        return true;
      }
    } catch {
      _driftMemo = true;
      _driftAt = Date.now();
      return true;
    }
  }
  _driftMemo = false;
  _driftAt = Date.now();
  return false;
}
