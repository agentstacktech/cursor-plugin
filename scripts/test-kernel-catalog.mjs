#!/usr/bin/env node
/**
 * Unit checks for plugin-kernel catalog flatten + OAuth pending body handling.
 */
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  flattenMcpActionsCatalog,
  actionsFromSnapshot,
  tenantActionsFromCatalog,
  buildTenantCapabilitySnapshot,
} from '../plugins/agentstack/lib/plugin-kernel/mcpActionsCatalog.mjs';
import { filterTenantActions, inferDocAudience } from '../plugins/agentstack/lib/plugin-kernel/docAudienceFilter.mjs';
import {
  applyAgentstackMcpBearer,
  normalizeAgentstackMcpConfig,
  agentstackAuthHeaders,
  stripLeanServerKeys,
  decodeJwtPayload,
  describeAgentstackMcpAuth,
  describeAgentstackAuthGate,
  pluginMcpOAuthError,
  pluginMcpPointerError,
  AUTHORIZE_SLASH,
  isTenantProjectId,
  gateNeedsDeviceLogin,
  shouldAutoDeviceLogin,
  readPinnedTenantProjectId,
  PROJECT_PIN_FILENAME,
} from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';
import {
  evaluateSingleToolSurface,
  MCP_EXECUTE_TOOL_CANONICAL,
  toolsCallErrorDetail,
} from '../plugins/agentstack/lib/plugin-kernel/mcpSurfaceProbe.mjs';
import { extractMcpAction } from '../plugins/agentstack/lib/plugin-kernel/extractMcpAction.mjs';
import { loadConfidentialClient, beginDeviceLoginLock, endDeviceLoginLock, isDeviceLoginLockBusy } from '../plugins/agentstack/lib/plugin-kernel/deviceCodeClient.mjs';

const catalog = {
  version: '2.0',
  total_actions: 2,
  domains: {
    auth: [{ action: 'auth.login', required_cap: 'auth.write', summary: 'Login' }],
    hosting: [{ action: 'hosting.publish', required_cap: 'hosting.write' }],
  },
};

const flat = flattenMcpActionsCatalog(catalog);
assert.equal(flat.length, 2);
assert.equal(flat[0].action, 'auth.login');
assert.equal(flat[1].required_cap, 'hosting.write');

const snap = { fetched_at: 1, actions: flat };
assert.equal(actionsFromSnapshot(snap).length, 2);

const legacy = { fetched_at: 1, actions: catalog };
assert.equal(actionsFromSnapshot(legacy).length, 2);
assert.equal(actionsFromSnapshot({ catalog }).length, 2);

const mixed = {
  domains: {
    auth: [{ action: 'auth.login', summary: 'Login' }],
    admin: [{ action: 'admin.database.schema_inventory', summary: 'Ops: schema' }],
    social: [{ action: 'social.admin.list_channels', summary: 'List channels' }],
  },
};
assert.equal(inferDocAudience('admin.foo'), 'operator');
assert.equal(inferDocAudience('social.admin.foo'), 'operator');
assert.equal(filterTenantActions(flattenMcpActionsCatalog(mixed)).length, 1);
assert.equal(tenantActionsFromCatalog(mixed).length, 1);
assert.equal(tenantActionsFromCatalog(mixed)[0].action, 'auth.login');
assert.equal(buildTenantCapabilitySnapshot(mixed, { now: 42 }).fetched_at, 42);
assert.equal(buildTenantCapabilitySnapshot(mixed, { now: 42 }).total_actions, 1);
assert.equal(buildTenantCapabilitySnapshot(mixed, { now: 42 }).audience, 'tenant');

const cfg = applyAgentstackMcpBearer(
  {
    mcpServers: {
      agentstack: {
        type: 'streamable-http',
        url: 'https://old.example/mcp',
        tools: { enabled: true },
        headers: { 'X-API-Key': 'ask_old', Authorization: 'Bearer stale' },
      },
    },
  },
  { accessToken: 'tok', baseUrl: 'https://agentstack.tech' },
);
assert.equal(cfg.mcpServers.agentstack.type, 'streamable-http');
assert.equal(cfg.mcpServers.agentstack.url, 'https://agentstack.tech/mcp');
assert.equal(cfg.mcpServers.agentstack.headers.Authorization, 'Bearer tok');
assert.equal(cfg.mcpServers.agentstack.headers['X-API-Key'], undefined);
assert.equal(cfg.mcpServers.agentstack.tools, undefined);

