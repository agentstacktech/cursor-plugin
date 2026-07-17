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

const help = spawnSync(process.execPath, ['hooks/scripts/device-code.mjs', '--help'], {
  cwd: ROOT,
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
