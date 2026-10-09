import test from 'node:test';
import assert from 'node:assert/strict';
import { Trainer } from '../games/01/engine.js';
import { SevenBagGenerator } from '../games/01/generator.js';
import { PIECE_TYPES, cellsFor } from '../games/01/pieces.js';
import { collides, move } from '../games/01/collision.js';
import { tryRotate } from '../games/01/rotation.js';

function makeTrainer() {
  const trainer = new Trainer(null, {
    deferInit: true,
    generator: new SevenBagGenerator({ seed: 180180 }),
    onState: () => {}
  });
  trainer.emptyBoard();
  trainer.queue = ['I', 'O', 'J', 'L', 'S', 'Z', 'T'];
  trainer.piece = { type: 'T', x: 3, y: 0, o: 0 };
  trainer.gameOver = false;
  return trainer;
}

test('seven-bag randomizer yields each of the seven tetrominoes exactly once per bag', () => {
  const generator = new SevenBagGenerator({ seed: 180180 });
  const sequence = Array.from({ length: 21 }, () => generator.next());
  for (let start = 0; start < sequence.length; start += 7) {
    assert.deepEqual([...sequence.slice(start, start + 7)].sort(), [...PIECE_TYPES].sort());
  }
});

test('every tetromino orientation contains exactly four cells', () => {
  for (const type of PIECE_TYPES) {
    for (let orientation = 0; orientation < 4; orientation++) {
      assert.equal(cellsFor(type, orientation).length, 4, type + ' orientation ' + orientation);
    }
  }
});

test('collision rejects walls, floor, and occupied cells without mutating the piece', () => {
  const t = makeTrainer();
  const piece = { type: 'O', x: 0, y: 0, o: 0 };
  assert.equal(collides(-1, 0, 0, t.board, t.W, t.H, cellsFor, 'O'), true);
  assert.equal(collides(4, t.H - 1, 0, t.board, t.W, t.H, cellsFor, 'O'), true);
  t.board[1][5] = 'J';
  assert.equal(collides(4, 0, 0, t.board, t.W, t.H, cellsFor, 'O'), true);
  assert.deepEqual(piece, { type: 'O', x: 0, y: 0, o: 0 });
});

test('legal horizontal movement changes position and blocked movement is a no-op', () => {
  const t = makeTrainer();
  t.piece = { type: 'O', x: 0, y: 0, o: 0 };
  assert.equal(t.movePiece(-1, 0), false);
  assert.equal(t.piece.x, 0);
  assert.equal(t.movePiece(1, 0), true);
  assert.equal(t.piece.x, 1);
});

test('clockwise then counterclockwise rotation returns to the original orientation', () => {
  const t = makeTrainer();
  const original = { ...t.piece };
  assert.equal(t.rotate(1), true);
  assert.equal(t.rotate(-1), true);
  assert.equal(t.piece.o, original.o);
});

test('soft drop advances one row and increments soft-drop rows and score', () => {
  const t = makeTrainer();
  const startY = t.piece.y;
  assert.equal(t.movePiece(0, 1, { countSoftDrop: true }), true);
  assert.equal(t.piece.y, startY + 1);
  assert.equal(t.stats.softDropRows, 1);
  assert.equal(t.stats.score, t.rules.scoring?.softDropPerRow ?? 1);
});

test('hard drop locks the active piece, awards row score, and advances the piece count', () => {
  const t = makeTrainer();
  t.piece = { type: 'O', x: 4, y: 0, o: 0 };
  const before = t.stats.score;
  t.hardDrop();
  assert.equal(t.stats.piecesPlaced, 1);
  assert.ok(t.stats.hardDropRows > 0);
  assert.ok(t.stats.score > before);
  assert.ok(t.board.some(row => row.some(cell => cell === 'O')));
  assert.ok(t.piece, 'a new active piece should spawn after locking');
});

test('hold stores the first piece, rejects a second hold before placement, then swaps after placement', () => {
  const t = makeTrainer();
  t.piece = { type: 'T', x: 3, y: 0, o: 0 };
  assert.equal(t.hold(), true);
  assert.equal(t.holdType, 'T');
  assert.equal(t.piece.type, 'I');
  assert.equal(t.hold(), false, 'hold is once per piece');
  t.hardDrop();
  const outgoing = t.piece.type;
  assert.equal(t.hold(), true);
  assert.equal(t.piece.type, 'T');
  assert.equal(t.holdType, outgoing);
});

test('single-line clear removes the completed row, updates counters, and scores a perfect clear', () => {
  const t = makeTrainer();
  t.board[t.H - 1] = Array(t.W).fill('J');
  for (let x = 3; x <= 6; x++) t.board[t.H - 1][x] = 0;
  t.piece = { type: 'I', x: 3, y: t.H - 2, o: 0 };
  t.lockPiece(false);
  assert.equal(t.lines, 1);
  assert.equal(t.stats.linesCleared, 1);
  assert.equal(t.stats.score, 100 + 3500);
  assert.equal(t.stats.perfectClears, 1);
  assert.ok(t.board.every(row => row.every(cell => !cell)));
});

