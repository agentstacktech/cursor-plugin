/**
 * Shared publication drift + secret scan constants for plugin validators.
 * @see repo.plugins.publication_gates.gen1
 */

export const STALE_ACTIONS = new Map([
  ['auth.quick_auth', 'auth.login'],
  ['auth.create_user', 'auth.register'],
  ['payments.create_payment', 'payments.create'],
  ['payments.get_status', 'payments.get'],
  ['projects.get_api_keys', 'apikeys.list'],
  ['projects.create_api_key', 'apikeys.create'],
  ['projects.delete_api_key', 'apikeys.delete'],
  ['apikeys.revoke', 'apikeys.delete'],
]);

export const SECRET_PATTERNS = [
  { name: 'AgentStack API key', regex: /\bask_[A-Za-z0-9_-]{16,}\b/g },
  { name: 'JWT bearer token', regex: /\bBearer\s+ey[A-Za-z0-9._-]{30,}\b/g },
  { name: 'OpenAI key', regex: /\bsk-[A-Za-z0-9]{24,}\b/g },
  { name: 'Stripe live key', regex: /\b(?:sk|pk)_live_[A-Za-z0-9]{16,}\b/g },
];

export const SAFE_PLACEHOLDER =
  /\$\{|<[^>\r\n]+>|YOUR_|REPLACE_|example|placeholder|fake/i;

/** Hard-coded marketing action counts (use runtime discovery instead). */
export const HARD_CODED_ACTION_COUNT =
  /\b\d{2,4}\+?\s+(?:catalog\s+)?actions?\b/i;

/** Files allowed to mention scale numbers (monorepo paths + publish-repo relatives). */
export const ACTION_COUNT_ALLOWLIST = new Set([
  'docs/plugins/PUBLISHER_COPY.md',
  'docs/publication/PLATFORM_SCALE.md',
  'docs/plugins/CANONICAL_COPY.md',
  'docs/plugins/CURSOR_PLUGIN_AUDIT_2026-05.md',
  'docs/plugins/CAPABILITY_MATRIX.public.md',
  'docs/plugins/CAPABILITY_MATRIX.md',
  'docs/CAPABILITY_MATRIX.md',
  'provided_plugins/cursor-plugin/VERIFICATION_CHECKLIST.md',
  'provided_plugins/cursor-plugin/commands/agentstack-diagnose.md',
  'provided_plugins/cursor-plugin/commands/agentstack-capability-matrix.md',
  'provided_plugins/cursor-plugin/docs/CAPABILITY_MATRIX.md',
  // Standalone publish repo (paths relative to plugin root)
  'VERIFICATION_CHECKLIST.md',
  'commands/agentstack-diagnose.md',
  'commands/agentstack-capability-matrix.md',
]);

/** Skills that must appear in agentstack-backend router table. */
export const ROUTER_SKILLS_REQUIRED = new Set([
  'agentstack-data',
  'agentstack-hosting',
  'agentstack-support',
  'agentstack-storage',
  'agentstack-auth-rbac',
  'agentstack-logic',
  'agentstack-commerce',
  'agentstack-rag',
  'agentstack-signals',
  'agentstack-projects',
  'agentstack-agents-ai',
  'agentstack-messenger',
  'agentstack-integrations',
  'agentstack-discovery',
  'agentstack-commerce-assets',
  'agentstack-capability-tasks',
  'agentstack-sdk',
  'agentstack-crm',
  'agentstack-agentnet',
  'agentstack-storefront-studio',
  'agentstack-project-wallet',
  'agentstack-guidance',
]);

/** Optional grant / specialty skills (not required in router). */
export const ROUTER_SKILLS_OPTIONAL = new Set(['solana']);
