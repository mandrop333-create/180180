// Shared trainer engine
// Owns the universal Tetris/training runtime. Mini-games provide only
// configuration and lifecycle hooks through their mode definition.

import { W, H, GRAVITY_MS_PER_ROW, LOCK_DELAY_MS, NS, keyNames, defaultBinds, softFactors as defaultSoftFactors } from './state.js';
import { cellsFor as defaultCellsFor } from './pieces.js';
import { collides, move } from './collision.js';
import { tryRotate } from './rotation.js';
import { drawActivePiece, renderBoard, startHalfTurn } from './renderer.js';

const defaultMode = { rules: {}, hooks: {} };

export class Trainer {
  constructor(boardEl, options = {}) {
    this.boardEl = boardEl;
    this.mode = options.mode || defaultMode;
    this.rules = {
      width: W, height: H, gravity: GRAVITY_MS_PER_ROW, lockDelay: LOCK_DELAY_MS,
      softFactors: defaultSoftFactors, cellsFor: defaultCellsFor, das: 127, arr: 0,
      ...this.mode.rules, ...options
    };
    this.options = {
      onTurn: options.onTurn || (() => {}),
      onPlace: options.onPlace || (() => {}),
      onReset: options.onReset || (() => {}),
      ...options
    };

    this.W = this.rules.width;
    this.H = this.rules.height;
    this.cellsFor = this.rules.cellsFor;
    this.board = [];
    this.piece = null;
    this.turns = 0;
    this.placed = 0;
    this.session = this.mode.createSession ? this.mode.createSession() : {};

    this.lastTime = 0;
    this.gravityAcc = 0;
    this.softAcc = 0;
    this.lockAcc = 0;
    this.anim = null;
    this.downKeys = new Set();
    this.moveState = { dir: 0, elapsed: 0, repeatElapsed: 0 };

    this.binds = { ...defaultBinds, ...(this.rules.binds || {}) };
    this.rebinding = null;
    this.depth = options.depth ?? 0.55;
    this.softScale = options.softScale ?? 0;
    this.cells = [];
    this.pieceSvg = null;
    this.toastCallback = null;
    this.init();
  }

  hook(name, ...args) {
    const fn = this.mode.hooks?.[name];
    if (typeof fn === 'function') return fn(this, ...args);
    return undefined;
  }

