/**
 * HTTP agentstack.execute via POST /mcp tools/call — uses ~/.cursor/mcp.json Bearer.
 * Bridge when Cursor plugin MCP (plugin-agentstack-*) is unsigned but Device Code wrote user-agentstack.
 */

import { MCP_EXECUTE_TOOL_ALIAS, toolsCallErrorDetail } from './mcpSurfaceProbe.mjs';

/**
 * @param {string} baseUrl
 * @param {Record<string, string>} authHeaders
 * @param {object} payload agentstack.execute body (steps, context, options)
 * @returns {Promise<object>} parsed execute result (structuredContent or JSON text)
 */
export async function postAgentstackExecute(baseUrl, authHeaders, payload) {
  const root = String(baseUrl || 'https://agentstack.tech').replace(/\/$/, '');
  const res = await fetch(`${root}/mcp`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: MCP_EXECUTE_TOOL_ALIAS, arguments: payload },
      id: 2,
    }),
  });
  if (!res.ok) {
    throw new Error(`tools/call HTTP ${res.status}`);
  }
  const body = await res.json();
  if (body?.error) {
    throw new Error(body.error.message || 'MCP JSON-RPC error');
  }
  if (body?.result?.isError !== false) {
    throw new Error(toolsCallErrorDetail(body));
  }
  const structured = body?.result?.structuredContent;
  if (structured && typeof structured === 'object') {
    return structured;
  }
  const text = body?.result?.content?.[0]?.text;
  if (typeof text === 'string' && text.trim()) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }
  return body?.result ?? {};
}

/**
 * @param {object|null} cfg mcp.json
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function resolveMcpBaseUrl(cfg, baseUrl) {
  const fromEnv = process.env.AGENTSTACK_BASE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  if (baseUrl) return String(baseUrl).replace(/\/$/, '');
  const url = cfg?.mcpServers?.agentstack?.url;
  if (typeof url === 'string' && url.includes('/mcp')) {
    return url.replace(/\/mcp\/?$/, '');
  }
  return 'https://agentstack.tech';
}
