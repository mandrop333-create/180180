import assert from 'node:assert/strict';
import { TETRIO_MATRIX_REFERENCE, TETRIO_MATRIX_SOURCE } from './tetrio-matrix-reference-fixtures.js';
import {
  nativeToTetrioState,
  tetrioBoardCells,
  tetrioToNativeState,
  TETRIO_TOTAL_HEIGHT
} from './tetrio-coordinate-adapter.js';

// This test now uses the matrices extracted from the exact pinned client asset.
// It verifies all-piece coordinate round trips against real client matrix data;
// it is not a movement/kick parity test.
assert.ok(TETRIO_MATRIX_SOURCE.asset.includes('/js/tetrio.js?hv=7eebfc9cd.'), 'must use the exact pinned TETR.IO asset');
assert.equal(Object.keys(TETRIO_MATRIX_REFERENCE).length, 7);

let checks = 0;
for (const [type, matrix] of Object.entries(TETRIO_MATRIX_REFERENCE)) {
  assert.equal(matrix.orientations.length, 4, type + ' must provide four client orientations');
  for (let rotation = 0; rotation < 4; rotation += 1) {
    const clientCells = matrix.orientations[rotation];
    assert.equal(clientCells.length, 4, type + ' orientation ' + rotation + ' must have four cells');
    assert.equal(new Set(clientCells.map(([x,y]) => x + ',' + y)).size, 4,
      type + ' orientation ' + rotation + ' must have unique matrix cells');

    for (const state of [
      { rotation, x: 0, y: 0 },
      { rotation, x: 3, y: 5 },
      { rotation, x: 6, y: 17 }
    ]) {
      const client = nativeToTetrioState(TETRIO_MATRIX_REFERENCE, type, state);
      const cells = tetrioBoardCells(TETRIO_MATRIX_REFERENCE, type, rotation, client.x, client.y);
      assert.equal(cells.length, 4);
      assert.equal(new Set(cells.map(({x,y}) => x + ',' + y)).size, 4);

      const expectedClientCells = clientCells.map(([cellX, cellY]) => ({
        x: client.x + (cellX - matrix.dx),
        y: Math.ceil(client.y) + (cellY - matrix.dy)
      }));
      assert.deepEqual(
        cells.map(({x,y}) => [x,y]).sort(comparePair),
        expectedClientCells.map(({x,y}) => [x,y]).sort(comparePair),
        type + ' orientation ' + rotation + ' must use exact pinned matrix cells'
      );

      const native = tetrioToNativeState(TETRIO_MATRIX_REFERENCE, type, rotation, client.x, client.y);
      assert.deepEqual(native, state, type + ' orientation ' + rotation + ' must round-trip native state');
      assert.ok(Math.abs((client.y - Math.floor(client.y)) - 0.000001) < 1e-8,
        'client anchor must preserve the pinned generator fractional-y convention');
      checks += 1;
    }
  }
}
assert.equal(checks, 84);
assert.equal(TETRIO_TOTAL_HEIGHT, 40);
console.log(JSON.stringify({
  ok: true,
  checks,
  pieces: 7,
  orientations: 28,
  source: TETRIO_MATRIX_SOURCE.asset,
  note: 'real pinned client matrices; coordinate arithmetic only, not kick/movement parity'
}));

function comparePair(a, b) {
  return a[0] - b[0] || a[1] - b[1];
}