const dirty = {
  mcpServers: {
    agentstack: {
      type: 'streamable-http',
      url: 'https://agentstack.tech/mcp',
      tools: { enabled: true, autoDiscover: true },
      headers: { 'X-API-Key': 'ask_test', 'Content-Type': 'application/json' },
    },
  },
};
const { cfg: cleaned, changed } = normalizeAgentstackMcpConfig(dirty, {
  baseUrl: 'https://agentstack.tech',
});
assert.equal(changed, true);
assert.equal(cleaned.mcpServers.agentstack.tools, undefined);
assert.equal(cleaned.mcpServers.agentstack.headers['X-API-Key'], 'ask_test');
assert.deepEqual(agentstackAuthHeaders(cleaned), { 'X-API-Key': 'ask_test' });

const devDirty = {
  mcpServers: {
    'agentstack-dev': {
      type: 'streamable-http',
      baseUrl: 'http://127.0.0.1:8000/mcp',
      url: 'http://127.0.0.1:8000/mcp',
      tools: { enabled: true, autoDiscover: true },
      headers: { 'X-API-Key': 'ask_dev' },
    },
  },
};
const { cfg: devClean, changed: devChanged } = normalizeAgentstackMcpConfig(devDirty);
assert.equal(devChanged, true);
assert.equal(devClean.mcpServers['agentstack-dev'].tools, undefined);
assert.equal(devClean.mcpServers['agentstack-dev'].baseUrl, undefined);
assert.equal(devClean.mcpServers['agentstack-dev'].url, 'http://127.0.0.1:8000/mcp');

assert.deepEqual(stripLeanServerKeys({ url: 'https://x/mcp', tools: {}, baseUrl: 'https://x/mcp' }), {
  url: 'https://x/mcp',
});

assert.equal(evaluateSingleToolSurface([{ name: MCP_EXECUTE_TOOL_CANONICAL }]).ok, true);
assert.equal(evaluateSingleToolSurface([{ name: 'a' }, { name: 'b' }]).ok, false);
assert.match(
  toolsCallErrorDetail({
    result: {
      isError: true,
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Unrestricted API keys (service_caps=null) are disabled in production.',
          error_code: 'service_caps_required_in_prod',
        }),
      }],
    },
  }),
  /service_caps_required_in_prod/,
);

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(
  JSON.stringify({ type: 'user_api_key', user_id: 7, service_caps: null, exp: 9999999999 }),
).toString('base64url');
const fakeJwt = `${header}.${payload}.sig`;
assert.equal(decodeJwtPayload(fakeJwt).type, 'user_api_key');
assert.equal(isTenantProjectId(1), false);
assert.equal(isTenantProjectId(1444), true);
const described = describeAgentstackMcpAuth({
  mcpServers: {
    agentstack: {
      headers: { Authorization: `Bearer ${fakeJwt}`, 'X-Project-ID': '1' },
    },
  },
});
assert.equal(described.serviceCaps, 'null');
assert.equal(described.projectHeader, '1');
assert.equal(AUTHORIZE_SLASH, '/agentstack-authorize');
assert.equal(describeAgentstackAuthGate(null).kind, 'unsigned');
assert.match(describeAgentstackAuthGate(null).additionalContext, /agentstack-authorize/);
assert.equal(describeAgentstackAuthGate({ mcpServers: { agentstack: { headers: { Authorization: `Bearer ${fakeJwt}` } } } }).kind, 'null_caps');
assert.equal(
  describeAgentstackAuthGate({
    mcpServers: { agentstack: { headers: { Authorization: 'Bearer ${AGENTSTACK_ACCESS_TOKEN}' } } },
  }).kind,
  'placeholder',
);
assert.equal(
  describeAgentstackAuthGate({
    mcpServers: { agentstack: { headers: { 'X-API-Key': 'ask_test' } } },
  }).kind,
  'ok',
);

assert.equal(pluginMcpPointerError({ mcpServers: './mcp.json' }), null);
assert.match(pluginMcpPointerError({ mcpServers: { agentstack: {} } }), /string path/);
assert.equal(
  pluginMcpOAuthError({
    mcpServers: { agentstack: { type: 'streamable-http', url: 'https://agentstack.tech/mcp' } },
  }),
  null,
);
assert.match(
  pluginMcpOAuthError({
    mcpServers: {
      agentstack: {
        type: 'streamable-http',
        url: 'https://agentstack.tech/mcp',
        headers: { Authorization: 'Bearer ${AGENTSTACK_ACCESS_TOKEN}' },
      },
    },
  }),
  /placeholder|Authorization/,
);

const keptPin = applyAgentstackMcpBearer(
  {
    mcpServers: {
      agentstack: {
        type: 'streamable-http',
        url: 'https://agentstack.tech/mcp',
        headers: { Authorization: 'Bearer old', 'X-Project-ID': '1444' },
      },
    },
  },
  { accessToken: 'tok2', baseUrl: 'https://agentstack.tech', projectId: 1 },
);
assert.equal(keptPin.mcpServers.agentstack.headers['X-Project-ID'], '1444');

