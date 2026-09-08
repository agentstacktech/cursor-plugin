---
name: agentstack-services
description: Use when the user asks about AgentStack professional services, hire studio, /services SKU pages, or implementation inquiries. REST-only public BFF — no MCP actions.
---

# AgentStack Professional Services (`/services`)

**Gene:** `frontend.public.services_offers.gen1` · **No MCP** — public REST BFF only.

## Decision matrix

| User says | Route / API | Not |
|-----------|-------------|-----|
| "hire studio" / professional services | `/services` hub | `/pricing` (SaaS tiers) |
| "implementation package" / SKU detail | `/services/:sku` | `/showcase` (demos) |
| "list service catalog" | `GET /api/public/services/catalog` | 8DNA fat read |
| "SKU detail" | `GET /api/public/services/skus/{id}` | MCP |
| "request quote" / inquiry | `POST /api/public/services/inquiry` | Stripe checkout on SKUs |

Locale prefixes: `/ru/services`, `/pt/services` (+ `/:sku`). `/offers` aliases to `/services`.

## Rules

- Fixture SoT: `shared/fixtures/services_offers_v1.json` (mirror `public/services-offers.json`).
- Inquiry creates CRM contact + activity on ecosystem **pid=1** — not tenant project scope.
- Prices are planning estimates (USD / locale RUB / BRL) — not a public оферта.
- Founder vs developer copy: cookie `agentstack_audience`; rate card and TZ lists are developer-only on hub.

## References

- Public hub: `/services` (SKU pages under `/services/:sku`; inquiry BFF on ecosystem pid=1)
- Fixture catalog: `shared/fixtures/services_offers_v1.json` (planning estimates, not a public оферта)
- Promo hire teaser on `/` (static SKU ids, no catalog fetch)

## Triggers

services, hire studio, professional services, implementation, /services, service inquiry, service SKU, agency package
