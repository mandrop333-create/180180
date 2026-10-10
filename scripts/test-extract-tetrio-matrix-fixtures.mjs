import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = resolve('.');
const temp = await mkdtemp(join(tmpdir(), 'tetrio-matrix-fixture-'));
try {
  const bundlePath = join(temp, 'synthetic-client.js');
  const outputPath = join(temp, 'matrix-fixtures.mjs');
  const pieces = {};
  for (const piece of ['i', 'o', 't', 's', 'z', 'j', 'l']) {
    pieces[piece] = {
      matrix: {
        dx: 1,
        dy: 2,
        data: Array.from({ length: 4 }, (_, orientation) => [
          [orientation, 0], [orientation + 1, 1], [orientation + 2, 2], [orientation + 3, 3]
        ])
      }
    };
  }
  await writeFile(bundlePath, 'const client = { tetrominoes: ' + JSON.stringify(pieces) + ' };', 'utf8');
  await execFileAsync(process.execPath, [
    join(root, 'scripts/extract-tetrio-matrix-fixtures.mjs'), bundlePath, outputPath
  ]);
  const { TETRIO_MATRIX_REFERENCE, TETRIO_MATRIX_SOURCE } = await import(pathToFileURL(outputPath).href);
  assert.equal(Object.keys(TETRIO_MATRIX_REFERENCE).length, 7);
  assert.equal(TETRIO_MATRIX_REFERENCE.I.dx, 1);
  assert.equal(TETRIO_MATRIX_REFERENCE.I.dy, 2);
  assert.equal(TETRIO_MATRIX_REFERENCE.I.orientations.length, 4);
  assert.deepEqual(TETRIO_MATRIX_REFERENCE.I.orientations[3], [[3,0],[4,1],[5,2],[6,3]]);
  assert.match(TETRIO_MATRIX_SOURCE.asset, /tetrio\.js\?hv=/);
  const output = await readFile(outputPath, 'utf8');
  assert.match(output, /Do not edit by hand/);
  console.log(JSON.stringify({ ok: true, pieces: 7, orientations: 28, checks: 'extraction, metadata, shape validation' }));
} finally {
  await rm(temp, { recursive: true, force: true });
}
