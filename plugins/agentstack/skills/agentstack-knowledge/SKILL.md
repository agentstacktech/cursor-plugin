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

## Tenant MCP edit ladder (paid)

**Genes:** `core.knowledge.platform.gen1` · `core.tenant.8dna_generation_supply.gen1` · `core.mcp.self_description.gen1`

1. `preflight.check` (+ `simulate_batch_steps` for multi-step batches) + `knowledge.health`
2. Mutate (one logical change per sync batch when possible)
3. `knowledge.retrieve.probe` or `knowledge.playground` simulate (one **heavy_llm** per sync execute; prefer `options.async=true` + `discovery.job_status` — see catalog `async_execute` on `discovery.list` rows)
4. `generation.diff_vs_prod` → `generation.gates` → `generation.promote`

On `generation_fork_required`: omit `env_uuid` to auto-fork, or pass sandbox `env_uuid`.

| Goal | MCP action | Avoid |
|------|------------|--------|
| Offer → product_id | `knowledge.config.patch` `{"product_id_map":{"<offer>":"<pid>"}}` | Full map replace via secrets unless bulk |
| One FAQ route | `knowledge.phenotype.upsert` | Full `gene_pack` fixture in `config.patch` |
| Pinned glossary binding | `knowledge.gene_pack.pinned_shape.upsert` | Raw gene_pack JSON |
| KB document text | `knowledge.content.patch` / `knowledge.kb.ingest` | `projects.patch_data` on knowledge paths |
| Plan / tone | `knowledge.prompt.patch` | Editing outline from `config.get` |
| Safety playbooks | `knowledge.config.patch` + `safety_playbooks_write_mode: patch` | Wiping playbooks with `replace` by mistake |
| Playground default bot | `knowledge.config.patch` `default_playground_bot_uuid` | Paused legacy bot UUID |
| Read counts | `knowledge.config.get` `response=stats` | `len(phenotypes)` on item_page without `shape.n` |
| Read bodies | `knowledge.config.get` `detail=full` | Patching `outline` when `config` is null |

**`knowledge.config.patch` response:** default `response=compact` (json_view) + `config_stats`; use `response=stats` after patch; `response=full` only to echo entire config.

Full runbook: platform **tenant knowledge MCP edit** guide (REST parity under `/api/projects/{id}/knowledge/*`).

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

- Live catalog: `GET /mcp/actions` — filter `knowledge.*`
- Unity mentor ops: `/agentstack-tenant-ops` · MCP prompt `agentstack_tenant_ops_mcp_first`
- [CAPABILITY_MATRIX.md](../../../../docs/CAPABILITY_MATRIX.md) — filter `knowledge.*`
