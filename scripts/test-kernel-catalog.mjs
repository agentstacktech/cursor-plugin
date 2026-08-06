#!/usr/bin/env node
/**
 * Unit checks for plugin-kernel catalog flatten + OAuth pending body handling.
 */
import assert from 'node:assert/strict';
import {
  flattenMcpActionsCatalog,
  actionsFromSnapshot,
  tenantActionsFromCatalog,
} from '../plugins/agentstack/lib/plugin-kernel/mcpActionsCatalog.mjs';
import { filterTenantActions, inferDocAudience } from '../plugins/agentstack/lib/plugin-kernel/docAudienceFilter.mjs';
import {
  applyAgentstackMcpBearer,
  normalizeAgentstackMcpConfig,
  agentstackAuthHeaders,
} from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';
import { extractMcpAction } from '../plugins/agentstack/lib/plugin-kernel/extractMcpAction.mjs';

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

console.log('OK   kernel catalog + mcpConfig contract');
