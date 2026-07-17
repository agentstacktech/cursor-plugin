#!/usr/bin/env node
// hooks/scripts/session-end.mjs
// Flush opt-in telemetry buffer on session end. Gene: repo.plugins.hooks.contract.gen1

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const CURSOR_DIR = join(homedir(), '.cursor');
const SETTINGS_PATH = join(CURSOR_DIR, 'settings.json');
const BUFFER_PATH = join(CURSOR_DIR, 'agentstack-telemetry.jsonl');
const FLUSH_MARK_PATH = join(CURSOR_DIR, 'agentstack-telemetry.last-flush');
const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

async function readPluginVersion() {
  try {
    const pj = JSON.parse(await readFile(join(PLUGIN_ROOT, '.cursor-plugin/plugin.json'), 'utf8'));
    return pj.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function main() {
  let settings = {};
  try {
    settings = JSON.parse(await readFile(SETTINGS_PATH, 'utf8'));
  } catch {
    process.exit(0);
  }
  if (!settings.agentstack?.sendTelemetry && !settings['agentstack.sendTelemetry']) {
    process.exit(0);
  }

  let content = '';
  try {
    content = await readFile(BUFFER_PATH, 'utf8');
  } catch {
    process.exit(0);
  }
  const lines = content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (!lines.length) process.exit(0);

  let auth = '';
  try {
    const mcp = JSON.parse(await readFile(join(CURSOR_DIR, 'mcp.json'), 'utf8'));
    auth = mcp?.mcpServers?.agentstack?.headers?.Authorization || '';
  } catch {
    process.exit(0);
  }
  if (!auth) process.exit(0);

  const version = await readPluginVersion();
  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/plugin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ plugin: 'cursor-plugin', version, events: lines }),
    });
    if (res.ok) {
      await writeFile(BUFFER_PATH, '', 'utf8');
      await writeFile(FLUSH_MARK_PATH, String(Date.now()), 'utf8');
    }
  } catch {
    /* keep buffer for next session */
  }
  process.exit(0);
}

main().catch(() => process.exit(0));
