import assert from 'node:assert/strict';
import {
  AUDIT_BATCH_ACTIONS,
  batchNeedsSemanticAnchor,
  ensureBatchSemanticAnchor,
} from '../plugins/agentstack/lib/plugin-kernel/batchSemanticAnchor.mjs';
import { verifyCanonicalCases } from '../plugins/agentstack/lib/plugin-kernel/batchParamAnchorEval.mjs';

assert.equal(batchNeedsSemanticAnchor([{ action: 'system.ping' }], {}), false);
assert.equal(batchNeedsSemanticAnchor([{ action: 'projects.create' }], {}), true);
assert.equal(
  batchNeedsSemanticAnchor([{ action: 'projects.create_project' }], { execution_intent: 'direct' }),
  false,
);
assert.equal(
  batchNeedsSemanticAnchor([{ action: 'script.put', params: { validate_only: true } }], {}),
  false,
);
assert.equal(
  batchNeedsSemanticAnchor([{ action: 'agents.work_next', params: { claim: true } }], {}),
  true,
);
const out = ensureBatchSemanticAnchor(
  { steps: [{ action: 'projects.create_project', params: {} }] },
  'QA goal',
);
assert.equal(out.options.goal, 'QA goal');

for (const row of verifyCanonicalCases(AUDIT_BATCH_ACTIONS)) {
  assert.equal(row.ok, true, `canonical case ${row.id}`);
}

console.log('test-batch-semantic-anchor: ok');
