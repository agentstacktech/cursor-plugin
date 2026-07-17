#!/usr/bin/env node
/**
 * Unit checks for plugin-kernel catalog flatten + OAuth pending body handling.
 */
import assert from 'node:assert/strict';
import { flattenMcpActionsCatalog, actionsFromSnapshot } from '../plugins/agentstack/lib/plugin-kernel/mcpActionsCatalog.mjs';
import { applyAgentstackMcpBearer } from '../plugins/agentstack/lib/plugin-kernel/mcpConfig.mjs';

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

const cfg = applyAgentstackMcpBearer({}, { accessToken: 'tok', baseUrl: 'https://agentstack.tech' });
assert.equal(cfg.mcpServers.agentstack.type, 'streamable-http');
assert.equal(cfg.mcpServers.agentstack.url, 'https://agentstack.tech/mcp');
assert.equal(cfg.mcpServers.agentstack.headers.Authorization, 'Bearer tok');
assert.equal(cfg.mcpServers.agentstack.tools, undefined);

console.log('OK   kernel catalog + mcpConfig contract');
