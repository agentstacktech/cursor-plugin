#!/usr/bin/env node
// hooks/scripts/pre-shell-scan.mjs
// Blocks shell commands that would leak AgentStack secrets (API keys, Bearer JWTs)
// into plaintext logs. Triggered for curl/wget/fetch/axios/PowerShell web-request shells.
// Cursor provides the proposed command via stdin (JSON) or env HOOK_COMMAND.

import { stdin } from 'node:process';

const LEAK_PATTERNS = [
  /\bask_[A-Za-z0-9_-]{20,}/,                // AgentStack API key prefix
  /Authorization:\s*Bearer\s+ey[A-Za-z0-9._-]{20,}/i, // JWT Bearer
  /X-API-Key:\s*ask_[A-Za-z0-9_-]{20,}/i,    // manual X-API-Key
  /AGENTSTACK_API_KEY=ask_[A-Za-z0-9_-]{20,}/, // inline env export
];

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    stdin.setEncoding('utf8');
    stdin.on('data', chunk => { data += chunk; });
    stdin.on('end', () => resolve(data));
    stdin.on('error', () => resolve(''));
    setTimeout(() => resolve(data), 200); // don't hang hook infra
  });
}

function extractCommand(raw) {
  if (!raw) return process.env.HOOK_COMMAND || '';
  try {
    const parsed = JSON.parse(raw);
    return parsed.command || parsed.shell || parsed.args?.join(' ') || '';
  } catch { return raw; }
}

async function main() {
  const raw = await readStdin();
  const cmd = extractCommand(raw) || process.env.HOOK_COMMAND || '';
  if (!cmd) process.exit(0);

  for (const pattern of LEAK_PATTERNS) {
    if (pattern.test(cmd)) {
      console.error('[agentstack] Blocked: shell command contains a plaintext AgentStack secret.');
      console.error('[agentstack] Pattern matched: ' + pattern);
      console.error('[agentstack] Use $env:AGENTSTACK_API_KEY or ~/.cursor/mcp.json instead of inlining secrets.');
      process.exit(2); // non-zero => block execution (Cursor hook convention)
    }
  }
  process.exit(0);
}

main().catch(() => process.exit(0));
