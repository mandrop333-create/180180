import assert from 'node:assert/strict';
import {
  nativeToTetrioState,
  tetrioBoardCells,
  tetrioToNativeState,
  TETRIO_TOTAL_HEIGHT
} from './tetrio-coordinate-adapter.js';

// Synthetic matrices make this an equation/round-trip test only. The pinned
// client matrix fixture is a separate prerequisite and is deliberately not
// substituted with the trainer's geometry.
const matrices = {
  I: {
    dx: 1,
    dy: 2,
    orientations: [
      [[1,3],[2,3],[3,3],[4,3]],
      [[3,1],[3,2],[3,3],[3,4]],
      [[1,2],[2,2],[3,2],[4,2]],
      [[2,1],[2,2],[2,3],[2,4]]
    ]
  }
};
let checks = 0;
for (let rotation = 0; rotation < 4; rotation += 1) {
  for (const state of [
    { rotation, x: 0, y: 0 },
    { rotation, x: 3, y: 5 },
    { rotation, x: 6, y: 17 }
  ]) {
    const client = nativeToTetrioState(matrices, 'I', state);
    const cells = tetrioBoardCells(matrices, 'I', rotation, client.x, client.y);
    assert.equal(cells.length, 4);
    assert.equal(new Set(cells.map(({x,y}) => x + ',' + y)).size, 4);
    const native = tetrioToNativeState(matrices, 'I', rotation, client.x, client.y);
    assert.equal(native.rotation, state.rotation);
    assert.equal(native.x, state.x);
    assert.equal(native.y, state.y);
    assert.ok(Math.abs((client.y - Math.floor(client.y)) - 0.000001) < 1e-8,
      'client anchor must preserve the pinned generator fractional-y convention');
    checks += 1;
  }
}
assert.equal(TETRIO_TOTAL_HEIGHT, 40);
console.log(JSON.stringify({ ok: true, checks, note: 'synthetic matrix arithmetic only; not client parity' }));
