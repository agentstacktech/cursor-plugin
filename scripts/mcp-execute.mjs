#!/usr/bin/env node
/**
 * Run agentstack.execute using Bearer from ~/.cursor/mcp.json (Device Code / PAT).
 * Use when plugin-agentstack-* MCP is unsigned but hooks already authorized user-agentstack.
 *
 * Usage:
 *   node scripts/mcp-execute.mjs auth.get_profile
 *   node scripts/mcp-execute.mjs --project-id 1 agents.plan_get
 *   node scripts/mcp-execute.mjs --file batch.json
 *   echo '{"steps":[...]}' | node scripts/mcp-execute.mjs
 */
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import {
  agentstackAuthHeaders,
  describeAgentstackAuthGate,
  describeAgentstackMcpAuth,
  formatAgentstackStatusCard,
} from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';
import { readHookStdinJson } from '../plugins/agentstack/lib/plugin-kernel/hookStdin.mjs';
import {
  postAgentstackExecute,
  resolveMcpBaseUrl,
} from '../plugins/agentstack/lib/plugin-kernel/mcpExecuteHttp.mjs';
import { ensureDirectExecutionIntent } from '../plugins/agentstack/lib/plugin-kernel/batchSemanticAnchor.mjs';

const MCP_PATH = join(homedir(), '.cursor', 'mcp.json');
const _SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const _HUB_ACTIONS_JSON = join(
  _SCRIPT_DIR,
  '..',
  '..',
  '..',
  'shared',
  'fixtures',
  'mcp_ecosystem_hub_actions.v1.json',
);

function loadEcosystemHubActions() {
  try {
    const raw = JSON.parse(readFileSync(_HUB_ACTIONS_JSON, 'utf8'));
    return new Set(Array.isArray(raw.actions) ? raw.actions : []);
  } catch {
    return new Set(['bots.bus.deliver', 'bots.bus.send', 'bots.bus.whoami']);
  }
}

function usage() {
  console.error(`Usage:
  node scripts/mcp-execute.mjs <action> [key=value ...] [--params JSON]
  node scripts/mcp-execute.mjs --project-id <pid> <action> [key=value ...] [--params JSON | --params @file.json | --params-file path]
  node scripts/mcp-execute.mjs --project-id 1 --execution-intent direct --focus-node-id <id> agents.plan_claim --params '{...}'
  node scripts/mcp-execute.mjs --file batch.json
  cat batch.json | node scripts/mcp-execute.mjs

  --help  Auth gate summary from ~/.cursor/mcp.json (exit 0).`);
}

function printAuthHelpAndExit(cfg) {
  const gate = describeAgentstackAuthGate(cfg);
  const claims = describeAgentstackMcpAuth(cfg);
  console.log(
    formatAgentstackStatusCard({
      gateKind: gate.kind,
      additionalContext: gate.additionalContext,
      auth: claims,
    }),
  );
  process.exit(gate.kind === 'ok' ? 0 : 1);
}

/** File bodies and ids stay strings. `{` in content is JSON text, not an object param. */
const STRING_CLI_PARAM_KEYS = new Set([
  'content',
  'unified_diff',
  'find',
  'replace',
  'path',
  'bucket_id',
  'bucket_name',
  'source_url',
  'expected_sha256',
  'message',
  'why',
]);

function coerceCliParamValue(raw, key = '') {
  const asString = String(raw ?? '');
  if (STRING_CLI_PARAM_KEYS.has(String(key))) return asString;
  const v = asString.trim();
  if (
    (v.startsWith('{') && v.endsWith('}')) ||
    (v.startsWith('[') && v.endsWith(']'))
  ) {
    try {
      return JSON.parse(v);
    } catch {
      /* fall through */
    }
  }
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  if (/^-?\d+$/.test(v)) {
    const n = Number(v);
    if (Number.isSafeInteger(n)) return n;
  }
  return v;
}

/** `agents.plan_get node_id=pl-abc detail=compact` — merges with --params JSON. */
function parseKeyValueRestParams(rest, { paramsIdx = -1 } = {}) {
  const out = {};
  if (!Array.isArray(rest)) return out;
  let i = 0;
  while (i < rest.length) {
    const t = rest[i];
    if (t === '--params') {
      i += 2;
      continue;
    }
    if (typeof t !== 'string' || t.startsWith('--')) {
      i += 1;
      continue;
    }
    if (paramsIdx >= 0 && i === paramsIdx) {
      i += 1;
      continue;
    }
    const eq = t.indexOf('=');
    if (eq <= 0) {
      i += 1;
      continue;
    }
    const key = t.slice(0, eq).trim();
    if (key) out[key] = coerceCliParamValue(t.slice(eq + 1), key);
    i += 1;
  }
  return out;
}

