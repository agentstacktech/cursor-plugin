/**
 * Normalize Cursor hook/MCP event payloads to an AgentStack action id.
 * Handles agentstack.execute nested params across Cursor hook versions.
 * @see repo.plugins.hooks.contract.gen1
 */

/** @param {unknown} event @returns {object[]} */
function mcpParamRoots(event) {
  if (!event || typeof event !== 'object') return [];
  return [
    event.params,
    event.arguments,
    event.arguments?.params,
    event.toolInput,
    event.toolInput?.params,
    event.input,
    event.input?.params,
  ].filter((r) => r && typeof r === 'object');
}

/**
 * All action ids in an agentstack.execute batch (session handoff, cap hints).
 * @param {unknown} event
 * @returns {string[]}
 */
export function extractMcpExecuteSteps(event) {
  const actions = [];
  for (const root of mcpParamRoots(event)) {
    if (Array.isArray(root.steps)) {
      for (const step of root.steps) {
        const action = step?.action;
        if (typeof action === 'string' && action.includes('.')) {
          actions.push(action);
        }
      }
    }
    if (typeof root.action === 'string' && root.action.includes('.')) {
      actions.push(root.action);
    }
  }
  if (actions.length) return actions;
  const single = extractMcpAction(event);
  return single ? [single] : [];
}

/**
 * @param {unknown} event
 * @returns {string|null}
 */
export function extractMcpAction(event) {
  if (!event || typeof event !== 'object') return null;

  const candidates = [
    event.params?.steps?.[0]?.action,
    event.params?.action,
    event.arguments?.steps?.[0]?.action,
    event.arguments?.action,
    event.arguments?.params?.steps?.[0]?.action,
    event.arguments?.params?.action,
    event.toolInput?.steps?.[0]?.action,
    event.toolInput?.action,
    event.toolInput?.params?.steps?.[0]?.action,
    event.toolInput?.params?.action,
    event.input?.steps?.[0]?.action,
    event.input?.params?.steps?.[0]?.action,
    event.action,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.includes('.')) return value;
  }
  return null;
}
