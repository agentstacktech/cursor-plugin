#!/usr/bin/env node
// hooks/scripts/post-tool-failure.mjs
// Structured failure hint → local opt-in buffer. Gene: repo.plugins.hooks.contract.gen1

import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { recoveryHintForCode } from '../../lib/plugin-kernel/canonicalCopy.mjs';
import { readHookStdinJson } from '../../lib/plugin-kernel/hookStdin.mjs';
import {
  buildMcpExecuteRetryCommand,
  shouldSemanticAnchorRetry,
} from '../../lib/plugin-kernel/mcpExecuteBridge.mjs';

const CURSOR_DIR = join(homedir(), '.cursor');
const SETTINGS_PATH = join(CURSOR_DIR, 'settings.json');
const BUFFER_PATH = join(CURSOR_DIR, 'agentstack-telemetry.jsonl');
const MAX_LINES = 500;

function normalizeErrText(event) {
  const candidates = [
    event.error,
    event.message,
    event.result,
    event.result?.error,
    event.result?.message,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.slice(0, 400);
    if (c && typeof c === 'object') {
      try {
        return JSON.stringify(c).slice(0, 400);
      } catch {
        /* skip */
      }
    }
  }
  const hint =
    event.recovery_hint ||
    event.result?.recovery_hint ||
    event.error?.recovery_hint;
  if (typeof hint === 'string' && hint.trim()) return hint.slice(0, 400);
  return 'unknown';
}

function extractErrorCode(event, errText) {
  const direct =
    event.error_code ||
    event.code ||
    event.result?.error_code ||
    event.result?.error?.code ||
    event.result?.code;
  if (typeof direct === 'string' && direct) return direct;
  try {
    const parsed = typeof errText === 'string' ? JSON.parse(errText) : null;
    const fromJson =
      parsed?.error_code || parsed?.code || parsed?.error?.code || parsed?.error?.error_code;
    if (typeof fromJson === 'string' && fromJson) return fromJson;
  } catch {
    const m = errText.match(/"error_code"\s*:\s*"([^"]+)"/);
    if (m?.[1]) return m[1];
  }
  if (/rbac_blocked/i.test(errText)) return 'rbac_blocked';
  if (/not_authenticated/i.test(errText)) return 'not_authenticated';
  if (/\bunauthorized\b/i.test(errText) || /User not authenticated/i.test(errText)) {
    return 'unauthorized';
  }
  if (/\bauth_required\b/i.test(errText)) return 'auth_required';
  if (/service_caps_required_in_prod/i.test(errText)) return 'service_caps_required_in_prod';
  if (/mcp_sync_heavy_limit/i.test(errText)) return 'mcp_sync_heavy_limit';
  if (/hosted_cookie_missing|hosted_session_mint_failed/i.test(errText)) {
    return 'hosted_cookie_missing';
  }
  return null;
}

function isAgentstackMcpTool(event) {
  const id = String(
    event.toolName || event.tool || event.namespace || event.mcpServerName || '',
  );
  return /agentstack|mcp_execute|plugin-agentstack/i.test(id);
}

async function main() {
  const event = await readHookStdinJson();
  if (!event) process.exit(0);

  let settings = {};
  try {
    settings = JSON.parse(await readFile(SETTINGS_PATH, 'utf8'));
  } catch {
    /* no settings */
  }
  const traceId =
    event.traceId ||
    event.trace_id ||
    event.headers?.['x-trace-id'] ||
    event.headers?.['X-Trace-Id'] ||
    null;
  const traceHint = traceId ? ` X-Trace-Id: ${traceId}.` : '';

  const errText = normalizeErrText(event);
  let errorCode = extractErrorCode(event, errText);
  const authTrap =
    isAgentstackMcpTool(event) &&
    (errorCode === 'not_authenticated' ||
      errorCode === 'unauthorized' ||
      errorCode === 'auth_required' ||
      /not_authenticated|unauthorized|User not authenticated/i.test(errText));
  if (authTrap && !errorCode) errorCode = 'not_authenticated';

  const recoveryLine = errorCode ? recoveryHintForCode(errorCode) : null;
  if (recoveryLine) {
    console.error(`[agentstack] ${recoveryLine}`);
  }
  if (errorCode === 'not_authenticated') {
    const syncHint = recoveryHintForCode('dual_surface_bearer_sync');
    if (syncHint) console.error(`[agentstack] ${syncHint}`);
  } else if (authTrap) {
    const fallback = recoveryHintForCode('not_authenticated');
    if (fallback) console.error(`[agentstack] ${fallback}`);
  }
  const anchorTrap =
    isAgentstackMcpTool(event) && shouldSemanticAnchorRetry(event, errorCode);
  if (authTrap || anchorTrap) {
    const retryCli = buildMcpExecuteRetryCommand(event, { errorCode });
    if (retryCli) {
      const label = authTrap ? 'Bearer bridge (same batch)' : 'Semantic anchor retry';
      console.error(`[agentstack] ${label}: ${retryCli}`);
    }
  }

  const optIn = !!(settings.agentstack?.sendTelemetry || settings['agentstack.sendTelemetry']);
  if (!optIn) {
    console.error(`[agentstack] tool failure — run /agentstack-diagnose.${traceHint}`);
    process.exit(0);
  }

  const entry = {
    ts: new Date().toISOString(),
    kind: 'tool_failure',
    tool: event.toolName || event.tool || 'unknown',
    action: event.params?.steps?.[0]?.action || event.action || null,
    success: false,
    error: errText.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]'),
    trace_id: traceId,
    error_code: errorCode,
    hint: recoveryLine || recoveryHintForCode('not_authenticated') || 'Run /agentstack-diagnose',
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
  console.error(`[agentstack] tool failure recorded — run /agentstack-diagnose.${traceHint}`);
  process.exit(0);
}

main().catch(() => process.exit(0));
