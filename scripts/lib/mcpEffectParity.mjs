/**
 * Generated — parity with agentstack-core/scripts/check_mcp_effect_parity.py
 * Regen: python agentstack-core/scripts/check_mcp_effect_parity.py
 * @see core.mcp.self_description.gen1
 */

export const READ_KINDS = new Set(['read', 'evaluate']);

/**
 * @param {Array<{ action?: string, effect?: { kind?: string, read_only_hint?: boolean } }>} actions
 * @param {{ limit?: number }} [opts]
 */
export function scanCatalogEffectParityMismatches(actions, opts = {}) {
  const limit = opts.limit ?? 12;
  const mutatesAware = opts.mutatesWhenAware !== false;
  const mismatches = [];

  for (const row of actions || []) {
    const effect = row?.effect;
    if (!effect?.kind) continue;
    const kind = String(effect.kind);
    let expectRead = READ_KINDS.has(kind);
    if (mutatesAware && effect.mutates_when === 'always') {
      expectRead = false;
    }
    if (effect.read_only_hint == null) {
      continue;
    }
    if (expectRead !== Boolean(effect.read_only_hint)) {
      mismatches.push({
        action: row.action,
        issue: `kind=${kind} read_only_hint=${effect.read_only_hint}`,
      });
    }
    if (mismatches.length >= limit) break;
  }

  return mismatches;
}
