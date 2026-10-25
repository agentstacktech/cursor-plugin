---
name: agentstack-stackscript
description: Use when the user needs server-side TypeScript logic on AgentStack — compile StackScript, dry_run/run scripts, publish versions, or bridge Logic Engine rules via script_processor. Prefer MCP script.* over custom Node/V8 sandboxes.
---

# AgentStack StackScript

Separate engine from Logic Engine V2 JSON rules: **TypeScript subset → SSBC bytecode → in-process VM** with host `ctx.*`.

**Agents:** `script.put` takes **TypeScript source** in `files[].content` (e.g. `main.ts`), not JSON rule graphs. Call `script.docs` with `topic=syntax` before first compile.

## TypeScript you should write

```typescript
// Style A (tests / bench)
defineFn("add", { caps: [] }, async (a: int, b: int) => { return a + b; });

// Style B (MCP probes / apps)
export const ping = defineCommand({
  name: "probe.ping",
  caps: [],
  run(ctx, input) { return { ok: true }; },
});
```

- File extension: `.ts` · imports: `@stack/runtime`, `@stack/std`
- No float literals · integer math · `idiv(a, b)` instead of `a / b` in code

## When to use

| User says | Use |
|-----------|-----|
| "TypeScript business logic on server" | `script.put` + `script.dry_run` |
| "Call script from automation" | Logic rule + `script_processor` / `call` step |
| "Migrate JSON rule to TS" | `logic.export_json` with `format=stackscript` (hint) + thin trigger shell |
| "Game / grid / tick simulation" | StackScript std subset + `script.test` |

## MCP actions

- `script.put` — compile and store (validate_only, publish staging/live).
- `script.get`, `script.list`, `script.versions`
- `script.test` — sandbox smoke
- `script.dry_run` — no persisted side effects; returns `fuel_used` and `cost.usd_est`
- `script.run` — live with quotas and idempotency_key
- `script.publish` / `script.rollback` — aliases; caps approval via `approve_caps` or project `config.agent_can_approve_caps`
- `script.docs` — topics `syntax` (TypeScript shapes), `overview`, `fuel`, `migration`
- `script.profile` — aggregates / hot lines

## Agent ladder

1. `script.docs` topic `migration` if coming from `logic.*`
2. `script.put` validate_only
3. `script.test` or `script.dry_run`
4. `script.publish` alias staging → live
5. Optional: `logic.create` with `tpl_stackscript_trigger_shell`

## SDK

`createStackScriptClient(http, projectId)` from `@agentstack/sdk` — wraps MCP execute for put/dry_run/run/docs.

## Do not

- Replace Logic Engine triggers with monolithic TS — keep triggers in JSON, delegate body to StackScript.
- Put SSBC in full project JSONB blobs — platform stores bytecode in blob storage + index leaves.

## References

- Live catalog: `GET /mcp/actions` — filter `script.*`
