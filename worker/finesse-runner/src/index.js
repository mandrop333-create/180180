import { acquire, connect } from "@cloudflare/playwright";

const GAME_URL = "https://180436.xyz/";

function response(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function authorized(request, env) {
  const expected = env.RUNNER_TOKEN;
  const supplied = request.headers.get("Authorization") || "";
  return typeof expected === "string" && expected.length >= 24
    && supplied === "Bearer " + expected;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return response(200, {
        ok: true,
        service: "180180-finesse-runner-poc",
        browserBindingConfigured: !!env.BROWSER,
        runnerTokenConfigured: typeof env.RUNNER_TOKEN === "string" && env.RUNNER_TOKEN.length >= 24
      });
    }

    if (url.pathname !== "/smoke" || request.method !== "POST") {
      return response(404, { ok: false, error: "not_found" });
    }
    if (!authorized(request, env)) {
      return response(401, { ok: false, error: "unauthorized" });
    }
    if (!env.BROWSER) {
      return response(503, { ok: false, error: "browser_binding_missing" });
    }

    let browser;
    try {
      const { sessionId } = await acquire(env.BROWSER);
      browser = await connect(env.BROWSER, sessionId);
      const page = await browser.newPage();
      page.setDefaultTimeout(15000);
      await page.goto(GAME_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForFunction(() => !!window.trainer, null, { timeout: 15000 });

      const state = await page.evaluate(() => {
        const trainer = window.trainer;
        return {
          title: document.title,
          trainerInitialized: !!trainer,
          boardWidth: Number.isInteger(trainer?.W) ? trainer.W : null,
          boardHeight: Number.isInteger(trainer?.H) ? trainer.H : null,
          finessePlannerAvailable: typeof trainer?.generateFinessePrompt === "function",
          activePieceType: trainer?.piece?.type ?? null
        };
      });

      if (!state.trainerInitialized || state.boardWidth !== 10 || state.boardHeight !== 20
          || !state.finessePlannerAvailable) {
        return response(502, { ok: false, error: "game_runtime_check_failed", state });
      }

      return response(200, {
        ok: true,
        test: "cloudflare-browser-run-smoke",
        target: new URL(GAME_URL).origin,
        checks: state,
        note: "Read-only load check; no gameplay state was changed or persisted."
      });
    } catch (error) {
      return response(502, {
        ok: false,
        error: "browser_smoke_failed",
        message: String(error?.message || error)
      });
    } finally {
      if (browser) {
        try { await browser.close(); } catch { /* best-effort session cleanup */ }
      }
    }
  }
};
