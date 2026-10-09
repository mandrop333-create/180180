import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';

function makeKV() {
  const data = new Map();
  return {
    async put(key, value, options) { data.set(key, { value: String(value), options }); },
    async get(key) { return data.get(key)?.value ?? null; },
    async list({ prefix = '', limit = 1000, cursor } = {}) {
      const all = [...data.keys()].filter(key => key.startsWith(prefix)).sort();
      // The fake cursor is a page offset; production KV cursors are opaque.
      const start = cursor ? Number.parseInt(cursor, 10) : 0;
      const page = all.slice(start, start + limit);
      const next = start + page.length;
      return {
        keys: page.map(name => ({ name })),
        list_complete: next >= all.length,
        cursor: next < all.length ? String(next) : undefined
      };
    }
  };
}

function env() {
  return {
    REPORTS: makeKV(),
    ALLOWED_ORIGINS: 'https://180436.xyz,http://127.0.0.1:4173'
  };
}

function report(sessionId = 'test-session-1') {
  return {
    schema: '180180-runtime-diagnostics/v1',
    sessionId,
    startedAt: '2026-10-09T12:00:00.000Z',
    durationMs: 120,
    mode: 'test',
    eventCount: 2,
    events: [{ t: 0, type: 'session-start', data: {} }, { t: 12, type: 'state-change', data: {} }]
  };
}

async function call(envObj, path, { method = 'GET', body, origin = 'https://180436.xyz' } = {}) {
  const headers = new Headers({ Origin: origin });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  return worker.fetch(new Request('https://worker.test' + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  }), envObj);
}

test('health endpoint reports storage readiness', async () => {
  const response = await call(env(), '/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: '180180-diagnostics', storageConfigured: true });
});

test('POST stores a report and latest endpoint retrieves it', async () => {
  const envObj = env();
  const post = await call(envObj, '/api/reports', { method: 'POST', body: report() });
  assert.equal(post.status, 201);
  assert.equal((await post.json()).sessionId, 'test-session-1');
  const latest = await call(envObj, '/api/reports/latest');
  assert.equal(latest.status, 200);
  assert.equal((await latest.json()).sessionId, 'test-session-1');
});

test('a report can be retrieved by session ID and listed', async () => {
  const envObj = env();
  await call(envObj, '/api/reports', { method: 'POST', body: report('run_abc') });
  const single = await call(envObj, '/api/reports/run_abc');
  assert.equal(single.status, 200);
  assert.equal((await single.json()).sessionId, 'run_abc');
  const list = await call(envObj, '/api/reports?limit=5');
  assert.equal(list.status, 200);
  assert.equal((await list.json()).reports[0].sessionId, 'run_abc');
});

test('report listing paginates before selecting the newest reports', async () => {
  const envObj = env();
  for (let i = 0; i < 1005; i++) {
    const id = 'session_' + String(i).padStart(4, '0');
    const key = 'reports/' + String(1_800_000_000_000 + i).padStart(13, '0') + '/' + id;
    await envObj.REPORTS.put(key, JSON.stringify({
      ...report(id),
      receivedAt: new Date(1_800_000_000_000 + i).toISOString()
    }), { expirationTtl: 60 * 60 * 24 * 30 });
  }
  const response = await call(envObj, '/api/reports?limit=5');
  assert.equal(response.status, 200);
  const ids = (await response.json()).reports.map(item => item.sessionId);
  assert.deepEqual(ids, ['session_1004', 'session_1003', 'session_1002', 'session_1001', 'session_1000']);
});

test('rejects invalid report schemas', async () => {
  const response = await call(env(), '/api/reports', { method: 'POST', body: { sessionId: 'x', events: [] } });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'invalid_report_schema');
});

test('rejects browser origins outside the allowlist', async () => {
  const response = await call(env(), '/api/reports', { method: 'POST', body: report(), origin: 'https://attacker.example' });
  assert.equal(response.status, 403);
});

test('rejects non-JSON uploads', async () => {
  const response = await worker.fetch(new Request('https://worker.test/api/reports', {
    method: 'POST',
    headers: { Origin: 'https://180436.xyz', 'Content-Type': 'text/plain' },
    body: 'nope'
  }), env());
  assert.equal(response.status, 415);
});

test('returns 503 when KV is not bound', async () => {
  const response = await call({ ALLOWED_ORIGINS: 'https://180436.xyz' }, '/api/reports/latest');
  assert.equal(response.status, 503);
});
