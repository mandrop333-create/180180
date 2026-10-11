import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tryRotate } from './rotation.js';
import { getSrsKicks, getTetrio180Kicks } from './kicks.js';
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';

const candidatePath = process.argv[2] ?? 'tetrio-current-movement-candidate.json';
const snapshot = JSON.parse(await readFile(candidatePath, 'utf8'));
const W = snapshot.board.width;
const VISIBLE_HEIGHT = snapshot.board.visibleHeight;
const H = VISIBLE_HEIGHT + snapshot.board.bufferHeight;

function nativeToLocalOrigin(type, state) {
  const cells = REFERENCE_PIECES[type].orientations[state.rotation];
  const minX = Math.min(...cells.map(([x]) => x));
  const maxY = Math.max(...cells.map(([, y]) => y));
  return { x: state.x - minX, y: H - 1 - state.y - maxY };
}
function boardFromNativeRows(rows) {
  const board = Array.from({ length: H }, () => Array(W).fill(0));
  for (let nativeY = 0; nativeY < rows.length; nativeY += 1) {
    for (let x = 0; x < W; x += 1) {
      if ((rows[nativeY] & (1 << x)) !== 0) board[H - 1 - nativeY][x] = 1;
    }
  }
  return board;
}
function localCandidates(type, from, to, direction) {
  return direction === 2
    ? getTetrio180Kicks(type, from)
    : getSrsKicks(type, from, to);
}

let checked = 0;
let direct = 0;
let kicked = 0;
let failed = 0;
for (const testCase of snapshot.cases) {
  const type = testCase.piece;
  const from = nativeToLocalOrigin(type, testCase.from);
  const board = boardFromNativeRows(testCase.rows);
  const piece = { type, ...from, o: testCase.from.rotation };
  const before = { ...piece };
  const succeeded = tryRotate(piece, testCase.direction, board, W, H,
    (pieceType, rotation) => REFERENCE_PIECES[pieceType].orientations[rotation]);

  assert.equal(succeeded, testCase.expected.success,
    testCase.name + ': success/failure differs from current-client generated outcome');

  if (!testCase.expected.success) {
    assert.deepEqual(piece, before, testCase.name + ': failed rotation mutated the piece');
    failed += 1;
    checked += 1;
    continue;
  }

  const expected = nativeToLocalOrigin(type, testCase.expected);
  assert.deepEqual(
    { x: piece.x, y: piece.y, rotation: piece.o },
    { ...expected, rotation: testCase.expected.rotation },
    testCase.name + ': landing state differs from current-client generated outcome'
  );

  const candidates = localCandidates(type, testCase.from.rotation, testCase.expected.rotation, testCase.direction);
  const selectedIndex = candidates.findIndex(([dx, dy]) =>
    dx === piece.x - from.x && dy === piece.y - from.y);
  if (testCase.expected.kickIndex === null) {
    assert.equal(selectedIndex, 0, testCase.name + ': direct rotation should select the unshifted candidate');
    direct += 1;
  } else {
    assert.equal(selectedIndex, testCase.expected.kickIndex + 1,
      testCase.name + ': local kick index must equal current-client kick index plus the unshifted candidate');
    kicked += 1;
  }
  checked += 1;
}

assert.ok(checked >= 400, 'expected a broad generated current-client movement corpus');
assert.ok(direct >= 50, 'expected direct rotation coverage');
assert.ok(kicked >= 50, 'expected kicked rotation coverage');
assert.ok(failed >= 50, 'expected failed rotation coverage');
console.log(JSON.stringify({
  ok: true,
  source: snapshot.source,
  checked,
  direct,
  kicked,
  failed,
  claim: 'Generated current-client SRS+ single-rotation outcomes match the trainer for the checked corpus; not exhaustive gameplay or timing parity.'
}));
