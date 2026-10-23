#!/usr/bin/env node
// beforeMCPExecution — non-blocking hint when mutating batch lacks options.goal (W1-A).

import { stdin } from 'node:process';
import { extractMcpExecuteSteps } from '../../lib/plugin-kernel/extractMcpAction.mjs';
import {
  batchNeedsSemanticAnchor,
  ensureBatchSemanticAnchor,
} from '../../lib/plugin-kernel/batchSemanticAnchor.mjs';

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

function executeBodyFromEvent(event) {
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
    if (root && typeof root === 'object' && Array.isArray(root.steps)) {
      return root;
    }
  }
  return null;
}

async function main() {
  const event = await readStdinJson();
  if (!event) process.exit(0);
  const body = executeBodyFromEvent(event);
  if (!body || !Array.isArray(body.steps)) process.exit(0);
  const opts = body.options && typeof body.options === 'object' ? body.options : {};
  if (!batchNeedsSemanticAnchor(body.steps, opts)) process.exit(0);

  const actions = extractMcpExecuteSteps(event);
  process.stderr.write(
    `[agentstack] batch_semantic_anchor: add options.execution_intent=direct, options.goal, ` +
      `focus_node_id, or plan_execute_mode ` +
      `before mutating steps: ${actions.slice(0, 4).join(', ')}. ` +
      `SDK: withSemanticAnchor(); see docs/plugins/CONTEXT_FOR_AI.md\n`,
  );
  const preview = ensureBatchSemanticAnchor(body, process.env.AGENTSTACK_DEFAULT_BATCH_GOAL || '');
  if (preview?.options?.goal) {
    process.stderr.write(`[agentstack] suggested options.goal length=${preview.options.goal.length}\n`);
  }
  process.exit(0);
}

main().catch(() => process.exit(0));
