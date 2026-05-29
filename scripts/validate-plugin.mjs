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
import {
  STALE_ACTIONS,
  SECRET_PATTERNS,
  SAFE_PLACEHOLDER,
  HARD_CODED_ACTION_COUNT,
  ACTION_COUNT_ALLOWLIST,
  ROUTER_SKILLS_REQUIRED,
  ROUTER_SKILLS_OPTIONAL,
} from '../../scripts/lib/stale-actions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..', '..');
const STRICT_SCREENSHOTS =
  process.argv.includes('--strict-screenshots') ||
  process.env.AGENTSTACK_STRICT_SCREENSHOTS === '1';
const CAPABILITY_MATRIX_CANDIDATES = [
  path.join(REPO_ROOT, 'docs/MCP_CAPABILITY_MATRIX.md'),
  path.join(REPO_ROOT, 'docs/plugins/CAPABILITY_MATRIX.md'),
];

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

const KEBAB_REGEX = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
const TARGET_VERSION = '0.4.13';
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

function walkTextFiles(dir, out = []) {
  const skip = new Set(['.git', 'node_modules', 'out', 'dist', 'hooks/fixtures']);
  const textExt = new Set(['.json', '.js', '.mjs', '.ts', '.md', '.mdc', '.yaml', '.yml', '.ps1', '.svg']);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTextFiles(full, out);
    else if (/^validate.*\.mjs$/.test(entry.name)) continue;
    else if (textExt.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function parseCapabilityActions() {
  for (const matrixPath of CAPABILITY_MATRIX_CANDIDATES) {
    if (!fs.existsSync(matrixPath)) continue;
    const content = fs.readFileSync(matrixPath, 'utf8');
    const actions = new Set();
    for (const match of content.matchAll(/\|\s+`([a-z0-9_.]+)`\s+\|/g)) {
      actions.add(match[1]);
    }
    if (actions.size === 0) {
      continue;
    }
    const total = content.match(/Total actions:\s+\*\*(\d+)\*\*/);
    if (!total) fail(`${path.relative(REPO_ROOT, matrixPath)}: missing total action count`);
    else ok(`${path.relative(REPO_ROOT, matrixPath)}: total actions = ${total[1]}`);
    return actions;
  }
  fail('CAPABILITY_MATRIX.md: no action rows parsed in canonical or fallback matrix');
  return new Set();
}

function checkTextSecurityAndDrift(liveActions) {
  for (const filePath of walkTextFiles(ROOT)) {
    const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
    if (relative.startsWith('hooks/fixtures/')) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const [oldAction, newAction] of STALE_ACTIONS) {
      if (content.includes(oldAction)) {
        const severity = liveActions.has(newAction) ? fail : warn;
        severity(`${relative}: stale action "${oldAction}" found; use "${newAction}" or runtime discovery`);
      }
    }
    const repoRelative = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    if (
      HARD_CODED_ACTION_COUNT.test(content) &&
      !ACTION_COUNT_ALLOWLIST.has(repoRelative) &&
      !ACTION_COUNT_ALLOWLIST.has(relative)
    ) {
      fail(`${relative}: hard-coded action count; use GET /mcp/actions (see docs/plugins/CANONICAL_COPY.md)`);
    }
    for (const { name, regex } of SECRET_PATTERNS) {
      for (const match of content.matchAll(regex)) {
        const start = Math.max(0, match.index - 40);
        const end = Math.min(content.length, match.index + match[0].length + 40);
        if (!SAFE_PLACEHOLDER.test(content.slice(start, end))) {
          fail(`${relative}: possible committed secret (${name})`);
        }
      }
    }
  }
}

console.log(`Validating Cursor plugin structure (root: ${ROOT})\n`);

const LIVE_ACTIONS = parseCapabilityActions();

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
    const required = ['name', 'displayName', 'version', 'description', 'author', 'license', 'keywords', 'logo', 'engines'];
    for (const key of required) {
      if (plugin[key] === undefined || plugin[key] === '') fail(`plugin.json: missing or empty "${key}"`);
    }
    if (plugin.name && !KEBAB_REGEX.test(plugin.name)) fail(`plugin.json: "name" must be lowercase alphanumeric/kebab/dotted, got: ${plugin.name}`);
    else if (plugin.name) ok('plugin.json: name format is Cursor-compatible');
    if (plugin.version && !SEMVER_REGEX.test(plugin.version)) fail(`plugin.json: version is not semver: ${plugin.version}`);
    else if (plugin.version === TARGET_VERSION) ok(`plugin.json: version ${plugin.version}`);
    else if (plugin.version) warn(`plugin.json: version ${plugin.version} (expected ${TARGET_VERSION})`);
    if (plugin.engines && plugin.engines.cursor) ok(`plugin.json: engines.cursor = ${plugin.engines.cursor}`);
    else fail('plugin.json: engines.cursor is required (e.g. ">=0.45.0")');
    const logoPath = plugin.logo || plugin.icon;
    if (!logoPath) fail('plugin.json: logo is required by current Cursor plugin docs');
    else if (!fs.existsSync(path.join(ROOT, logoPath))) fail(`plugin.json: logo path does not exist: ${logoPath}`);
    else ok(`plugin.json: logo path exists (${logoPath})`);
    if (plugin.logoDark && !fs.existsSync(path.join(ROOT, plugin.logoDark))) fail(`plugin.json: logoDark path does not exist: ${plugin.logoDark}`);
    if (plugin.icon && !plugin.logo) warn('plugin.json: icon is legacy; prefer logo');
    if (logoPath && !logoPath.endsWith('.svg')) warn('plugin.json: logo should be SVG for crisp retina');
    if (Array.isArray(plugin.keywords) && plugin.keywords.length >= 5) ok(`plugin.json: ${plugin.keywords.length} keywords`);
    else fail('plugin.json: at least 5 keywords recommended');
    if (plugin.hooks && plugin.hooks !== 'hooks/hooks.json') warn(`plugin.json: hooks points to ${plugin.hooks}, expected hooks/hooks.json`);
  }
}

