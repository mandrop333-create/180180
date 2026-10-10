import assert from 'node:assert/strict';
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';
import {
  nativeToTetrioState,
  tetrioBoardCells,
  tetrioToNativeState,
  TETRIO_TOTAL_HEIGHT
} from './tetrio-coordinate-adapter.js';

// This deliberately uses trainer geometry as synthetic input. It validates
// coordinate arithmetic across all pieces; it is NOT a TETR.IO client parity
// test. Client parity requires the generated pinned matrix fixture.
const matrices = Object.fromEntries(Object.entries(REFERENCE_PIECES).map(([type, piece], index) => {
  const dx = index % 3;
  const dy = (index + 1) % 4;
  return [type, {
    dx,
    dy,
    orientations: piece.orientations.map((cells) => cells.map(([x, y]) => [x + dx, y + dy]))
  }];
}));

let checks = 0;
for (const [type, piece] of Object.entries(REFERENCE_PIECES)) {
  for (let rotation = 0; rotation < 4; rotation += 1) {
    for (const state of [
      { rotation, x: 0, y: 0 },
      { rotation, x: 3, y: 5 },
      { rotation, x: 6, y: 17 }
    ]) {
      const client = nativeToTetrioState(matrices, type, state);
      const cells = tetrioBoardCells(matrices, type, rotation, client.x, client.y);
      assert.equal(cells.length, 4, type + ' orientation ' + rotation + ' must have four cells');
      assert.equal(new Set(cells.map(({x,y}) => x + ',' + y)).size, 4,
        type + ' orientation ' + rotation + ' must have unique cells');

      const localCells = piece.orientations[rotation];
      const maxLocalY = Math.max(...localCells.map(([, y]) => y));
      // Native y is the bottom-up coordinate of the topmost occupied cell,
      // so rows within the piece are reflected around maxLocalY.
      const expected = new Set(localCells.map(([x,y]) =>
        (state.x + x) + ',' + (state.y + maxLocalY - y)));
      const actual = new Set(cells.map(({x,y}) =>
        x + ',' + (TETRIO_TOTAL_HEIGHT - 1 - y)));
      assert.deepEqual(actual, expected,
        type + ' orientation ' + rotation + ' occupied cells must survive conversion');

      const native = tetrioToNativeState(matrices, type, rotation, client.x, client.y);
      assert.equal(native.rotation, state.rotation);
      assert.equal(native.x, state.x);
      assert.equal(native.y, state.y);
      assert.ok(Math.abs((client.y - Math.floor(client.y)) - 0.000001) < 1e-8,
        'client anchor must preserve the pinned generator fractional-y convention');
      checks += 1;
    }
  }
}
assert.equal(checks, 84);
console.log(JSON.stringify({
  ok: true,
  checks,
  pieces: 7,
  orientations: 28,
  note: 'synthetic trainer geometry only; not TETR.IO client parity'
}));