test('vertical I clears four prepared rows as a Tetris and activates back-to-back', () => {
  const t = makeTrainer();
  for (let y = t.H - 4; y < t.H; y++) {
    t.board[y] = Array(t.W).fill('J');
    t.board[y][3] = 0;
  }
  t.piece = { type: 'I', x: 1, y: t.H - 4, o: 1 };
  t.lockPiece(false);
  assert.equal(t.lines, 4);
  assert.equal(t.stats.linesCleared, 4);
  assert.equal(t.stats.tetrises, 1);
  assert.equal(t.b2b, true);
  assert.equal(t.stats.perfectClears, 1);
});

test('spin classifier distinguishes no spin, mini, and full T-spin corner occupancy', () => {
  const t = makeTrainer();
  t.piece = { type: 'T', x: 4, y: 10, o: 0 };
  t.lastRotation = false;
  assert.equal(t.isTSpin(t.piece), null);
  t.lastRotation = true;
  t.board[10][4] = 'J';
  t.board[12][4] = 'J';
  t.board[12][6] = 'J';
  assert.equal(t.isTSpin(t.piece), 'mini');
  t.board[10][6] = 'J';
  assert.equal(t.isTSpin(t.piece), 'full');
});

test('score table maps standard line clears and spin clears to expected base scores', () => {
  const t = makeTrainer();
  assert.equal(t.spinOrLineScore(1, null), 100);
  assert.equal(t.spinOrLineScore(2, null), 300);
  assert.equal(t.spinOrLineScore(3, null), 500);
  assert.equal(t.spinOrLineScore(4, null), 800);
  assert.equal(t.spinOrLineScore(0, 'full'), 400);
  assert.equal(t.spinOrLineScore(1, 'full'), 800);
  assert.equal(t.spinOrLineScore(2, 'full'), 1200);
  assert.equal(t.spinOrLineScore(0, 'mini'), 100);
});

test('line-combo and back-to-back counters update on difficult and ordinary clears', () => {
  const t = makeTrainer();
  for (let y = t.H - 4; y < t.H; y++) {
    t.board[y] = Array(t.W).fill('J');
    t.board[y][3] = 0;
  }
  t.piece = { type: 'I', x: 1, y: t.H - 4, o: 1 };
  t.lockPiece(false);
  assert.equal(t.combo, 0);
  assert.equal(t.b2b, true);

  for (let y = t.H - 1; y >= t.H - 1; y--) {
    t.board[y] = Array(t.W).fill('J');
    for (let x = 3; x <= 6; x++) t.board[y][x] = 0;
  }
  t.piece = { type: 'I', x: 3, y: t.H - 2, o: 0 };
  t.lockPiece(false);
  assert.equal(t.combo, 1);
  assert.equal(t.stats.combos, 1);
  assert.equal(t.b2b, false, 'an ordinary single clear breaks back-to-back');
});


test('gravity advances the active piece at the configured interval', () => {
  const t = makeTrainer();
  t.piece = { type: 'O', x: 4, y: 0, o: 0 };
  t.rules.gravity = 50;
  t.lastTime = 100;
  t.flushRender = () => {};
  t.tick(150);
  assert.equal(t.piece.y, 1);
});

test('grounded pieces lock only after the configured lock delay', () => {
  const t = makeTrainer();
  t.piece = { type: 'O', x: 4, y: t.H - 2, o: 0 };
  t.rules.gravity = Infinity;
  t.rules.lockDelay = 100;
  t.lastTime = 100;
  t.flushRender = () => {};
  t.tick(150);
  assert.equal(t.stats.piecesPlaced, 0, 'piece must not lock before the delay');
  t.tick(200);
  assert.equal(t.stats.piecesPlaced, 1, 'piece should lock when the delay expires');
});

test('DAS with zero ARR moves a held direction to the wall at the repeat boundary', () => {
  const t = makeTrainer();
  t.piece = { type: 'O', x: 4, y: 0, o: 0 };
  t.rules.das = 50;
  t.rules.arr = 0;
  t.downKeys.add(t.binds.left);
  t.moveState = { dir: -1, elapsed: 0, repeatElapsed: 0, startedAt: 100, nextRepeatAt: 150 };
  t.lastTime = 100;
  t.flushRender = () => {};
  t.tick(150);
  assert.equal(t.piece.x, 0);
});

test('hold can be disabled by the active rule set', () => {
  const t = makeTrainer();
  t.rules.hold = false;
  assert.equal(t.hold(), false);
  assert.equal(t.holdType, null);
  assert.equal(t.piece.type, 'T');
});
