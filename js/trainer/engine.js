// Main trainer game logic

import { W, H, CELL, GRAVITY_MS_PER_ROW, LOCK_DELAY_MS, NS, keyNames, defaultBinds, labels, softFactors } from './state.js';
import { cellsFor } from './pieces.js';
import { collides, move } from './collision.js';
import { tryRotate } from './rotation.js';
import { drawActivePiece, renderBoard, startHalfTurn, svgEl } from './renderer.js';

/**
 * Trainer class - encapsulates the game state and logic
 * Can be extended or configured for different training modes
 */
export class Trainer {
  constructor(boardEl, options = {}) {
    this.boardEl = boardEl;
    this.options = {
      gravity: options.gravity || GRAVITY_MS_PER_ROW,
      lockDelay: options.lockDelay || LOCK_DELAY_MS,
      onTurn: options.onTurn || (() => {}),
      onPlace: options.onPlace || (() => {}),
      onReset: options.onReset || (() => {}),
      ...options
    };
    
    // Game state
    this.board = [];
    this.piece = null;
    this.turns = 0;
    this.placed = 0;
    
    // Timing state
    this.lastTime = 0;
    this.gravityAcc = 0;
    this.softAcc = 0;
    this.lockAcc = 0;
    
    // Animation state
    this.anim = null;
    
    // Input state
    this.downKeys = new Set();
    this.moveState = { dir: 0, elapsed: 0, repeatElapsed: 0 };
    
    // Settings
    this.binds = { ...defaultBinds };
    this.rebinding = null;
    this.depth = 0.55;
    this.softScale = 0;
    
    // DOM elements
    this.cells = [];
    this.pieceSvg = null;
    
    // Callbacks
    this.toastCallback = null;
    
    this.init();
  }
  
