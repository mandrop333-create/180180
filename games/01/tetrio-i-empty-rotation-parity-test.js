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


const BLOCKED_CASES = [
  {
    name: 'I 1 CW wall/stack kick (pinned random-1718, source kick index 1)',
    from: { rotation: 1, x: 1, y: 5 },
    direction: 1,
    rows: [789, 92, 400, 119, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    expected: { rotation: 2, x: 1, y: 6 }
  },
  {
    name: 'I 2 CCW floor kick (pinned random-2021, source kick index 2)',
    from: { rotation: 2, x: 6, y: 0 },
    direction: -1,
    rows: Array(20).fill(0),
    expected: { rotation: 1, x: 6, y: 0 }
  }
];

function boardFromNativeRows(rows) {
  const board = Array.from({ length: TOTAL_HEIGHT }, () => Array(W).fill(0));
  for (let nativeY = 0; nativeY < rows.length; nativeY += 1) {
    for (let x = 0; x < W; x += 1) {
      if ((rows[nativeY] & (1 << x)) !== 0) board[TOTAL_HEIGHT - 1 - nativeY][x] = 1;
    }
  }
  return board;
}

for (const testCase of BLOCKED_CASES) {
  const from = nativeToLocalOrigin('I', testCase.from);
  const expected = nativeToLocalOrigin('I', testCase.expected);
  const piece = { type: 'I', ...from, o: testCase.from.rotation };
  const board = boardFromNativeRows(testCase.rows);
  assert.equal(tryRotate(piece, testCase.direction, board, W, H, cellsForReference), true,
    testCase.name + ': reference rotation should succeed');
  assert.deepEqual(
    { x: piece.x, y: piece.y, rotation: piece.o },
    { ...expected, rotation: testCase.expected.rotation },
    testCase.name + ': local landing must match pinned TETR.IO snapshot'
  );
}

console.log(JSON.stringify({
  ok: true,
  cases: CASES.length + BLOCKED_CASES.length,
  sourceAsset: SOURCE_ASSET,
  scope: '12 empty-board I turns plus 2 pinned blocked/floor-kick landing outcomes; candidate-index parity is not asserted'
}));
