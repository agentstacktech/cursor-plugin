/**
 * Build copy-paste `mcp-execute.mjs` CLI from hook/MCP event payloads.
 * Gene: repo.plugins.cursor.gen3 · DRY with scripts/mcp-execute.mjs
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { extractMcpExecuteSteps } from './extractMcpAction.mjs';
import { batchNeedsSemanticAnchor } from './batchSemanticAnchor.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repo-relative path for docs (monorepo checkout). */
export const MCP_EXECUTE_DOC_PATH =
  'provided_plugins/cursor-plugin/scripts/mcp-execute.mjs';

const ANCHOR_FAILURE_CODES = new Set([
  'batch_semantic_anchor_required',
  'batch_semantic_anchor_conflict',
  'conflicting_semantic_anchor',
]);

/**
 * Best-effort absolute path to scripts/mcp-execute.mjs from plugin kernel.
 * @returns {string}
 */
export function resolveMcpExecuteScriptPath() {
  return resolve(__dirname, '..', '..', '..', '..', 'scripts', 'mcp-execute.mjs');
}

/**
 * @param {unknown} errorCode
 * @returns {boolean}
 */
export function isSemanticAnchorFailure(errorCode) {
  return ANCHOR_FAILURE_CODES.has(String(errorCode || '').trim());
}

/**
 * @param {unknown} nextAction
 * @returns {string|undefined}
 */
function nodeIdFromNextAction(nextAction) {
  if (!nextAction || typeof nextAction !== 'object') return undefined;
  const na = nextAction;
  const top = String(na.node_id || '').trim();
  if (top) return top;
  const params = na.params;
  if (params && typeof params === 'object') {
    const ids = params.node_ids;
    if (Array.isArray(ids) && ids[0]) return String(ids[0]).trim();
    const one = String(params.node_id || '').trim();
    if (one) return one;
  }
  return undefined;
}

/**
 * @param {unknown} body
 * @returns {string|undefined}
 */
function resolveFocusNodeIdFromWorkGraphBody(body) {
  if (!body || typeof body !== 'object') return undefined;
  const roots = [
    body,
    body.recovery_block,
    body.recovery,
    body.packet,
    body.data,
    body.step?.data,
    body.step?.result,
  ].filter((r) => r && typeof r === 'object');
  for (const root of roots) {
    const top = String(root.node_id || root.focus_node_id || root.target_node_id || '').trim();
    if (top) return top;
    const fromNa = nodeIdFromNextAction(root.next_action);
    if (fromNa) return fromNa;
    const actions = root.next_actions;
    if (Array.isArray(actions)) {
      for (const row of actions) {
        const fromRow = nodeIdFromNextAction(row);
        if (fromRow) return fromRow;
      }
    }
  }
  return undefined;
}

/**
 * @param {unknown} text
 * @returns {string|undefined}
 */
function focusNodeIdFromErrText(text) {
  if (typeof text !== 'string' || !text.trim()) return undefined;
  const trimmed = text.trim();
  try {
    return resolveFocusNodeIdFromWorkGraphBody(JSON.parse(trimmed));
  } catch {
    if (!trimmed.includes('next_action') && !trimmed.includes('node_id')) return undefined;
    const m = trimmed.match(
      /"next_action"\s*:\s*\{[\s\S]*?"node_id"\s*:\s*"([^"]+)"/,
    );
    if (m?.[1]) return m[1].trim();
    const mParams = trimmed.match(
      /"params"\s*:\s*\{[\s\S]*?"node_id"\s*:\s*"([^"]+)"/,
    );
    if (mParams?.[1]) return mParams[1].trim();
    return undefined;
  }
}

/**
 * @param {unknown} event
 * @returns {string|undefined}
 */
function resolveFocusNodeIdFromFailurePayload(event) {
  const candidates = [
    event?.error,
    event?.message,
    event?.stderr,
    event?.result,
    event?.result?.error,
    event?.result?.message,
    event?.result?.data,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object') {
      const fromObj = resolveFocusNodeIdFromWorkGraphBody(c);
      if (fromObj) return fromObj;
    }
    if (typeof c === 'string') {
      const fromText = focusNodeIdFromErrText(c);
      if (fromText) return fromText;
    }
  }
  return undefined;
}

/**
 * @param {unknown} event
 * @param {string|null|undefined} [errorCode]
 * @returns {boolean}
 */
export function isPlanClaimRetryFailure(event, errorCode) {
  const code = String(errorCode || '').trim();
  if (code === 'plan_claim_required') return true;
  const { steps } = extractExecuteBatchFromEvent(event);
  const act = steps[0]?.action || '';
  return act === 'agents.plan_claim';
}

/**
 * @param {unknown} event
 * @param {string|null|undefined} [errorCode]
 * @returns {boolean}
 */
export function shouldSemanticAnchorRetry(event, errorCode) {
  return (
    isSemanticAnchorFailure(errorCode) || isPlanClaimRetryFailure(event, errorCode)
  );
}

/**
 * @param {unknown} event
 * @returns {string|undefined}
 */
