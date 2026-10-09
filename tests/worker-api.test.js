import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';

function makeKV() {
  const data = new Map();
  return {
    async put(key, value, options) { data.set(key, { value: String(value), options }); },
    async get(key) { return data.get(key)?.value ?? null; },
    async list({ prefix = '', limit = 100 } = {}) {
      const keys = [...data.keys()].filter(key => key.startsWith(prefix)).sort().slice(0, limit);
      return { keys: keys.map(name => ({ name })) };
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
