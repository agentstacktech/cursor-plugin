#!/usr/bin/env node
// hooks/scripts/post-tool-telemetry.mjs
// Logs AgentStack MCP tool calls to a local JSONL buffer.
// Opt-in upload: when `agentstack.sendTelemetry: true` in ~/.cursor/settings.json,
// batches are posted to /api/telemetry/plugin once per hour.
// Buffer is capped at 500 lines (rolled file-style).

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { stdin } from 'node:process';

const CURSOR_DIR = join(homedir(), '.cursor');
const SETTINGS_PATH = join(CURSOR_DIR, 'settings.json');
const BUFFER_PATH = join(CURSOR_DIR, 'agentstack-telemetry.jsonl');
const FLUSH_MARK_PATH = join(CURSOR_DIR, 'agentstack-telemetry.last-flush');
const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const MAX_LINES = 500;
const FLUSH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function readStdinJson() {
  return new Promise((resolve) => {
    let data = '';
    stdin.setEncoding('utf8');
    stdin.on('data', c => { data += c; });
    stdin.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    stdin.on('error', () => resolve(null));
    setTimeout(() => { try { resolve(data ? JSON.parse(data) : null); } catch { resolve(null); } }, 200);
  });
}

async function readSettings() {
  try { return JSON.parse(await readFile(SETTINGS_PATH, 'utf8')); } catch { return {}; }
}

async function readMcp() {
  try { return JSON.parse(await readFile(join(CURSOR_DIR, 'mcp.json'), 'utf8')); } catch { return null; }
}

async function append(entry) {
  await mkdir(CURSOR_DIR, { recursive: true });
  let existing = '';
  try { existing = await readFile(BUFFER_PATH, 'utf8'); } catch {}
  const lines = existing ? existing.trimEnd().split('\n') : [];
  lines.push(JSON.stringify(entry));
  const trimmed = lines.slice(-MAX_LINES).join('\n') + '\n';
  await writeFile(BUFFER_PATH, trimmed, 'utf8');
}

async function maybeFlush(opts) {
  if (!opts.sendTelemetry) return;
  let last = 0;
  try { last = Number((await readFile(FLUSH_MARK_PATH, 'utf8')).trim()) || 0; } catch {}
  if (Date.now() - last < FLUSH_INTERVAL_MS) return;

  let content = '';
  try { content = await readFile(BUFFER_PATH, 'utf8'); } catch { return; }
  const lines = content.trim().split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (!lines.length) return;

  const mcp = await readMcp();
  const auth = mcp?.mcpServers?.agentstack?.headers?.Authorization;
  if (!auth) return; // not authed; keep buffering

  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/plugin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({ plugin: 'cursor-plugin', version: '0.4.9', events: lines }),
    });
    if (res.ok) {
      await writeFile(BUFFER_PATH, '', 'utf8');
      await writeFile(FLUSH_MARK_PATH, String(Date.now()), 'utf8');
    }
  } catch { /* next hour */ }
}

async function main() {
  const event = await readStdinJson();
  if (!event) process.exit(0);

  const toolName = event.tool || event.tool_name || '';
  const isAgentStack = toolName.includes('agentstack') || toolName === 'mcp_agentstack';
  if (!isAgentStack) process.exit(0);

  const entry = {
    ts: Date.now(),
    tool: toolName,
    action: event.params?.steps?.[0]?.action || event.params?.action || null,
    success: event.success !== false && !event.error,
    duration_ms: event.duration_ms || null,
    trace_id: event.response_headers?.['x-trace-id'] || event.trace_id || null,
    error: event.error ? String(event.error).slice(0, 500) : null,
  };

  await append(entry);

  const settings = await readSettings();
  await maybeFlush({ sendTelemetry: settings['agentstack.sendTelemetry'] === true });
  process.exit(0);
}

main().catch(() => process.exit(0));
