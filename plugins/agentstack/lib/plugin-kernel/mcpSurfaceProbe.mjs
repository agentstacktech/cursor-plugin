/**
 * MCP surface contract probes (0.4.16+).
 * SoT: provided_plugins/scripts/lib/mcpSurfaceProbe.mjs — keep in sync via sync-plugin-kernel.mjs.
 */

export const MCP_EXECUTE_TOOL_CANONICAL = 'agentstack.execute';
export const MCP_EXECUTE_TOOL_ALIAS = 'agentstack_execute';

/** Minimal tools/list row for unit tests (outputSchema + inputSchema wire). */
export function minimalExecuteToolFixture() {
  return {
    name: MCP_EXECUTE_TOOL_CANONICAL,
    outputSchema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    inputSchema: {
      type: 'object',
      properties: {
        steps: { type: 'array' },
        context: { type: 'object', properties: { project_id: { type: 'integer' } } },
        options: {
          type: 'object',
          properties: {
            async: {},
            idempotency_key: {},
            goal: {},
            focus_node_id: {},
            plan_execute_mode: {},
            execution_intent: {},
            stopOnError: {},
            continueOnError: {},
            recipe_id: {},
          },
        },
      },
    },
  };
}

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
  const schema = tools[0]?.outputSchema;
  const union = schema && (schema.oneOf || schema.anyOf || schema.$defs);
  if (!schema || schema.type !== 'object' || union) {
    return {
      ok: false,
      reason:
        'agentstack.execute outputSchema root must be type:object with properties (Cursor drops tools/call on oneOf+$defs)',
    };
  }
  const inputCheck = evaluateExecuteInputSchema(tools);
  if (!inputCheck.ok) return inputCheck;
  return { ok: true };
}

/** @param {object[]} tools */
export function evaluateExecuteInputSchema(tools) {
  const schema = tools[0]?.inputSchema;
  if (!schema || typeof schema !== 'object') {
    return { ok: false, reason: 'agentstack.execute missing inputSchema' };
  }
  const props = schema.properties;
  if (!props?.steps || !props?.context?.properties?.project_id) {
    return { ok: false, reason: 'inputSchema wire missing steps or context.project_id' };
  }
  const optProps = props?.options?.properties;
  if (!optProps || typeof optProps !== 'object') {
    return { ok: false, reason: 'inputSchema missing options.properties' };
  }
  for (const key of [
    'async',
    'idempotency_key',
    'goal',
    'focus_node_id',
    'plan_execute_mode',
    'execution_intent',
    'stopOnError',
    'continueOnError',
    'recipe_id',
  ]) {
    if (!(key in optProps)) {
      return { ok: false, reason: `inputSchema.options missing ${key}` };
    }
  }
  return { ok: true };
}

/**
 * Postel: tools/call must accept underscore alias.
 * @param {string} baseUrl
 * @param {Record<string, string>} authHeaders
 */
/**
 * Session truth probe — tools/list and discovery.list alone can false-green.
 * @param {string} baseUrl
 * @param {Record<string, string>} authHeaders
 */
export async function postToolsCallAuthGetProfile(baseUrl, authHeaders) {
  const root = String(baseUrl || 'https://agentstack.tech').replace(/\/$/, '');
  const res = await fetch(`${root}/mcp`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: MCP_EXECUTE_TOOL_CANONICAL,
        arguments: {
          steps: [{ id: 'auth1', action: 'auth.get_profile', params: {} }],
          options: { stopOnError: true },
        },
      },
      id: 3,
    }),
  });
  if (!res.ok) throw new Error(`tools/call auth.get_profile HTTP ${res.status}`);
  const body = await res.json();
  if (body?.result?.isError !== false) {
    throw new Error(`auth.get_profile: ${toolsCallErrorDetail(body)}`);
  }
  return body;
}

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
          steps: [{ id: 'p1', action: 'discovery.list', params: {} }],
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
