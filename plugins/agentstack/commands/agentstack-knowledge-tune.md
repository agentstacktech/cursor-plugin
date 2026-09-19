---
name: agentstack-knowledge-tune
description: Tenant knowledge self-service — prompt/phenotype/safety tune via MCP generation cycle.
---

# /agentstack-knowledge-tune

MCP-first knowledge edits for tenant operators (no deploy).

## Flows

| Task | UF flow | Recipe |
|------|---------|--------|
| Plan bullet | `UF_KNOWLEDGE_PROMPT_TUNE` | `mcp_knowledge_answer_tune` |
| Phenotype / pinned_shapes | `UF_KNOWLEDGE_PHENOTYPE` | — |
| Safety overlay | `UF_KNOWLEDGE_SAFETY` | — |
| Journal fix | `UF_KNOWLEDGE_CORRECTION` | — |
| Validate + promote | `UF_KNOWLEDGE_VALIDATE` | `mcp_knowledge_acceptance_promote` |

Prompts: `agentstack_knowledge_answer_tune` · `agentstack_knowledge_safety_tune` · `agentstack_knowledge_mentor`

Runbook: MCP prompts `agentstack_knowledge_*` + `/agentstack-safe-cycle` (sandbox → diff → promote).

**Corpus / ingest** (`knowledge.content.patch`, `knowledge.kb.ingest`) target **scoped sandbox RAG** when generation sandbox is active — **promote** to publish. Playground smoke before bulk edits.

**Gene pack ergonomics:** prefer `knowledge.phenotype.upsert` / `knowledge.gene_pack.pinned_shape.upsert` (returns `compile_warnings`) over raw `knowledge.config.patch` JSON.
