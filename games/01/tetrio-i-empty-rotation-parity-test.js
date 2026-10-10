import assert from 'node:assert/strict';
import { tryRotate } from './rotation.js';
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';

// These empty-board I-piece transitions are copied from the pinned TETR.IO
// movement snapshot fixture generated from the client asset recorded below.
// The snapshot coordinates are native min-cell coordinates; convert them into
// the trainer's orientation-specific local-origin convention before comparing.
const SOURCE_ASSET = 'https://tetr.io/js/tetrio.js?hv=7eebfc9cd.987f91854aad.20260504T210001';
const TOTAL_HEIGHT = 40;
const CASES = [
  { name: 'I 0 CCW', from: { rotation: 0, x: 2, y: 3 }, direction: -1, expected: { rotation: 3, x: 3, y: 1 } },
  { name: 'I 0 CW',  from: { rotation: 0, x: 2, y: 3 }, direction:  1, expected: { rotation: 1, x: 4, y: 1 } },
  { name: 'I 0 180', from: { rotation: 0, x: 2, y: 3 }, direction:  2, expected: { rotation: 2, x: 2, y: 2 } },
  { name: 'I 1 CCW', from: { rotation: 1, x: 4, y: 3 }, direction: -1, expected: { rotation: 0, x: 2, y: 5 } },
  { name: 'I 1 CW',  from: { rotation: 1, x: 4, y: 3 }, direction:  1, expected: { rotation: 2, x: 2, y: 4 } },
  { name: 'I 1 180', from: { rotation: 1, x: 4, y: 3 }, direction:  2, expected: { rotation: 3, x: 3, y: 3 } },
  { name: 'I 2 CCW', from: { rotation: 2, x: 2, y: 3 }, direction: -1, expected: { rotation: 1, x: 4, y: 2 } },
  { name: 'I 2 CW',  from: { rotation: 2, x: 2, y: 3 }, direction:  1, expected: { rotation: 3, x: 3, y: 2 } },
  { name: 'I 2 180', from: { rotation: 2, x: 2, y: 3 }, direction:  2, expected: { rotation: 0, x: 2, y: 4 } },
  { name: 'I 3 CCW', from: { rotation: 3, x: 4, y: 3 }, direction: -1, expected: { rotation: 2, x: 3, y: 4 } },
  { name: 'I 3 CW',  from: { rotation: 3, x: 4, y: 3 }, direction:  1, expected: { rotation: 0, x: 3, y: 5 } },
  { name: 'I 3 180', from: { rotation: 3, x: 4, y: 3 }, direction:  2, expected: { rotation: 1, x: 5, y: 3 } }
];

function nativeToLocalOrigin(type, state) {
  const cells = REFERENCE_PIECES[type].orientations[state.rotation];
  const minX = Math.min(...cells.map(([x]) => x));
  const maxY = Math.max(...cells.map(([, y]) => y));
  return { x: state.x - minX, y: TOTAL_HEIGHT - 1 - state.y - maxY };
}

const W = 10;
const H = TOTAL_HEIGHT;
const emptyBoard = Array.from({ length: H }, () => Array(W).fill(0));
const cellsForReference = (type, rotation) => REFERENCE_PIECES[type].orientations[rotation];

for (const testCase of CASES) {
  const from = nativeToLocalOrigin('I', testCase.from);
  const expected = nativeToLocalOrigin('I', testCase.expected);
  const piece = { type: 'I', ...from, o: testCase.from.rotation };

  assert.equal(tryRotate(piece, testCase.direction, emptyBoard, W, H, cellsForReference), true,
    testCase.name + ': empty-board turn should succeed');
  assert.deepEqual(
    { x: piece.x, y: piece.y, rotation: piece.o },
    { ...expected, rotation: testCase.expected.rotation },
    testCase.name + ': local-origin result must match pinned TETR.IO transition'
  );
}

console.log(JSON.stringify({
  ok: true,
  cases: CASES.length,
  sourceAsset: SOURCE_ASSET,
  scope: 'empty-board I-piece quarter-turns and direct 180; no blocked-kick parity claim'
}));
