/** @see repo.plugins.vscode.gen1 · core.mcp.universal_client.gen1 */
export const LIVE_CATALOG_PHRASE =
  'live MCP action catalog via agentstack.execute (see GET /mcp/actions)';

/** Backend error codes → English recovery hints for plugin docs (localize in GPT/Gemini guides). */
export const MCP_RECOVERY_HINTS = {
  auth_required:
    'Add X-API-Key or complete OAuth in Custom GPT Actions or MCP Connector settings.',
  service_cap_denied:
    'Widen API key caps via apikeys.create (preset agent_runner) or call discovery.list first.',
  action_not_found:
    'Use list_actions or GET /mcp/actions for exact action names before retrying.',
  confirmation_required:
    'Ask the user to confirm destructive, payment, or access-changing operations.',
  mcp_sync_heavy_limit:
    'Split the batch or use async execute for heavy LLM actions.',
};

export function recoveryHintForCode(code) {
  return MCP_RECOVERY_HINTS[code] || null;
}
