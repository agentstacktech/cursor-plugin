/**
 * Dual-surface MCP auth (do not collapse them):
 * - plugin mcp.json (plugin-agentstack-*): OAuth URL-only. Cursor Connect (G-A174) owns the token.
 * - ~/.cursor/mcp.json (user-agentstack, hooks, mcp-execute): Device Code PAT and/or X-API-Key.
 * A static Authorization on the plugin file makes Cursor run oauthFlow and that header together;
 * tools/list then hangs and the tool list drops to 0. GPT directory mcp.json stays URL-only too.
 * Gene: repo.plugins.oauth_device_code.gen1 · repo.plugins.hooks.contract.gen1
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  agentstackAuthHeaders,
  isCursorMirrorBearer,
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
  if (!isCursorMirrorBearer(bearer)) {
    throw new Error('buildPluginRuntimeMcpConfig requires a mirrorable JWT (session, Connect, or Device Code PAT)');
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
  if (!isCursorMirrorBearer(token)) {
    return 'plugin cache Bearer is not a usable MCP JWT (session, Connect, or Device Code PAT with service_caps)';
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

function isGitPluginSource(filePath) {
  try {
    const real = fsSync.realpathSync(filePath).replace(/\\/g, '/').toLowerCase();
    return real.includes('/provided_plugins/') && real.endsWith('/plugins/agentstack/mcp.json');
  } catch {
    return false;
  }
}

/**
 * Cache, marketplace, and the local directory copy. Never the git SoT.
 * @returns {string[]}
 */
function listPluginCacheMcpPaths() {
  if (_cachePathsMemo.length && Date.now() - _cachePathsAt < CACHE_PATHS_TTL_MS) {
    return _cachePathsMemo;
  }
  const pluginsRoot = path.join(os.homedir(), '.cursor', 'plugins');
  const roots = [
    path.join(pluginsRoot, 'cache', 'agentstack'),
    path.join(pluginsRoot, 'marketplaces'),
    path.join(pluginsRoot, 'local', 'agentstack'),
  ];
  const out = [];
  const stack = roots.filter((root) => fsSync.existsSync(root)).map((root) => [root, 0]);
  while (stack.length) {
    const [dir, depth] = stack.pop();
    if (depth > 12) continue;
    let entries;
    try {
      entries = fsSync.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        stack.push([full, depth + 1]);
        continue;
      }
      if (entry.name !== 'mcp.json') continue;
      const norm = full.replace(/\\/g, '/').toLowerCase();
      if (!norm.includes('agentstack')) continue;
      if (isGitPluginSource(full)) continue;
      out.push(full);
    }
  }
  _cachePathsMemo = out;
  _cachePathsAt = Date.now();
  return out;
}

function pluginFileHasStaticBearer(cfg) {
  const auth =
    cfg?.mcpServers?.agentstack?.headers?.Authorization ||
    cfg?.mcpServers?.agentstack?.headers?.authorization;
  return typeof auth === 'string' && auth.startsWith('Bearer ') && !auth.includes('${');
}

/**
 * Keep every plugin mcp.json on OAuth URL-only.
 * The name is historical: callers still run this after Device Code, but the PAT
 * stays in ~/.cursor/mcp.json and is not copied onto the plugin server.
 * @param {{ baseUrl?: string, userMcpPath?: string, force?: boolean }} [opts]
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
  const runtime = oauthOnlyPluginRuntimeMcpConfig({
    baseUrl: opts.baseUrl || DEFAULT_BASE_URL,
  });
  const payload = `${JSON.stringify(runtime, null, 2)}\n`;
  const updated = [];
  const skipped = [];
  const errors = [];
  for (const p of listPluginCacheMcpPaths()) {
    try {
      let cur = null;
      try {
        cur = JSON.parse(await fs.readFile(p, 'utf8'));
      } catch {
        cur = null;
      }
      if (cur && !pluginFileHasStaticBearer(cur) && JSON.stringify(cur) === JSON.stringify(runtime)) {
        skipped.push(p);
        continue;
      }
      if (cur && !pluginFileHasStaticBearer(cur)) {
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
 * True when a plugin mcp.json still carries a static Bearer.
 * That header blocks Cursor OAuth Connect on plugin-agentstack-*.
 * @param {object|null} [_userCfg]
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export async function pluginCacheBearerDrifted(_userCfg, opts = {}) {
  if (!opts.force && Date.now() - _driftAt < DRIFT_TTL_MS) {
    return _driftMemo;
  }
  let drifted = false;
  for (const p of listPluginCacheMcpPaths()) {
    try {
      const cur = JSON.parse(fsSync.readFileSync(p, 'utf8'));
      if (pluginFileHasStaticBearer(cur)) {
        drifted = true;
        break;
      }
    } catch {
      /* unreadable file is not a static bearer */
    }
  }
  _driftMemo = drifted;
  _driftAt = Date.now();
  return drifted;
}
