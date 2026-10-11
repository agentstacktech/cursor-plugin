# Plugin logo contract

Enforced by `scripts/validate-plugin.mjs` section 11.

**MCP catalog / `GET /mcp/icon` SoT:** `shared/seo/assets/mcp_icon.png` — **400×400** transparent PNG (official registry, ChatGPT connector, `initialize` icons).

**Marketplace `logo` (plugin.json):** `assets/icon.png` — **400×400** copy of SoT (same art as `GET /mcp/icon`). Regenerate: monorepo `python scripts/sync_mcp_brand_icon.py` — commit the PNG in the publish repo so GitHub raw / review UI do not 404.

**Local chip PNG:** `assets/logo.png` — **64×64** derivative from the same script. `refresh-cursor-runtime.mjs --fix` mirrors `icon.png` + `logo.png` into `~/.cursor/plugins/cache` when the IDE chip is stale.

SVG still shipped (validator + brand SoT):

- viewBox `0 0 512 512`
- Single canonical `<path>` matching `assets/brand-mark.svg`
- Transform `translate(0, 512) scale(0.2, -0.2)`
- No `<rect>` badge, no visible strokes, no `<line>`/`<polyline>`
- `assets/logo.svg` — white mark (dark chrome)
- `assets/logo-dark.svg` — slate + cyan (light chrome)

Cursor forbids `logoDark` / `icon` in plugin.json.
