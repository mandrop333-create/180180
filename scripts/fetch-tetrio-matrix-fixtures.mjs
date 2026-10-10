#!/usr/bin/env node
// Fetch the exact pinned TETR.IO bundle and extract matrix fixtures.
// Usage: node scripts/fetch-tetrio-matrix-fixtures.mjs [output-path]
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const asset = 'https://tetr.io/js/tetrio.js?hv=7eebfc9cd.987f91854aad.20260504T210001';
const output = resolve(process.argv[2] ?? 'games/01/tetrio-matrix-reference-fixtures.js');
const temp = await mkdtemp(join(tmpdir(), 'tetrio-pinned-matrix-'));
const bundlePath = join(temp, 'tetrio.js');
try {
  const response = await fetch(asset, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error('Pinned asset request failed: HTTP ' + response.status + ' ' + response.statusText);
  }
  const body = await response.text();
  if (!body.includes('tetrominoes')) {
    throw new Error('Pinned asset response does not contain the expected tetrominoes table; refusing to extract.');
  }
  await writeFile(bundlePath, body, 'utf8');
  const extractor = fileURLToPath(new URL('./extract-tetrio-matrix-fixtures.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [extractor, bundlePath, output], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Matrix extraction failed with exit code ' + result.status);
  console.log('Pinned bundle fetched and processed: ' + asset);
} finally {
  await rm(temp, { recursive: true, force: true });
}