const droppedEco = applyAgentstackMcpBearer(
  { mcpServers: { agentstack: { headers: { 'X-Project-ID': '1' } } } },
  { accessToken: 'tok3', baseUrl: 'https://agentstack.tech', projectId: 1 },
);
assert.equal(droppedEco.mcpServers.agentstack.headers['X-Project-ID'], undefined);

const scrubbed = normalizeAgentstackMcpConfig(
  {
    mcpServers: {
      agentstack: {
        type: 'streamable-http',
        url: 'https://agentstack.tech/mcp',
        headers: { Authorization: 'Bearer x', 'X-Project-ID': '1' },
      },
    },
  },
  { baseUrl: 'https://agentstack.tech' },
);
assert.equal(scrubbed.cfg.mcpServers.agentstack.headers['X-Project-ID'], undefined);
assert.equal(scrubbed.changed, true);
assert.equal(
  normalizeAgentstackMcpConfig(scrubbed.cfg, {
    baseUrl: 'https://agentstack.tech',
    projectId: 1444,
  }).cfg.mcpServers.agentstack.headers['X-Project-ID'],
  '1444',
);
assert.equal(
  agentstackAuthHeaders({
    mcpServers: { agentstack: { headers: { Authorization: 'Bearer x', 'X-Project-ID': '1' } } },
  })['X-Project-ID'],
  undefined,
);

assert.equal(
  extractMcpAction({
    tool: 'agentstack.execute',
    arguments: { params: { steps: [{ action: 'hosting.publish' }] } },
  }),
  'hosting.publish',
);

assert.equal(
  extractMcpAction({ params: { steps: [{ action: 'auth.login' }] } }),
  'auth.login',
);

const prevDcr = process.env.AGENTSTACK_OAUTH_USE_DCR;
const prevId = process.env.AGENTSTACK_OAUTH_CLIENT_ID;
const prevSecret = process.env.AGENTSTACK_OAUTH_CLIENT_SECRET;
delete process.env.AGENTSTACK_OAUTH_USE_DCR;
delete process.env.AGENTSTACK_OAUTH_CLIENT_ID;
delete process.env.AGENTSTACK_OAUTH_CLIENT_SECRET;
try {
  const oc = await loadConfidentialClient();
  assert.equal(oc.source, 'builtin');
  assert.equal(oc.clientId, 'cursor-plugin');
  assert.equal(oc.clientSecret, null);
} finally {
  if (prevDcr !== undefined) process.env.AGENTSTACK_OAUTH_USE_DCR = prevDcr;
  if (prevId !== undefined) process.env.AGENTSTACK_OAUTH_CLIENT_ID = prevId;
  if (prevSecret !== undefined) process.env.AGENTSTACK_OAUTH_CLIENT_SECRET = prevSecret;
}

assert.equal(gateNeedsDeviceLogin('unsigned'), true);
assert.equal(gateNeedsDeviceLogin('placeholder'), true);
assert.equal(gateNeedsDeviceLogin('null_caps'), true);
assert.equal(gateNeedsDeviceLogin('ok'), false);
assert.equal(shouldAutoDeviceLogin('null_caps', { fromHook: false }), false);
assert.equal(shouldAutoDeviceLogin('null_caps', { fromHook: true, disable: true }), false);
assert.equal(shouldAutoDeviceLogin('null_caps', { fromHook: true }), true);
assert.equal(shouldAutoDeviceLogin('ok', { fromHook: true }), false);

const lockDir = await mkdtemp(join(tmpdir(), 'as-dlock-'));
try {
  assert.equal(await isDeviceLoginLockBusy(lockDir), false);
  const acquired = await beginDeviceLoginLock(lockDir);
  assert.equal(acquired.ok, true);
  assert.equal(await isDeviceLoginLockBusy(lockDir), true);
  const busy = await beginDeviceLoginLock(lockDir);
  assert.equal(busy.ok, false);
  await endDeviceLoginLock(lockDir);
  assert.equal(await isDeviceLoginLockBusy(lockDir), false);
  await writeFile(join(lockDir, PROJECT_PIN_FILENAME), '1\n', 'utf8');
  assert.equal(await readPinnedTenantProjectId(lockDir), null);
  await writeFile(join(lockDir, PROJECT_PIN_FILENAME), '1444\n', 'utf8');
  assert.equal(await readPinnedTenantProjectId(lockDir), 1444);
} finally {
  await rm(lockDir, { recursive: true, force: true });
}

console.log('OK   kernel catalog + mcpConfig contract');
