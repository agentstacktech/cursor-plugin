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
  const apiKeyPresent = typeof h['X-API-Key'] === 'string' && h['X-API-Key'].trim().length > 0;
  const out = {
    placeholder: Boolean(auth.includes('${') || /AGENTSTACK_ACCESS_TOKEN/i.test(auth)),
    apiKeyPresent,
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
/**
 * @param {object|null} cfg
 * @returns {Record<string, string>|null}
 */
function agentstackMcpHeaderBlock(cfg) {
  const h = cfg?.mcpServers?.agentstack?.headers;
  return h && typeof h === 'object' ? h : null;
}

/**
 * Scoped integration key in mcp.json (CI, admin PAT, apikeys.create).
 * @param {object|null} cfg
 */
export function hasAgentstackApiKeyHeader(cfg) {
  const h = agentstackMcpHeaderBlock(cfg);
  return typeof h?.['X-API-Key'] === 'string' && h['X-API-Key'].trim().length > 0;
}

/**
 * Device Code / apikeys JWT PAT shape — not browser session JWT (user_token) or null service_caps.
 * Used for Bearer mirror into plugin cache; X-API-Key is a separate auth plane.
 * @param {string} accessToken
 */
export function isDeviceCodeMcpBearer(accessToken) {
  const raw = String(accessToken || '').trim();
  if (!raw) return false;
  if (!raw.startsWith('eyJ')) return false;
  const p = decodeJwtPayload(raw);
  if (!p || typeof p !== 'object') return false;
  if (p.type !== 'user_api_key') return false;
  const sc = p.service_caps;
  return Array.isArray(sc) && sc.length > 0;
}

/**
 * Bearer Cursor may send on plugin-agentstack-* so tools/list is not stuck at 0.
 * Session ``user_token`` is valid on Core (probe: tools/list + auth.get_profile).
 * ``user_api_key`` with null/empty ``service_caps`` is not — prod rejects writes.
 * @param {string} accessToken
 */
export function isCursorMirrorBearer(accessToken) {
  const raw = String(accessToken || '').trim();
  if (!raw.startsWith('eyJ') || raw.includes('${')) return false;
  const p = decodeJwtPayload(raw);
  if (!p || typeof p !== 'object') return false;
  if (p.type === 'user_token' || p.type === 'oauth_access_token') return true;
  return isDeviceCodeMcpBearer(raw);
}

export function applyAgentstackMcpBearer(cfg, { accessToken, baseUrl, projectId } = {}) {
  if (!isDeviceCodeMcpBearer(accessToken)) {
    throw new Error(
      `Refusing mcp.json Bearer: need user_api_key PAT with service_caps[]. Run ${AUTHORIZE_SLASH}.`,
    );
  }
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
 * Auth headers for MCP/REST from ~/.cursor/mcp.json.
 * Prefer valid integration Bearer PAT; else X-API-Key (so admin keys work when a stale user_token Bearer lingers).
 * @param {object|null} cfg
 * @returns {Record<string, string>|null}
 */
export function agentstackAuthHeaders(cfg) {
  const h = agentstackMcpHeaderBlock(cfg);
  if (!h) return null;
  const pid = h['X-Project-ID'] || h['x-project-id'];
  const stampPid = (out) => {
    if (isTenantProjectId(pid)) out['X-Project-ID'] = String(Number(pid));
    return out;
  };
  const auth = typeof h.Authorization === 'string' ? h.Authorization : '';
  const bearer =
    auth.startsWith('Bearer ') && !auth.includes('${')
      ? auth.slice('Bearer '.length).trim()
      : '';
  if (bearer && isDeviceCodeMcpBearer(bearer)) {
    return stampPid({ Authorization: `Bearer ${bearer}` });
  }
  const apiKey = typeof h['X-API-Key'] === 'string' ? h['X-API-Key'].trim() : '';
  if (apiKey) {
    return stampPid({ 'X-API-Key': apiKey });
  }
  if (auth.startsWith('Bearer ')) {
    return stampPid({ Authorization: auth });
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
 * @returns {{ kind: 'unsigned'|'placeholder'|'null_caps'|'ok', additionalContext: string|null, authMode?: 'api_key'|'bearer_pat'|'bearer_other' }}
 */
export function describeAgentstackAuthGate(cfg) {
  const h = agentstackMcpHeaderBlock(cfg);
  const hasApiKey = hasAgentstackApiKeyHeader(cfg);
  const rawAuth = typeof h?.Authorization === 'string' ? h.Authorization : '';
  const rawBearer =
    rawAuth.startsWith('Bearer ') && !rawAuth.includes('${')
      ? rawAuth.slice('Bearer '.length).trim()
      : '';

  if (!h || (!rawAuth && !hasApiKey)) {
    return {
      kind: 'unsigned',
      additionalContext:
        'AgentStack MCP is not signed in. After Reload, the plugin shows an AgentStack MCP server — ' +
        'click Connect (site login, G-A174) or run ' +
        `${AUTHORIZE_SLASH} (Device Code). Or set X-API-Key (scoped apikeys.create). Then Reload Window.`,
    };
  }
  const desc = describeAgentstackMcpAuth(cfg);
  if (desc.placeholder && !hasApiKey) {
    return {
      kind: 'placeholder',
      additionalContext:
        'AgentStack MCP Authorization is a placeholder (${AGENTSTACK_ACCESS_TOKEN}). ' +
        `Run ${AUTHORIZE_SLASH} or click Connect on the plugin MCP, then Reload Window.`,
    };
  }
  if (hasApiKey) {
    let additionalContext = null;
    if (rawBearer && !isDeviceCodeMcpBearer(rawBearer)) {
      additionalContext =
        'Using X-API-Key for MCP. Remove stale Authorization Bearer (browser user_token) from mcp.json ' +
        'to avoid confusion — hooks prefer valid PAT Bearer when present.';
    }
    return { kind: 'ok', additionalContext, authMode: 'api_key' };
  }
  if (rawBearer) {
    if (desc.jwtType === 'user_token' || desc.jwtType === 'oauth_access_token') {
      return {
        kind: 'ok',
        additionalContext:
          desc.jwtType === 'user_token'
            ? 'Session JWT (user_token) is valid for MCP. Plugin cache must mirror this Bearer or Cursor shows 0 tools.'
            : null,
        authMode: 'session_jwt',
      };
    }
    if (!isDeviceCodeMcpBearer(rawBearer)) {
      const additionalContext =
        desc.serviceCaps === 'null'
          ? 'AgentStack MCP JWT has service_caps=null. tools/list can look connected while tools/call ' +
            `fails with service_caps_required_in_prod. Run ${AUTHORIZE_SLASH} or apikeys.create with mcp_write.`
          : 'AgentStack mcp.json Bearer is not an integration PAT (user_api_key with service_caps[]). ' +
            `Run ${AUTHORIZE_SLASH}, or use X-API-Key from apikeys.create.`;
      return { kind: 'null_caps', additionalContext };
    }
    return { kind: 'ok', additionalContext: null, authMode: 'bearer_pat' };
  }
  return { kind: 'ok', additionalContext: null, authMode: 'bearer_other' };
}

/**
 * sessionStart auto Device Code: placeholder token or prod-dead null caps.
 * Unsigned is OAuth Connect-first unless `includeUnsigned` (legacy auto Device Code).
 */
export function gateNeedsDeviceLogin(kind, { includeUnsigned = false } = {}) {
  if (kind === 'unsigned') return includeUnsigned;
  return kind === 'placeholder' || kind === 'null_caps';
}

/**
 * Cursor sessionStart only (`--from-hook`). Tests and diagnose must not open a browser.
 * @param {string} kind
 * @param {{ fromHook?: boolean, disable?: boolean }} [opts]
 */
export function shouldAutoDeviceLogin(
  kind,
  { fromHook = false, disable = false, includeUnsigned = false } = {},
) {
  if (disable || !fromHook) return false;
  const envUnsigned =
    process.env.AGENTSTACK_AUTO_DEVICE_LOGIN_UNSIGNED === '1' ||
    process.env.AGENTSTACK_AUTO_DEVICE_LOGIN_UNSIGNED === 'true';
  return gateNeedsDeviceLogin(kind, { includeUnsigned: includeUnsigned || envUnsigned });
}

function peekJwtPayload(bearer) {
  const raw = String(bearer || '').replace(/^Bearer\s+/i, '').trim();
  if (!raw.startsWith('eyJ')) return null;
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function bearerExpWarn(auth) {
  if (!auth?.expInSec && auth?.expInSec !== 0) return null;
  if (auth.expInSec < 0) {
    return { level: 'error', message: 'Bearer expired — Connect on plugin MCP or /agentstack-authorize' };
  }
  if (auth.expInSec < 600) {
    return {
      level: 'warn',
      message: `Bearer expires in ${Math.round(auth.expInSec / 60)}m — Connect on plugin MCP before it lapses`,
    };
  }
  return null;
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
  transportRecommended,
  namespaceHint,
} = {}) {
  if (gateKind && gateKind !== 'ok') {
    const transport =
      transportRecommended ||
      (gateKind === 'unsigned' ? 'connect' : 'device_code');
    return [
      additionalContext || `AgentStack: not signed in. Run ${AUTHORIZE_SLASH}.`,
      `transport_recommended=${transport}`,
      namespaceHint ||
        'Agents using plugin-agentstack-*: Connect (G-A174). Hooks use ~/.cursor/mcp.json.',
    ].join('\n');
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
  const jwtType = auth?.jwtType || '';
  const transport =
    transportRecommended ||
    (auth?.apiKeyPresent ? 'api_key' : jwtType === 'user_api_key' ? 'device_code' : 'connect');
  const expWarn = bearerExpWarn(auth);
  const authModeLine = auth?.apiKeyPresent ? 'auth_mode=api_key' : auth?.jwtType ? `auth_mode=${auth.jwtType}` : '';
  const namespaceLine =
    auth?.apiKeyPresent
      ? 'active_namespace=user-agentstack (hooks); plugin-agentstack-* → Connect'
      : 'active_namespace=user-agentstack + plugin-agentstack-* (after Connect or PAT mirror)';
  const lines = [
    `AgentStack: ${who}${role}`,
    `project ${pid} · ${caps} · ${exp}`,
    ...(authModeLine ? [authModeLine] : []),
    ...(namespaceLine ? [namespaceLine] : []),
    `transport_recommended=${transport}`,
    namespaceHint ||
      'plugin-agentstack-* → Connect; user-agentstack / mcp-execute → Device Code Bearer.',
  ];
  if (expWarn?.message) lines.push(expWarn.message);
  else if (transport === 'connect') {
    lines.push('Primary: Connect on plugin MCP after Reload Window.');
  }
  return lines.join('\n');
}

/**
 * Best-effort GET /api/auth/me for the status card (never throws).
 * @param {Record<string, string>|null} headers
 * @param {{ baseUrl?: string, timeoutMs?: number }} [opts]
 */
/**
 * REST remint for workspace switch (hooks + Device Code automation).
 * @param {Record<string, string>|null} authHeaders
 * @param {number|string} targetProjectId
 * @param {{ baseUrl?: string, timeoutMs?: number }} [opts]
 * @returns {Promise<string|null>} new access_token
 */
export async function switchProjectViaRest(
  authHeaders,
  targetProjectId,
  { baseUrl = 'https://agentstack.tech', timeoutMs = 8000 } = {},
) {
  if (!authHeaders?.Authorization?.startsWith('Bearer ')) return null;
  const pid = Number(targetProjectId);
  if (!Number.isFinite(pid) || pid < 1) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${String(baseUrl).replace(/\/$/, '')}/api/auth/switch-project`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_project_id: pid }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const body = await res.json();
    const data = body?.data && typeof body.data === 'object' ? body.data : body;
    const token = data?.access_token || data?.accessToken;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * API-key JWTs may lack mcp_write — plan_claim then fails with rbac_blocked (not auth).
 * @param {object|null} cfg
 * @returns {{ missing: boolean, reason: string|null }}
 */
export function describeMcpWriteCapGap(cfg) {
  const headers = agentstackAuthHeaders(cfg);
  if (headers?.['X-API-Key']) {
    return { missing: false, reason: null };
  }
  if (!headers?.Authorization) {
    return { missing: false, reason: null };
  }
  const payload = decodeJwtPayload(headers.Authorization);
  if (!payload || typeof payload !== 'object') {
    return { missing: false, reason: null };
  }
  const caps = payload.service_caps;
  if (caps == null) {
    return {
      missing: true,
      reason:
        'JWT service_caps=null — prod may reject writes. Prefer Device Code (/agentstack-authorize) or apikeys.create with mcp_write.',
    };
  }
  if (!Array.isArray(caps)) {
    return { missing: false, reason: null };
  }
  if (caps.includes('mcp_write') || caps.includes('admin.write')) {
    return { missing: false, reason: null };
  }
  return {
    missing: true,
    reason:
      'JWT missing mcp_write — agents.plan_claim / mutations may return rbac_blocked. Widen caps via apikeys.create (agent_runner preset).',
  };
}

/** Session-start / hooks: identity from JWT only (no /api/auth/me round-trip). */
export function profileBriefFromJwt(authHeaders) {
  if (!authHeaders?.Authorization?.startsWith('Bearer ')) return null;
  const bearer = authHeaders.Authorization.slice('Bearer '.length).trim();
  const payload = bearer ? decodeJwtPayload(bearer) : null;
  if (!payload || typeof payload !== 'object') return null;
  const displayName = String(
    payload.name || payload.display_name || payload.username || '',
  ).trim();
  const email =
    typeof payload.email === 'string' && payload.email
      ? payload.email
      : typeof payload.sub === 'string' && payload.sub.includes('@')
        ? payload.sub
        : null;
  const rawUid = payload.user_id ?? payload.uid ?? null;
  const userId =
    rawUid != null && Number.isFinite(Number(rawUid)) ? Number(rawUid) : null;
  const role = typeof payload.role === 'string' ? payload.role : '';
  if (!email && !displayName && userId == null) return null;
  return { email, displayName: displayName || null, userId, role };
}

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
