#!/usr/bin/env node
// beforeMCPExecution — Device Code Bearer in ~/.cursor/mcp.json while call uses plugin MCP (D-2, no network).
// Gene: repo.plugins.hooks.contract.gen1

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { extractMcpExecuteSteps } from '../../lib/plugin-kernel/extractMcpAction.mjs';
import { readHookStdinJson } from '../../lib/plugin-kernel/hookStdin.mjs';
import {
  agentstackAuthHeaders,
  describeAgentstackAuthGate,
} from '../../lib/plugin-kernel/mcpConfig.mjs';
import { buildMcpExecuteRetryCommand } from '../../lib/plugin-kernel/mcpExecuteBridge.mjs';
import { pluginCacheBearerDrifted } from '../../lib/plugin-kernel/pluginMcpRuntimeSync.mjs';

const MCP_PATH = join(homedir(), '.cursor', 'mcp.json');

function isPluginAgentstackMcp(event) {
  const id = String(
    event?.namespace ||
      event?.server ||
      event?.mcpServerName ||
      event?.mcpServer ||
      event?.serverName ||
      '',
  );
  return /plugin-agentstack/i.test(id);
}

async function readMcp() {
  try {
    return JSON.parse(await readFile(MCP_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const event = await readHookStdinJson();
  if (!event) process.exit(0);
  if (!extractMcpExecuteSteps(event).length) process.exit(0);
  if (!isPluginAgentstackMcp(event)) process.exit(0);

  const cfg = await readMcp();
  const gate = describeAgentstackAuthGate(cfg);
  if (gate.kind !== 'ok') process.exit(0);
  if (gate.authMode === 'api_key') process.exit(0);

  const authHeaders = agentstackAuthHeaders(cfg);
  if (!authHeaders) process.exit(0);

  if (!(await pluginCacheBearerDrifted(cfg))) {
    process.exit(0);
  }

  const strict =
    process.env.AGENTSTACK_PLUGIN_AUTH_BRIDGE_STRICT === '1' ||
    process.env.AGENTSTACK_PLUGIN_AUTH_BRIDGE_STRICT === 'true';
  const hintOptOut =
    process.env.AGENTSTACK_PLUGIN_AUTH_BRIDGE_HINT === '0' ||
    process.env.AGENTSTACK_PLUGIN_AUTH_BRIDGE_HINT === 'false';
  const hint =
    strict ||
    process.env.AGENTSTACK_PLUGIN_AUTH_BRIDGE_HINT === '1' ||
    process.env.AGENTSTACK_PLUGIN_AUTH_BRIDGE_HINT === 'true';
  if (!hint) process.exit(0);

  const retryCli = buildMcpExecuteRetryCommand(event);
  process.stderr.write(
    '[agentstack] DUAL_SURFACE: plugin mcp.json has a static Bearer, which blocks OAuth Connect. ' +
      'It will be reset to URL-only. Click Connect (G-A174). ' +
      'Device Code and X-API-Key stay in ~/.cursor/mcp.json. Do not call mcp_auth from agents.\n',
  );
  if (retryCli) {
    process.stderr.write(`[agentstack] ${retryCli}\n`);
  }
  process.exit(strict ? 1 : 0);
}

main().catch(() => process.exit(0));
