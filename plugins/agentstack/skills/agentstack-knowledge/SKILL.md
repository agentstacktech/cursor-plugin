---
name: agentstack-knowledge
description: Use when the user mentions mentor, knowledge KB, knowledge.playground, knowledge.kb.ingest, knowledge.config, or tenant mentor simulate. Not generic RAG collections (see agentstack-rag).
---

# AgentStack Knowledge — mentor plane + KB config

## Write planes

| Plane | Actions | Sandbox + promote? |
|-------|---------|-------------------|
| 8DNA | `knowledge.config.patch`, `knowledge.prompt.patch` | Yes |
| Live RAG | `knowledge.content.patch`, `knowledge.kb.ingest` | **No** — bots see changes immediately |

Runbook: MCP prompts `agentstack_knowledge_*` + `/agentstack-safe-cycle` (sandbox → diff → promote).

## Decision matrix

| Intent signal | Prefer | Over |
|---------------|--------|------|
| Tenant KB ingest / cards | `knowledge.kb.ingest`, `knowledge.config.patch` | Manual JSON blob replace |
| Mentor simulate / playground | `knowledge.playground` (1 heavy step / batch) | Custom chat API |
| Prompt tune | `knowledge.prompt.get` → `knowledge.prompt.patch` (append) | Stub replace |
| Phenotype / pinned_shapes | `knowledge.config.patch` gene_pack partial **or** `knowledge.phenotype.upsert` | Full gene_pack replace |
| Acceptance gate | `knowledge.acceptance.run` (`eval_mode=retrieval`) | Ad-hoc playground only |
| Index heal | `knowledge.kb.heal_index` | Deprecated `knowledge.reindex` |

## GET before PATCH

Always `knowledge.prompt.get` / `knowledge.config.get` before replace. Use `write_mode=append` for new Plan bullets. Shrink guard: `allow_shrink=true` only when intentional.

## MCP recipes & flows

- `mcp_knowledge_answer_tune` → `UF_KNOWLEDGE_PROMPT_TUNE`
- `mcp_knowledge_acceptance_promote` → validate + promote
- `mcp_knowledge_ingest` · `mcp_knowledge_playground`
- Prompts: `agentstack_knowledge_answer_tune`, `agentstack_knowledge_safety_tune`, `agentstack_knowledge_mentor`
- Command: `/agentstack-knowledge-tune`

## Disambiguation vs RAG skill

| | Knowledge (`knowledge.*`) | RAG (`rag.*`) |
|--|---------------------------|---------------|
| Scope | Tenant mentor + KB config plane | Collections, documents, memory search |
| Heavy LLM | `knowledge.playground` (one per batch) | `rag.search` (usually cheap) |

## References

- Unity mentor ops: `/agentstack-tenant-ops` · MCP prompt `agentstack_tenant_ops_mcp_first`
- [CAPABILITY_MATRIX.md](../../../../docs/CAPABILITY_MATRIX.md) — filter `knowledge.*`
