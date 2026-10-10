import assert from 'node:assert/strict';
import { TETRIO_MATRIX_REFERENCE, TETRIO_MATRIX_SOURCE } from './tetrio-matrix-reference-fixtures.js';
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import {
  nativeToTetrioState,
  tetrioBoardCells,
  tetrioToNativeState,
  tetrioKickToLocalOriginOffset,
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

    // Compare normalized occupied-cell shapes from the pinned client matrices
    // against the independently authored trainer reference, not just round trips.
    const normalize = (cells) => {
      const minX = Math.min(...cells.map(([x]) => x));
      const minY = Math.min(...cells.map(([, y]) => y));
      return cells.map(([x,y]) => [x - minX, y - minY]).sort(comparePair);
    };
    assert.deepEqual(
      normalize(clientCells),
      normalize(REFERENCE_PIECES[type].orientations[rotation]),
      type + ' orientation ' + rotation + ' pinned client shape must match trainer reference'
    );
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

// Raw ordered SRS+ I kick candidates extracted from the pinned TETR.IO client
// asset. These arrays intentionally omit the trainer's explicit direct-test
// candidate [0,0]; the client tests the direct destination before this list.
const PINNED_I_SRS_PLUS_KICKS = Object.freeze({
  '0>1': [[1,0],[-2,0],[-2,1],[1,-2]],
  '1>2': [[-1,0],[2,0],[-1,-2],[2,1]],
  '2>3': [[2,0],[-1,0],[2,-1],[-1,2]],
  '3>0': [[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3': [[-1,0],[2,0],[2,1],[-1,-2]],
  '1>0': [[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[-2,0],[1,0],[-2,-1],[1,2]],
  '3>2': [[1,0],[-2,0],[1,-2],[-2,1]]
});
const PINNED_I_180_KICKS = Object.freeze({
  '0>2': [[0,-1]],
  '1>3': [[1,0]],
  '2>0': [[0,1]],
  '3>1': [[-1,0]]
});
let kickConversionChecks = 0;
for (const [transition, rawKicks] of Object.entries(PINNED_I_SRS_PLUS_KICKS)) {
  const [from, to] = transition.split('>').map(Number);
  const converted = rawKicks.map(kick =>
    tetrioKickToLocalOriginOffset(TETRIO_MATRIX_REFERENCE, REFERENCE_PIECES, 'I', from, to, kick)
  );
  assert.deepEqual(getSrsKicks('I', from, to).slice(1), converted,
    'I SRS+ transition ' + transition + ' ordered kick offsets must match pinned client after anchor conversion');
  kickConversionChecks += converted.length;
}
for (const [transition, rawKicks] of Object.entries(PINNED_I_180_KICKS)) {
  const [from, to] = transition.split('>').map(Number);
  const converted = rawKicks.map(kick =>
    tetrioKickToLocalOriginOffset(TETRIO_MATRIX_REFERENCE, REFERENCE_PIECES, 'I', from, to, kick)
  );
  assert.deepEqual(getTetrio180Kicks('I', from).slice(1), converted,
    'I SRS+ direct-180 transition ' + transition + ' ordered kick offsets must match pinned client after anchor conversion');
  kickConversionChecks += converted.length;
}
assert.equal(kickConversionChecks, 36);
console.log(JSON.stringify({
  ok: true,
  checks,
  kickConversionChecks,
  pieces: 7,
  orientations: 28,
  source: TETRIO_MATRIX_SOURCE.asset,
  note: 'real pinned client matrices plus SRS+ I kick offset/order parity; not full all-piece movement parity'
}));

function comparePair(a, b) {
  return a[0] - b[0] || a[1] - b[1];
}
