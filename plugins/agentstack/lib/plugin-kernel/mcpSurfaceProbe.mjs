/**
 * Shared MCP surface contract probes (0.4.16+).
 * Used by diagnose-local, verify-mcp-surface-e2e, and kernel tests.
 */

export const MCP_EXECUTE_TOOL_CANONICAL = 'agentstack.execute';
export const MCP_EXECUTE_TOOL_ALIAS = 'agentstack_execute';

/**
 * @param {string} baseUrl
 * @param {Record<string, string>|null} [authHeaders]
 * @returns {Promise<object[]>}
 */
export async function postToolsList(baseUrl, authHeaders = null) {
  const root = String(baseUrl || 'https://agentstack.tech').replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', ...(authHeaders || {}) };
  const res = await fetch(`${root}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 }),
  });
  if (!res.ok) throw new Error(`tools/list HTTP ${res.status}`);
  const body = await res.json();
  const tools = body?.result?.tools;
  if (!Array.isArray(tools)) throw new Error('tools/list: missing result.tools array');
  return tools;
}

/**
 * @param {object[]} tools
 * @returns {{ ok: boolean, reason?: string }}
 */
export function evaluateSingleToolSurface(tools) {
  if (!Array.isArray(tools)) return { ok: false, reason: 'invalid tools array' };
  if (tools.length !== 1) {
    const names = tools.map((t) => t?.name).filter(Boolean).join(', ');
    return { ok: false, reason: `expected 1 tool, got ${tools.length} (${names})` };
  }
  if (tools[0]?.name !== MCP_EXECUTE_TOOL_CANONICAL) {
    return { ok: false, reason: `expected ${MCP_EXECUTE_TOOL_CANONICAL}, got ${tools[0]?.name}` };
  }
  return { ok: true };
}

/**
 * Postel: tools/call must accept underscore alias.
 * @param {string} baseUrl
 * @param {Record<string, string>} authHeaders
 */
export async function postToolsCallExecuteAlias(baseUrl, authHeaders) {
  const root = String(baseUrl || 'https://agentstack.tech').replace(/\/$/, '');
  const res = await fetch(`${root}/mcp`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: MCP_EXECUTE_TOOL_ALIAS,
        arguments: {
          steps: [{ id: 'p1', action: 'system.ping', params: {} }],
          options: { stopOnError: true },
        },
      },
      id: 2,
    }),
  });
  if (!res.ok) throw new Error(`tools/call HTTP ${res.status}`);
  const body = await res.json();
  if (body?.result?.isError !== false) {
    throw new Error(`tools/call ${MCP_EXECUTE_TOOL_ALIAS}: ${toolsCallErrorDetail(body)}`);
  }
  return body;
}

/**
 * Short, secret-free reason from JSON-RPC tools/call isError payload.
 * @param {object} body
 * @returns {string}
 */
export function toolsCallErrorDetail(body) {
  const text = body?.result?.content?.[0]?.text;
  if (typeof text === 'string' && text.trim()) {
    const raw = text.trim();
    try {
      const parsed = JSON.parse(raw);
      const code = parsed.error_code || parsed.code;
      const err = parsed.error || parsed.message;
      if (err) {
        return [code, err].filter(Boolean).join(': ').replace(/\s+/g, ' ').trim().slice(0, 280);
      }
    } catch {
      /* plain text */
    }
    return raw.replace(/\s+/g, ' ').trim().slice(0, 280);
  }
  if (body?.error?.message) return String(body.error.message);
  return `isError=${body?.result?.isError}`;
}

/**
 * @param {string} baseUrl
 * @returns {Promise<{ mcp_surface_tools?: number, tools_count?: number }|null>}
 */
export async function fetchMcpHealth(baseUrl) {
  const root = String(baseUrl || 'https://agentstack.tech').replace(/\/$/, '');
  const res = await fetch(`${root}/mcp/health`);
  if (!res.ok) return null;
  return res.json();
}
