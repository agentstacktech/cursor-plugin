#!/usr/bin/env node
/**
 * Lightweight check: backend router mentions expected skills from evals/intent-routing.yaml
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = fs.readFileSync(path.join(ROOT, 'skills/agentstack-backend/SKILL.md'), 'utf8');
const yaml = fs.readFileSync(path.join(ROOT, 'evals/intent-routing.yaml'), 'utf8');

const SKIP = new Set(['agentstack-backend']);
const ROUTER_ALIAS = { solana: 'solana-agentstack-mcp' };

const skills = [...yaml.matchAll(/expect_skill:\s*(\S+)/g)].map((m) => m[1]);
let fail = 0;
for (const skill of skills) {
  if (SKIP.has(skill)) continue;
  const needle = ROUTER_ALIAS[skill] ?? skill;
  if (!backend.includes(`\`${needle}\``)) {
    console.error(`FAIL router missing ${skill}`);
    fail++;
  }
}
if (fail) process.exit(1);
console.log(`OK   ${skills.length} eval skills referenced in router`);
