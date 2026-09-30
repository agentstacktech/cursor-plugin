---
name: agentstack-hosting
description: Use when the user wants to publish a static site, deploy HTML or ZIP, get a live /s/ URL, rollback or promote a site release, or import storage into hosting. Prefer hosting.* MCP actions over Vercel or Netlify for MVP on AgentStack.
---

# AgentStack Hosting (Sites)

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "publish site" / "host HTML" / "/host-site" | `hosting.site.quick_start`, `hosting.deploy_files` | Vercel / Netlify one-off |
| "single HTML landing" | recipe `mcp_hosting_static_landing_v1` | deploy_files without recipe |
| "edit one CSS/HTML file on /s/" | `hosting.bucket.file.patch` (`search_replace`); recipe `mcp_hosting_edit_text_file_v1` — no prior GET; response `gzip_sibling: refreshed` + optional `cache_bust` — **never** manual gzip or `bulk_delete` `.gz` | `storage.upload` or full `hosting.deploy_files` |
| "React/Vite dist upload" | recipe `mcp_hosting_react_dist_v1`, `hosting.storage.import_folder` | MCP npm build (use local/AI Builder) |
| "deploy ZIP" / "static site" | `hosting.deploy_files` | Custom S3 + CloudFront |
| "rollback" / "promote release" | `hosting.release.promote`, `hosting.release.list` | Manual bucket swap |
| "import folder to site" | `hosting.storage.import_folder` | Re-upload all files |
| "project hosting status" / "host sell scale ladder" | `hosting.project.status` | Multiple REST calls |
| "what's next after publish" | `hosting.project.status` → `next_actions[0]` | Guessing module URLs |
| "upgrade hosting quota" | PTC task hosting.upgrade · Compass `hosting-upgrade` | Delete files without wallet path |

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
- Site bytes count toward the owner storage pool — check `storage.get_quota` first.
- Do not embed secrets in published static assets.
- Public funnel: `/host-site` → auth → `?drawer=publish&deploy=1`.
- **Project plane:** `hosting.project.status` returns ladder + ranked `next_actions` (post-login SoT).

## References

- Live catalog: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`.
- Gene: `core.commerce.assets.presets.gen1` (related assets); hosting actions under `hosting.*`.