// 3b. marketplace.json
const marketplacePath = path.join(ROOT, '.cursor-plugin/marketplace.json');
if (fs.existsSync(marketplacePath)) {
  const marketplace = loadJson(marketplacePath);
  if (marketplace) {
    if (!marketplace.publisher) fail('marketplace.json: publisher is required');
    const listing = marketplace.listing || {};
    if (!listing.name) fail('marketplace.json: listing.name is required');
    if (!listing.tagline || listing.tagline.length > 80) fail('marketplace.json: listing.tagline missing or longer than 80 chars');
    if (!listing.description || listing.description.length < 80) fail('marketplace.json: listing.description too short for marketplace review');
    if (!Array.isArray(listing.categories) || listing.categories.length === 0) fail('marketplace.json: listing.categories required');
    if (!listing.privacy || !/^https:\/\//.test(listing.privacy)) fail('marketplace.json: listing.privacy must be an https URL');
    if (!listing.terms || !/^https:\/\//.test(listing.terms)) fail('marketplace.json: listing.terms must be an https URL');
    for (const screenshot of listing.screenshots || []) {
      const full = path.join(ROOT, screenshot);
      if (!fs.existsSync(full)) {
        const msg = `marketplace.json: screenshot missing: ${screenshot}`;
        if (STRICT_SCREENSHOTS) fail(msg);
        else warn(msg);
      } else ok(`marketplace.json: screenshot exists (${screenshot})`);
    }
    ok('marketplace.json: listing metadata checked');
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

// 6b. Router ↔ skills registry
const backendSkillPath = path.join(ROOT, 'skills/agentstack-backend/SKILL.md');
if (fs.existsSync(backendSkillPath)) {
  const backendBody = fs.readFileSync(backendSkillPath, 'utf8');
  for (const skill of ROUTER_SKILLS_REQUIRED) {
    if (!backendBody.includes(`\`${skill}\``)) {
      fail(`skills/agentstack-backend/SKILL.md: missing router row for ${skill}`);
    }
  }
  ok('skills/agentstack-backend: router covers required skills');
}
if (fs.existsSync(path.join(ROOT, 'skills/agentstack-support-storage'))) {
  fail('skills/agentstack-support-storage/: removed in gen3 — use hosting, support, storage');
}

// 6c. alwaysApply rule budget (T0)
let alwaysApplyCount = 0;
if (fs.existsSync(rulesDir)) {
  for (const f of fs.readdirSync(rulesDir).filter((x) => x.endsWith('.mdc'))) {
    const body = fs.readFileSync(path.join(rulesDir, f), 'utf8');
    if (/alwaysApply:\s*true/i.test(body)) alwaysApplyCount += 1;
  }
  if (alwaysApplyCount > 2) fail(`rules/: ${alwaysApplyCount} alwaysApply rules (max 2 T0 recommended)`);
  else ok(`rules/: ${alwaysApplyCount} alwaysApply rule(s)`);
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

// 7b. agentstack-init step title (OAuth primary)
const initPath = path.join(ROOT, 'commands/agentstack-init.md');
if (fs.existsSync(initPath)) {
  const initBody = fs.readFileSync(initPath, 'utf8');
  if (/##\s*3\.\s*Persist scoped API key/i.test(initBody)) {
    fail('commands/agentstack-init.md: rename step 3 to Persist tokens (OAuth primary)');
  } else ok('commands/agentstack-init.md: step 3 title OK');
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

// 10b. Cross-file drift/security.
checkTextSecurityAndDrift(LIVE_ACTIONS);

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
