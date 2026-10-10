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

const [currentResponse, pinnedResponse] = await Promise.all([
  fetch(currentAsset, { redirect: 'follow' }),
  fetch(pinnedAsset, { redirect: 'follow' })
]);
if (!currentResponse.ok || !pinnedResponse.ok) {
  throw new Error('Could not fetch current/pinned TETR.IO asset: current HTTP ' +
    currentResponse.status + ', pinned HTTP ' + pinnedResponse.status);
}
const [currentBytes, pinnedBytes] = await Promise.all([
  currentResponse.arrayBuffer(),
  pinnedResponse.arrayBuffer()
]);
const digest = bytes => createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const currentHash = digest(currentBytes);
const pinnedHash = digest(pinnedBytes);
if (currentHash !== pinnedHash) {
  throw new Error('TETR.IO asset content mismatch: current SHA-256 ' + currentHash +
    ', pinned SHA-256 ' + pinnedHash);
}

console.log('TETR.IO movement reference is current.');
console.log('Asset: ' + pinnedAsset);
console.log('SHA-256: ' + pinnedHash);
