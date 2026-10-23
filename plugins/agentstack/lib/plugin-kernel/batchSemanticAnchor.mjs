/**
 * Default semantic anchor for agentstack.execute batches (W1-A).
 * Cursor hooks cannot rewrite MCP bodies — use this in skills/scripts; hook emits hints only.
 * @see docs/plugins/CONTEXT_FOR_AI.md · SDK withSemanticAnchor
 */

/** Generated from shared/work_graph/audit_batch_actions.py — npm run gen:audit-batch-actions */
import auditBatchActions from './auditBatchActions.generated.json' with { type: 'json' };
import { stepNeedsSemanticAnchor as evalStepNeedsSemanticAnchor } from './batchParamAnchorEval.mjs';

export const AUDIT_BATCH_ACTIONS = new Set(auditBatchActions.actions || []);

/** @param {string} action */
export function normalizeMcpActionAlias(action) {
  if (action === 'projects.create') return 'projects.create_project';
  if (action === 'projects.list') return 'projects.get_projects';
  return action;
}

/**
 * @param {{ action?: string, params?: object }[]} steps
 * @returns {boolean}
 */
function optionsSatisfyAnchor(options) {
  if (!options || typeof options !== 'object') return false;
  const intent = String(options.execution_intent || '').toLowerCase();
  if (intent === 'direct' || intent === 'validate') return true;
  if (options.goal || options.focus_node_id || options.plan_execute_mode) return true;
  return false;
}

/** Mirrors Python step_allowed_without_semantic_anchor (plugin subset: audit whitelist + param mutates). */
function stepNeedsSemanticAnchor(action, params) {
  const act = normalizeMcpActionAlias(action);
  return evalStepNeedsSemanticAnchor(act, params, AUDIT_BATCH_ACTIONS);
}

export function batchNeedsSemanticAnchor(steps, options) {
  if (optionsSatisfyAnchor(options)) return false;
  if (!Array.isArray(steps) || !steps.length) return false;
  for (const step of steps) {
    const raw = step?.action;
    if (typeof raw !== 'string' || !raw.includes('.')) continue;
    if (stepNeedsSemanticAnchor(raw, step?.params)) return true;
  }
  return false;
}

/**
 * @param {object} body agentstack.execute payload
 * @param {string} goalText
 * @returns {object}
 */
export function ensureBatchSemanticAnchor(body, goalText) {
  if (!body || typeof body !== 'object') return body;
  const steps = Array.isArray(body.steps) ? body.steps : [];
  const options =
    body.options && typeof body.options === 'object' ? { ...body.options } : {};
  if (!batchNeedsSemanticAnchor(steps, options)) return body;
  if (optionsSatisfyAnchor(options)) {
    return body;
  }
  const goal = String(goalText || '').trim();
  if (!goal) return body;
  return { ...body, options: { ...options, goal: goal.slice(0, 2000) } };
}
