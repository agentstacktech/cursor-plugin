---
name: agentstack-hosting
description: Use when the user wants to publish a static site, deploy HTML or ZIP, get a live /s/ URL, rollback or promote a site release, push git, push to dev, or delete extra branches. Hosting git remote is named agentstack and the default branch is dev. That is not generation.promote and not git push origin. Prefer hosting.* MCP actions over Vercel or Netlify for MVP on AgentStack.
---

# AgentStack Hosting (Sites)

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "publish site" / "host HTML" / "/host-site" | `hosting.site.quick_start`, `hosting.deploy_files` | Vercel / Netlify one-off |
| "single HTML landing" | recipe `mcp_hosting_static_landing_v1` | deploy_files without recipe |
| "edit one CSS/HTML file on /s/" | `hosting.bucket.file.patch` (`search_replace`); recipe `mcp_hosting_edit_text_file_v1` — no prior GET; response `gzip_sibling: refreshed` + optional `cache_bust` — **never** manual gzip or `bulk_delete` `.gz` | `storage.upload` or full `hosting.deploy_files` |
| "React/Vite dist upload" | `hosting.site.import_archive`, `hosting.site.upload_grant` + HTTP POST, recipe `mcp_hosting_react_dist_v1` | `hosting.deploy_files`, `hosting.storage.import_folder`, MCP npm build |
| "deploy ZIP" / "static site" | `hosting.site.import_archive` or `hosting.site.upload_grant`; CLI `agentstack hosting deploy --zip` | `hosting.deploy_files` (no unzip), Custom S3 |
| "rollback" / "promote release" | `hosting.release.promote`, `hosting.release.list` | Manual bucket swap |
| "import folder to site" | `hosting.storage.import_folder` | Re-upload all files |
| "project hosting status" / "host sell scale ladder" | `hosting.project.status` | Multiple REST calls |
| "what's next after publish" | `hosting.project.status` → `next_actions[0]` | Guessing module URLs |
| "upgrade hosting quota" | PTC task `hosting-upgrade` · MCP `hosting.release.promote` · Compass `hosting-upgrade` | Delete files without wallet path |
| "git journal" / "push to dev" / "hosting git" / second bucket | prompt **`agentstack_hosting_git_journal`** · `hosting.git.init` → push `dev`/`main` → poll `hosting.site.build_status` | SSH-only bucket setup; `hosting.deploy_files` for full SPA dist |
| "patch notes" / "changelog" / "what changed in the game" | Public **`/s/{pid}/{bucket}/changelog.json`** after build; MCP **`hosting.git.log`** for deep history | `discovery.changelog` (platform MCP wire only) |
| "link commit to work graph task" | Commit trailer `AgentStack-Task: <node_id>` from `agents.work_next`; read `task_ids` on `hosting.git.log` | A second task table or DNA copy of the log |
| `service_cap_denied` on hosting | `apikeys.create` preset `user_full` or Device Code `--scope-preset=full` | Retry without widening caps |
| `batch_semantic_anchor_required` | `mcp-execute.mjs --execution-intent direct` or `preflight.check` before `hosting.site.build` / `hosting.git.init` | Same execute without anchor |
| `submodule_link_missing` | `hosting.git.init` project 1 `sdk` + `shared-ui`; fix `.gitmodules` — worker symlinks `vendor/` | `import_tree` full SDK per app |

## ArcaneStack proof (pid 1438)

- Journal: `CardGame/PLATFORM_GIT.md` · bucket `arcanestack-prod` · preview `--dev`.
- Post-heal: `showcase.arcanestack.ensure_rules` (not every UI push).
- DR bake: `sync_arcanestack_dist.py` only when `ARCANESTACK_PUBLISH_VIA_JOURNAL` is off.

## Which plane (promote / push / branches)

| Words | Plane | Action |
|-------|--------|--------|
| push, dev, extra branches, hosting git | Hosting git | Remote **`agentstack`**: `https://agentstack.tech/api/git/{project_id}/{bucket}.git`. Default push is **`dev`** (preview `/s/{pid}/{bucket}--dev/`). Do not delete `dev` or `main`. Prune only merged feature branches. |
| promote the site / go live | Hosting git | `git push agentstack HEAD:main` or `hosting.git.promote_branch` with **`bucket_id`** (not `bucket`), `ref=dev`, `target=prod`. |
| promote DNA, config, fleet, bus handle | 8DNA | `generation.fork` → write with **`params.env_uuid`** → `diff_vs_prod` → `gates` → `generation.promote`. One action per sync execute. Skip a sandbox whose diff rewinds `showcase.health`. |
| push platform core / shared | VPS deploy | Those folders often have **no** git remote. Empty `origin` means do not `git push origin`. `agentstack-frontend` tracks `agentstack` / `dev`. |