async function parseParamsArg(rest, paramsIdx) {
  if (paramsIdx < 0 || !rest[paramsIdx + 1]) {
    return {};
  }
  const token = rest[paramsIdx + 1];
  if (token === '@-' || token === '-') {
    const piped = await readHookStdinJson({ timeoutMs: 2000 });
    if (piped && typeof piped === 'object') {
      return piped;
    }
    throw new Error('Expected JSON on stdin for --params @-');
  }
  if (token.startsWith('@')) {
    const p = token.slice(1);
    return JSON.parse(await readFile(p, 'utf8'));
  }
  return JSON.parse(token);
}

function parseArgs(argv) {
  let projectId;
  let file;
  let executionIntent;
  let focusNodeId;
  let planExecuteMode;
  let paramsFile;
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project-id' && argv[i + 1]) {
      projectId = Number(argv[++i]);
      continue;
    }
    if (a === '--file' && argv[i + 1]) {
      file = argv[++i];
      continue;
    }
    if (a === '--execution-intent' && argv[i + 1]) {
      executionIntent = String(argv[++i]);
      continue;
    }
    if (a === '--focus-node-id' && argv[i + 1]) {
      focusNodeId = String(argv[++i]);
      continue;
    }
    if (a === '--plan-execute-mode') {
      planExecuteMode = true;
      continue;
    }
    if (a === '--params-file' && argv[i + 1]) {
      paramsFile = argv[++i];
      continue;
    }
    if (a === '--help' || a === '-h') return { help: true };
    rest.push(a);
  }
  return {
    projectId,
    file,
    executionIntent,
    focusNodeId,
    planExecuteMode,
    paramsFile,
    rest,
    help: false,
  };
}

async function loadBatch({
  projectId,
  file,
  rest,
  executionIntent,
  focusNodeId,
  planExecuteMode,
  paramsFile,
}) {
  if (file) {
    const batch = JSON.parse(await readFile(file, 'utf8'));
    batch.options = batch.options && typeof batch.options === 'object' ? batch.options : {};
    if (executionIntent) {
      batch.options.execution_intent = executionIntent;
    }
    if (focusNodeId) {
      batch.options.focus_node_id = focusNodeId;
    }
    if (planExecuteMode) {
      batch.options.plan_execute_mode = true;
    }
    return batch;
  }
  const piped = await readHookStdinJson({ timeoutMs: 500 });
  if (piped && typeof piped === 'object' && Array.isArray(piped.steps)) {
    return piped;
  }
  if (piped && typeof piped === 'object') {
    return piped;
  }
  const action = rest[0];
  if (!action || !action.includes('.')) {
    usage();
    process.exit(2);
  }
  let params = {};
  const paramsIdx = rest.indexOf('--params');
  if (paramsFile) {
    params = JSON.parse(await readFile(paramsFile, 'utf8'));
  } else if (paramsIdx >= 0) {
    params = await parseParamsArg(rest, paramsIdx);
  }
  params = {
    ...parseKeyValueRestParams(rest.slice(1), { paramsIdx }),
    ...params,
  };
  const options = { stopOnError: true };
  if (executionIntent) {
    options.execution_intent = executionIntent;
  }
  if (focusNodeId) {
    options.focus_node_id = focusNodeId;
    if (!params.focus_node_id && !params.node_id) {
      params.focus_node_id = focusNodeId;
    }
  }
  if (planExecuteMode) {
    options.plan_execute_mode = true;
  }
  const batch = {
    steps: [{ id: 's1', action, params }],
    options,
  };
  if (projectId && Number.isFinite(projectId)) {
    batch.context = { project_id: projectId };
  }
  return batch;
}

