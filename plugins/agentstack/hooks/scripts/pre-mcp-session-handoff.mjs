#!/usr/bin/env node
// hooks/scripts/pre-mcp-session-handoff.mjs
// beforeMCPExecution — REST switch-project when batch includes auth.switch_project (cross-batch Bearer).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { stdin } from 'node:process';
import {
  extractMcpExecuteSteps,
} from '../../lib/plugin-kernel/extractMcpAction.mjs';
import {
  applyAgentstackMcpBearer,
  agentstackAuthHeaders,
  decodeJwtPayload,
  readPinnedTenantProjectId,
  switchProjectViaRest,
} from '../../lib/plugin-kernel/mcpConfig.mjs';

const BASE_URL = process.env.AGENTSTACK_BASE_URL || 'https://agentstack.tech';
const CURSOR_DIR = join(homedir(), '.cursor');
const MCP_PATH = join(CURSOR_DIR, 'mcp.json');

async function readStdinJson() {
  return new Promise((resolve) => {
    let data = '';
    stdin.setEncoding('utf8');
    stdin.on('data', (c) => {
      data += c;
    });
    stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
    setTimeout(() => resolve(null), 200);
  });
}

function extractSwitchTargetProjectId(event) {
  const roots = [
    event?.params,
    event?.arguments,
    event?.arguments?.params,
    event?.toolInput,
    event?.toolInput?.params,
    event?.input,
    event?.input?.params,
  ];
  for (const root of roots) {
    if (!root || typeof root !== 'object' || !Array.isArray(root.steps)) continue;
    for (const step of root.steps) {
      if (!step || typeof step !== 'object') continue;
      if (step.action !== 'auth.switch_project') continue;
      const params = step.params && typeof step.params === 'object' ? step.params : {};
      const raw = params.target_project_id ?? params.project_id;
      const pid = Number(raw);
      if (Number.isFinite(pid) && pid > 1) return pid;
    }
  }
  return null;
}

async function readMcp() {
  try {
    return JSON.parse(await readFile(MCP_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function writeMcpFile(cfg) {
  await mkdir(CURSOR_DIR, { recursive: true });
  await writeFile(MCP_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

async function main() {
  const event = await readStdinJson();
  if (!event) process.exit(0);
  const actions = extractMcpExecuteSteps(event);
  if (!actions.includes('auth.switch_project')) process.exit(0);

  const targetPid = extractSwitchTargetProjectId(event);
  if (!targetPid) process.exit(0);

  const cfg = await readMcp();
  const authHeaders = agentstackAuthHeaders(cfg);
  if (!authHeaders?.Authorization?.startsWith('Bearer ')) process.exit(0);

  const payload = decodeJwtPayload(authHeaders.Authorization.slice('Bearer '.length).trim());
  const jwtPid = payload?.project_id != null ? Number(payload.project_id) : null;
  if (jwtPid === targetPid) process.exit(0);

  const accessToken = await switchProjectViaRest(authHeaders, targetPid, { baseUrl: BASE_URL });
  if (!accessToken || !cfg) {
    const isOAuthish =
      payload?.session_type === "oauth_token" ||
      payload?.session_type === "oauth_access_token" ||
      String(payload?.client_id || "").includes("chatgpt");
    if (isOAuthish) {
      process.stderr.write(
        `[agentstack] session handoff: OAuth Connect — set context.project_id=${targetPid} ` +
          `(check auth_surface.session_ready / preflight.check). Reconnect with project_id= on authorize if needed.\n`,
      );
    } else {
      process.stderr.write(
        `[agentstack] session handoff: REST switch-project failed for pid=${targetPid} — check Bearer or POST /api/auth/switch-project.\n`,
      );
    }
    process.exit(0);
  }

  const pin = (await readPinnedTenantProjectId(CURSOR_DIR)) || targetPid;
  applyAgentstackMcpBearer(cfg, {
    accessToken,
    baseUrl: BASE_URL,
    projectId: pin,
  });
  await writeMcpFile(cfg);
  process.stderr.write(
    `[agentstack] session handoff: REST switch-project -> ${targetPid} (mcp.json Bearer updated)\n`,
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
