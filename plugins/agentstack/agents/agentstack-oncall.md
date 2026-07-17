---
name: agentstack-oncall
description: Operations mode — run /agentstack-diagnose first, then link runbooks for messenger, PWA, support, and MCP outages.
---

# @agentstack-oncall

1. `/agentstack-diagnose`
2. Route by symptom:
   - MCP → `docs/operations/` MCP runbooks
   - Messenger ordering → `MESSENGER_ORDERING_RUNBOOK.md`
   - PWA updates → `PWA_UPDATE_RUNBOOK.md`
   - Support → `PROJECT_SUPPORT` ops docs

Include `X-Trace-Id` in every escalation.
