#!/usr/bin/env node
/**
 * Wave 5 automated probes — MCP dedupe 0.4.16 (VERIFICATION_CHECKLIST §3 API slice).
 *
 * Usage:
 *   node scripts/verify-mcp-surface-e2e.mjs
 *   AGENTSTACK_BASE_URL=https://agentstack.tech node scripts/verify-mcp-surface-e2e.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { agentstackAuthHeaders, pluginMcpOAuthError, pluginMcpPointerError } from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';
import {
  evaluateSingleToolSurface,
  fetchMcpHealth,
  postToolsCallExecuteAlias,
  postToolsList,
} from '../plugins/agentstack/lib/plugin-kernel/mcpSurfaceProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_JSON = path.join(ROOT, 'plugins', 'agentstack', '.cursor-plugin', 'plugin.json');
const MCP = path.join(os.homedir(), '.cursor', 'mcp.json');
const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';

let fails = 0;
function ok(msg) {
  console.log(`OK   ${msg}`);
}
function warn(msg) {
  console.warn(`WARN ${msg}`);
}
function fail(msg) {
  console.error(`FAIL ${msg}`);
  fails += 1;
}

const pj = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
const ptrErr = pluginMcpPointerError(pj);
if (ptrErr) fail(`plugin.json: ${ptrErr}`);
else ok(`plugin.json mcpServers=${pj.mcpServers}`);

if (String(pj.version || '').startsWith('0.4.18')) ok(`plugin version ${pj.version}`);
else warn(`plugin version ${pj.version} — expected 0.4.18 (plugin MCP Connect)`);

const pluginMcp = path.join(ROOT, 'plugins', 'agentstack', 'mcp.json');
if (!fs.existsSync(pluginMcp)) fail('plugins/agentstack/mcp.json missing');
else {
  const mcpErr = pluginMcpOAuthError(JSON.parse(fs.readFileSync(pluginMcp, 'utf8')));
  if (mcpErr) fail(`plugin mcp.json: ${mcpErr}`);
  else ok('plugin mcp.json OAuth URL-only');
}

if (fs.existsSync(MCP)) {
  const cfg = JSON.parse(fs.readFileSync(MCP, 'utf8'));
  const servers = Object.keys(cfg.mcpServers || {});
  const agentstackKeys = servers.filter((k) => /agentstack/i.test(k));
  if (agentstackKeys.length === 0) warn('no agentstack* entry in ~/.cursor/mcp.json');
  else if (agentstackKeys.length === 1) ok(`~/.cursor/mcp.json: one agentstack server (${agentstackKeys[0]})`);
  else warn(`~/.cursor/mcp.json: ${agentstackKeys.length} agentstack* servers (${agentstackKeys.join(', ')}) — OK if one is dev-only`);

  const entry = cfg.mcpServers?.agentstack;
  if (entry?.tools) warn('mcpServers.agentstack.tools present — run diagnose-local.mjs --fix');
  else if (entry) ok('mcpServers.agentstack is lean (no tools key)');
}

try {
  const tools = await postToolsList(BASE_URL);
  const verdict = evaluateSingleToolSurface(tools);
  if (verdict.ok) ok(`tools/list: 1 tool (agentstack.execute) @ ${BASE_URL}`);
  else fail(`tools/list: ${verdict.reason}`);
} catch (e) {
  fail(`tools/list probe: ${e.message}`);
}

try {
  const h = await fetchMcpHealth(BASE_URL);
  if (h?.mcp_surface_tools === 1) ok('GET /mcp/health mcp_surface_tools=1');
  else if (h) warn(`GET /mcp/health mcp_surface_tools=${h.mcp_surface_tools ?? 'missing'} (tools/list already single-tool)`);
  else warn('GET /mcp/health unreachable');
} catch {
  warn('GET /mcp/health probe failed');
}

if (fs.existsSync(MCP)) {
  const auth = agentstackAuthHeaders(JSON.parse(fs.readFileSync(MCP, 'utf8')));
  if (!auth) warn('skip tools/call alias probe — no auth in ~/.cursor/mcp.json');
  else {
    try {
      await postToolsCallExecuteAlias(BASE_URL, auth);
      ok('tools/call agentstack_execute (Postel alias) succeeds');
    } catch (e) {
      fail(`tools/call alias probe: ${e.message}`);
    }
  }
}

console.log(`\nsummary: failed=${fails}`);
if (fails) {
  console.log('\nHuman UI (cannot automate): Reload Window → plugin AgentStack MCP appears; click Connect (no empty Bearer).');
  process.exit(1);
}
console.log('\nAPI slice PASS. Human: Reload Window — plugin MCP should appear; click Connect if needed.');
process.exit(0);
