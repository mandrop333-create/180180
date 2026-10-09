# 180180 diagnostics Worker

This is a **separate** Worker named `180180-diagnostics`; it does not replace the existing `180trainertool` Worker. It accepts bounded gameplay reports and stores them in Cloudflare KV for 30 days.

## One-time Cloudflare setup

1. Create a Workers KV namespace named `180180-diagnostics-reports`.
2. Copy its namespace ID into `worker/wrangler.toml`, replacing `REPLACE_WITH_KV_NAMESPACE_ID`.
3. Deploy this directory's config from the repository root with `npx wrangler deploy --config worker/wrangler.toml`. If using Cloudflare Workers Builds, set its deploy command to that exact command for this separate Worker project. Do not change the existing `180trainertool` project's deployment command to this config.

The expected Worker URL is `https://180180-diagnostics.<your-workers-subdomain>.workers.dev`. Verify the URL Cloudflare assigns and keep the frontend endpoint in `games/01/game.js` aligned with it. The endpoint is intentionally not deployed by GitHub Actions; CI does not publish to Cloudflare.

## API

- `GET /health` — health and KV binding status.
- `POST /api/reports` — validate and save a report.
- `GET /api/reports/latest` — fetch the newest report.
- `GET /api/reports?limit=10` — list recent report metadata (maximum 20).
- `GET /api/reports/{sessionId}` — retrieve one report.

Only `https://180436.xyz`, `https://www.180436.xyz`, and the local Playwright test origins are allowed by default. The Worker enforces JSON, a 1 MB request cap, the diagnostics schema, and at most 4,000 events per report. Stored reports expire after 30 days.

Reports contain gameplay inputs and board state. The read endpoints are public so a report can be retrieved without a client-side secret; do not add personal information to diagnostic events. CORS is browser protection, not authentication. If reports ever include sensitive data, add authenticated read access before deployment.
