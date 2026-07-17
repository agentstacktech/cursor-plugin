/**
 * Shared writer for ~/.cursor/mcp.json agentstack server entry.
 * Keeps Device Code install and session-start refresh aligned (lean Cursor MCP shape).
 */

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
  root.mcpServers.agentstack = {
    type: 'streamable-http',
    url: `${baseUrl.replace(/\/$/, '')}/mcp`,
    headers,
  };
  return root;
}
