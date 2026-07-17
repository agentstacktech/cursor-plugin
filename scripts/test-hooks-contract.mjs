#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(ROOT, 'hooks/fixtures');

function runHook(script, fixture, expectCode) {
  const input = fs.readFileSync(path.join(fixtures, fixture), 'utf8');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'hooks/scripts', script)], {
    input,
    encoding: 'utf8',
    cwd: ROOT,
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
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.error(`FAIL missing ${rel}`);
    process.exit(1);
  }
  console.log(`OK   exists ${rel}`);
}

// Cwd contract: hooks resolve when cwd = plugin root
assertExists('hooks/scripts/pre-shell-scan.mjs');
assertExists('hooks/scripts/pre-mcp-cap-check.mjs');
assertExists('hooks/scripts/session-end.mjs');
assertExists('hooks/scripts/post-tool-failure.mjs');
assertExists('lib/plugin-kernel/deviceCodeClient.mjs');

runHook('pre-shell-scan.mjs', 'pre-shell-block.json', 2);
runHook('pre-shell-scan.mjs', 'pre-shell-allow.json', 0);
runHook('pre-mcp-cap-check.mjs', 'pre-shell-allow.json', 0);

const smoke = spawnSync(process.execPath, ['hooks/scripts/device-code.mjs', '--help'], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (/ERR_MODULE_NOT_FOUND|Cannot find module/.test(`${smoke.stderr}${smoke.stdout}`)) {
  console.error('FAIL device-code kernel load', smoke.stderr);
  process.exit(1);
}
console.log('OK   device-code.mjs loads with vendored kernel');

console.log('Hook contract tests passed.');
