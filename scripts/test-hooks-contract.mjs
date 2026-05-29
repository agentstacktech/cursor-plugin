#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(ROOT, 'hooks/fixtures');

function runHook(script, fixture, expectCode) {
  const input = fs.readFileSync(path.join(fixtures, fixture), 'utf8');
  const r = spawnSync('node', [path.join(ROOT, 'hooks/scripts', script)], {
    input,
    encoding: 'utf8',
  });
  const code = r.status ?? 1;
  if (code !== expectCode) {
    console.error(`FAIL ${script} + ${fixture}: expected exit ${expectCode}, got ${code}`);
    process.exit(1);
  }
  console.log(`OK   ${script} + ${fixture} -> ${code}`);
}

runHook('pre-shell-scan.mjs', 'pre-shell-block.json', 2);
runHook('pre-shell-scan.mjs', 'pre-shell-allow.json', 0);
console.log('Hook contract tests passed.');
