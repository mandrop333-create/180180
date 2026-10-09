# Runtime diagnostics

## Gameplay recorder

The recorder is opt-in: append `?diagnostics=1` to the game URL. Example: `https://180436.xyz/?diagnostics=1`.

It records keyboard input, piece spawn/movement/rotation/hold/drop/placement, board and state changes, Finesse state, reset/game-over events, uncaught browser errors, unhandled promise rejections, and console errors. It keeps a bounded local backup and exposes:

- `window.__180180Diagnostics.report()` — current report
- `window.export180180Diagnostics()` — download the current report as JSON
- `window.get180180DiagnosticSessions()` — read saved local sessions

On the production host only, with diagnostics explicitly enabled, the recorder uploads new events every 30 seconds and on page exit to the separate `180180-diagnostics` Worker. Local development and Playwright do not upload to the live endpoint. The game continues normally if upload fails.

## Cloudflare report API

Worker code and deployment configuration live in `worker/`. It uses a dedicated KV namespace and expires reports after 30 days. See [worker/README.md](../worker/README.md) for the one-time setup. This is deliberately a separate Worker; it must not replace the existing `180trainertool` Worker.

Endpoints:
- `GET /health`
- `POST /api/reports`
- `GET /api/reports/latest`
- `GET /api/reports?limit=10`
- `GET /api/reports/{sessionId}`

The read endpoints return gameplay diagnostic data without authentication so it can be retrieved without embedding a client secret. Do not put personal information into reports. CORS is not authentication.

## Automated tests and artifacts

GitHub Actions runs deterministic engine-rule tests (`tests/engine-rules.test.js`), Worker API tests, and a headless Playwright gameplay/visual audit on prompt-triggered runs. The browser test exercises movement, rotation, hold, hard drop, reset, and a deterministic game-over path. It captures full-page and board screenshots at desktop gameplay checkpoints plus a mobile-width view, a Playwright trace (screenshots, DOM snapshots, and action history), browser video, page-state JSON snapshots, the runtime event report, console messages, JavaScript errors, failed requests, HTTP error responses, and runner/server metadata. The complete `runtime-diagnostics-bundle` artifact is uploaded even when tests fail and is retained for 7 days. Open `playwright-trace.zip` with Playwright Trace Viewer to inspect the timeline; view PNGs under `screenshots/` and JSON files for machine-readable state. CI tests the Worker handler with an in-memory KV implementation; it does not deploy to Cloudflare or upload to the production Worker.

After deployment, the `Sync latest gameplay diagnostics report` workflow, which runs every four hours fetches the newest live report into a GitHub Actions artifact named `latest-gameplay-diagnostics`. That lets ChatGPT retrieve the artifact through the connected GitHub repository tools when asked to analyze the latest gameplay report. It never commits gameplay data into the source tree.