async function main() {
  const {
    projectId,
    file,
    executionIntent,
    focusNodeId,
    planExecuteMode,
    paramsFile,
    rest,
    help,
  } = parseArgs(process.argv.slice(2));
  let cfg;
  try {
    cfg = JSON.parse(await readFile(MCP_PATH, 'utf8'));
  } catch {
    console.error(
      'No ~/.cursor/mcp.json — run /agentstack-authorize or click Connect on plugin AgentStack MCP.',
    );
    process.exit(1);
  }
  if (help) printAuthHelpAndExit(cfg);
  const gate = describeAgentstackAuthGate(cfg);
  if (gate.kind !== 'ok') {
    console.error(
      formatAgentstackStatusCard({
        gateKind: gate.kind,
        additionalContext: gate.additionalContext,
        auth: describeAgentstackMcpAuth(cfg),
      }),
    );
    process.exit(1);
  }
  const authHeaders = agentstackAuthHeaders(cfg);
  if (!authHeaders) {
    console.error(
      'No Bearer in mcpServers.agentstack — /agentstack-authorize or plugin MCP Connect (G-A174).',
    );
    process.exit(1);
  }
  const batch = await loadBatch({
    projectId,
    file,
    rest,
    executionIntent,
    focusNodeId,
    planExecuteMode,
    paramsFile,
  });
  if (projectId && Number.isFinite(projectId) && !batch.context) {
    batch.context = { project_id: projectId };
  }
  const anchored = ensureDirectExecutionIntent(batch);
  const ctxPid = Number(anchored?.context?.project_id || projectId || 0);
  const forceScope = process.argv.includes('--force-scope');
  const autoSplit = !process.argv.includes('--no-auto-split');
  const HUB_ACTIONS = loadEcosystemHubActions();
  const ECOSYSTEM_PID = 1;

  function splitHubTenantBatch(batch, tenantPid) {
    const hub = [];
    const tenant = [];
    for (const step of batch.steps || []) {
      if (!step || typeof step !== 'object') continue;
      const sp = Number(step.params?.project_id || tenantPid);
      const act = String(step.action || '');
      if (HUB_ACTIONS.has(act) && sp === ECOSYSTEM_PID) hub.push(step);
      else tenant.push(step);
    }
    if (!hub.length || !tenant.length) return null;
    return [
      { ...batch, context: { ...(batch.context || {}), project_id: ECOSYSTEM_PID }, steps: hub },
      { ...batch, context: { ...(batch.context || {}), project_id: tenantPid }, steps: tenant },
    ];
  }

  if (ctxPid > 0 && Array.isArray(anchored?.steps)) {
    let scopeLeak = false;
    for (const step of anchored.steps) {
      if (!step || typeof step !== 'object') continue;
      const sp = Number(step.params?.project_id || 0);
      if (sp > 0 && sp !== ctxPid) {
        scopeLeak = true;
        const allowedHub =
          HUB_ACTIONS.has(String(step.action || '')) && sp === ECOSYSTEM_PID && ctxPid > 1;
        if (!allowedHub) {
          const msg = `workflow_scope_leak: step.params.project_id=${sp} != context project_id=${ctxPid}`;
          if (forceScope) {
            console.warn(msg);
          } else if (autoSplit) {
            const parts = splitHubTenantBatch(anchored, ctxPid);
            if (parts) {
              console.error(`${msg} — auto-split into ${parts.length} executes (use --no-auto-split to block)`);
              const baseUrl = resolveMcpBaseUrl(cfg);
              const merged = { data: { steps: [] } };
              for (const part of parts) {
                const partOut = await postAgentstackExecute(baseUrl, authHeaders, part);
                const steps = partOut?.data?.steps ?? partOut?.steps ?? [];
                if (Array.isArray(steps)) merged.data.steps.push(...steps);
              }
              for (const step of merged.data.steps) {
                const sug = step?.data?.report_suggested ?? step?.report_suggested;
                if (sug?.next_action?.action === 'diagnostics.report') {
                  console.error(
                    'Hint: MCP returned report_suggested — run diagnostics.report with the prefill payload.',
                  );
                  break;
                }
              }
              console.log(JSON.stringify(merged, null, 2));
              return;
            }
            console.error(msg);
            process.exit(2);
          } else {
            console.error(msg);
            process.exit(2);
          }
        }
      }
    }
    if (scopeLeak && forceScope) {
      // hub+tenant tolerated with --force-scope
    }
  }
  const baseUrl = resolveMcpBaseUrl(cfg);
  const out = await postAgentstackExecute(baseUrl, authHeaders, anchored);
  const steps = out?.data?.steps ?? out?.steps;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      const sug = step?.data?.report_suggested ?? step?.report_suggested;
      if (sug?.next_action?.action === 'diagnostics.report') {
        console.error(
          'Hint: MCP returned report_suggested — run diagnostics.report with the prefill payload.',
        );
        break;
      }
    }
  }
  console.log(JSON.stringify(out, null, 2));
}

export { STRING_CLI_PARAM_KEYS, coerceCliParamValue, parseKeyValueRestParams };

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
main().catch((e) => {
  const msg = String(e?.message || e);
  if (/not_authenticated|unauthorized/i.test(msg)) {
    console.error(
      `${msg}\nHint: plugin-agentstack-* needs Connect; hooks use this CLI with Device Code Bearer.`,
    );
  } else {
    console.error(msg);
  }
  process.exit(1);
});
}
