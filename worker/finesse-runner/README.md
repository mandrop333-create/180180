# Cloudflare finesse runner proof of concept

This is an isolated, non-production smoke-test Worker. It does not replace the diagnostics Worker, change the game, or run the full finesse suite yet.

It checks that Cloudflare Browser Run can open the live game and that the browser sees the expected trainer runtime, board dimensions, and finesse planner entry point. The request is read-only: it does not issue gameplay inputs or save anything to the game.

## Deploy manually

From this directory:

```sh
npm install
npx wrangler login
npx wrangler secret put RUNNER_TOKEN --config wrangler.toml
npm run deploy
```

Set `RUNNER_TOKEN` to a randomly generated secret at least 24 characters long. Do not commit it or send it in chat. Keep this proof-of-concept Worker separate from `180180-diagnostics`.

Cloudflare Browser Run must be available on the account. The `browser` binding in `wrangler.toml` connects this Worker to Browser Run; the test uses a hosted browser and therefore consumes Browser Run usage. The Worker endpoint requires the bearer secret before it will start a browser.

## Verify

Use the deployed Worker URL returned by Wrangler:

```sh
curl -sS https://YOUR-WORKER-URL/health
curl -sS -X POST https://YOUR-WORKER-URL/smoke \
  -H "Authorization: Bearer YOUR_RUNNER_TOKEN"
```

A successful smoke response must contain `"ok": true`, `"trainerInitialized": true`, a 10-by-20 board, and `"finessePlannerAvailable": true`.

This smoke test only validates browser connectivity and live-game initialization. It does **not** claim the independent reference, route-optimality, kick-order, or timing suites have passed. Those are the next stage after this isolated connection is verified.

## Free usage safety

The Worker does not start a browser for health checks, missing/invalid authorization, or unknown routes. Every smoke request creates one browser session and closes it in `finally`. Cloudflare Workers Free Browser Run has a 10-minute daily browser allowance; monitor usage in Cloudflare before repeating tests.
