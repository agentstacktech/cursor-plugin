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
import { agentstackAuthHeaders } from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';

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

// 1. Plugin registration plane
const pj = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
if (pj.mcpServers) fail('plugin.json must not declare mcpServers (0.4.16+)');
else ok('plugin.json has no mcpServers');

if (String(pj.version || '').startsWith('0.4.16')) ok(`plugin version ${pj.version}`);
else warn(`plugin version ${pj.version} — expected 0.4.16 for dedupe release`);

// 2. User mcp.json shape (lean; optional dev second server is OK)
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

// 3. Live tools/list (prod or AGENTSTACK_BASE_URL)
try {
  const listRes = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 }),
  });
  if (!listRes.ok) fail(`tools/list HTTP ${listRes.status}`);
  else {
    const body = await listRes.json();
    const tools = body?.result?.tools ?? [];
    if (tools.length === 1 && tools[0]?.name === 'agentstack.execute') {
      ok(`tools/list: 1 tool (agentstack.execute) @ ${BASE_URL}`);
    } else {
      fail(`tools/list: expected 1 agentstack.execute, got ${tools.length} (${tools.map((t) => t?.name).join(', ')})`);
    }
  }
} catch (e) {
  fail(`tools/list probe: ${e.message}`);
}

// 4. Health mcp_surface_tools when deployed
try {
  const hRes = await fetch(`${BASE_URL}/mcp/health`);
  if (hRes.ok) {
    const h = await hRes.json();
    if (h.mcp_surface_tools === 1) ok('GET /mcp/health mcp_surface_tools=1');
    else warn(`GET /mcp/health mcp_surface_tools=${h.mcp_surface_tools ?? 'missing'} (tools/list already single-tool)`);
  }
} catch {
  warn('GET /mcp/health unreachable');
}

// 5. Backward compat: tools/call accepts agentstack_execute
if (fs.existsSync(MCP)) {
  const cfg = JSON.parse(fs.readFileSync(MCP, 'utf8'));
  const auth = agentstackAuthHeaders(cfg);
  if (!auth) {
    warn('skip tools/call alias probe — no auth in ~/.cursor/mcp.json');
  } else {
    try {
      const callRes = await fetch(`${BASE_URL}/mcp`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'agentstack_execute',
            arguments: {
              steps: [{ id: 'p1', action: 'system.ping', params: {} }],
              options: { stopOnError: true },
            },
          },
          id: 2,
        }),
      });
      if (!callRes.ok) fail(`tools/call agentstack_execute HTTP ${callRes.status}`);
      else {
        const body = await callRes.json();
        const isErr = body?.result?.isError;
        if (isErr === false) ok('tools/call agentstack_execute (Postel alias) succeeds');
        else fail(`tools/call agentstack_execute isError=${isErr}`);
      }
    } catch (e) {
      fail(`tools/call alias probe: ${e.message}`);
    }
  }
}

console.log(`\nsummary: failed=${fails}`);
if (fails) {
  console.log('\nHuman UI (cannot automate): Reload Window → Settings → MCP → one plugin server (no plugin-agentstack-* duplicate); Tools panel → one agentstack_execute.');
  process.exit(1);
}
console.log('\nAPI slice PASS. Human: Reload Window and confirm Cursor MCP UI §3 (one server, one tool).');
process.exit(0);
