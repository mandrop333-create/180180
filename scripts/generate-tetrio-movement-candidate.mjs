#!/usr/bin/env node
// Generate review-only rotation outcomes from the exact current TETR.IO bundle.
// The generated cases are compared with the trainer engine; they never replace
// accepted fixtures automatically.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [bundlePath, candidatePath, outputPath = 'tetrio-current-movement-candidate.json'] = process.argv.slice(2);
if (!bundlePath || !candidatePath) {
  console.error('Usage: node scripts/generate-tetrio-movement-candidate.mjs <client-bundle> <matrix-candidate> [output-json]');
  process.exit(2);
}

const bytes = await readFile(bundlePath);
const bundle = bytes.toString('utf8');
const candidate = await import(pathToFileURL(resolve(candidatePath)).href);
const asset = candidate.TETRIO_MATRIX_SOURCE.asset;
const fetchedAt = candidate.TETRIO_MATRIX_SOURCE.fetchedAt;
const sha256 = createHash('sha256').update(bytes).digest('hex');
const tetrominoes = evaluateObject(extractObjectLiteralAfterKey(bundle, 'tetrominoes'));
const kicksets = evaluateObject(extractObjectLiteralAfterKey(bundle, 'kicksets'));
const profileKey = 'SRS+';
const kickset = kicksets[profileKey];
if (!kickset) throw new Error('Current client bundle has no SRS+ kickset.');

const BOARD_WIDTH = 10;
const VISIBLE_HEIGHT = 20;
const BOARD_BUFFER = 20;
const TOTAL_HEIGHT = VISIBLE_HEIGHT + BOARD_BUFFER;
const PIECES = ['i', 'o', 't', 's', 'z', 'j', 'l'];
const DIRECTIONS = [-1, 1, 2];
const ZERO_OFFSETS = [[0,0],[0,0],[0,0],[0,0]];
const cases = [];
const coverage = { direct: 0, kicked: 0, failed: 0 };

for (const piece of PIECES) {
  for (let rotation = 0; rotation < 4; rotation += 1) {
    for (const direction of DIRECTIONS) {
      const from = centralState(piece, rotation);
      addCase('empty-' + piece + '-' + rotation + '-' + direction, piece, emptyRows(), from, direction);
    }
  }
}

const rng = createXorshift32(0x715e2026);
let attempts = 0;
while (cases.length < 400 || coverage.kicked < 50 || coverage.failed < 50 || coverage.direct < 50) {
  attempts += 1;
  if (attempts > 120000) throw new Error('Could not generate sufficient direct/kicked/failed rotation coverage.');
  const piece = pick(PIECES, rng);
  const rotation = Math.floor(rng() * 4);
  const direction = pick(DIRECTIONS, rng);
  const from = randomState(piece, rotation, rng);
  const rows = randomRows(rng);
  clearNativeCells(rows, piece, from);
  if (!isLegalAtNativeState(rows, piece, from)) continue;
  addCase('random-' + String(cases.length).padStart(4, '0'), piece, rows, from, direction);
}

const snapshot = {
  source: { asset, fetchedAt, sha256, profile: profileKey, generator: 'scripts/generate-tetrio-movement-candidate.mjs' },
  board: { width: BOARD_WIDTH, visibleHeight: VISIBLE_HEIGHT, bufferHeight: BOARD_BUFFER },
  coverage,
  cases
};
await writeFile(resolve(outputPath), JSON.stringify(snapshot, null, 2) + '\n');
const staticAudit = await verifyExistingSnapshots();
console.log(JSON.stringify({ ok: staticAudit.errors.length === 0, output: resolve(outputPath), source: snapshot.source, caseCount: cases.length, coverage, staticSnapshotAudit: staticAudit.summary, staticMismatches: staticAudit.errors.slice(0, 30) }, null, 2));
if (staticAudit.errors.length) process.exitCode = 1;

