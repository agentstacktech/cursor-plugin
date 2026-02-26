#!/usr/bin/env node
/**
 * Cursor Plugin AgentStack — structure validation
 * Run from plugin root: node scripts/validate-plugin.mjs
 * Exit 0 = success, 1 = validation failed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const requiredFiles = [
  '.cursor-plugin/plugin.json',
  'mcp.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
];

const requiredDirs = ['skills', 'rules'];

const KEBAB_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

let hasErrors = false;

function fail(msg) {
  console.error('❌', msg);
  hasErrors = true;
}

function ok(msg) {
  console.log('✅', msg);
}

function checkFile(filePath, label = filePath) {
  const full = path.join(ROOT, filePath);
  if (!fs.existsSync(full)) {
    fail(`Missing: ${label}`);
    return null;
  }
  ok(`${label} exists`);
  return full;
}

function checkDir(dirPath, label = dirPath) {
  const full = path.join(ROOT, dirPath);
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) {
    fail(`Missing directory: ${label}`);
    return false;
  }
  ok(`${label}/ exists`);
  return true;
}

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    fail(`Invalid JSON: ${path.relative(ROOT, filePath)} — ${e.message}`);
    return null;
  }
}

// --- Run checks ---

console.log('Validating Cursor plugin structure (root: %s)\n', ROOT);

// 1. Required files
for (const f of requiredFiles) {
  checkFile(f);
}

// 2. Required directories
for (const d of requiredDirs) {
  checkDir(d);
}

// 3. plugin.json schema and content
const pluginPath = path.join(ROOT, '.cursor-plugin/plugin.json');
if (fs.existsSync(pluginPath)) {
  const plugin = loadJson(pluginPath);
  if (plugin) {
    const required = ['name', 'displayName', 'author', 'description', 'keywords', 'license', 'version'];
    for (const key of required) {
      if (plugin[key] === undefined || plugin[key] === '') {
        fail(`plugin.json: missing or empty "${key}"`);
      }
    }
    if (plugin.name && !KEBAB_REGEX.test(plugin.name)) {
      fail(`plugin.json: "name" must be lowercase kebab-case, got: ${plugin.name}`);
    } else if (plugin.name) {
      ok('plugin.json: name is kebab-case');
    }
    if (plugin.version && !SEMVER_REGEX.test(plugin.version)) {
      fail(`plugin.json: "version" should be semver, got: ${plugin.version}`);
    } else if (plugin.version) {
      ok(`plugin.json: version ${plugin.version}`);
    }
  }
}

// 4. mcp.json structure
const mcpPath = path.join(ROOT, 'mcp.json');
if (fs.existsSync(mcpPath)) {
  const mcp = loadJson(mcpPath);
  if (mcp) {
    if (!mcp.mcpServers || typeof mcp.mcpServers !== 'object') {
      fail('mcp.json: missing "mcpServers" object');
    } else if (!mcp.mcpServers.agentstack) {
      fail('mcp.json: missing "mcpServers.agentstack"');
    } else {
      ok('mcp.json: mcpServers.agentstack present');
      const cfg = mcp.mcpServers.agentstack;
      if (cfg.headers && (cfg.headers['X-API-Key'] === undefined || cfg.headers['X-API-Key'] === '')) {
        // placeholder is ok
      }
      const keyVal = cfg.headers && cfg.headers['X-API-Key'];
      const isPlaceholder = !keyVal || keyVal === '<YOUR_API_KEY>' || keyVal === 'YOUR_API_KEY_HERE' || keyVal.includes('YOUR_') || keyVal.startsWith('<');
      if (keyVal && keyVal.length > 16 && !isPlaceholder) {
        fail('mcp.json: X-API-Key looks like a real key; use placeholder <YOUR_API_KEY> in repo');
      } else if (cfg.headers && cfg.headers['X-API-Key']) {
        ok('mcp.json: X-API-Key is placeholder (safe for repo)');
      }
    }
  }
}

// 5. Skills: each skill dir has SKILL.md
const skillsDir = path.join(ROOT, 'skills');
if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  for (const d of dirs) {
    const skillMd = path.join(skillsDir, d.name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      fail(`skills/${d.name}: missing SKILL.md`);
    } else {
      ok(`skills/${d.name}/SKILL.md`);
      const content = fs.readFileSync(skillMd, 'utf8');
      if (!content.includes('---') || !content.includes('name:') || !content.includes('description:')) {
        fail(`skills/${d.name}/SKILL.md: expected frontmatter with name and description`);
      }
      const lineCount = content.split(/\n/).length;
      if (lineCount > 500) {
        console.warn(`⚠️  skills/${d.name}/SKILL.md: ${lineCount} lines (recommended ≤500 for Elegant Minimalism)`);
      }
    }
  }
}

// 6. Rules: at least one .mdc
const rulesDir = path.join(ROOT, 'rules');
if (fs.existsSync(rulesDir) && fs.statSync(rulesDir).isDirectory()) {
  const mdc = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.mdc'));
  if (mdc.length === 0) {
    fail('rules/: no .mdc files found');
  } else {
    mdc.forEach((f) => ok(`rules/${f}`));
  }
}

// --- Result ---
console.log('');
if (hasErrors) {
  console.error('Validation FAILED. Fix the issues above and run again.');
  process.exit(1);
}
console.log('All checks passed.');
process.exit(0);
