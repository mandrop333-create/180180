// TETR.IO-style gameplay core layered over the shared trainer renderer/UI.
// Gameplay state remains authoritative; animation is presentation only.
// The core also keeps an explicit piece queue and deterministic RNG option so
// gameplay sequences can be reproduced exactly when testing.

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
    if (!inherited.generator && !inherited.mode?.createGenerator) {
      inherited.generator = new SevenBagGenerator({ seed: options.seed });
    }
    super(boardEl, inherited);
    this.lockResets = 0;
    this.lastHorizontal = 0;
  }

  ensureQueue() {
    if (!this.pieceQueue) this.pieceQueue = [];
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
    this.anim = null;
    this.phase = 'active';
    this.lockResets = 0;

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

  isGrounded() {
    if (!this.piece) return false;
    return this.collides(this.piece.x, this.piece.y + 1, this.piece.o, this.piece.type);
  }

  resetLockDelay() {
    if (this.lockResets >= MAX_LOCK_RESETS) return;
    this.lockAcc = 0;
    this.lockResets++;
  }

  movePiece(dx, dy, options = {}) {
    if (this.gameOver || !this.piece) return false;
    const wasGrounded = this.isGrounded();
    const moved = super.movePiece(dx, dy, options);
    if (!moved) return false;
    if (wasGrounded && dy === 0) this.resetLockDelay();
    return true;
  }

  rotate(delta) {
    if (this.gameOver || !this.piece) return false;

    const wasGrounded = this.isGrounded();
    const before = { ...this.piece };
    let halfTurnOld = null;

    const success = tryRotate(
      this.piece,
      delta,
      this.board,
      this.W,
      this.H,
      this.cellsFor,
      old => { halfTurnOld = old; }
    );

    if (!success) return false;
    if (wasGrounded) this.resetLockDelay();

    this.turns++;
    this.stats.rotations++;
    this.options.onTurn(this.turns);
    this.hook('rotate', before, { ...this.piece }, delta);

    if (halfTurnOld) this.startHalfTurn(halfTurnOld, { ...this.piece });
    return true;
  }

  processHorizontal(dt) {
    if (!this.moveState.dir) return;

    const das = Math.max(0, this.das());
    const arr = Math.max(0, this.arr());
    const before = this.moveState.elapsed;
    const toDas = Math.max(0, das - before);
    this.moveState.elapsed += dt;

    if (before < das && this.moveState.elapsed >= das) {
      const afterDas = Math.max(0, dt - toDas);
      if (arr === 0) {
        while (this.movePiece(this.moveState.dir, 0)) {}
        this.moveState.repeatElapsed = 0;
      } else {
        this.moveState.repeatElapsed += afterDas;
      }
    } else if (this.moveState.elapsed >= das && arr > 0) {
      this.moveState.repeatElapsed += dt;
    }

    if (this.moveState.elapsed < das || arr === 0) return;

    while (this.moveState.repeatElapsed >= arr) {
      this.moveState.repeatElapsed -= arr;
      if (!this.movePiece(this.moveState.dir, 0)) {
        this.moveState.repeatElapsed = 0;
        break;
      }
    }
  }

  processVertical(dt) {
    const softHeld = this.downKeys.has(this.binds.soft);
    const factor = this.rules.softFactors[this.softScale] ?? 1;

    if (softHeld) {
      if (factor === Infinity) {
        while (this.movePiece(0, 1, { countSoftDrop: true })) {}
        this.softAcc = 0;
      } else {
        const interval = Math.max(16, this.rules.gravity / factor);
        this.softAcc += dt;
        while (this.softAcc >= interval) {
          this.softAcc -= interval;
          if (!this.movePiece(0, 1, { countSoftDrop: true })) {
            this.softAcc = 0;
            break;
          }
        }
      }
      this.gravityAcc = 0;
      return;
    }

    this.softAcc = 0;
    this.gravityAcc += dt;
    while (this.gravityAcc >= this.rules.gravity) {
      this.gravityAcc -= this.rules.gravity;
      if (!this.movePiece(0, 1)) {
        this.gravityAcc = 0;
        break;
      }
    }
  }

  processLock(dt) {
    if (!this.isGrounded()) {
      this.lockAcc = 0;
      return false;
    }

    this.lockAcc += dt;
    if (this.lockAcc < this.rules.lockDelay) return false;
    this.lockPiece();
    return true;
  }

  lockPiece() {
    if (this.gameOver || !this.piece) return;
    this.phase = 'locking';
    super.lockPiece();
  }

  tick(t) {
    if (!this.lastTime) this.lastTime = t;
    const dt = Math.max(0, Math.min(MAX_FRAME_DT, t - this.lastTime));
    this.lastTime = t;
    if (this.gameOver || !this.piece) return;

    this.processHorizontal(dt);
    this.processVertical(dt);
    if (this.processLock(dt)) return;

    this.hook('tick', dt);
    this.render();
  }

  handleKeyup(e) {
    this.downKeys.delete(e.code);
    const action = Object.keys(this.binds).find(k => this.binds[k] === e.code);
    if (action !== 'left' && action !== 'right') return;

    const released = action === 'left' ? -1 : 1;
    if (this.moveState.dir !== released) return;

    const oppositeCode = released === -1 ? this.binds.right : this.binds.left;
    if (this.downKeys.has(oppositeCode)) {
      this.moveState.dir = -released;
      this.moveState.elapsed = 0;
      this.moveState.repeatElapsed = 0;
    } else {
      this.moveState.dir = 0;
      this.moveState.elapsed = 0;
      this.moveState.repeatElapsed = 0;
    }
  }

  handleBlur() {
    super.handleBlur();
    this.moveState.elapsed = 0;
    this.moveState.repeatElapsed = 0;
  }

  reset(...args) {
    this.pieceQueue = [];
    this.phase = 'active';
    this.lockResets = 0;
    return super.reset(...args);
  }

  setDepth(value) {
    this.depth = Math.max(0, Math.min(1, Number(value) || 0));
    this.render();
  }

  setSoftScale(value) {
    this.softScale = Math.max(0, Math.min(4, Number(value) || 0));
  }

  getSoftFactor() {
    return this.rules.softFactors[this.softScale] ?? 1;
  }
}
