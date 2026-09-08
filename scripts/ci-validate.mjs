#!/usr/bin/env node
/**
 * Single entry for GitHub Actions — runs the full offline validation suite.
 * Keeps workflow to one third-party action (checkout) to reduce download failures.
 */
import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MONOREPO_IMPORT_RE = /\.\.\/\.\.\/scripts\/lib\//;

function assertStandaloneImports() {
  const targets = [
    'scripts/test-kernel-catalog.mjs',
    'scripts/diagnose-local.mjs',
    'scripts/verify-mcp-surface-e2e.mjs',
    'plugins/agentstack/lib/plugin-kernel/mcpSurfaceProbe.mjs',
  ];
  const bad = targets.filter((rel) => {
    const full = path.join(ROOT, rel);
    return fs.existsSync(full) && MONOREPO_IMPORT_RE.test(fs.readFileSync(full, 'utf8'));
  });
  if (bad.length) {
    console.error('CI FAILED: monorepo-only import paths (use ./lib/ or vendored kernel):', bad.join(', '));
    process.exit(1);
  }
  for (const rel of ['scripts/lib/mcpSurfaceProbe.mjs', 'scripts/lib/stale-actions.mjs']) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      console.error(`CI FAILED: missing vendored ${rel} — run sync-plugin-kernel.mjs`);
      process.exit(1);
    }
  }
}

/** @type {[string, string[]][]} */
const STEPS = [
  ['validate-plugin', ['scripts/validate-plugin.mjs', '--strict-screenshots']],
  ['audit-layers', ['scripts/audit-layers.mjs']],
  ['test-hooks-contract', ['scripts/test-hooks-contract.mjs']],
  ['run-intent-eval', ['scripts/run-intent-eval.mjs']],
  ['device-code --help', ['plugins/agentstack/hooks/scripts/device-code.mjs', '--help']],
  ['test-kernel-catalog', ['scripts/test-kernel-catalog.mjs']],
];

function run(label, args) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\nCI FAILED: ${label} (exit ${r.status ?? 1})`);
    process.exit(r.status ?? 1);
  }
}

console.log(`CI validate — root: ${ROOT}`);
assertStandaloneImports();
for (const [label, args] of STEPS) {
  run(label, args);
}
console.log('\nCI validate OK');
