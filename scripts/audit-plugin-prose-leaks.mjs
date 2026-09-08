#!/usr/bin/env node
/**
 * Scan tenant bundle prose for platform-internal leaks (publish-repo CI).
 * Gene: docs.public.classification.gen1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(root, 'plugins', 'agentstack');

const FORBIDDEN = [
  { re: /docs\/operations\//, label: 'docs/operations path' },
  { re: /platform_db_init/, label: 'platform_db_init' },
  { re: /platform_schema_migrations/, label: 'platform_schema_migrations' },
  { re: /data_projects_8dna/, label: 'data_projects_8dna table name' },
  { re: /admin\.database\./, label: 'admin.database action' },
  { re: /social\.admin\./, label: 'social.admin action' },
  { re: /agentstack-core\//, label: 'agentstack-core path' },
  { re: /philosophy\/genes\//, label: 'philosophy/genes path' },
];

const BANNED_AGENTS = new Set(['agentstack-oncall.md', 'agentstack-fleet-operator.md']);
const SKIP_FILES = new Set(['agentstack-platform-monorepo.mdc', 'agentstack-ui-surfaces.mdc']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (/\.(md|mdc)$/.test(name)) out.push(full);
  }
  return out;
}

let failed = false;

for (const file of walk(pluginRoot)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const base = path.basename(file);
  if (SKIP_FILES.has(base)) continue;
  if (rel.includes('/agents/') && BANNED_AGENTS.has(base)) {
    console.error(`FAIL ${rel}: platform-only agent in tenant bundle`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  for (const { re, label } of FORBIDDEN) {
    if (re.test(text)) {
      console.error(`FAIL ${rel}: ${label}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('audit-plugin-prose-leaks OK');
