#!/usr/bin/env node
/** @see mcpExecuteBridge.mjs */
import assert from 'node:assert/strict';
import {
  buildMcpExecuteRetryCommand,
  extractExecuteBatchFromEvent,
  isSemanticAnchorFailure,
  semanticAnchorCliFlags,
} from '../plugins/agentstack/lib/plugin-kernel/mcpExecuteBridge.mjs';

const event = {
  namespace: 'plugin-agentstack-agentstack',
  arguments: {
    context: { project_id: 1 },
    steps: [
      {
        id: '1',
        action: 'agents.work_next',
        params: { project_id: 1, detail: 'compact' },
      },
    ],
  },
};

const batch = extractExecuteBatchFromEvent(event);
assert.equal(batch.projectId, 1);
assert.equal(batch.steps[0].action, 'agents.work_next');

const cmd = buildMcpExecuteRetryCommand(event);
assert.ok(cmd);
assert.match(cmd, /mcp-execute\.mjs/);
assert.match(cmd, /--project-id 1/);
assert.match(cmd, /agents\.work_next/);

assert.equal(isSemanticAnchorFailure('batch_semantic_anchor_required'), true);
const anchorEvent = {
  arguments: {
    context: { project_id: 1 },
    options: {},
    steps: [
      {
        action: 'agents.plan_claim',
        params: { project_id: 1, node_ids: ['mcp-registry-auth'] },
      },
    ],
  },
};
const flags = semanticAnchorCliFlags(anchorEvent, {
  errorCode: 'batch_semantic_anchor_required',
});
assert.equal(flags.executionIntent, 'direct');
assert.equal(flags.focusNodeId, 'mcp-registry-auth');
const anchorCmd = buildMcpExecuteRetryCommand(anchorEvent, {
  errorCode: 'batch_semantic_anchor_required',
});
assert.match(anchorCmd, /--execution-intent direct/);
assert.match(anchorCmd, /--focus-node-id mcp-registry-auth/);

const stderrClaimEvent = {
  arguments: {
    context: { project_id: 1 },
    steps: [
      {
        action: 'agents.plan_claim',
        params: { project_id: 1, if_match_revision: 3 },
      },
    ],
  },
  error: JSON.stringify({
    error_code: 'revision_mismatch',
    next_action: {
      action: 'agents.plan_claim',
      node_id: 'leaf-from-work-next',
      params: { project_id: 1 },
    },
  }),
};
const stderrFlags = semanticAnchorCliFlags(stderrClaimEvent, {
  errorCode: 'revision_mismatch',
});
assert.equal(stderrFlags.executionIntent, 'direct');
assert.equal(stderrFlags.focusNodeId, 'leaf-from-work-next');
const stderrCmd = buildMcpExecuteRetryCommand(stderrClaimEvent, {
  errorCode: 'revision_mismatch',
});
assert.match(stderrCmd, /--execution-intent direct/);
assert.match(stderrCmd, /--focus-node-id leaf-from-work-next/);

console.log('test-mcp-execute-bridge: ok');
