---
name: agentstack-storefront-studio
description: Use when the user builds a hosted storefront, edits catalog in studio mode, or uses commerce.storefront.* MCP actions. Prefer Storefront Studio (?mode=studio) and hosted /s/ URLs.
---

# Storefront Studio

## Decision matrix

| User says | Prefer |
|-----------|--------|
| "storefront studio" / merchant UI | `/dev/projects/{id}/commerce?mode=studio` |
| "seed demo store" | `commerce.storefront.*` MCP |
| "hosted shop URL" | `/s/{project_id}/{bucket}/` |

## References

- `commerce/STOREFRONT_STUDIO.md`, `commerce/HOSTED_STOREFRONT.md`
- SDK: `@agentstack/sdk/commerce/assets`

## Live catalog

Discover actions: `GET https://agentstack.tech/mcp/actions` or `/agentstack-capability-matrix`. Do not hard-code action counts.
