#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(ROOT, 'plugins', 'agentstack');
const fixtures = path.join(PLUGIN, 'hooks/fixtures');

function runHook(script, fixture, expectCode) {
  const input = fs.readFileSync(path.join(fixtures, fixture), 'utf8');
  const r = spawnSync(process.execPath, [path.join(PLUGIN, 'hooks/scripts', script)], {
    input,
    encoding: 'utf8',
    cwd: PLUGIN,
  });
  const code = r.status ?? 1;
  if (code !== expectCode) {
    console.error(`FAIL ${script} + ${fixture}: expected exit ${expectCode}, got ${code}`);
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  console.log(`OK   ${script} + ${fixture} -> ${code}`);
}

function assertExists(rel) {
  const full = path.join(PLUGIN, rel);
  if (!fs.existsSync(full)) {
    console.error(`FAIL missing plugins/agentstack/${rel}`);
    process.exit(1);
  }
  console.log(`OK   exists ${rel}`);
}

// Cwd contract: hooks resolve when cwd = plugin package root
assertExists('hooks/scripts/pre-shell-scan.mjs');
assertExists('hooks/scripts/pre-mcp-cap-check.mjs');
assertExists('hooks/scripts/session-end.mjs');
assertExists('hooks/scripts/post-tool-failure.mjs');
assertExists('hooks/scripts/pre-nav-index-edit.mjs');
assertExists('lib/plugin-kernel/deviceCodeClient.mjs');

runHook('pre-shell-scan.mjs', 'pre-shell-block.json', 2);
runHook('pre-shell-scan.mjs', 'pre-shell-allow.json', 0);
runHook('pre-mcp-cap-check.mjs', 'pre-shell-allow.json', 0);
runHook('pre-mcp-cap-check.mjs', 'pre-mcp-agentstack-execute.json', 0);

const help = spawnSync(process.execPath, ['hooks/scripts/device-code.mjs', '--help'], {
  cwd: PLUGIN,
  encoding: 'utf8',
});
if (help.status !== 0) {
  console.error('FAIL device-code --help exit', help.status, help.stderr);
  process.exit(1);
}
if (!/Usage:/.test(help.stdout || '')) {
  console.error('FAIL device-code --help missing Usage');
  process.exit(1);
}
console.log('OK   device-code.mjs --help');

const sessionStart = spawnSync(process.execPath, ['hooks/scripts/session-start.mjs'], {
  cwd: PLUGIN,
  encoding: 'utf8',
  env: { ...process.env, AGENTSTACK_DISABLE_AUTO_LOGIN: '1' },
});
if (sessionStart.status !== 0) {
  console.error('FAIL session-start exit', sessionStart.status, sessionStart.stderr);
  process.exit(1);
}
let sessionOut;
try {
  sessionOut = JSON.parse((sessionStart.stdout || '').trim().split(/\r?\n/).pop() || '{}');
} catch {
  console.error('FAIL session-start stdout is not JSON:', sessionStart.stdout);
  process.exit(1);
}
if (sessionOut.additional_context != null && typeof sessionOut.additional_context !== 'string') {
  console.error('FAIL session-start additional_context must be a string');
  process.exit(1);
}
console.log('OK   session-start.mjs stdout JSON');

const sessionFromHook = spawnSync(
  process.execPath,
  ['hooks/scripts/session-start.mjs', '--from-hook'],
  {
    cwd: PLUGIN,
    encoding: 'utf8',
    env: { ...process.env, AGENTSTACK_DISABLE_AUTO_LOGIN: '1' },
  },
);
if (sessionFromHook.status !== 0) {
  console.error('FAIL session-start --from-hook exit', sessionFromHook.status, sessionFromHook.stderr);
  process.exit(1);
}
JSON.parse((sessionFromHook.stdout || '').trim().split(/\r?\n/).pop() || '{}');
console.log('OK   session-start.mjs --from-hook + DISABLE_AUTO_LOGIN');

const kernelTest = spawnSync(process.execPath, ['scripts/test-kernel-catalog.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (kernelTest.status !== 0) {
  console.error(kernelTest.stderr || kernelTest.stdout);
  process.exit(1);
}
console.log((kernelTest.stdout || '').trim());

console.log('Hook contract tests passed.');