The AgentStack workspace is several git roots. Run git in the package that owns the files.

## Git journal (per bucket)

1. **`context.project_id`** on every MCP execute (tenant bucket ≠ default OAuth project 1 unless intentional).
2. `hosting.workspace.init` or `hosting.site.quick_start` → **`hosting.git.init`** (`bucket_name`, not `bucket`).
3. Clone/push: `https://agentstack.tech/api/git/{project_id}/{bucket}.git` — Basic auth password = PAT; read needs project read, push needs project write.
4. **`git push agentstack HEAD:dev`** → preview build enqueued → **`hosting.site.build_status`** until `completed` → `/s/{pid}/{bucket}--dev/`.
5. **`git push agentstack HEAD:main`** or `hosting.git.promote_branch` `ref=dev` `target=prod` → `/s/{pid}/{bucket}/`.
6. Vite: `site.build.yaml` must use **`npx vite build --base ./`** for subpath hosting gates.
7. Docs: `docs/golden-paths/HOSTING_GOLDEN_PATHS.md` · `docs/sdk/HOSTED_WORKSPACE_INTEGRATOR.md` · `discovery.describe` on `hosting.git.*` exposes `HOSTING_GIT_JOURNAL_FLOW`, `HOSTING_BATCH_SEMANTIC_ANCHOR`, `HOSTING_SUBMODULE_LINK_MISSING`.
8. Headless build enqueue: `node provided_plugins/cursor-plugin/scripts/mcp-execute.mjs --project-id <pid> --execution-intent direct hosting.site.build …`; poll `build_status` in a **separate** execute.

## Guidance (headless)

```ts
import { GuidanceClient } from '@agentstack/sdk/guidance';
// const client = new GuidanceClient(sdk);
// await client.compile({ playbookId: 'host-static-site', projectId });
```

## Rules

- **Project scope:** there is **no** MCP action `context.set`. Pass `"project_id": <pid>` on each step (`hosting.project.status`, `hosting.bucket.file.patch`, `projects.get_data`, …). After `auth.get_profile`, when `mutation_allowed` or `session_ready` is true, do **not** loop `auth.switch_project` unless a step returns cross-project denial.
- **Ladder first:** recipe `mcp_site_growth_v1` → read `hosting.project.status` → follow `next_actions[0]` and `hosting_plane_chooser` (visitor auth, gzip, bucket_id omission rules).
- **No `releases` MCP domain** — publish = `hosting.deploy_files` / `hosting.site.quick_start`; history/rollback = `hosting.release.list` / `hosting.release.promote` (aliases: `hosting.publish`, `releases.list`).
- **Control panel:** `/dev/projects/{id}/storage/sites` (or `/user/...` for user shell) — not legacy `/hosting`.
- **Canonical URL:** `/s/{project_id}/{bucket_name}/` — wait for `edge_ready` before telling the user the site is live.
- **Quota triage:** `hosting.project.status` → `quota.artifact_bytes_used_gate` vs limit; then `hosting.quota.breakdown` (alias `hosting.bucket.usage`); if over limit → `hosting.gc.orphans` dry_run → `hosting.quota.recount` dry_run. Never bulk_delete `assets/` manually — use `hosting.site.prune` when available.
- **Deploy honesty:** if `publish_failed` or `success: false`, read `live_changed` and `next_action`; do not treat step as ✅.
- Site bytes count toward the owner storage pool — `storage.get_quota` + hosting gate fields on storage hub summary.
- Do not embed secrets in published static assets.
- Public funnel: `/host-site` → auth → `?drawer=publish&deploy=1`.
- **Project plane:** `hosting.project.status` returns ladder + ranked `next_actions` (post-login SoT).

## References

- Live catalog: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.
- Gene: `core.commerce.assets.presets.gen1` (related assets); hosting actions under `hosting.*`.
