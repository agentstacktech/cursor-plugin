#!/usr/bin/env node
// Optional: wire to beforeMCPExecution when Cursor build supports it.
// Policy-as-data cap hint using ~/.cursor/agentstack-capabilities.json

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { stdin } from 'node:process';

const SNAPSHOT_PATH = join(homedir(), '.cursor', 'agentstack-capabilities.json');

async function readStdinJson() {
  return new Promise((resolve) => {
    let data = '';
    stdin.setEncoding('utf8');
    stdin.on('data', (c) => { data += c; });
    stdin.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    setTimeout(() => resolve(null), 200);
  });
}

async function main() {
  const event = await readStdinJson();
  if (!event) process.exit(0);
  const action =
    event.params?.steps?.[0]?.action ||
    event.params?.action ||
    event.action;
  if (!action || !String(action).includes('.')) process.exit(0);

  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'));
  } catch {
    process.exit(0);
  }
  const row = (snapshot.actions || []).find((a) => a.action === action);
  if (row?.required_cap) {
    console.error(`[agentstack] action ${action} requires cap ${row.required_cap}`);
  }
  process.exit(0);
}

main().catch(() => process.exit(0));
