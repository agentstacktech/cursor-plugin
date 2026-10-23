#!/usr/bin/env node
// beforeMCPExecution — Device Code Bearer in ~/.cursor/mcp.json while call uses plugin MCP (D-2, no network).
// Gene: repo.plugins.hooks.contract.gen1

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { stdin } from 'node:process';
import { extractMcpExecuteSteps } from '../../lib/plugin-kernel/extractMcpAction.mjs';
import {
  agentstackAuthHeaders,
  describeAgentstackAuthGate,
} from '../../lib/plugin-kernel/mcpConfig.mjs';
import { buildMcpExecuteRetryCommand } from '../../lib/plugin-kernel/mcpExecuteBridge.mjs';

const MCP_PATH = join(homedir(), '.cursor', 'mcp.json');

async function readStdinJson() {
  return new Promise((resolve) => {
    let data = '';
    stdin.setEncoding('utf8');
    stdin.on('data', (c) => {
      data += c;
    });
    stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
    setTimeout(() => resolve(null), 200);
  });
}

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
  const event = await readStdinJson();
  if (!event) process.exit(0);
  if (!extractMcpExecuteSteps(event).length) process.exit(0);
  if (!isPluginAgentstackMcp(event)) process.exit(0);

  const cfg = await readMcp();
  const authHeaders = agentstackAuthHeaders(cfg);
  if (!authHeaders) process.exit(0);
  if (describeAgentstackAuthGate(cfg).kind !== 'ok') process.exit(0);

  const strict =
    process.env.AGENTSTACK_PLUGIN_AUTH_BRIDGE_STRICT === '1' ||
    process.env.AGENTSTACK_PLUGIN_AUTH_BRIDGE_STRICT === 'true';

  const retryCli = buildMcpExecuteRetryCommand(event);
  process.stderr.write(
    '[agentstack] plugin MCP is unsigned; ~/.cursor/mcp.json has Bearer — use CLI bridge or Connect (G-A174). ' +
      'Do not call mcp_auth from agents.\n',
  );
  if (retryCli) {
    process.stderr.write(`[agentstack] ${retryCli}\n`);
  }
  process.exit(strict ? 1 : 0);
}

main().catch(() => process.exit(0));