  init() {
    // Create SVG for active piece
    this.pieceSvg = document.createElementNS(NS, 'svg');
    this.pieceSvg.setAttribute('class', 'active-piece-svg');
    this.pieceSvg.setAttribute('width', '100%');
    this.pieceSvg.setAttribute('height', '100%');
    this.pieceSvg.setAttribute('aria-hidden', 'true');
    this.boardEl.appendChild(this.pieceSvg);
    
    // Create board cells
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const el = document.createElement('div');
        el.className = 'cell';
        this.boardEl.appendChild(el);
        this.cells.push(el);
      }
    }
    
    this.emptyBoard();
    this.spawn();
  }
  
  emptyBoard() {
    this.board = Array.from({ length: H }, () => Array(W).fill(0));
  }
  
  spawn() {
    if (this.anim && this.anim.layer) this.anim.layer.remove();
    this.piece = { x: 3, y: 0, o: 0 };
    this.gravityAcc = 0;
    this.softAcc = 0;
    this.lockAcc = 0;
    this.anim = null;
    
    if (this.collides(this.piece.x, this.piece.y, this.piece.o)) {
      this.emptyBoard();
    }
    
    this.render();
  }
  
  collides(px, py, o) {
    return collides(px, py, o, this.board, W, H, cellsFor);
  }
  
  movePiece(dx, dy) {
    return move(this.piece, dx, dy, this.board, W, H, cellsFor);
  }
  
  rotate(delta) {
    const success = tryRotate(
      this.piece,
      delta,
      this.board,
      W,
      H,
      cellsFor,
      (old) => {
        this.turns++;
        this.options.onTurn(this.turns);
        this.startHalfTurn(old);
      }
    );
    
    if (success) {
      this.lockAcc = 0;
    }
    
    return success;
  }
  
  startHalfTurn(old) {
    startHalfTurn(
      old,
      this.boardEl,
      this.anim,
      this.depth,
      cellsFor,
      NS,
      () => this.render()
    );
  }
  
  applySoftDrop() {
    if (!this.piece) return;
    
    const factor = softFactors[this.softScale] ?? 1;
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
    while (this.movePiece(0, 1)) {}
    this.lockPiece();
  }
  
  lockPiece() {
    if (!this.piece) return;
    
    for (const [cx, cy] of cellsFor(this.piece.o)) {
      let x = this.piece.x + cx, y = this.piece.y + cy;
      if (y >= 0 && y < H && x >= 0 && x < W) {
        this.board[y][x] = 1;
      }
    }
    
    // Row clear is retained, then board resets to isolate every practice repetition.
    let full = this.board.some(r => r.every(Boolean));
    if (full) {
      this.board = this.board.filter(r => !r.every(Boolean));
    }
    
    this.placed++;
    this.options.onPlace(this.placed);
    this.emptyBoard();
    this.spawn();
  }
  
  render() {
    renderBoard(this.board, this.piece, this.anim, this.cells, W, H, cellsFor, this.collides.bind(this), this.depth);
    drawActivePiece(this.piece, this.pieceSvg, this.anim, W, H, this.depth, cellsFor, NS);
  }
  
  tick(t) {
    if (!this.lastTime) this.lastTime = t;
    const dt = Math.min(50, t - this.lastTime);
    this.lastTime = t;
    
    if (this.piece) {
      // Handle DAS/ARR movement
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
      
      // Handle soft drop
      const softHeld = this.downKeys.has(this.binds.soft);
      if (softHeld) {
        const factor = softFactors[this.softScale] ?? 1;
        if (factor === Infinity) {
          while (this.movePiece(0, 1)) {}
          this.softAcc = 0;
        } else {
          const interval = Math.max(16, this.options.gravity / factor);
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
        const g = this.options.gravity;
        while (this.gravityAcc >= g) {
          this.gravityAcc -= g;
          if (!this.movePiece(0, 1)) break;
        }
      }
      
      // Lock delay
      if (!this.collides(this.piece.x, this.piece.y + 1, this.piece.o)) {
        this.lockAcc = 0;
      } else {
        this.lockAcc += dt;
      }
      
      if (this.lockAcc >= this.options.lockDelay) {
        this.lockPiece();
      }
      
      // Animation cleanup
      if (this.anim && t > this.anim.until) {
        if (this.anim.layer) this.anim.layer.remove();
        this.anim = null;
      }
      
      this.render();
    }
  }
  
  // Settings getters (can be overridden by mode-specific configs)
  das() { return 127; }
  arr() { return 0; }
  
  // Key handling
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
    
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    
    if (this.downKeys.has(e.code)) return;
    this.downKeys.add(e.code);
    
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
    const a = Object.keys(this.binds).find(k => this.binds[k] === e.code);
    if (a === 'left' || a === 'right') {
      if (this.moveState.dir === (a === 'left' ? -1 : 1)) {
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
  
  // UI helpers
  keyLabel(code) {
    return keyNames[code] || code.replace(/^Key/, '').replace(/^Digit/, '');
  }
  
  say(s) {
    if (this.toastCallback) {
      this.toastCallback(s);
    }
  }
  
  setToastCallback(cb) {
    this.toastCallback = cb;
  }
  
  updateBindUI() {
    const root = document.getElementById('bindings');
    if (!root) return;
    
    root.innerHTML = '';
    const id = 'half';
    const row = document.createElement('div');
    row.className = 'bind';
    
    const btn = document.createElement('button');
    btn.textContent = this.rebinding === id ? 'PRESS KEY' : this.keyLabel(this.binds[id]);
    if (this.rebinding === id) btn.classList.add('listening');
    btn.setAttribute('aria-label', 'Change 180 degree rotation key');
    btn.onclick = () => {
      this.rebinding = id;
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
    this.emptyBoard();
    this.spawn();
    this.options.onReset();
    this.say('Practice reset');
  }
  
  // Settings
  setDepth(value) {
    this.depth = value;
  }
  
  setSoftScale(value) {
    this.softScale = value;
  }
  
  getSoftFactor() {
    return softFactors[this.softScale] ?? 1;
  }
}
