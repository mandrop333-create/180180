#!/usr/bin/env node
// Fetch the TETR.IO bundle advertised by its live homepage and extract matrix fixtures.
// By default this creates a review candidate, never the accepted reference fixture.
// Usage: node scripts/fetch-tetrio-matrix-fixtures.mjs [output-path]
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const homepageResponse = await fetch('https://tetr.io/', {\n  headers: {\n    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',\n    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'\n  }\n});
if (!homepageResponse.ok) {
  throw new Error('TETR.IO homepage request failed: HTTP ' + homepageResponse.status);
}
const homepage = await homepageResponse.text();
// The homepage may advertise the version token outside a literal script URL.
// Match the same hv token used by the freshness guard, then build the canonical URL.
const versions = [...new Set([...homepage.matchAll(/\\bhv=([^"&<>]+)/g)].map(match => match[1]))];
if (versions.length !== 1) {
  throw new Error('Expected exactly one TETR.IO homepage asset version; found ' + versions.length);
}
const asset = new URL('https://tetr.io/js/tetrio.js?hv=' + versions[0]);
if (asset.hostname !== 'tetr.io' || asset.pathname !== '/js/tetrio.js' || !asset.searchParams.get('hv')) {
  throw new Error('Homepage advertised an unexpected client asset URL: ' + asset.href);
}
const output = resolve(process.argv[2] ?? 'games/01/tetrio-matrix-reference-candidate.js');
const temp = await mkdtemp(join(tmpdir(), 'tetrio-current-matrix-'));
const bundlePath = join(temp, 'tetrio.js');
try {
  const response = await fetch(asset.href, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error('Current asset request failed: HTTP ' + response.status + ' ' + response.statusText);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const body = bytes.toString('utf8');
  if (!body.includes('tetrominoes') || !body.includes('kicksets')) {
    throw new Error('Current asset is missing expected movement tables; refusing to extract.');
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const fetchedAt = new Date().toISOString();
  await writeFile(bundlePath, bytes);
  const extractor = fileURLToPath(new URL('./extract-tetrio-matrix-fixtures.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [
    extractor, bundlePath, output, asset.href, fetchedAt, sha256
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Matrix extraction failed with exit code ' + result.status);
  console.log('Current TETR.IO matrix candidate generated: ' + output);
  console.log('Asset: ' + asset.href);
  console.log('Fetched at: ' + fetchedAt);
  console.log('Bundle SHA-256: ' + sha256);
  console.log('Review candidate against movement snapshots before promoting it to the accepted fixture.');
} finally {
  await rm(temp, { recursive: true, force: true });
}
