#!/usr/bin/env node
// hooks/scripts/post-tool-failure.mjs
// Structured failure hint → local opt-in buffer. Gene: repo.plugins.hooks.contract.gen1

import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { stdin } from 'node:process';

const CURSOR_DIR = join(homedir(), '.cursor');
const SETTINGS_PATH = join(CURSOR_DIR, 'settings.json');
const BUFFER_PATH = join(CURSOR_DIR, 'agentstack-telemetry.jsonl');
const MAX_LINES = 500;

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
    setTimeout(() => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    }, 200);
  });
}

async function main() {
  const event = await readStdinJson();
  if (!event) process.exit(0);

  let settings = {};
  try {
    settings = JSON.parse(await readFile(SETTINGS_PATH, 'utf8'));
  } catch {
    /* no settings */
  }
  const optIn = !!(settings.agentstack?.sendTelemetry || settings['agentstack.sendTelemetry']);
  if (!optIn) {
    // Still print a short stderr hint for the agent/user
    console.error('[agentstack] tool failure — run /agentstack-diagnose');
    process.exit(0);
  }

  const errText = String(event.error || event.message || event.result || 'unknown').slice(0, 200);
  const entry = {
    ts: new Date().toISOString(),
    kind: 'tool_failure',
    tool: event.toolName || event.tool || 'unknown',
    action: event.params?.steps?.[0]?.action || event.action || null,
    success: false,
    error: errText.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]'),
    hint: 'Run /agentstack-diagnose',
  };

  await mkdir(CURSOR_DIR, { recursive: true });
  let existing = '';
  try {
    existing = await readFile(BUFFER_PATH, 'utf8');
  } catch {
    /* empty */
  }
  const lines = existing ? existing.trimEnd().split('\n') : [];
  lines.push(JSON.stringify(entry));
  await writeFile(BUFFER_PATH, `${lines.slice(-MAX_LINES).join('\n')}\n`, 'utf8');
  try {
    await chmod(BUFFER_PATH, 0o600);
  } catch {
    /* Windows */
  }
  console.error('[agentstack] tool failure recorded — run /agentstack-diagnose');
  process.exit(0);
}

main().catch(() => process.exit(0));
