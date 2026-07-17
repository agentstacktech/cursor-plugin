## Summary

- [ ] Philosophy gate (Creation / Minimalism / live catalog — no hard-coded action counts)
- [ ] `audit-cursor-plugin.mjs` green (add `--strict-screenshots` for release)
- [ ] `sync-plugin-kernel.mjs --check` green
- [ ] CHANGELOG section matches `plugin.json` version
- [ ] Skills: one domain each; router row updated if new skill

## Test plan

- [ ] `node provided_plugins/cursor-plugin/scripts/test-hooks-contract.mjs`
- [ ] `node provided_plugins/cursor-plugin/scripts/run-intent-eval.mjs`
- [ ] Local symlink smoke (`scripts/smoke-local.ps1`) when hooks/auth touched
