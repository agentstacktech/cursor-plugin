#!/usr/bin/env node
/**
 * Deep audit of plugin layers: skills, rules, commands, agents, hooks.
 * Run from publish repo root: node scripts/audit-layers.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(ROOT, 'plugins', 'agentstack');
let fails = 0;
let warns = 0;

function ok(m) {
  console.log(`OK   ${m}`);
}
function warn(m) {
  console.warn(`WARN ${m}`);
  warns += 1;
}
function fail(m) {
  console.error(`FAIL ${m}`);
  fails += 1;
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext));
}

function parseFm(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

console.log(`Layer audit — ${PLUGIN}\n`);

// Skills
const skillDirs = listDirs(path.join(PLUGIN, 'skills'));
const missingLive = [];
const skillNames = new Set();
for (const d of skillDirs) {
  const p = path.join(PLUGIN, 'skills', d, 'SKILL.md');
  if (!fs.existsSync(p)) {
    fail(`skills/${d}: missing SKILL.md`);
    continue;
  }
  const t = fs.readFileSync(p, 'utf8');
  const fm = parseFm(t);
  if (!fm?.name || !fm?.description) fail(`skills/${d}: frontmatter needs name + description`);
  else {
    skillNames.add(fm.name);
    ok(`skill ${fm.name}`);
  }
  if (!/\/mcp\/actions|live catalog/i.test(t)) missingLive.push(d);
  if (/docs\/MCP_CAPABILITY_MATRIX\.md/.test(t)) {
    fail(`skills/${d}: references docs/MCP_CAPABILITY_MATRIX.md (not in package) — use GET /mcp/actions`);
  }
}
if (missingLive.length) {
  for (const d of missingLive) warn(`skills/${d}: add live catalog pointer (GET /mcp/actions)`);
} else {
  ok('all skills mention live catalog /mcp/actions');
}

// Rules
const rules = listFiles(path.join(PLUGIN, 'rules'), '.mdc');
let always = 0;
for (const f of rules) {
  const t = fs.readFileSync(path.join(PLUGIN, 'rules', f), 'utf8');
  const fm = parseFm(t);
  if (!fm?.description) fail(`rules/${f}: missing description frontmatter`);
  if (/alwaysApply:\s*true/.test(t)) always += 1;
  ok(`rule ${f}`);
}
if (always !== 1) fail(`expected exactly 1 alwaysApply rule, got ${always}`);
else ok('exactly 1 alwaysApply rule (agentstack-prefer)');

// Commands
const cmds = listFiles(path.join(PLUGIN, 'commands'), '.md');
for (const f of cmds) {
  const t = fs.readFileSync(path.join(PLUGIN, 'commands', f), 'utf8');
  const fm = parseFm(t);
  if (!fm?.name || !fm?.description) fail(`commands/${f}: frontmatter needs name + description`);
  else ok(`command ${fm.name}`);
}
for (const need of ['agentstack-init.md', 'agentstack-login.md', 'agentstack-diagnose.md']) {
  if (!cmds.includes(need)) fail(`missing command ${need}`);
}

// Agents
const agents = listFiles(path.join(PLUGIN, 'agents'), '.md');
for (const f of agents) {
  const t = fs.readFileSync(path.join(PLUGIN, 'agents', f), 'utf8');
  const fm = parseFm(t);
  if (!fm?.name || !fm?.description) fail(`agents/${f}: frontmatter needs name + description`);
  else ok(`agent ${fm.name}`);
}

// Hooks
const hooksPath = path.join(PLUGIN, 'hooks/hooks.json');
const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
const requiredEvents = [
  'sessionStart',
  'sessionEnd',
  'beforeShellExecution',
  'beforeMCPExecution',
  'postToolUse',
  'postToolUseFailure',
  'afterFileEdit',
];
for (const ev of requiredEvents) {
  const list = hooks.hooks?.[ev];
  if (!Array.isArray(list) || !list.length) fail(`hooks.json missing ${ev}`);
  else {
    for (const entry of list) {
      const m = String(entry.command || '').match(/\.\/(.+\.mjs)/);
      if (!m || !fs.existsSync(path.join(PLUGIN, m[1]))) fail(`hooks ${ev}: missing ${entry.command}`);
      else ok(`hook ${ev} → ${m[1]}`);
    }
  }
}

// device-code is not a hook event but required script
if (!fs.existsSync(path.join(PLUGIN, 'hooks/scripts/device-code.mjs'))) {
  fail('hooks/scripts/device-code.mjs missing');
} else ok('device-code.mjs present (install path)');

// Backend router covers skill folders (name match or known alias)
const backend = fs.readFileSync(path.join(PLUGIN, 'skills/agentstack-backend/SKILL.md'), 'utf8');
const optional = new Set(['solana']);
for (const d of skillDirs) {
  if (d === 'agentstack-backend') continue;
  if (optional.has(d)) continue;
  if (!backend.includes(d) && !backend.includes(`\`${d}\``)) {
    warn(`backend router may omit skill folder ${d}`);
  }
}

console.log(`\nsummary: failed=${fails} warnings=${warns}`);
console.log(`counts: skills=${skillDirs.length} rules=${rules.length} commands=${cmds.length} agents=${agents.length}`);
process.exit(fails ? 1 : 0);
