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
import { join } from 'node:path';
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

const MCP_PATH = join(homedir(), '.cursor', 'mcp.json');

function usage() {
  console.error(`Usage:
  node scripts/mcp-execute.mjs <action> [--params JSON]
  node scripts/mcp-execute.mjs --project-id <pid> <action> [--params JSON]
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

function parseArgs(argv) {
  let projectId;
  let file;
  let executionIntent;
  let focusNodeId;
  let planExecuteMode;
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
    if (a === '--help' || a === '-h') return { help: true };
    rest.push(a);
  }
  return { projectId, file, executionIntent, focusNodeId, planExecuteMode, rest, help: false };
}

async function loadBatch({
  projectId,
  file,
  rest,
  executionIntent,
  focusNodeId,
  planExecuteMode,
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
  if (paramsIdx >= 0 && rest[paramsIdx + 1]) {
    params = JSON.parse(rest[paramsIdx + 1]);
  }
  const options = { stopOnError: true };
  if (executionIntent) {
    options.execution_intent = executionIntent;
  }
  if (focusNodeId) {
    options.focus_node_id = focusNodeId;
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
  });
  if (projectId && Number.isFinite(projectId) && !batch.context) {
    batch.context = { project_id: projectId };
  }
  const baseUrl = resolveMcpBaseUrl(cfg);
  const out = await postAgentstackExecute(baseUrl, authHeaders, batch);
  console.log(JSON.stringify(out, null, 2));
}

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
