#!/usr/bin/env node
// Fail closed when the pinned TETR.IO movement reference no longer matches the
// asset advertised by the live homepage. This protects the parity suite from
// silently treating an old client snapshot as current.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const fixturePath = new URL('../games/01/tetrio-matrix-reference-fixtures.js', import.meta.url);
const fixture = await readFile(fixturePath, 'utf8');
const assetMatch = fixture.match(/asset:\s*"([^"]+)"/);
if (!assetMatch) {
  throw new Error('Could not read the pinned asset URL from tetrio-matrix-reference-fixtures.js');
}
const pinnedAsset = assetMatch[1];
const pinnedVersion = new URL(pinnedAsset).searchParams.get('hv');
if (!pinnedVersion) {
  throw new Error('Pinned TETR.IO asset URL has no hv version parameter');
}

const homepageResponse = await fetch('https://tetr.io/');
if (!homepageResponse.ok) {
  throw new Error('Could not fetch TETR.IO homepage: HTTP ' + homepageResponse.status);
}
const homepage = await homepageResponse.text();
const versions = [...new Set([...homepage.matchAll(/\bhv=([^"&<>]+)/g)].map(match => match[1]))];
if (versions.length !== 1) {
  throw new Error('Expected exactly one TETR.IO homepage asset version; found ' + versions.length);
}
const currentAsset = 'https://tetr.io/js/tetrio.js?hv=' + versions[0];
if (currentAsset !== pinnedAsset) {
  throw new Error(
    'Pinned TETR.IO reference is stale. Current homepage advertises ' + currentAsset +
    ', but fixture pins ' + pinnedAsset + '. Refresh the matrix and movement snapshots before claiming current-client parity.'
  );
}

const response = await fetch(currentAsset, { redirect: 'follow' });
if (!response.ok) {
  throw new Error('Could not fetch current TETR.IO asset: HTTP ' + response.status);
}
const bytes = await response.arrayBuffer();
const bundle = Buffer.from(bytes).toString('utf8');
if (!bundle.includes('tetrominoes') || !bundle.includes('kicksets')) {
  throw new Error('Current TETR.IO asset is missing expected movement tables; refusing to accept freshness check.');
}
const hash = createHash('sha256').update(Buffer.from(bytes)).digest('hex');

console.log('TETR.IO movement reference version matches the live homepage.');
console.log('Asset: ' + pinnedAsset);
console.log('Current bundle SHA-256 (for audit only; the fixture does not pin this digest): ' + hash);
