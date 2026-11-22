#!/usr/bin/env node
/**
 * Operator bus intake — conversations + handle binding checklist → docs/_generated/bus_intake_latest.json pattern.
 * Requires Device Code Bearer in ~/.cursor/mcp.json (same as mcp-execute.mjs).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { agentstackAuthHeaders, describeAgentstackAuthGate } from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';
import { postAgentstackExecute, resolveMcpBaseUrl } from '../plugins/agentstack/lib/plugin-kernel/mcpExecuteHttp.mjs';

const MCP_PATH = join(homedir(), '.cursor', 'mcp.json');
const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = join(__dir, '..', '..', '..', 'docs', '_generated', 'bus_intake_latest.json');

async function main() {
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const out = outArg ? outArg.split('=').slice(1).join('=') : DEFAULT_OUT;
  const pid = Number(process.argv.find((a) => a.startsWith('--project-id='))?.split('=')[1] || 1);
  let cfg;
  try {
    cfg = JSON.parse(await readFile(MCP_PATH, 'utf8'));
  } catch {
    console.error('No ~/.cursor/mcp.json — /agentstack-authorize or plugin Connect');
    process.exit(1);
  }
  const gate = describeAgentstackAuthGate(cfg);
  const headers = agentstackAuthHeaders(cfg);
  if (gate.kind !== 'ok' || !headers) {
    console.error('MCP auth not ready');
    process.exit(1);
  }
  const baseUrl = resolveMcpBaseUrl(cfg);
  const batch = {
    context: { project_id: pid },
    steps: [
      { id: 'whoami', action: 'bots.bus.whoami', params: { project_id: pid } },
      {
        id: 'conv',
        action: 'bots.conversations',
        params: { project_id: pid, channel: 'agentbus:cursor-ops', limit: 20 },
      },
      { id: 'wg', action: 'agents.work_next', params: { project_id: pid } },
    ],
  };
  const raw = await postAgentstackExecute(baseUrl, headers, batch);
  const payload = {
    polled_at: new Date().toISOString(),
    project_id: pid,
    handle_bind_checklist: [
      'bots.bus.handle.set requires handle + credential binding (not agent_id alone)',
      'channel agentbus:cursor-ops for cursor-deploy',
    ],
    execute: raw,
  };
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, out }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});