#!/usr/bin/env node
/**
 * Cursor Plugin AgentStack — structure validation (v0.4.9)
 *
 * Covers the 5-layer plugin architecture (rules, skills, commands, agents, hooks)
 * plus the OAuth Device Code flow shipped in 0.4.9.
 *
 * Run from plugin root: node scripts/validate-plugin.mjs
 * Exit 0 = success, 1 = validation failed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  '.cursor-plugin/plugin.json',
  '.cursor-plugin/marketplace.json',
  'mcp.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'hooks/hooks.json',
  'hooks/scripts/device-code.mjs',
  'hooks/scripts/session-start.mjs',
  'hooks/scripts/pre-shell-scan.mjs',
  'hooks/scripts/post-tool-telemetry.mjs',
  'hooks/scripts/capability-refresh.mjs',
  'assets/logo.svg',
  'assets/logo-dark.svg',
  'assets/brand-mark.svg',
];

const REQUIRED_DIRS = ['rules', 'skills', 'commands', 'agents', 'hooks', 'hooks/scripts', 'assets'];

const KEBAB_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
const TARGET_VERSION = '0.4.9';
const MIN_TRIGGER_KEYWORDS = 3;

let hasErrors = false;

function fail(msg) {
  console.error('FAIL ' + msg);
  hasErrors = true;
}
function ok(msg) {
  console.log('OK   ' + msg);
}
function warn(msg) {
  console.warn('WARN ' + msg);
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
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(`Invalid JSON: ${path.relative(ROOT, filePath)} — ${e.message}`);
    return null;
  }
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!m) return null;
  const body = m[1];
  const fields = {};
  for (const line of body.split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function countWords(str) {
  if (!str) return 0;
  return str.split(/[\s,./|]+/).filter(Boolean).length;
}

console.log(`Validating Cursor plugin structure (root: ${ROOT})\n`);

// 1. Required files
for (const f of REQUIRED_FILES) checkFile(f);
// 2. Required directories
for (const d of REQUIRED_DIRS) checkDir(d);

// 3. plugin.json
const pluginPath = path.join(ROOT, '.cursor-plugin/plugin.json');
let plugin = null;
if (fs.existsSync(pluginPath)) {
  plugin = loadJson(pluginPath);
  if (plugin) {
    const required = ['name', 'displayName', 'version', 'description', 'author', 'license', 'keywords', 'icon', 'engines'];
    for (const key of required) {
      if (plugin[key] === undefined || plugin[key] === '') fail(`plugin.json: missing or empty "${key}"`);
    }
    if (plugin.name && !KEBAB_REGEX.test(plugin.name)) fail(`plugin.json: "name" must be kebab-case, got: ${plugin.name}`);
    else if (plugin.name) ok('plugin.json: name is kebab-case');
    if (plugin.version && !SEMVER_REGEX.test(plugin.version)) fail(`plugin.json: version is not semver: ${plugin.version}`);
    else if (plugin.version === TARGET_VERSION) ok(`plugin.json: version ${plugin.version}`);
    else if (plugin.version) warn(`plugin.json: version ${plugin.version} (expected ${TARGET_VERSION})`);
    if (plugin.engines && plugin.engines.cursor) ok(`plugin.json: engines.cursor = ${plugin.engines.cursor}`);
    else fail('plugin.json: engines.cursor is required (e.g. ">=0.45.0")');
    if (plugin.icon && !plugin.icon.endsWith('.svg')) warn('plugin.json: icon should be SVG for crisp retina');
    if (Array.isArray(plugin.keywords) && plugin.keywords.length >= 5) ok(`plugin.json: ${plugin.keywords.length} keywords`);
    else fail('plugin.json: at least 5 keywords recommended');
    if (plugin.hooks && plugin.hooks !== 'hooks/hooks.json') warn(`plugin.json: hooks points to ${plugin.hooks}, expected hooks/hooks.json`);
  }
}

// 4. mcp.json — streamable-http + OAuth primary
const mcpPath = path.join(ROOT, 'mcp.json');
if (fs.existsSync(mcpPath)) {
  const mcp = loadJson(mcpPath);
  if (mcp) {
    const cfg = mcp.mcpServers && mcp.mcpServers.agentstack;
    if (!cfg) fail('mcp.json: missing mcpServers.agentstack');
    else {
      ok('mcp.json: mcpServers.agentstack present');
      if (cfg.type !== 'streamable-http') fail(`mcp.json: type must be "streamable-http" (got: ${cfg.type})`);
      else ok('mcp.json: type = streamable-http');
      const h = cfg.headers || {};
      const auth = h.Authorization || '';
      const apiKey = h['X-API-Key'] || '';
      if (auth.startsWith('Bearer ')) ok('mcp.json: Authorization: Bearer present (OAuth primary)');
      else if (apiKey) warn('mcp.json: only X-API-Key present; OAuth Bearer is the primary channel in 0.4.9');
      else fail('mcp.json: neither Authorization nor X-API-Key header configured');
      const tokenLooksReal = /^ask_[A-Za-z0-9_-]{16,}/.test(apiKey) || /^Bearer\s+ey[A-Za-z0-9._-]{30,}/.test(auth);
      const isPlaceholder = /\$\{|YOUR_|<.+>/.test(apiKey + '|' + auth);
      if (tokenLooksReal && !isPlaceholder) fail('mcp.json: real token appears committed — use ${AGENTSTACK_ACCESS_TOKEN} placeholder');
    }
  }
}

// 5. Skills
const skillsDir = path.join(ROOT, 'skills');
if (fs.existsSync(skillsDir)) {
  const dirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (dirs.length === 0) fail('skills/: no sub-skills');
  for (const d of dirs) {
    const md = path.join(skillsDir, d.name, 'SKILL.md');
    if (!fs.existsSync(md)) { fail(`skills/${d.name}: missing SKILL.md`); continue; }
    const content = fs.readFileSync(md, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) { fail(`skills/${d.name}/SKILL.md: missing frontmatter`); continue; }
    if (!fm.name) fail(`skills/${d.name}/SKILL.md: frontmatter.name missing`);
    if (!fm.description) fail(`skills/${d.name}/SKILL.md: frontmatter.description missing`);
    else {
      const wc = countWords(fm.description);
      if (wc < MIN_TRIGGER_KEYWORDS) fail(`skills/${d.name}/SKILL.md: description has ${wc} trigger keywords (need >= ${MIN_TRIGGER_KEYWORDS})`);
      else ok(`skills/${d.name}: ${wc} trigger keywords`);
    }
    const lines = content.split(/\r?\n/).length;
    if (lines > 500) warn(`skills/${d.name}: ${lines} lines (Elegant Minimalism suggests <=500)`);
  }
}

// 6. Rules (.mdc with frontmatter)
const rulesDir = path.join(ROOT, 'rules');
if (fs.existsSync(rulesDir)) {
  const mdcs = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.mdc'));
  if (mdcs.length === 0) fail('rules/: no .mdc files');
  for (const f of mdcs) {
    const full = path.join(rulesDir, f);
    const content = fs.readFileSync(full, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) fail(`rules/${f}: missing frontmatter`);
    else if (!fm.description) fail(`rules/${f}: frontmatter.description missing`);
    else ok(`rules/${f}`);
  }
}

// 7. Commands — frontmatter required
const cmdDir = path.join(ROOT, 'commands');
if (fs.existsSync(cmdDir)) {
  const mds = fs.readdirSync(cmdDir).filter((f) => f.endsWith('.md'));
  if (mds.length === 0) fail('commands/: no .md files');
  for (const f of mds) {
    const full = path.join(cmdDir, f);
    const content = fs.readFileSync(full, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) fail(`commands/${f}: missing frontmatter`);
    else if (!fm.name || !fm.description) fail(`commands/${f}: frontmatter needs name + description`);
    else ok(`commands/${f}`);
  }
}

// 8. Agents — frontmatter required
const agentDir = path.join(ROOT, 'agents');
if (fs.existsSync(agentDir)) {
  const mds = fs.readdirSync(agentDir).filter((f) => f.endsWith('.md'));
  if (mds.length === 0) warn('agents/: no .md files (optional layer, but recommended)');
  for (const f of mds) {
    const full = path.join(agentDir, f);
    const content = fs.readFileSync(full, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) fail(`agents/${f}: missing frontmatter`);
    else if (!fm.name || !fm.description) fail(`agents/${f}: frontmatter needs name + description`);
    else ok(`agents/${f}`);
  }
}

// 9. hooks/hooks.json — all referenced scripts must exist
const hooksPath = path.join(ROOT, 'hooks/hooks.json');
if (fs.existsSync(hooksPath)) {
  const hooks = loadJson(hooksPath);
  if (hooks) {
    if (!hooks.hooks || typeof hooks.hooks !== 'object') fail('hooks.json: missing "hooks" object');
    else {
      for (const [event, list] of Object.entries(hooks.hooks)) {
        if (!Array.isArray(list)) { fail(`hooks.json: hooks.${event} must be an array`); continue; }
        for (const entry of list) {
          const cmd = entry.command || '';
          const m = cmd.match(/node\s+\.\/(.+?\.mjs)/);
          if (m) {
            const script = path.join(ROOT, m[1]);
            if (!fs.existsSync(script)) fail(`hooks.json: ${event} -> missing script ${m[1]}`);
            else ok(`hooks.json: ${event} -> ${m[1]}`);
          } else {
            warn(`hooks.json: ${event} -> non-node command: ${cmd}`);
          }
        }
      }
    }
  }
}

// 10. Consistency: CHANGELOG mentions the target version
const chPath = path.join(ROOT, 'CHANGELOG.md');
if (fs.existsSync(chPath)) {
  const ch = fs.readFileSync(chPath, 'utf8');
  if (ch.includes(`[${TARGET_VERSION}]`) || ch.includes(`## ${TARGET_VERSION}`)) ok(`CHANGELOG.md mentions ${TARGET_VERSION}`);
  else warn(`CHANGELOG.md does not mention version ${TARGET_VERSION}`);
}

// 11. Logo contract.
// Canonical AgentStack mark (single <path>) — same geometry as the official
// favicon served at https://agentstack.tech/favicon.svg — rendered transparent
// (no rounded badge) and filling the full 512x512 canvas for the plugin.
// See assets/ICON_DESIGN.md.
// Enforced invariants:
//   • no <line>, no <polyline>   (gen1 failure mode — strokes dropped by Cursor's PNG preview)
//   • no VISIBLE strokes         (stroke="none" is allowed; stroke="#…"/any colour is not)
//   • no background <rect>       (gen2 removed the rounded badge — logo is transparent)
//   • viewBox 0 0 512 512        (square canvas)
//   • mark transform fills the canvas: translate(0, 512) scale(0.2, -0.2)
//   • ≥ 1 <path> element         (the AgentStack mark)
//   • brand mark path string must match brand-mark.svg (drift detector)
const LOGO_FILES = ['assets/logo.svg', 'assets/logo-dark.svg'];
const BRAND_MARK_PATH = path.join(ROOT, 'assets/brand-mark.svg');

function extractFirstPathD(svg) {
  // Strip comments.
  let body = svg.replace(/<!--[\s\S]*?-->/g, '');
  // Strip decorative silhouette layers: <g ... aria-hidden="true"> ... </g>.
  // These are gen2 silhouette backfills and contain a shortened `d` (outer
  // subpath only). The canonical mark is in the *remaining* <g>.
  body = body.replace(/<g\b[^>]*\baria-hidden\s*=\s*["']true["'][^>]*>[\s\S]*?<\/g>/g, '');
  const m = body.match(/<path\b[^>]*\bd=(["'])([\s\S]*?)\1/);
  return m ? m[2].replace(/\s+/g, ' ').trim() : null;
}

let brandMarkD = null;
if (fs.existsSync(BRAND_MARK_PATH)) {
  const svg = fs.readFileSync(BRAND_MARK_PATH, 'utf8');
  brandMarkD = extractFirstPathD(svg);
  if (!brandMarkD) fail('assets/brand-mark.svg: no <path d="..."> found');
  else ok('assets/brand-mark.svg: canonical mark detected');
} else {
  fail('assets/brand-mark.svg missing (source of truth for the plugin logo)');
}

for (const rel of LOGO_FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue; // REQUIRED_FILES already flagged it
  const svg = fs.readFileSync(full, 'utf8');
  const body = svg.replace(/<!--[\s\S]*?-->/g, '');
  let localOk = true;

  if (!/<svg[^>]*viewBox=["']0 0 512 512["']/.test(body)) {
    fail(`${rel}: viewBox must be "0 0 512 512"`); localOk = false;
  }
  if (/<line\b/.test(body) || /<polyline\b/.test(body)) {
    fail(`${rel}: contains <line>/<polyline> (gen1 failure mode — use the canonical <path> mark)`); localOk = false;
  }
  // Allow stroke="none" (defensive no-op); reject any other stroke= value.
  const strokeMatches = body.match(/\bstroke\s*=\s*["']([^"']*)["']/g) || [];
  for (const m of strokeMatches) {
    if (!/["']\s*none\s*["']/.test(m)) {
      fail(`${rel}: visible stroke attribute not allowed — ${m}`); localOk = false;
    }
  }
  if (/<rect\b/.test(body)) {
    fail(`${rel}: <rect> element not allowed — logo is transparent (no rounded badge); see assets/ICON_DESIGN.md`); localOk = false;
  }
  if (!/<path\b/.test(body)) {
    fail(`${rel}: missing <path> (canonical AgentStack mark)`); localOk = false;
  }
  if (!/transform\s*=\s*["']translate\(0,\s*512\)\s*scale\(0\.2,\s*-0\.2\)["']/.test(body)) {
    fail(`${rel}: mark transform must fill the canvas — expected translate(0, 512) scale(0.2, -0.2)`); localOk = false;
  }

  if (brandMarkD) {
    const d = extractFirstPathD(svg);
    if (!d) {
      fail(`${rel}: could not extract <path d="...">`); localOk = false;
    } else if (d !== brandMarkD) {
      fail(`${rel}: <path d="..."> differs from assets/brand-mark.svg — resync the brand mark`);
      localOk = false;
    }
  }

  if (localOk) ok(`${rel}: canonical AgentStack mark fills 512×512 canvas (no badge)`);
}

console.log('');
if (hasErrors) {
  console.error('Validation FAILED. Fix the issues above and run again.');
  process.exit(1);
}
console.log('All checks passed.');
process.exit(0);
