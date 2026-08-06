#!/usr/bin/env node
// hooks/scripts/pre-mcp-cap-check.mjs
// beforeMCPExecution — hint required_cap from local flat snapshot (non-blocking).

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { stdin } from 'node:process';
import { actionsFromSnapshot } from '../../lib/plugin-kernel/mcpActionsCatalog.mjs';
import { extractMcpAction } from '../../lib/plugin-kernel/extractMcpAction.mjs';

const SNAPSHOT_PATH = join(homedir(), '.cursor', 'agentstack-capabilities.json');

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

function extractAction(event) {
  return extractMcpAction(event);
}

async function main() {
  const event = await readStdinJson();
  if (!event) process.exit(0);
  const action = extractAction(event);
  if (!action || !String(action).includes('.')) process.exit(0);

  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'));
  } catch {
    process.exit(0);
  }

  const actions = actionsFromSnapshot(snapshot);
  const row = actions.find((a) => a.action === action || a.safe_action === action);
  if (row?.required_cap) {
    console.error(`[agentstack] action ${action} requires cap ${row.required_cap}`);
  }
  process.exit(0);
}

main().catch(() => process.exit(0));