export function resolveFocusNodeIdForBridge(event) {
  const roots = [
    event?.arguments,
    event?.params,
    event?.result,
    event?.result?.data,
    event?.toolInput,
  ].filter((r) => r && typeof r === 'object');

  for (const root of roots) {
    const opts = root.options;
    if (opts && typeof opts === 'object') {
      const fid = String(opts.focus_node_id || '').trim();
      if (fid) return fid;
    }
    const nid = String(root.node_id || root.focus_node_id || '').trim();
    if (nid) return nid;
    const na = root.next_action;
    if (na && typeof na === 'object') {
      const fromNa = nodeIdFromNextAction(na);
      if (fromNa) return fromNa;
    }
    const steps = root.steps;
    if (Array.isArray(steps)) {
      for (const step of steps) {
        const p = step?.params;
        if (p && typeof p === 'object') {
          const ids = p.node_ids;
          if (Array.isArray(ids) && ids[0]) return String(ids[0]).trim();
          const one = String(p.node_id || '').trim();
          if (one) return one;
        }
      }
    }
  }
  const fromFailure = resolveFocusNodeIdFromFailurePayload(event);
  if (fromFailure) return fromFailure;
  return undefined;
}

/**
 * @param {unknown} event
 * @param {{ errorCode?: string }} [opts]
 * @returns {{ executionIntent?: string, focusNodeId?: string }}
 */
export function semanticAnchorCliFlags(event, { errorCode } = {}) {
  const { projectId, steps } = extractExecuteBatchFromEvent(event);
  const roots = [event?.arguments, event?.params].filter((r) => r && typeof r === 'object');
  let options = {};
  for (const root of roots) {
    if (root.options && typeof root.options === 'object') {
      options = root.options;
      break;
    }
  }
  const needs =
    shouldSemanticAnchorRetry(event, errorCode) || batchNeedsSemanticAnchor(steps, options);
  if (!needs) return {};
  const focusNodeId = resolveFocusNodeIdForBridge(event);
  if (!focusNodeId && !projectId) return {};
  return {
    executionIntent: 'direct',
    ...(focusNodeId ? { focusNodeId } : {}),
  };
}

/**
 * @param {unknown} event
 * @returns {{ projectId?: number, steps: { action: string, params?: object }[] }}
 */
export function extractExecuteBatchFromEvent(event) {
  const roots = [
    event?.params,
    event?.arguments,
    event?.toolInput,
    event?.arguments?.params,
    event?.toolInput?.params,
    event?.input,
    event?.input?.params,
  ].filter((r) => r && typeof r === 'object');

  for (const root of roots) {
    if (Array.isArray(root.steps) && root.steps.length) {
      const steps = root.steps
        .map((s) => ({
          action: typeof s?.action === 'string' ? s.action : '',
          params: s?.params && typeof s.params === 'object' ? s.params : undefined,
        }))
        .filter((s) => s.action.includes('.'));
      const ctx = root.context && typeof root.context === 'object' ? root.context : {};
      const pid = Number(ctx.project_id ?? root.project_id);
      return {
        projectId: Number.isFinite(pid) && pid > 0 ? pid : undefined,
        steps,
      };
    }
  }

  const actions = extractMcpExecuteSteps(event);
  const steps = actions.map((action) => ({ action }));
  let projectId;
  for (const root of roots) {
    const ctx = root.context && typeof root.context === 'object' ? root.context : {};
    const pid = Number(ctx.project_id ?? root.project_id);
    if (Number.isFinite(pid) && pid > 0) {
      projectId = pid;
      break;
    }
  }
  return { projectId, steps };
}

/**
 * Shell-safe one-liner (PowerShell: wrap outer string in single quotes).
 * @param {unknown} event
 * @param {{ scriptPath?: string, errorCode?: string }} [opts]
 * @returns {string|null}
 */
export function buildMcpExecuteRetryCommand(event, { scriptPath, errorCode } = {}) {
  const { projectId, steps } = extractExecuteBatchFromEvent(event);
  if (!steps.length) return null;
  const script = scriptPath || MCP_EXECUTE_DOC_PATH;
  const first = steps[0];
  const paramsJson =
    first.params && Object.keys(first.params).length
      ? JSON.stringify(first.params)
      : null;
  const pidFlag =
    projectId != null ? ` --project-id ${projectId}` : '';
  const anchor = semanticAnchorCliFlags(event, { errorCode });
  const anchorFlags = [
    anchor.executionIntent ? ` --execution-intent ${anchor.executionIntent}` : '',
    anchor.focusNodeId ? ` --focus-node-id ${anchor.focusNodeId}` : '',
  ].join('');
  if (steps.length === 1) {
    const paramsPart = paramsJson ? ` --params '${paramsJson.replace(/'/g, "'\\''")}'` : '';
    return `node ${script}${pidFlag}${anchorFlags} ${first.action}${paramsPart}`;
  }
  const batch = {
    context: projectId != null ? { project_id: projectId } : undefined,
    options: {
      ...(anchor.executionIntent ? { execution_intent: anchor.executionIntent } : {}),
      ...(anchor.focusNodeId ? { focus_node_id: anchor.focusNodeId } : {}),
    },
    steps: steps.map((s, i) => ({
      id: String(i + 1),
      action: s.action,
      ...(s.params ? { params: s.params } : {}),
    })),
  };
  const batchJson = JSON.stringify(batch);
  return `echo '${batchJson.replace(/'/g, "'\\''")}' | node ${script}`;
}
