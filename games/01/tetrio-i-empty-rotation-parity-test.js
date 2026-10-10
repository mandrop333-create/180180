import assert from 'node:assert/strict';
import { tryRotate } from './rotation.js';
import { collides } from './collision.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
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
    sourceKickIndex: 1,
    from: { rotation: 1, x: 1, y: 5 },
    direction: 1,
    rows: [789, 92, 400, 119, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    expected: { rotation: 2, x: 1, y: 6 }
  },
  {
    name: 'I 2 CCW floor kick (pinned random-2021, source kick index 2)',
    sourceKickIndex: 2,
    from: { rotation: 2, x: 6, y: 0 },
    direction: -1,
    rows: Array(20).fill(0),
    expected: { rotation: 1, x: 6, y: 0 }
  },
  {
    name: 'I 0 180 floor kick (pinned random-1313, source kick index 0)',
    sourceKickIndex: 0,
    from: { rotation: 0, x: 6, y: 0 },
    direction: 2,
    rows: [26, 2, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    expected: { rotation: 2, x: 6, y: 0 }
  },
  {
    name: 'I 2 180 stack kick (pinned random-1478, source kick index 0)',
    sourceKickIndex: 0,
    from: { rotation: 2, x: 2, y: 5 },
    direction: 2,
    rows: [412, 514, 640, 812, 688, 512, 848, 72, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    expected: { rotation: 0, x: 2, y: 5 }
  },
  {
    name: 'I 3 180 wall/stack kick (pinned random-1922, source kick index 0)',
    sourceKickIndex: 0,
    from: { rotation: 3, x: 9, y: 2 },
    direction: 2,
    rows: [672, 360, 0, 150, 50, 2, 635, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    expected: { rotation: 1, x: 9, y: 2 }
  },
  {
    name: 'I 2 180 stack kick (pinned random-2037, source kick index 0)',
    sourceKickIndex: 0,
    from: { rotation: 2, x: 0, y: 1 },
    direction: 2,
    rows: [137, 160, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    expected: { rotation: 0, x: 0, y: 1 }
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

  // The pinned client kickIndex counts only non-zero source candidates; the
  // trainer's ordered arrays include the direct destination at index 0.
  const candidates = testCase.direction === 2 || testCase.direction === -2
    ? getTetrio180Kicks('I', testCase.from.rotation)
    : getSrsKicks('I', testCase.from.rotation, testCase.expected.rotation);
  const selectedLocalIndex = candidates.findIndex(([dx, dy]) =>
    dx === piece.x - from.x && dy === piece.y - from.y);
  assert.equal(selectedLocalIndex, testCase.sourceKickIndex + 1,
    testCase.name + ': selected trainer candidate must correspond to pinned source kickIndex');
}

// Synthetic regression matrix: force a non-zero I-piece direct-180 kick from
// every starting orientation. The pinned corpus above does not cover every
// blocked baseline orientation, so construct one blocker that invalidates the
// unshifted destination while leaving both the source and first kick legal.
let syntheticHalfTurnCases = 0;
for (let fromRotation = 0; fromRotation < 4; fromRotation += 1) {
  const toRotation = (fromRotation + 2) % 4;
  const piece = { type: 'I', x: 3, y: 10, o: fromRotation };
  const kicks = getTetrio180Kicks('I', fromRotation);
  const [kickX, kickY] = kicks[1];
  const sourceCells = new Set(cellsForReference('I', fromRotation)
    .map(([x, y]) => (piece.x + x) + ',' + (piece.y + y)));
  const baselineCells = cellsForReference('I', toRotation)
    .map(([x, y]) => [piece.x + x, piece.y + y]);
  const kickedCells = new Set(cellsForReference('I', toRotation)
    .map(([x, y]) => (piece.x + kickX + x) + ',' + (piece.y + kickY + y)));
  const blocker = baselineCells.find(([x, y]) =>
    !sourceCells.has(x + ',' + y) && !kickedCells.has(x + ',' + y));
  assert.ok(blocker, 'synthetic I ' + fromRotation + ' 180: must find a blocker unique to the baseline destination');

  const board = Array.from({ length: H }, () => Array(W).fill(0));
  board[blocker[1]][blocker[0]] = 1;
  assert.equal(collides(piece.x, piece.y, fromRotation, board, W, H, cellsForReference, 'I'), false,
    'synthetic I ' + fromRotation + ' 180: starting piece must be legal');
  assert.equal(collides(piece.x, piece.y, toRotation, board, W, H, cellsForReference, 'I'), true,
    'synthetic I ' + fromRotation + ' 180: baseline destination must be blocked');
  assert.equal(collides(piece.x + kickX, piece.y + kickY, toRotation, board, W, H, cellsForReference, 'I'), false,
    'synthetic I ' + fromRotation + ' 180: first non-zero kick destination must be legal');

  assert.equal(tryRotate(piece, 2, board, W, H, cellsForReference), true,
    'synthetic I ' + fromRotation + ' 180: direct half-turn should succeed via non-zero kick');
  assert.deepEqual(
    { x: piece.x, y: piece.y, rotation: piece.o },
    { x: 3 + kickX, y: 10 + kickY, rotation: toRotation },
    'synthetic I ' + fromRotation + ' 180: must select the pinned non-zero kick'
  );
  syntheticHalfTurnCases += 1;
}
assert.equal(syntheticHalfTurnCases, 4, 'all four I-piece direct-180 orientations must be exercised');

console.log(JSON.stringify({
  ok: true,
  cases: CASES.length + BLOCKED_CASES.length + 1,
  sourceAsset: SOURCE_ASSET,
  scope: '12 empty-board I turns, 6 pinned blocked/edge/floor outcomes, plus synthetic blocked-baseline direct-180 kick regressions for all four I orientations; pinned outcomes map local candidate index to raw kickIndex + 1'
}));