  init() {
    this.pieceSvg = document.createElementNS(NS, 'svg');
    this.pieceSvg.setAttribute('class', 'active-piece-svg');
    this.pieceSvg.setAttribute('width', '100%');
    this.pieceSvg.setAttribute('height', '100%');
    this.pieceSvg.setAttribute('aria-hidden', 'true');
    this.boardEl.appendChild(this.pieceSvg);

    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const el = document.createElement('div');
        el.className = 'cell';
        this.boardEl.appendChild(el);
        this.cells.push(el);
      }
    }

    this.emptyBoard();
    this.hook('init');
    this.spawn();
  }

  emptyBoard() {
    this.board = Array.from({ length: this.H }, () => Array(this.W).fill(0));
  }

  spawn() {
    if (this.anim?.layer) this.anim.layer.remove();
    const spawn = this.mode.spawn ? this.mode.spawn(this) : { x: 3, y: 0, o: 0 };
    this.piece = { ...spawn };
    this.gravityAcc = 0;
    this.softAcc = 0;
    this.lockAcc = 0;
    this.anim = null;

    if (this.collides(this.piece.x, this.piece.y, this.piece.o)) this.emptyBoard();
    this.hook('spawn', this.piece);
    this.render();
  }

  collides(px, py, o) {
    return collides(px, py, o, this.board, this.W, this.H, this.cellsFor);
  }

  movePiece(dx, dy) {
    const previous = { ...this.piece };
    const moved = move(this.piece, dx, dy, this.board, this.W, this.H, this.cellsFor);
    if (moved) this.hook('move', previous, { ...this.piece }, { dx, dy });
    return moved;
  }

  rotate(delta) {
    const before = { ...this.piece };
    const success = tryRotate(
      this.piece, delta, this.board, this.W, this.H, this.cellsFor,
      (old) => {
        this.turns++;
        this.options.onTurn(this.turns);
        this.hook('rotate', old, { ...this.piece }, delta);
        this.startHalfTurn(old);
      }
    );

    if (success) {
      this.lockAcc = 0;
      if (delta !== 2 && delta !== -2) {
        this.turns++;
        this.options.onTurn(this.turns);
        this.hook('rotate', before, { ...this.piece }, delta);
      }
    }
    return success;
  }

  startHalfTurn(old) {
    this.anim = {};
    startHalfTurn(old, this.boardEl, this.anim, this.depth, this.cellsFor, NS, () => this.render());
  }

  applySoftDrop() {
    if (!this.piece) return;
    const factor = this.rules.softFactors[this.softScale] ?? 1;
    if (factor === Infinity) {
      while (this.movePiece(0, 1)) {}
      this.softAcc = 0;
      return;
    }
    if (this.movePiece(0, 1)) {
      this.softAcc = 0;
      this.lockAcc = 0;
    }
  }

  hardDrop() {
    if (!this.piece) return;
    const startY = this.piece.y;
    while (this.movePiece(0, 1)) {}
    this.hook('hardDrop', startY, this.piece.y);
    this.lockPiece();
  }

  lockPiece() {
    if (!this.piece) return;
    const lockedPiece = { ...this.piece };

    for (const [cx, cy] of this.cellsFor(lockedPiece.o)) {
      const x = lockedPiece.x + cx;
      const y = lockedPiece.y + cy;
      if (y >= 0 && y < this.H && x >= 0 && x < this.W) this.board[y][x] = 1;
    }

    if (this.board.some(r => r.every(Boolean))) {
      this.board = this.board.filter(r => !r.every(Boolean));
      while (this.board.length < this.H) this.board.unshift(Array(this.W).fill(0));
    }

    this.placed++;
    this.hook('place', lockedPiece);
    this.options.onPlace(this.placed);

    if (this.rules.clearBoardAfterPlace !== false) this.emptyBoard();
    this.spawn();
  }

  render() {
    renderBoard(this.board, this.piece, this.anim, this.cells, this.W, this.H, this.cellsFor, this.collides.bind(this), this.depth);
    drawActivePiece(this.piece, this.pieceSvg, this.anim, this.W, this.H, this.depth, this.cellsFor, NS);
    this.hook('render');
  }

  tick(t) {
    if (!this.lastTime) this.lastTime = t;
    const dt = Math.min(50, t - this.lastTime);
    this.lastTime = t;
    if (!this.piece) return;

    if (this.moveState.dir) {
      this.moveState.elapsed += dt;
      if (this.moveState.elapsed >= this.das()) {
        if (this.arr() === 0) {
          while (this.movePiece(this.moveState.dir, 0)) {}
        } else {
          this.moveState.repeatElapsed += dt;
          while (this.moveState.repeatElapsed >= this.arr()) {
            this.moveState.repeatElapsed -= this.arr();
            if (!this.movePiece(this.moveState.dir, 0)) break;
          }
        }
      }
    }

    const softHeld = this.downKeys.has(this.binds.soft);
    if (softHeld) {
      const factor = this.rules.softFactors[this.softScale] ?? 1;
      if (factor === Infinity) {
        while (this.movePiece(0, 1)) {}
        this.softAcc = 0;
      } else {
        const interval = Math.max(16, this.rules.gravity / factor);
        this.softAcc += dt;
        while (this.softAcc >= interval) {
          this.softAcc -= interval;
          if (!this.movePiece(0, 1)) {
            this.softAcc = 0;
            break;
          }
        }
      }
      this.gravityAcc = 0;
    } else {
      this.softAcc = 0;
      this.gravityAcc += dt;
      while (this.gravityAcc >= this.rules.gravity) {
        this.gravityAcc -= this.rules.gravity;
        if (!this.movePiece(0, 1)) break;
      }
    }

    if (!this.collides(this.piece.x, this.piece.y + 1, this.piece.o)) this.lockAcc = 0;
    else this.lockAcc += dt;

    if (this.lockAcc >= this.rules.lockDelay) this.lockPiece();

    if (this.anim && t > this.anim.until) {
      if (this.anim.layer) this.anim.layer.remove();
      this.anim = null;
    }

    this.hook('tick', dt);
    this.render();
  }

  das() { return this.rules.das; }
  arr() { return this.rules.arr; }

  handleKeydown(e) {
    if (this.rebinding) {
      e.preventDefault();
      if (e.code === 'Escape') {
        this.rebinding = null;
        this.updateBindUI();
        return;
      }
      if (!Object.values(this.binds).includes(e.code) || this.binds[this.rebinding] === e.code) {
        this.binds[this.rebinding] = e.code;
        this.rebinding = null;
        this.updateBindUI();
        this.say('Binding updated');
      } else {
        this.say('That key is already assigned');
      }
      return;
    }

    const action = Object.keys(this.binds).find(k => this.binds[k] === e.code);
    if (!action) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
    if (this.downKeys.has(e.code)) return;

    this.downKeys.add(e.code);
    this.hook('input', e, action);

    if (action === 'left' || action === 'right') {
      this.moveState.dir = action === 'left' ? -1 : 1;
      this.moveState.elapsed = 0;
      this.moveState.repeatElapsed = 0;
      this.movePiece(this.moveState.dir, 0);
      this.render();
    } else if (action === 'soft') {
      this.applySoftDrop();
      this.render();
    } else if (action === 'hard') {
      this.hardDrop();
      this.render();
    } else if (action === 'cw') {
      this.rotate(1);
      this.render();
    } else if (action === 'ccw') {
      this.rotate(-1);
      this.render();
    } else if (action === 'half') {
      this.rotate(2);
      this.render();
    }
  }

  handleKeyup(e) {
    this.downKeys.delete(e.code);
    const action = Object.keys(this.binds).find(k => this.binds[k] === e.code);
    if (action === 'left' || action === 'right') {
      if (this.moveState.dir === (action === 'left' ? -1 : 1)) {
        this.moveState.dir = 0;
        this.moveState.elapsed = 0;
        this.moveState.repeatElapsed = 0;
      }
    }
  }

  handleBlur() {
    this.downKeys.clear();
    this.moveState.dir = 0;
  }

  keyLabel(code) {
    return keyNames[code] || code.replace(/^Key/, '').replace(/^Digit/, '');
  }

  say(s) {
    if (this.toastCallback) this.toastCallback(s);
  }

  setToastCallback(cb) {
    this.toastCallback = cb;
  }

  updateBindUI() {
    const root = document.getElementById('bindings');
    if (!root) return;
    root.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'bind';

    const btn = document.createElement('button');
    btn.textContent = this.rebinding === 'half' ? 'PRESS KEY' : this.keyLabel(this.binds.half);
    if (this.rebinding === 'half') btn.classList.add('listening');
    btn.setAttribute('aria-label', 'Change 180 degree rotation key');
    btn.onclick = () => {
      this.rebinding = 'half';
      this.updateBindUI();
    };

    row.append(btn);
    root.append(row);
  }

  reset() {
    this.turns = 0;
    this.placed = 0;
    this.softAcc = 0;
    this.gravityAcc = 0;
    this.lockAcc = 0;
    this.session = this.mode.createSession ? this.mode.createSession() : {};
    this.emptyBoard();
    this.spawn();
    this.hook('reset');
    this.options.onReset();
    this.say('Practice reset');
  }

  setDepth(value) { this.depth = value; }
  setSoftScale(value) { this.softScale = value; }
  getSoftFactor() { return this.rules.softFactors[this.softScale] ?? 1; }

  getState() {
    return {
      mode: this.mode.id || null,
      piece: this.piece ? { ...this.piece } : null,
      turns: this.turns,
      placed: this.placed,
      session: this.session,
      board: this.board.map(row => [...row])
    };
  }
}
