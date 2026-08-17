/**
 * Shared writer for ~/.cursor/mcp.json agentstack server entry.
 * Keeps Device Code install and session-start refresh aligned (lean Cursor MCP shape).
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Ecosystem identity home (JWT project_id=1) — not a tenant workspace. */
export const ECOSYSTEM_PROJECT_ID = 1;

/** Plain-text tenant pin written by /agentstack-login (must not be ecosystem 1). */
export const PROJECT_PIN_FILENAME = 'agentstack-project';

/**
 * Drop Cursor-only extras (tools{}, redundant baseUrl when url is set).
 * @param {object} entry
 */
export function stripLeanServerKeys(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const next = { ...entry };
  delete next.tools;
  if (next.url && next.baseUrl) delete next.baseUrl;
  return next;
}

/**
 * Tenant working project (not ecosystem pid=1).
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isTenantProjectId(raw) {
  const n = Number(String(raw ?? '').trim());
  return Number.isInteger(n) && n > ECOSYSTEM_PROJECT_ID;
}

/**
 * Read ~/.cursor/agentstack-project. Ecosystem `1` and junk are ignored.
 * @param {string} cursorDir
 * @returns {Promise<number|null>}
 */
export async function readPinnedTenantProjectId(cursorDir) {
  try {
    const raw = (await readFile(join(cursorDir, PROJECT_PIN_FILENAME), 'utf8')).trim();
    return isTenantProjectId(raw) ? Number(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Decode JWT payload without verifying the signature (local diagnose / expiry peek).
 * @param {string} token
 * @returns {object|null}
 */
export function decodeJwtPayload(token) {
  try {
    const raw = String(token || '').replace(/^Bearer\s+/i, '').trim();
    const parts = raw.split('.');
    if (parts.length < 2) return null;
    const pad = '='.repeat((4 - (parts[1].length % 4)) % 4);
    const json = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/') + pad,
      'base64',
    ).toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Safe claims for diagnose (never returns the secret).
 * @param {object|null} cfg
 */
export function describeAgentstackMcpAuth(cfg) {
  const headers = cfg?.mcpServers?.agentstack?.headers;
  const h = headers && typeof headers === 'object' ? headers : {};
  const auth = typeof h.Authorization === 'string' ? h.Authorization : '';
  const out = {
    placeholder: Boolean(auth.includes('${') || /AGENTSTACK_ACCESS_TOKEN/i.test(auth)),
    jwtType: null,
    actorKind: null,
    userId: null,
    serviceCaps: 'absent',
    expInSec: null,
    projectHeader: h['X-Project-ID'] || h['x-project-id'] || null,
  };
  if (!auth.startsWith('Bearer ') || out.placeholder) return out;
  const payload = decodeJwtPayload(auth);
  if (!payload || typeof payload !== 'object') return out;
  out.jwtType = payload.type || null;
  out.actorKind = payload.actor_kind || null;
  out.userId = payload.user_id ?? null;
  const sc = payload.service_caps;
  if (sc == null) out.serviceCaps = 'null';
  else if (Array.isArray(sc)) out.serviceCaps = `list:${sc.length}`;
  else out.serviceCaps = 'other';
  if (typeof payload.exp === 'number') {
    out.expInSec = payload.exp - Math.floor(Date.now() / 1000);
  }
  return out;
}

/**
 * Build a lean streamable-http agentstack entry (no Cursor-only extras like `tools`).
 * @param {object} [existing]
 * @param {{ baseUrl: string, headers?: Record<string, string> }} opts
 */
export function leanAgentstackServer(existing = {}, { baseUrl, headers: headerOverrides } = {}) {
  const prev = stripLeanServerKeys(existing && typeof existing === 'object' ? existing : {});
  const headers = headerOverrides
    ? { ...headerOverrides, 'Content-Type': 'application/json' }
    : { ...(prev.headers || {}), 'Content-Type': 'application/json' };
  return {
    type: 'streamable-http',
    url: `${String(baseUrl || 'https://agentstack.tech').replace(/\/$/, '')}/mcp`,
    headers,
  };
}

/**
 * Tenant pin for mcp.json: keep existing tenant header, ignore ecosystem `1`.
 * @param {Record<string, string>} [prevHeaders]
 * @param {string|number} [projectId]
 * @returns {string|null}
 */
export function resolveAgentstackProjectPin(prevHeaders = {}, projectId) {
  const prevPin = prevHeaders['X-Project-ID'] || prevHeaders['x-project-id'];
  let pin = projectId ?? process.env.AGENTSTACK_PROJECT_ID;
  if (!isTenantProjectId(pin) && isTenantProjectId(prevPin)) pin = prevPin;
  return isTenantProjectId(pin) ? String(Number(pin)) : null;
}

/** Mutates headers: tenant `X-Project-ID` or drop ecosystem/junk. */
export function stampAgentstackProjectHeader(headers, pin) {
  if (!headers || typeof headers !== 'object') return headers;
  delete headers['x-project-id'];
  if (pin) headers['X-Project-ID'] = String(pin);
  else delete headers['X-Project-ID'];
  return headers;
}

/**
 * Normalize all mcpServers entries (strip tools/baseUrl); re-lean agentstack entry.
 * @param {object} cfg
 * @param {{ baseUrl?: string, projectId?: string|number }} [opts]
 * @returns {{ cfg: object, changed: boolean }}
 */
export function normalizeAgentstackMcpConfig(cfg, { baseUrl, projectId } = {}) {
  const root = cfg && typeof cfg === 'object' ? cfg : {};
  root.mcpServers = root.mcpServers || {};
  let changed = false;

  for (const [key, entry] of Object.entries(root.mcpServers)) {
    if (!entry || typeof entry !== 'object') continue;
    let next = stripLeanServerKeys(entry);
    if (key === 'agentstack') {
      const url = baseUrl || next.url?.replace(/\/mcp\/?$/, '') || 'https://agentstack.tech';
      const headers = { ...(next.headers || {}) };
      stampAgentstackProjectHeader(headers, resolveAgentstackProjectPin(headers, projectId));
      next = leanAgentstackServer(next, { baseUrl: url, headers });
    }
    if (JSON.stringify(next) !== JSON.stringify(entry)) {
      root.mcpServers[key] = next;
      changed = true;
    }
  }

  return { cfg: root, changed };
}

/**
 * @param {object} cfg — existing mcp.json object (mutated)
 * @param {object} opts
 * @param {string} opts.accessToken
 * @param {string} opts.baseUrl
 * @param {string|number} [opts.projectId] — tenant working project; ecosystem `1` is ignored
 * @returns {object} cfg
 */
export function applyAgentstackMcpBearer(cfg, { accessToken, baseUrl, projectId } = {}) {
  const root = cfg && typeof cfg === 'object' ? cfg : {};
  root.mcpServers = root.mcpServers || {};
  const existing = root.mcpServers.agentstack || {};
  const prevHeaders = existing.headers && typeof existing.headers === 'object' ? existing.headers : {};
  const headers = {
    ...prevHeaders,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  delete headers['X-API-Key'];
  stampAgentstackProjectHeader(headers, resolveAgentstackProjectPin(prevHeaders, projectId));
  root.mcpServers.agentstack = leanAgentstackServer(existing, { baseUrl, headers });
  return root;
}

/**
 * Auth headers for AgentStack HTTP calls from mcp.json (Bearer preferred, else X-API-Key).
 * @param {object|null} cfg
 * @returns {Record<string, string>|null}
 */
export function agentstackAuthHeaders(cfg) {
  const h = cfg?.mcpServers?.agentstack?.headers;
  if (!h || typeof h !== 'object') return null;
  if (typeof h.Authorization === 'string' && h.Authorization.startsWith('Bearer ')) {
    const out = { Authorization: h.Authorization };
    const pid = h['X-Project-ID'] || h['x-project-id'];
    if (isTenantProjectId(pid)) out['X-Project-ID'] = String(Number(pid));
    return out;
  }
  if (typeof h['X-API-Key'] === 'string' && h['X-API-Key'].length > 0) {
    return { 'X-API-Key': h['X-API-Key'] };
  }
  return null;
}

/** Slash command that is the plugin Device Code auth control. */
export const AUTHORIZE_SLASH = '/agentstack-authorize';

/** Figma-style pointer in plugin.json — Cursor Connect, not an inline servers object. */
export const PLUGIN_MCP_POINTER = './mcp.json';

/**
 * plugin.json ``mcpServers`` must be a path string (not an inline object).
 * @param {object|null} pluginJson
 * @returns {string|null}
 */
export function pluginMcpPointerError(pluginJson) {
  const p = pluginJson?.mcpServers;
  if (p == null || p === '') {
    return 'plugin.json mcpServers must point at ./mcp.json (Cursor Connect)';
  }
  if (typeof p === 'object') {
    return 'mcpServers must be a string path, not an inline object (G-A162 duplicate)';
  }
  if (typeof p !== 'string') return 'mcpServers must be a string path to mcp.json';
  const n = p.replace(/\\/g, '/');
  if (n !== PLUGIN_MCP_POINTER && n !== 'mcp.json') {
    return `mcpServers path must be ./mcp.json (got ${p})`;
  }
  return null;
}

/**
 * Plugin-owned MCP file (Cursor gen3 ``plugin.json`` ``mcpServers: "./mcp.json"``).
 * G-A162 is an empty ``Authorization`` placeholder — OAuth URL-only is required.
 * @param {object|null} cfg
 * @returns {string|null} error or null when safe to ship
 */
export function pluginMcpOAuthError(cfg) {
  const entry = cfg?.mcpServers?.agentstack;
  if (!entry || typeof entry !== 'object') return 'missing mcpServers.agentstack';
  if (entry.type !== 'streamable-http' && entry.type !== 'http') {
    return `type must be streamable-http (got ${entry.type || 'missing'})`;
  }
  const url = String(entry.url || '');
  if (!/^https:\/\/agentstack\.tech\/mcp\/?$/.test(url) && !url.endsWith('/mcp')) {
    return 'url must be the AgentStack /mcp endpoint';
  }
  const blob = JSON.stringify(entry);
  if (blob.includes('${')) return 'no ${placeholders} (G-A162 empty Bearer trap)';
  const auth = entry.headers?.Authorization || entry.headers?.authorization;
  if (typeof auth === 'string' && auth.trim()) {
    return 'do not ship Authorization; Cursor OAuth Connect (G-A174)';
  }
  if (entry.auth?.CLIENT_SECRET) return 'do not ship CLIENT_SECRET';
  return null;
}

/**
 * SessionStart / diagnose gate: unsigned MCP vs placeholder vs null-caps JWT vs ok.
 * Plugin MCP is OAuth URL-only; Device Code still writes ~/.cursor/mcp.json for hooks.
 *
 * @param {object|null} cfg
 * @returns {{ kind: 'unsigned'|'placeholder'|'null_caps'|'ok', additionalContext: string|null }}
 */
export function describeAgentstackAuthGate(cfg) {
  const headers = agentstackAuthHeaders(cfg);
  if (!headers) {
    return {
      kind: 'unsigned',
      additionalContext:
        'AgentStack MCP is not signed in. After Reload, the plugin shows an AgentStack MCP server — ' +
        'click Connect (site login, G-A174) or run ' +
        `${AUTHORIZE_SLASH} (Device Code). Then Developer: Reload Window.`,
    };
  }
  const desc = describeAgentstackMcpAuth(cfg);
  if (desc.placeholder) {
    return {
      kind: 'placeholder',
      additionalContext:
        'AgentStack MCP Authorization is a placeholder (${AGENTSTACK_ACCESS_TOKEN}). ' +
        `Run ${AUTHORIZE_SLASH} or click Connect on the plugin MCP, then Reload Window.`,
    };
  }
  if (desc.serviceCaps === 'null' && desc.jwtType === 'user_api_key') {
    return {
      kind: 'null_caps',
      additionalContext:
        'AgentStack MCP JWT has service_caps=null. tools/list can look connected while tools/call ' +
        `fails with service_caps_required_in_prod. Run ${AUTHORIZE_SLASH} (Device Code, no API key) ` +
        'to mint a scoped token, then Reload Window.',
    };
  }
  return { kind: 'ok', additionalContext: null };
}

/** sessionStart auto Device Code: unsigned, placeholder token, or prod-dead null caps. */
export function gateNeedsDeviceLogin(kind) {
  return kind === 'unsigned' || kind === 'placeholder' || kind === 'null_caps';
}

/**
 * Cursor sessionStart only (`--from-hook`). Tests and diagnose must not open a browser.
 * @param {string} kind
 * @param {{ fromHook?: boolean, disable?: boolean }} [opts]
 */
export function shouldAutoDeviceLogin(kind, { fromHook = false, disable = false } = {}) {
  if (disable || !fromHook) return false;
  return gateNeedsDeviceLogin(kind);
}

/**
 * Compact status for sessionStart / diagnose (no secrets).
 * @param {{
 *   gateKind?: string,
 *   additionalContext?: string|null,
 *   auth?: object|null,
 *   pin?: number|string|null,
 *   profile?: { email?: string, displayName?: string, username?: string, role?: string, userId?: number|null }|null,
 * }} [opts]
 */
export function formatAgentstackStatusCard({
  gateKind,
  additionalContext,
  auth,
  pin,
  profile,
} = {}) {
  if (gateKind && gateKind !== 'ok') {
    return additionalContext || `AgentStack: not signed in. Run ${AUTHORIZE_SLASH}.`;
  }
  const who =
    (profile && (profile.displayName || profile.email || profile.username)) ||
    (auth && auth.userId != null ? `user ${auth.userId}` : 'signed in');
  const role = profile?.role ? ` · ${profile.role}` : '';
  const pid = pin || auth?.projectHeader || 'unpinned';
  const caps = auth?.serviceCaps || 'caps?';
  let exp = 'exp unknown';
  if (typeof auth?.expInSec === 'number') {
    if (auth.expInSec < 0) exp = 'expired';
    else if (auth.expInSec < 3600) exp = `expires ${Math.round(auth.expInSec / 60)}m`;
    else exp = `expires ${Math.round(auth.expInSec / 3600)}h`;
  }
  return [
    `AgentStack: ${who}${role}`,
    `project ${pid} · ${caps} · ${exp}`,
    'After Reload, click Connect on the plugin MCP. Device Code keeps hooks signed in.',
  ].join('\n');
}

/**
 * Best-effort GET /api/auth/me for the status card (never throws).
 * @param {Record<string, string>|null} headers
 * @param {{ baseUrl?: string, timeoutMs?: number }} [opts]
 */
export async function fetchAuthMeBrief(headers, { baseUrl = 'https://agentstack.tech', timeoutMs = 2500 } = {}) {
  if (!headers) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${String(baseUrl).replace(/\/$/, '')}/api/auth/me`, {
      headers,
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const body = await res.json();
    const d = body?.data && typeof body.data === 'object' ? body.data : body;
    if (!d || typeof d !== 'object') return null;
    return {
      userId: d.user_id ?? null,
      email: typeof d.email === 'string' ? d.email : '',
      displayName: String(d.display_name || d.username || '').trim(),
      role: typeof d.role === 'string' ? d.role : '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