async function verifyExistingSnapshots() {
  const emptySource = await readFile(new URL('../games/01/tetrio-i-empty-rotation-parity-test.js', import.meta.url), 'utf8');
  const kickedSource = await readFile(new URL('../games/01/tetrio-srs-plus-movement-parity-test.js', import.meta.url), 'utf8');
  const emptyCases = evaluateArray(extractArrayAfterDeclaration(emptySource, 'const CASES ='));
  const blockedCases = evaluateArray(extractArrayAfterDeclaration(emptySource, 'const BLOCKED_CASES ='));
  const kickedCases = evaluateArray(extractArrayAfterDeclaration(kickedSource, 'const CASES ='));
  const errors = [];
  const verify = (name, piece, rows, from, direction, expected, expectedKickIndex) => {
    const actual = resolveRotation(rows, piece, from, direction);
    if (!actual.success) {
      errors.push(name + ': current client reports rotation failure but static fixture expects success');
      return;
    }
    for (const field of ['rotation', 'x', 'y']) {
      if (actual[field] !== expected[field]) {
        errors.push(name + ': current ' + field + '=' + actual[field] + ', fixture=' + expected[field]);
      }
    }
    if (actual.kickIndex !== expectedKickIndex) {
      errors.push(name + ': current kickIndex=' + actual.kickIndex + ', fixture=' + expectedKickIndex);
    }
  };
  for (const testCase of emptyCases) {
    verify(testCase.name, 'i', emptyRows(), testCase.from, testCase.direction, testCase.expected, null);
  }
  for (const testCase of blockedCases) {
    verify(testCase.name, 'i', testCase.rows, testCase.from, testCase.direction, testCase.expected, testCase.sourceKickIndex);
  }
  for (const testCase of kickedCases) {
    verify(testCase.name, testCase.piece.toLowerCase(), testCase.rows, testCase.from, testCase.direction, testCase.expected, testCase.sourceKickIndex);
  }
  return {
    summary: { emptyI: emptyCases.length, blockedI: blockedCases.length, kickedSrsPlus: kickedCases.length, checked: emptyCases.length + blockedCases.length + kickedCases.length },
    errors
  };
}
function extractArrayAfterDeclaration(source, declaration) {
  const declarationIndex = source.indexOf(declaration);
  if (declarationIndex === -1) throw new Error('Could not find ' + declaration);
  const start = source.indexOf('[', declarationIndex + declaration.length);
  if (start === -1) throw new Error('Could not find array start for ' + declaration);
  let depth = 0;
  let quote;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === '\`') { quote = char; continue; }
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error('Could not find array end for ' + declaration);
}
function evaluateArray(source) {
  const value = Function('"use strict"; return (' + source + ');')();
  if (!Array.isArray(value)) throw new Error('Extracted snapshot fixture is not an array');
  return value;
}

function addCase(name, piece, rows, from, direction) {
  const expected = resolveRotation(rows, piece, from, direction);
  cases.push({ name, piece: piece.toUpperCase(), rows: [...rows], from, direction, expected });
  if (!expected.success) coverage.failed += 1;
  else if (expected.kickIndex === null) coverage.direct += 1;
  else coverage.kicked += 1;
}

function resolveRotation(rows, piece, from, direction) {
  const sourceState = nativeToTetrioState(piece, from);
  const toRotation = mod4(from.rotation + direction);
  const offsets = kickset.additional_offsets?.[piece] ?? ZERO_OFFSETS;
  const fromOffset = offsets[from.rotation] ?? [0,0];
  const toOffset = offsets[toRotation] ?? [0,0];
  const deltaX = toOffset[0] - fromOffset[0];
  const deltaY = toOffset[1] - fromOffset[1];
  const direct = { x: sourceState.x + deltaX, y: sourceState.y + deltaY, rotation: toRotation };
  if (isLegalAtTetrioPos(rows, piece, direct.x, direct.y, direct.rotation)) {
    return { success: true, ...tetrioToNativeState(piece, direct.rotation, direct.x, direct.y), kickIndex: null };
  }
  const record = getPieceKickRecord(piece);
  if (!record) return { success: false };
  const kicks = record[from.rotation + '' + toRotation] ?? [];
  for (const [kickIndex, [kickX, kickY]] of kicks.entries()) {
    const kicked = {
      x: sourceState.x + kickX + deltaX,
      y: Math.floor(sourceState.y) + 0.1 + kickY + deltaY,
      rotation: toRotation
    };
    if (isLegalAtTetrioPos(rows, piece, kicked.x, kicked.y, kicked.rotation)) {
      return { success: true, ...tetrioToNativeState(piece, kicked.rotation, kicked.x, kicked.y), kickIndex };
    }
  }
  return { success: false };
}

function getPieceKickRecord(piece) {
  const tetromino = readPiece(piece);
  if (tetromino.disallow_kick === true && kickset.allow_o_kick !== true) return undefined;
  if (tetromino.kickset_special !== undefined) {
    const special = kickset[tetromino.kickset_special + '_kicks'];
    if (isRecord(special)) return special;
  }
  return kickset.kicks;
}

