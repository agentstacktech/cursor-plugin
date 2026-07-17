#!/usr/bin/env node
/**
 * Cross-platform offline smoke (Layers 1–2) + optional local install.
 *
 * Usage:
 *   node scripts/smoke-local.mjs
 *   node scripts/smoke-local.mjs --install
 *   node scripts/smoke-local.mjs --strict
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wantInstall = process.argv.includes('--install');
const strict = process.argv.includes('--strict');
let failed = 0;

function run(label, args) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if ((r.status ?? 1) !== 0) {
    console.error(`FAIL ${label}`);
    failed += 1;
    return false;
  }
  console.log(`OK   ${label}`);
  return true;
}

console.log('Cursor plugin smoke (node)');
console.log('root:', ROOT);

if (wantInstall) {
  run('install-local', ['scripts/install-local.mjs', '--force']);
}

console.log('\n=== local install status ===');
const chk = spawnSync(process.execPath, ['scripts/install-local.mjs', '--check'], {
  cwd: ROOT,
  encoding: 'utf8',
});
process.stdout.write(chk.stdout || '');
process.stderr.write(chk.stderr || '');
if (chk.status === 0) {
  console.log('OK   local link present');
} else if (wantInstall) {
  console.error('FAIL expected local link after --install');
  failed += 1;
} else {
  console.log('NOTE not linked yet — run: node scripts/install-local.mjs');
}

run(
  'validate-plugin',
  ['scripts/validate-plugin.mjs', ...(strict ? ['--strict-screenshots'] : [])],
);
run('test-hooks-contract', ['scripts/test-hooks-contract.mjs']);
run('test-kernel-catalog', ['scripts/test-kernel-catalog.mjs']);
run('device-code --help', ['plugins/agentstack/hooks/scripts/device-code.mjs', '--help']);

console.log(`\nsummary: failed=${failed}`);
process.exit(failed ? 1 : 0);
