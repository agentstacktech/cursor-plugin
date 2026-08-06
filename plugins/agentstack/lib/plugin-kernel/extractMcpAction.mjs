/**
 * Normalize Cursor hook/MCP event payloads to an AgentStack action id.
 * Handles agentstack.execute nested params across Cursor hook versions.
 * @see repo.plugins.hooks.contract.gen1
 */

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
