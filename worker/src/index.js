const MAX_BODY_BYTES = 1_000_000;
const MAX_EVENTS = 4000;
const RETENTION_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_ORIGINS = [
  "https://180436.xyz",
  "https://www.180436.xyz",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
];

function allowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ORIGINS);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  if (origin && allowedOrigins(env).has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request, env, status, value, extra = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
      ...extra
    }
  });
}

function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || allowedOrigins(env).has(origin);
}

function validReport(report) {
  return !!report
    && report.schema === "180180-runtime-diagnostics/v1"
    && typeof report.sessionId === "string"
    && /^[a-zA-Z0-9_-]{1,100}$/.test(report.sessionId)
    && Array.isArray(report.events)
    && report.events.length <= MAX_EVENTS
    && report.events.every(event => event && typeof event.type === "string" && Number.isFinite(event.t));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method === "OPTIONS") {
      if (!originAllowed(request, env)) return new Response(null, { status: 403, headers: corsHeaders(request, env) });
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (!originAllowed(request, env)) return json(request, env, 403, { error: "origin_not_allowed" });

    if (path === "/health" && request.method === "GET") {
      return json(request, env, 200, { ok: true, service: "180180-diagnostics", storageConfigured: !!env.REPORTS });
    }

    if (!env.REPORTS) {
      return json(request, env, 503, { error: "storage_not_configured", message: "Bind a Cloudflare KV namespace as REPORTS." });
    }

    // Isolated smoke-test route: never changes the production "latest" report pointer.
    if (path === "/api/test/reports" && request.method === "POST") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json(request, env, 415, { error: "content_type_must_be_json" });
      }
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
        return json(request, env, 413, { error: "report_too_large" });
      }
      let report;
      try { report = JSON.parse(body); }
      catch { return json(request, env, 400, { error: "invalid_json" }); }
      if (!validReport(report)) return json(request, env, 400, { error: "invalid_report_schema" });
      const now = Date.now();
      const stored = JSON.stringify({ ...report, receivedAt: new Date(now).toISOString(), smokeTest: true });
      await env.REPORTS.put("test/session/" + report.sessionId, stored, { expirationTtl: 60 * 60 });
      return json(request, env, 201, { ok: true, sessionId: report.sessionId, smokeTest: true });
    }

    const testSingle = path.match(/^\/api\/test\/reports\/([a-zA-Z0-9_-]{1,100})$/);
    if (testSingle && request.method === "GET") {
      const report = await env.REPORTS.get("test/session/" + testSingle[1]);
      if (!report) return json(request, env, 404, { error: "test_report_not_found" });
      return new Response(report, {
        status: 200,
        headers: { ...corsHeaders(request, env), "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (path === "/api/reports" && request.method === "POST") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json(request, env, 415, { error: "content_type_must_be_json" });
      }
      const declaredLength = Number(request.headers.get("Content-Length") || 0);
      if (declaredLength > MAX_BODY_BYTES) return json(request, env, 413, { error: "report_too_large" });

      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
        return json(request, env, 413, { error: "report_too_large" });
      }
      let report;
      try { report = JSON.parse(body); }
      catch { return json(request, env, 400, { error: "invalid_json" }); }
      if (!validReport(report)) return json(request, env, 400, { error: "invalid_report_schema" });

      const now = Date.now();
      const id = report.sessionId;
      const reportKey = "reports/" + String(now).padStart(13, "0") + "/" + id;
      const stored = JSON.stringify({ ...report, receivedAt: new Date(now).toISOString() });
      const options = { expirationTtl: RETENTION_SECONDS, metadata: { sessionId: id, receivedAt: now } };
      await env.REPORTS.put(reportKey, stored, options);
      await env.REPORTS.put("session/" + id, stored, { expirationTtl: RETENTION_SECONDS });
      await env.REPORTS.put("latest", stored, { expirationTtl: RETENTION_SECONDS });
      return json(request, env, 201, {
        ok: true,
        sessionId: id,
        receivedAt: new Date(now).toISOString(),
        reportUrl: "/api/reports/" + encodeURIComponent(id)
      });
    }

    if (path === "/api/reports/latest" && request.method === "GET") {
      const report = await env.REPORTS.get("latest");
      if (!report) return json(request, env, 404, { error: "no_reports_yet" });
      return new Response(report, {
        status: 200,
        headers: { ...corsHeaders(request, env), "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const single = path.match(/^\/api\/reports\/([a-zA-Z0-9_-]{1,100})$/);
    if (single && request.method === "GET") {
      const report = await env.REPORTS.get("session/" + single[1]);
      if (!report) return json(request, env, 404, { error: "report_not_found" });
      return new Response(report, {
        status: 200,
        headers: { ...corsHeaders(request, env), "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (path === "/api/reports" && request.method === "GET") {
      const requested = Number.parseInt(url.searchParams.get("limit") || "10", 10);
      const limit = Number.isFinite(requested) ? Math.max(1, Math.min(20, requested)) : 10;
      const listing = await env.REPORTS.list({ prefix: "reports/", limit: 100 });
      const keys = listing.keys.slice().sort((a, b) => b.name.localeCompare(a.name)).slice(0, limit);
      const reports = await Promise.all(keys.map(async key => {
        const value = await env.REPORTS.get(key.name);
        if (!value) return null;
        try {
          const parsed = JSON.parse(value);
          return { sessionId: parsed.sessionId, startedAt: parsed.startedAt, receivedAt: parsed.receivedAt, eventCount: parsed.eventCount, url: "/api/reports/" + encodeURIComponent(parsed.sessionId) };
        } catch { return null; }
      }));
      return json(request, env, 200, { reports: reports.filter(Boolean), limit });
    }

    return json(request, env, 404, { error: "not_found" });
  }
};
