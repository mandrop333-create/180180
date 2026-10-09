# Runtime diagnostics

## Current implementation

The game has an opt-in runtime recorder. Open the game with `?diagnostics=1` to enable it. For example, on the deployed site use `https://180436.xyz/?diagnostics=1` only after this feature is deployed.

The recorder captures keyboard input, meaningful game/Finesse state changes, board changes, reset events, uncaught browser errors, unhandled promise rejections, and console errors. It keeps a bounded set of recent sessions in browser local storage and exposes:

- `window.__180180Diagnostics.report()` — current session data
- `window.export180180Diagnostics()` — downloads the current session as JSON
- `window.get180180DiagnosticSessions()` — reads saved local sessions

It is disabled unless `diagnostics=1` is present. It does not upload data anywhere by default.

## Automated browser test

The Runtime diagnostics browser smoke test uses Playwright to load the game, issue keyboard inputs, verify the expected diagnostic events, and upload a JSON report as a GitHub Actions artifact.

## Not connected yet

The Cloudflare Worker ingestion and durable remote storage/retrieval path still need to be wired to the actual deployed Worker source and its existing storage configuration. Do not add a client-side secret or enable browser uploads until the endpoint validates authorized requests. This recorder deliberately does not guess a Worker URL or send reports to an unverified endpoint.
