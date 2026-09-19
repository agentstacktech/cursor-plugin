/**
 * Live catalog effect parity — mirrors agentstack-core/scripts/check_mcp_effect_parity.py.
 * @see core.mcp.self_description.gen1
 */

/** Agent preflight read set (keep in sync with check_mcp_effect_parity.py). */
export const PREFLIGHT_READ_ACTIONS = [
  'permissions.effective',
  'agents.templates_list',
  'bots.conversations',
  'agents.fleet_diagnostics',
  'agents.gates',
  'agents.policy_preview',
  'hosting.site.edge_health',
  'crm.magic_fill',
  'diagnostics.consistency.scan',
  'knowledge.export',
];

const READ_KINDS = new Set(['read', 'evaluate']);

/**
 * @param {Array<{ action?: string, effect?: { kind?: string, read_only_hint?: boolean } }>} actions
 * @param {{ limit?: number }} [opts]
 */
export function scanCatalogEffectParityMismatches(actions, opts = {}) {
  const limit = opts.limit ?? 12;
  const mismatches = [];
  const byAction = new Map();
  for (const row of actions || []) {
    if (row?.action) byAction.set(row.action, row);
  }

  for (const action of PREFLIGHT_READ_ACTIONS) {
    const row = byAction.get(action);
    const kind = row?.effect?.kind;
    if (!kind) {
      mismatches.push({ action, issue: 'missing effect.kind in catalog' });
    } else if (!READ_KINDS.has(String(kind))) {
      mismatches.push({ action, issue: `effect.kind=${kind} (want read|evaluate)` });
    }
    if (mismatches.length >= limit) return mismatches;
  }

  for (const row of actions || []) {
    const effect = row?.effect;
    if (!effect || effect.read_only_hint == null || !effect.kind) continue;
    const expectRead = READ_KINDS.has(String(effect.kind));
    if (expectRead !== Boolean(effect.read_only_hint)) {
      mismatches.push({
        action: row.action,
        issue: `kind=${effect.kind} read_only_hint=${effect.read_only_hint}`,
      });
    }
    if (mismatches.length >= limit) break;
  }

  return mismatches;
}
