#!/usr/bin/env node
/**
 * Read-only MCP batch for Harness Lab #1730 (no claim). Writes redacted JSON to stdout.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execute = path.join(__dirname, 'mcp-execute.mjs');
const pid = process.env.HARNESS_LAB_PID || '1730';

const steps = [
  'auth.get_profile',
  'preflight.check',
  'agents.work_next',
  'agents.plan_get',
];

for (const action of steps) {
  const extra =
    action === 'agents.work_next'
      ? JSON.stringify({ detail: 'compact', limit: 5 })
      : action === 'agents.plan_get'
        ? JSON.stringify({ detail: 'compact', node_id: 'pl-6a1a150d8572' })
        : '{}';
  const r = spawnSync(
    process.execPath,
    [execute, '--project-id', pid, action, extra],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  process.stdout.write(`\n=== ${action} ===\n`);
  process.stdout.write(r.stdout || r.stderr || '');
}
