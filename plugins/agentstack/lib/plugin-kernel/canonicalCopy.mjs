/** @see repo.plugins.vscode.gen1 · repo.plugins.claude.gen1 · core.mcp.universal_client.gen1 */
export const LIVE_CATALOG_PHRASE =
  'live MCP action catalog via agentstack.execute (see GET /mcp/actions)';

/** Claude Code plugin manifest copy (SoT — validate-plugin checks plugin.json parity). */
export const PLUGIN_MANIFEST_CLAUDE = {
  description:
    'Work Graph control plane: bound project starts at agents.work_next (recipe mcp_work_loop_v1) via one MCP tool (agentstack.execute). Catalog search is fallback. Also hosting (/s/), storage, 8DNA, logic, payments, RAG. Live capabilities from GET /mcp/actions. OAuth Device Code via scripts/device-login.mjs.',
  keywords: [
    '8dna',
    'rules-engine',
    'payments',
    'mcp',
    'backend',
    'hosting',
    'buffs',
    'projects',
    'storage',
    'ecosystem',
    'rag',
    'agents',
    'agentstack',
  ],
};

/** Claude marketplace entry blurb (no version — plugin.json is semver SoT). */
export const MARKETPLACE_ENTRY_CLAUDE = {
  description:
    'Work Graph control plane for Claude Code: agents.work_next (mcp_work_loop_v1) via agentstack.execute. Catalog search is fallback. Also publish sites (/s/), 8DNA, payments, RAG.',
  keywords: ['mcp', '8dna', 'backend', 'hosting', 'agentstack', 'rag', 'payments'],
};

const DEFAULT_MCP_BASE = 'https://agentstack.tech';

/**
 * One-line `claude mcp add` for OAuth Bearer or X-API-Key fallback.
 * @param {{ baseUrl?: string, bearerToken?: string|null, apiKey?: string|null }} opts
 * @returns {string}
 */
export function formatClaudeMcpAddCommand({
  baseUrl = DEFAULT_MCP_BASE,
  bearerToken = null,
  apiKey = null,
} = {}) {
  const mcpUrl = `${String(baseUrl || DEFAULT_MCP_BASE).replace(/\/$/, '')}/mcp`;
  const authHeader = apiKey
    ? `--header "X-API-Key: ${apiKey}"`
    : `--header "Authorization: Bearer ${bearerToken || '<access_token>'}"`;
  return (
    `claude mcp add agentstack --transport http ${mcpUrl} ` +
    `${authHeader} ` +
    `--header "Content-Type: application/json"`
  );
}

/** Backend error codes → English recovery hints for plugin docs (localize in GPT/Gemini guides). */
export const MCP_RECOVERY_HINTS = {
  auth_required:
    'Add X-API-Key or complete OAuth in Custom GPT Actions or MCP Connector settings.',
  not_authenticated:
    'Connect (G-A174) or /agentstack-authorize — then auth.get_profile (or node scripts/mcp-execute.mjs auth.get_profile) before context.project_id.',
  unauthorized:
    'Same as auth_required — Connect, Device Code, or Bearer from profile API key.',
  plan_graph_private:
    'Sign in (auth.get_profile) or set orchestrator public_read on the project before agents.plan_get.',
  service_cap_denied:
    'Widen API key caps via apikeys.create (preset agent_runner) or call discovery.list first.',
  action_not_found:
    'Use list_actions or GET /mcp/actions for exact action names before retrying.',
  confirmation_required:
    'Ask the user to confirm destructive, payment, or access-changing operations.',
  mcp_sync_heavy_limit:
    'Split the batch or use async execute for heavy LLM actions.',
  service_caps_required_in_prod:
    'Run /agentstack-authorize or Connect — production requires scoped service_caps on the JWT.',
  dual_surface_unsigned_plugin:
    'Device Code signed user-agentstack only — click Connect on plugin-agentstack-* (G-A174) or use mcp-execute.mjs.',
};

export function recoveryHintForCode(code) {
  return MCP_RECOVERY_HINTS[code] || null;
}
