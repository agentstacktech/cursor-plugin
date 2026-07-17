#!/usr/bin/env node
// hooks/scripts/post-tool-telemetry.mjs
// Opt-in only: writes local JSONL and uploads when agentstack.sendTelemetry is true.
// Gene: repo.plugins.cursor.gen3 · privacy: no buffer when opt-in is off.

import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { stdin } from 'node:process';

const CURSOR_DIR = join(homedir(), '.cursor');
const SETTINGS_PATH = join(CURSOR_DIR, 'settings.json');
const BUFFER_PATH = join(CURSOR_DIR, 'agentstack-telemetry.jsonl');
const FLUSH_MARK_PATH = join(CURSOR_DIR, 'agentstack-telemetry.last-flush');
const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const MAX_LINES = 500;
const FLUSH_INTERVAL_MS = 60 * 60 * 1000;
const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

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
    stdin.on('error', () => resolve(null));
    setTimeout(() => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    }, 200);
  });
}

async function readSettings() {
  try {
    return JSON.parse(await readFile(SETTINGS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function isOptIn(settings) {
  return (
    settings['agentstack.sendTelemetry'] === true ||
    settings.agentstack?.sendTelemetry === true
  );
}

async function readPluginVersion() {
  try {
    const pj = JSON.parse(await readFile(join(PLUGIN_ROOT, '.cursor-plugin/plugin.json'), 'utf8'));
    return pj.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function redact(text) {
  return String(text || '')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/ask_[A-Za-z0-9_-]{8,}/g, 'ask_[redacted]')
    .slice(0, 200);
}

async function append(entry) {
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
    /* Windows ACL — see SECURITY.md */
  }
}

async function maybeFlush(version) {
  let last = 0;
  try {
    last = Number((await readFile(FLUSH_MARK_PATH, 'utf8')).trim()) || 0;
  } catch {
    /* first flush */
  }
  if (Date.now() - last < FLUSH_INTERVAL_MS) return;

  let content = '';
  try {
    content = await readFile(BUFFER_PATH, 'utf8');
  } catch {
    return;
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
  if (!lines.length) return;

  let auth = '';
  try {
    const mcp = JSON.parse(await readFile(join(CURSOR_DIR, 'mcp.json'), 'utf8'));
    auth = mcp?.mcpServers?.agentstack?.headers?.Authorization || '';
  } catch {
    return;
  }
  if (!auth) return;

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
    /* next hour / sessionEnd */
  }
}

async function main() {
  const event = await readStdinJson();
  if (!event) process.exit(0);

  const settings = await readSettings();
  if (!isOptIn(settings)) process.exit(0);

  const toolName = event.tool || event.tool_name || '';
  const isAgentStack = toolName.includes('agentstack') || toolName === 'mcp_agentstack';
  if (!isAgentStack) process.exit(0);

  const version = await readPluginVersion();
  const entry = {
    ts: Date.now(),
    tool: toolName,
    action: event.params?.steps?.[0]?.action || event.params?.action || null,
    success: event.success !== false && !event.error,
    duration_ms: event.duration_ms || null,
    trace_id: event.response_headers?.['x-trace-id'] || event.trace_id || null,
    error: event.error ? redact(event.error) : null,
    plugin_version: version,
    layer: 'hook',
    gene_tag: 'repo.plugins.cursor.gen3',
  };

  await append(entry);
  await maybeFlush(version);
  process.exit(0);
}

main().catch(() => process.exit(0));
