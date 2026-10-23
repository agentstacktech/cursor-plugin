/**
 * Param-sensitive batch anchor policy from codegen SoT.
 * @see batchParamAnchorRules.generated.json · shared/work_graph/audit_batch_policy.py
 */

import rules from './batchParamAnchorRules.generated.json' with { type: 'json' };

const MUTATES_WHEN = rules.mutates_when_by_action || {};
const PLAIN_READ_ACTIONS = new Set(rules.plain_read_actions || []);
const FALLBACK = rules.plugin_fallback || {};

/** @param {unknown} val */
function isTrueish(val) {
  return (rules.truthiness?.true_values || []).some((t) => t === val);
}

/** @param {unknown} val */
function isFalseish(val) {
  return (rules.truthiness?.false_values || []).some((t) => t === val);
}

/**
 * Mirrors shared.mcp.batch_preflight_gate.batch_step_effective_mutates (param slice only).
 * @param {string} action canonical action
 * @param {Record<string, unknown>} params
 */
export function batchStepEffectiveMutates(action, params) {
  const act = String(action || '').trim();
  const p = params && typeof params === 'object' ? params : {};

  if (act === 'agents.plan_process_backlog') {
    const policy = String(p.auto_apply_policy || '').trim().toLowerCase();
    if (policy === 'safe' || policy === 'force') return true;
  }
  if (act === 'hosting.sync.commit') {
    if (!isFalseish(p.publish)) return true;
  }
  if (act === 'hosting.gc.ix') {
    if (!isTrueish(p.dry_run)) return true;
  }
  if (act === 'diagnostics.consistency.scan') {
    if (isTrueish(p.sync_plan)) return true;
  }
  if (act === 'script.put') {
    const pub = String(p.publish ?? 'none').trim().toLowerCase();
    if (pub && pub !== 'none' && pub !== 'false' && pub !== '0') return true;
  }

  const mutatesWhen = MUTATES_WHEN[act];
  if (!mutatesWhen || typeof mutatesWhen !== 'object') return false;

  for (const [key, expected] of Object.entries(mutatesWhen)) {
    const val = p[key];
    if (expected === true) {
      if (isTrueish(val)) return true;
    } else if (val === expected) {
      return true;
    }
  }
  return false;
}

/**
 * True when step may run without options.goal (negation → needs anchor).
 * @param {string} action
 * @param {Record<string, unknown>} params
 * @param {Set<string>} auditBatchActions
 */
export function stepAllowedWithoutSemanticAnchor(action, params, auditBatchActions) {
  const act = String(action || '').trim();
  if (!act) return true;

  if (batchStepEffectiveMutates(act, params)) return false;

  if (auditBatchActions?.has(act) && FALLBACK.audit_whitelist_no_anchor !== false) {
    return true;
  }

  if (PLAIN_READ_ACTIONS.has(act)) return true;

  if (FALLBACK.non_whitelist_needs_anchor) return false;
  return true;
}

/**
 * @param {string} action
 * @param {Record<string, unknown>} params
 * @param {Set<string>} auditBatchActions
 */
export function stepNeedsSemanticAnchor(action, params, auditBatchActions) {
  return !stepAllowedWithoutSemanticAnchor(action, params, auditBatchActions);
}

/** @returns {{ id: string, ok: boolean }[]} */
export function verifyCanonicalCases(auditBatchActions) {
  const cases = rules.canonical_cases || [];
  return cases.map((caseRow) => {
    const needs = stepNeedsSemanticAnchor(
      caseRow.action,
      caseRow.params || {},
      auditBatchActions,
    );
    return { id: caseRow.id, ok: needs === Boolean(caseRow.needs_anchor) };
  });
}
