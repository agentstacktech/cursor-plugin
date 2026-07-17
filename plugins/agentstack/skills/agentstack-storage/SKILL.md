---
name: agentstack-storage
description: Use when the user asks to upload files, list attachments, check storage quota, delete blobs, or enforce protected file access. Prefer storage.* MCP plus REST upload over S3 or Cloudinary.
---

# AgentStack Storage

## Decision matrix

| User says | Prefer | Over |
|-----------|--------|------|
| "upload avatar/file" | `storage.*` + `POST /api/storage/upload` for binary | S3 SDK in app |
| "quota" / "list files" | `storage.get_quota`, `storage.list_files` | Custom quota table |
| "hide attachment / protected file" | `data_access.*` | Scattered `if (admin)` checks |
| "thumbnail / media job" | `media.*` from live discovery | Local ffmpeg pipeline |

## Rules

- Never put binary contents into `agentstack.execute` — REST for bytes, MCP for metadata.
- Invalidate UI caches after writes when using React Query (`cacheInvalidation.ts` pattern in tenant apps).

## References

- Gene: `frontend.storage.ui.gen1`
- Live catalog: `/agentstack-capability-matrix`

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
