/**
 * Shared writer for ~/.cursor/mcp.json agentstack server entry.
 * Keeps Device Code install and session-start refresh aligned (lean Cursor MCP shape).
 */

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
 * Normalize all mcpServers entries (strip tools/baseUrl); re-lean agentstack entry.
 * @param {object} cfg
 * @param {{ baseUrl?: string }} [opts]
 * @returns {{ cfg: object, changed: boolean }}
 */
export function normalizeAgentstackMcpConfig(cfg, { baseUrl } = {}) {
  const root = cfg && typeof cfg === 'object' ? cfg : {};
  root.mcpServers = root.mcpServers || {};
  let changed = false;

  for (const [key, entry] of Object.entries(root.mcpServers)) {
    if (!entry || typeof entry !== 'object') continue;
    let next = stripLeanServerKeys(entry);
    if (key === 'agentstack') {
      const url = baseUrl || next.url?.replace(/\/mcp\/?$/, '') || 'https://agentstack.tech';
      next = leanAgentstackServer(next, { baseUrl: url });
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
 * @returns {object} cfg
 */
export function applyAgentstackMcpBearer(cfg, { accessToken, baseUrl, projectId } = {}) {
  const root = cfg && typeof cfg === 'object' ? cfg : {};
  root.mcpServers = root.mcpServers || {};
  const existing = root.mcpServers.agentstack || {};
  const headers = {
    ...(existing.headers || {}),
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  delete headers['X-API-Key'];
  const pin = projectId ?? process.env.AGENTSTACK_PROJECT_ID;
  if (pin != null && String(pin).trim()) {
    headers['X-Project-ID'] = String(pin).trim();
  }
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
