/**
 * Shared writer for ~/.cursor/mcp.json agentstack server entry.
 * Keeps Device Code install and session-start refresh aligned (lean Cursor MCP shape).
 */

/**
 * Build a lean streamable-http agentstack entry (no Cursor-only extras like `tools`).
 * @param {object} [existing]
 * @param {{ baseUrl: string, headers?: Record<string, string> }} opts
 */
export function leanAgentstackServer(existing = {}, { baseUrl, headers: headerOverrides } = {}) {
  const prev = existing && typeof existing === 'object' ? existing : {};
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
 * Drop non-lean keys on mcpServers.agentstack while preserving auth headers.
 * @param {object} cfg
 * @param {{ baseUrl?: string }} [opts]
 * @returns {{ cfg: object, changed: boolean }}
 */
export function normalizeAgentstackMcpConfig(cfg, { baseUrl } = {}) {
  const root = cfg && typeof cfg === 'object' ? cfg : {};
  root.mcpServers = root.mcpServers || {};
  const existing = root.mcpServers.agentstack;
  if (!existing || typeof existing !== 'object') {
    return { cfg: root, changed: false };
  }
  const url = baseUrl || existing.url?.replace(/\/mcp\/?$/, '') || 'https://agentstack.tech';
  const next = leanAgentstackServer(existing, { baseUrl: url });
  const before = JSON.stringify(existing);
  const after = JSON.stringify(next);
  root.mcpServers.agentstack = next;
  return { cfg: root, changed: before !== after };
}

/**
 * @param {object} cfg — existing mcp.json object (mutated)
 * @param {object} opts
 * @param {string} opts.accessToken
 * @param {string} opts.baseUrl
 * @returns {object} cfg
 */
export function applyAgentstackMcpBearer(cfg, { accessToken, baseUrl }) {
  const root = cfg && typeof cfg === 'object' ? cfg : {};
  root.mcpServers = root.mcpServers || {};
  const existing = root.mcpServers.agentstack || {};
  const headers = {
    ...(existing.headers || {}),
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  delete headers['X-API-Key'];
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
    return { Authorization: h.Authorization };
  }
  if (typeof h['X-API-Key'] === 'string' && h['X-API-Key'].length > 0) {
    return { 'X-API-Key': h['X-API-Key'] };
  }
  return null;
}