function centralState(piece, rotation) {
  const bounds = nativeBounds(piece, rotation);
  return { rotation, x: Math.max(0, Math.min(BOARD_WIDTH - bounds.width, 4 - Math.floor(bounds.width / 2))), y: 3 };
}
function randomState(piece, rotation, random) {
  const bounds = nativeBounds(piece, rotation);
  return {
    rotation,
    x: Math.floor(random() * (BOARD_WIDTH - bounds.width + 1)),
    y: Math.floor(random() * Math.min(8, VISIBLE_HEIGHT - bounds.height + 1))
  };
}
function nativeBounds(piece, rotation) {
  const cells = tetrioCells(piece, rotation);
  const ys = cells.map(([, y]) => -y);
  return {
    width: Math.max(...cells.map(([x]) => x)) - Math.min(...cells.map(([x]) => x)) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1
  };
}
function nativeToTetrioState(piece, state) {
  const tetromino = readPiece(piece);
  const cells = tetromino.matrix.data[state.rotation] ?? [];
  const minRelativeX = Math.min(...cells.map(([x]) => x - tetromino.matrix.dx));
  const maxRelativeY = Math.max(...cells.map(([, y]) => y - tetromino.matrix.dy));
  const ceilY = TOTAL_HEIGHT - 1 - state.y - maxRelativeY;
  return { x: state.x - minRelativeX, y: ceilY - 0.999999 };
}
function tetrioToNativeState(piece, rotation, x, y) {
  const cells = tetrioBoardCells(piece, rotation, x, y);
  return {
    rotation,
    x: Math.min(...cells.map(cell => cell.x)),
    y: Math.min(...cells.map(cell => TOTAL_HEIGHT - 1 - cell.y))
  };
}
function isLegalAtNativeState(rows, piece, state) {
  const position = nativeToTetrioState(piece, state);
  return isLegalAtTetrioPos(rows, piece, position.x, position.y, state.rotation);
}
function isLegalAtTetrioPos(rows, piece, x, y, rotation) {
  return tetrioBoardCells(piece, rotation, x, y).every(cell => !isOccupiedOrWall(rows, cell.x, cell.y));
}
function tetrioBoardCells(piece, rotation, x, y) {
  const tetromino = readPiece(piece);
  const ceilY = Math.ceil(y);
  return (tetromino.matrix.data[rotation] ?? []).map(([cellX, cellY]) => ({
    x: x + cellX - tetromino.matrix.dx,
    y: ceilY + cellY - tetromino.matrix.dy
  }));
}
function tetrioCells(piece, rotation) {
  const tetromino = readPiece(piece);
  return (tetromino.matrix.data[rotation] ?? []).map(([x,y]) => [x - tetromino.matrix.dx, y - tetromino.matrix.dy]);
}
function isOccupiedOrWall(rows, x, y) {
  if (!Number.isInteger(x) || x < 0 || x >= BOARD_WIDTH || y < 0 || y >= TOTAL_HEIGHT) return true;
  if (y < BOARD_BUFFER) return false;
  const nativeY = TOTAL_HEIGHT - 1 - y;
  return ((rows[nativeY] ?? 0) & (1 << x)) !== 0;
}
function randomRows(random) {
  const rows = emptyRows();
  const height = 1 + Math.floor(random() * 8);
  for (let y = 0; y < height; y += 1) {
    let mask = 0;
    const density = 0.12 + random() * 0.38;
    for (let x = 0; x < BOARD_WIDTH; x += 1) if (random() < density) mask |= 1 << x;
    rows[y] = mask;
  }
  return rows;
}
function clearNativeCells(rows, piece, state) {
  const position = nativeToTetrioState(piece, state);
  for (const cell of tetrioBoardCells(piece, state.rotation, position.x, position.y)) {
    const nativeY = TOTAL_HEIGHT - 1 - cell.y;
    if (nativeY >= 0 && nativeY < VISIBLE_HEIGHT && cell.x >= 0 && cell.x < BOARD_WIDTH) {
      rows[nativeY] = (rows[nativeY] ?? 0) & ~(1 << cell.x);
    }
  }
}
function emptyRows() { return new Array(VISIBLE_HEIGHT).fill(0); }
function readPiece(piece) {
  const value = tetrominoes[piece];
  if (!value) throw new Error('Missing TETR.IO tetromino ' + piece);
  return value;
}
function pick(values, random) {
  const value = values[Math.floor(random() * values.length)];
  if (value === undefined) throw new Error('Cannot pick from empty list');
  return value;
}
function createXorshift32(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}
function mod4(value) { return ((value % 4) + 4) % 4; }
function isRecord(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function extractObjectLiteralAfterKey(input, key) {
  const keyIndex = input.indexOf(key + ':');
  if (keyIndex === -1) throw new Error('Could not find ' + key + ' in client bundle.');
  const start = input.indexOf('{', keyIndex + key.length + 1);
  if (start === -1) throw new Error('Could not find object start for ' + key);
  let depth = 0, quote, escaped = false;
  for (let i = start; i < input.length; i += 1) {
    const char = input[i];
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === '\`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return input.slice(start, i + 1);
  }
  throw new Error('Could not find object end for ' + key);
}
function evaluateObject(source) {
  const value = Function('"use strict"; return (' + source + ');')();
  if (!isRecord(value)) throw new Error('Extracted client table is not an object');
  return value;
}
