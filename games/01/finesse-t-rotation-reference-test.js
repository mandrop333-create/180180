// Explicit unobstructed T-piece rotation fixture.
// Expected cells come from the independent static fixture, not pieces.js.
// This test validates geometry, orientation, pivot/anchor stability, and the
// no-kick path on an empty board. It does not modify production behavior.
import { REFERENCE_PIECES } from './finesse-reference-fixtures.js';
import { cellsFor } from './pieces.js';
import { tryRotate } from './rotation.js';

const W = 10;
const H = 20;
const START = Object.freeze({ type: 'T', x: 3, y: 4, o: 0 });

function assert(condition, message) {
  if (!condition) throw new Error('T rotation reference: ' + message);
}

function canonicalWorldCells(type, x, y, orientation, cellProvider) {
  return cellProvider(type, orientation)
    .map(([cx, cy]) => (x + cx) + ',' + (y + cy))
    .sort()
    .join('|');
}

function canonicalExpectedWorldCells(type, x, y, orientation) {
  return REFERENCE_PIECES[type].orientations[orientation]
    .map(([cx, cy]) => (x + cx) + ',' + (y + cy))
    .sort()
    .join('|');
}

function emptyBoard() {
  return Array.from({ length: H }, () => Array(W).fill(0));
}

function runRotation(delta, expectedOrientation, label) {
  const board = emptyBoard();
  const piece = { ...START };
  const before = { ...piece };

  assert(canonicalWorldCells(piece.type, piece.x, piece.y, piece.o, cellsFor) ===
    canonicalExpectedWorldCells('T', before.x, before.y, before.o),
  label + ': initial production geometry differs from the independent fixture');

  const succeeded = tryRotate(piece, delta, board, W, H, cellsFor);
  assert(succeeded, label + ': rotation should succeed on an empty board');
  assert(piece.o === expectedOrientation,
    label + ': expected orientation ' + expectedOrientation + ', got ' + piece.o);
  assert(piece.x === before.x && piece.y === before.y,
    label + ': an unobstructed rotation must not displace the piece');

  const actual = canonicalWorldCells(piece.type, piece.x, piece.y, piece.o, cellsFor);
  const expected = canonicalExpectedWorldCells('T', piece.x, piece.y, expectedOrientation);
  assert(actual === expected, label + ': occupied cells differ from the independent expected geometry');
}

export function runFinesseTRotationReferenceTest() {
  // Orientation 0 points up. Positive delta is clockwise; negative is counterclockwise.
  runRotation(1, 1, 'T-UP-CW-TO-RIGHT');
  runRotation(-1, 3, 'T-UP-CCW-TO-LEFT');

  // The round-trip checks actual cells and origin, not only the orientation label.
  const board = emptyBoard();
  const piece = { ...START };
  assert(tryRotate(piece, 1, board, W, H, cellsFor), 'round-trip CW should succeed');
  assert(tryRotate(piece, -1, board, W, H, cellsFor), 'round-trip CCW should succeed');
  assert(piece.x === START.x && piece.y === START.y && piece.o === START.o,
    'CW then CCW should restore the original state');
  assert(canonicalWorldCells(piece.type, piece.x, piece.y, piece.o, cellsFor) ===
    canonicalExpectedWorldCells('T', START.x, START.y, START.o),
  'CW then CCW should restore all four original occupied cells');

  return { ok: true, fixture: 'ROT-T-001', cases: 3, board: 'empty', productionChanged: false };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  console.log(JSON.stringify(runFinesseTRotationReferenceTest()));
}
