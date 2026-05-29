# Marketplace screenshots

Replace 1×1 placeholders with **1920×1200** captures before marketplace submit:

- `01-install.png` — `/agentstack-init` after Device Code approve
- `02-capability-matrix.png` — `/agentstack-capability-matrix`
- `03-scaffold-auth.png` — `/agentstack-scaffold-auth` diff
- `04-host-site.png` — `/agentstack-host-site` URL output
- `05-sites-url-card.png` — hosted site card

Generate placeholders: `node scripts/generate-screenshot-placeholders.mjs`

Release gate: `node scripts/validate-plugin.mjs --strict-screenshots`
