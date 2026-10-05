// Universal trainer runtime. Owns gameplay lifecycle; shared player preferences live in settings.js.
import { Trainer as BaseTrainer } from './engine.js';
import { tryRotate } from './rotation.js';
import { SevenBagGenerator } from './generator.js';
import { spawnFor } from './pieces.js';

const MAX_LOCK_RESETS = 15;
const MAX_FRAME_DT = 50;
const QUEUE_PREVIEW_SIZE = 5;

export class Trainer extends BaseTrainer {
  constructor(boardEl, options = {}) {
    const inherited = { ...options };
    // The engine is the sole generator owner. Modes may customize behavior by
    // supplying a generator explicitly, but createGenerator is no longer an
    // alternate ownership path that can bypass seeds/settings.
    if (!inherited.generator) {
      inherited.generator = inherited.mode?.createGenerator
        ? inherited.mode.createGenerator({ seed: options.seed })
        : new SevenBagGenerator({ seed: options.seed });
    }
    super(boardEl, inherited);
    this.lockResets = 0;
    this.lastHorizontal = 0;
    this.phase = 'active';
    this.pieceQueue = [];
    this.ensureQueue();
  }

  ensureQueue() {
    while (this.pieceQueue.length < QUEUE_PREVIEW_SIZE) {
      this.pieceQueue.push(this.generator.next());
    }
  }

  nextPieceType() {
    this.ensureQueue();
    const type = this.pieceQueue.shift();
    this.ensureQueue();
    return type;
  }

  getNextQueue() {
    this.ensureQueue();
    return [...this.pieceQueue];
  }

  spawn() {
    if (this.anim?.layer) this.anim.layer.remove();
    const type = this.nextPieceType();
    this.piece = spawnFor(type);
    this.gravityAcc = 0;
    this.softAcc = 0;
    this.lockAcc = 0;
    this.lockResets = 0;
    this.lastHorizontal = 0;
    this.anim = null;
    this.phase = 'active';

    if (this.collides(this.piece.x, this.piece.y, this.piece.o, this.piece.type)) {
      this.gameOver = true;
      this.phase = 'gameover';
      this.hook('gameOver', { ...this.piece });
      this.render();
      return;
    }

    this.hook('spawn', { ...this.piece });
    this.render();
  }

  movePiece(dx, dy, options = {}) {
    const moved = super.movePiece(dx, dy, options);
    if (moved && dy === 0) this.resetLockAfterAction();
    return moved;
  }

  rotate(delta) {
    if (this.gameOver || !this.piece || this.phase !== 'active') return false;
    const before = { ...this.piece };
    let halfTurnOld = null;
    const success = tryRotate(
      this.piece, delta, this.board, this.W, this.H, this.cellsFor,
      old => { halfTurnOld = old; }
    );
    if (!success) return false;

    this.resetLockAfterAction();
    this.turns++;
    this.stats.rotations++;
    this.options.onTurn(this.turns);
    this.hook('rotate', before, { ...this.piece }, delta);
    if (halfTurnOld) this.startHalfTurn(halfTurnOld, { ...this.piece });
    return true;
  }

  resetLockAfterAction() {
    if (!this.piece || !this.collides(this.piece.x, this.piece.y + 1, this.piece.o, this.piece.type)) {
      this.lockAcc = 0;
      return;
    }
    if (this.lockResets < MAX_LOCK_RESETS) {
      this.lockAcc = 0;
      this.lockResets++;
    }
  }

  lockPiece() {
    if (this.gameOver || !this.piece || this.phase !== 'active') return;
    this.phase = 'locking';
    super.lockPiece();
  }

  reset(...args) {
    this.pieceQueue = [];
    this.phase = 'active';
    this.lockResets = 0;
    this.lastHorizontal = 0;
    const result = super.reset(...args);
    this.ensureQueue();
    return result;
  }

  tick(t) {
    if (this.gameOver || !this.piece || this.phase !== 'active') return;
    const before = this.lockAcc;
    super.tick(t);
    // Base tick owns timing; this guard keeps a large frame gap from creating
    // an accidental extra lock window after tab switches.
    if (Number.isFinite(before) && this.lockAcc > this.rules.lockDelay + MAX_FRAME_DT) {
      this.lockAcc = this.rules.lockDelay;
    }
  }
}

export { MAX_LOCK_RESETS, QUEUE_PREVIEW_SIZE };
