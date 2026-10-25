#!/usr/bin/env node
// hooks/scripts/pre-mcp-cap-check.mjs
// beforeMCPExecution — hint required_cap from local flat snapshot (non-blocking).

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { actionsFromSnapshot } from '../../lib/plugin-kernel/mcpActionsCatalog.mjs';
import { extractMcpExecuteSteps } from '../../lib/plugin-kernel/extractMcpAction.mjs';
import { readHookStdinJson } from '../../lib/plugin-kernel/hookStdin.mjs';

const SNAPSHOT_PATH = join(homedir(), '.cursor', 'agentstack-capabilities.json');

async function main() {
  const event = await readHookStdinJson();
  if (!event) process.exit(0);
  const stepActions = extractMcpExecuteSteps(event);
  if (!stepActions.length) process.exit(0);

  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'));
  } catch {
    console.error(
      '[agentstack] no capability snapshot — sessionStart or /agentstack-authorize refreshes ~/.cursor/agentstack-capabilities.json',
    );
    process.exit(0);
  }

  const catalogActions = actionsFromSnapshot(snapshot);
  const seen = new Set();
  for (const action of stepActions) {
    if (!action || !String(action).includes('.') || seen.has(action)) continue;
    seen.add(action);
    const row = catalogActions.find((a) => a.action === action || a.safe_action === action);
    if (row?.required_cap) {
      console.error(`[agentstack] action ${action} requires cap ${row.required_cap}`);
    }
  }
  process.exit(0);
}

main().catch(() => process.exit(0));
