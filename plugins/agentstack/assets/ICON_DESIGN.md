# Plugin logo contract

Enforced by `scripts/validate-plugin.mjs` section 11.

**MCP catalog / `GET /mcp/icon` SoT:** `shared/seo/assets/mcp_icon.png` — **400×400** transparent PNG (official registry, ChatGPT connector, `initialize` icons).

**Chip / marketplace `logo` (plugin.json):** `assets/logo.png` — **64×64** derivative (`python scripts/sync_mcp_brand_icon.py` from SoT). Cursor’s SVG→PNG preview drops strokes and often flattens `linearGradient` to an empty chip. PNG skips that pipeline.

SVG still shipped (validator + brand SoT):

- viewBox `0 0 512 512`
- Single canonical `<path>` matching `assets/brand-mark.svg`
- Transform `translate(0, 512) scale(0.2, -0.2)`
- No `<rect>` badge, no visible strokes, no `<line>`/`<polyline>`
- `assets/logo.svg` — white mark (dark chrome)
- `assets/logo-dark.svg` — slate + cyan (light chrome)

Cursor forbids `logoDark` / `icon` in plugin.json.
