// Shared trainer engine.
// Owns the universal Tetris runtime. Mini-games provide rules, generators,
// session state, and hooks without duplicating the engine.

import {
  W, H, NS, defaultBinds, keyNames,
  softFactors as defaultSoftFactors
} from './state.js';
import { cellsFor as defaultCellsFor, spawnFor } from './pieces.js';
import { SevenBagGenerator } from './generator.js';
import { collides, move } from './collision.js';
import { tryRotate } from './rotation.js';
import { drawActivePiece, renderBoard, startHalfTurn } from './renderer.js';

const defaultMode = { id: null, rules: {}, hooks: {} };

export class Trainer {
  constructor(boardEl, options = {}) {
    this.boardEl = boardEl;
    this.mode = options.mode || defaultMode;

    this.rules = {
      width: W,
      height: H,
      gravity: 800,
      lockDelay: 500,
      softFactors: defaultSoftFactors,
      das: 127,
      arr: 0,
      clearBoardAfterPlace: false,
      ...this.mode.rules
    };

    if (Number.isFinite(options.das)) this.rules.das = options.das;
    if (Number.isFinite(options.arr)) this.rules.arr = options.arr;
    if (Number.isFinite(options.gravity)) this.rules.gravity = options.gravity;
    if (Number.isFinite(options.lockDelay)) this.rules.lockDelay = options.lockDelay;

    this.options = {
      onTurn: options.onTurn || (() => {}),
      onPlace: options.onPlace || (() => {}),
      onReset: options.onReset || (() => {})
    };

    this.W = this.rules.width;
    this.H = this.rules.height;
    this.cellsFor = options.cellsFor || defaultCellsFor;
    this.board = [];
    this.piece = null;
    this.generator = options.generator ||
      (this.mode.createGenerator ? this.mode.createGenerator() : new SevenBagGenerator());

    this.turns = 0;
    this.placed = 0;
    this.lines = 0;
    this.stats = {
      piecesPlaced: 0,
      linesCleared: 0,
      rotations: 0,
      hardDropRows: 0,
      softDropRows: 0
    };
    this.gameOver = false;

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

    for (let y=0; y<this.H; y++) {
      for (let x=0; x<this.W; x++) {
        const el=document.createElement('div');
        el.className='cell';
        this.boardEl.appendChild(el);
        this.cells.push(el);
      }
    }

    this.emptyBoard();
    this.hook('init');
    this.spawn();
  }

  emptyBoard() {
    this.board=Array.from({length:this.H},()=>Array(this.W).fill(0));
  }

  spawn() {
    if (this.anim?.layer) this.anim.layer.remove();

    const type=this.generator.next();
    this.piece=spawnFor(type);
    this.gravityAcc=0;
    this.softAcc=0;
    this.lockAcc=0;
    this.anim=null;

    if (this.collides(this.piece.x,this.piece.y,this.piece.o,this.piece.type)) {
      this.gameOver=true;
      this.hook('gameOver', { ...this.piece });
      this.render();
      return;
    }

    this.hook('spawn', { ...this.piece });
    this.render();
  }

  collides(px,py,o,type=this.piece?.type) {
    return collides(px,py,o,this.board,this.W,this.H,this.cellsFor,type);
  }

  movePiece(dx,dy) {
    if (this.gameOver || !this.piece) return false;
    const previous={...this.piece};
    const moved=move(this.piece,dx,dy,this.board,this.W,this.H,this.cellsFor);
    if (moved) {
      if (dy>0) this.stats.softDropRows += dy;
      this.hook('move',previous,{...this.piece},{dx,dy});
    }
    return moved;
  }

  rotate(delta) {
    if (this.gameOver || !this.piece) return false;
    const before={...this.piece};
    let halfTurnOld=null;

    const success=tryRotate(
      this.piece,delta,this.board,this.W,this.H,this.cellsFor,
      old => { halfTurnOld=old; }
    );

    if (!success) return false;

    this.lockAcc=0;
    this.turns++;
    this.stats.rotations++;
    this.options.onTurn(this.turns);
    this.hook('rotate',before,{...this.piece},delta);

    if (halfTurnOld) this.startHalfTurn(halfTurnOld);

    return true;
  }

  startHalfTurn(old) {
    this.anim={};
    startHalfTurn(
      old,this.boardEl,this.anim,this.depth,this.cellsFor,NS,
      ()=>this.render()
    );
  }

  applySoftDrop() {
    if (this.gameOver || !this.piece) return;
    const factor=this.rules.softFactors[this.softScale] ?? 1;

    if (factor===Infinity) {
      while (this.movePiece(0,1)) {}
      this.softAcc=0;
      return;
    }

    if (this.movePiece(0,1)) {
      this.softAcc=0;
      this.lockAcc=0;
    }
  }

  hardDrop() {
    if (this.gameOver || !this.piece) return;
    const startY=this.piece.y;
    while (this.movePiece(0,1)) {}
    this.stats.hardDropRows += this.piece.y-startY;
    this.hook('hardDrop',startY,this.piece.y);
    this.lockPiece();
  }

  lockPiece() {
    if (this.gameOver || !this.piece) return;

    const lockedPiece={...this.piece};

    for (const [cx,cy] of this.cellsFor(lockedPiece.type,lockedPiece.o)) {
      const x=lockedPiece.x+cx;
      const y=lockedPiece.y+cy;
      if (y>=0 && y<this.H && x>=0 && x<this.W) this.board[y][x]=1;
    }

    let cleared=0;
    const remaining=this.board.filter(row=>{
      const full=row.every(Boolean);
      if (full) cleared++;
      return !full;
    });

    if (cleared) {
      while (remaining.length<this.H) remaining.unshift(Array(this.W).fill(0));
      this.board=remaining;
      this.lines += cleared;
      this.stats.linesCleared += cleared;
    }

    this.placed++;
    this.stats.piecesPlaced++;
    this.hook('place',lockedPiece,cleared);
    this.options.onPlace(this.placed);

    // Board persistence is the normal core behavior. A mode may explicitly
    // request isolated repetitions with clearBoardAfterPlace=true.
    if (this.rules.clearBoardAfterPlace) this.emptyBoard();

    this.spawn();
  }

  render() {
    renderBoard(
      this.board,this.piece,this.anim,this.cells,this.W,this.H,
      this.cellsFor,this.collides.bind(this),this.depth
    );
    drawActivePiece(
      this.piece,this.pieceSvg,this.anim,this.W,this.H,
      this.depth,this.cellsFor,NS
    );
    this.hook('render');
  }

  tick(t) {
    if (!this.lastTime) this.lastTime=t;
    const dt=Math.min(50,t-this.lastTime);
    this.lastTime=t;
    if (this.gameOver || !this.piece) return;

    if (this.moveState.dir) {
      this.moveState.elapsed += dt;
      if (this.moveState.elapsed >= this.das()) {
        if (this.arr()===0) {
          while (this.movePiece(this.moveState.dir,0)) {}
        } else {
          this.moveState.repeatElapsed += dt;
          while (this.moveState.repeatElapsed >= this.arr()) {
            this.moveState.repeatElapsed -= this.arr();
            if (!this.movePiece(this.moveState.dir,0)) break;
          }
        }
      }
    }

    const softHeld=this.downKeys.has(this.binds.soft);
    if (softHeld) {
      const factor=this.rules.softFactors[this.softScale] ?? 1;
      if (factor===Infinity) {
        while (this.movePiece(0,1)) {}
        this.softAcc=0;
      } else {
        const interval=Math.max(16,this.rules.gravity/factor);
        this.softAcc += dt;
        while (this.softAcc>=interval) {
          this.softAcc -= interval;
          if (!this.movePiece(0,1)) {
            this.softAcc=0;
            break;
          }
        }
      }
      this.gravityAcc=0;
    } else {
      this.softAcc=0;
      this.gravityAcc += dt;
      while (this.gravityAcc>=this.rules.gravity) {
        this.gravityAcc -= this.rules.gravity;
        if (!this.movePiece(0,1)) break;
      }
    }

    if (!this.collides(this.piece.x,this.piece.y+1,this.piece.o,this.piece.type)) {
      this.lockAcc=0;
    } else {
      this.lockAcc += dt;
    }

    if (this.lockAcc>=this.rules.lockDelay) this.lockPiece();

    if (this.anim && t>this.anim.until) {
      if (this.anim.layer) this.anim.layer.remove();
      this.anim=null;
    }

    this.hook('tick',dt);
    this.render();
  }

  das(){ return this.rules.das; }
  arr(){ return this.rules.arr; }

  handleKeydown(e) {
    if (this.rebinding) {
      e.preventDefault();
      if (e.code==='Escape') {
        this.rebinding=null;
        this.updateBindUI();
        return;
      }

      if (!Object.values(this.binds).includes(e.code) || this.binds[this.rebinding]===e.code) {
        this.binds[this.rebinding]=e.code;
        this.rebinding=null;
        this.updateBindUI();
        this.say('Binding updated');
      } else {
        this.say('That key is already assigned');
      }
      return;
    }

    if (this.gameOver) return;

    const action=Object.keys(this.binds).find(k=>this.binds[k]===e.code);
    if (!action) return;
    if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space'].includes(e.code)) e.preventDefault();
    if (this.downKeys.has(e.code)) return;

    this.downKeys.add(e.code);
    this.hook('input',e,action);

    if (action==='left' || action==='right') {
      this.moveState.dir=action==='left' ? -1 : 1;
      this.moveState.elapsed=0;
      this.moveState.repeatElapsed=0;
      this.movePiece(this.moveState.dir,0);
      this.render();
    } else if (action==='soft') {
      this.applySoftDrop();
      this.render();
    } else if (action==='hard') {
      this.hardDrop();
      this.render();
    } else if (action==='cw') {
      this.rotate(1);
      this.render();
    } else if (action==='ccw') {
      this.rotate(-1);
      this.render();
    } else if (action==='half') {
      this.rotate(2);
      this.render();
    }
  }

  handleKeyup(e) {
    this.downKeys.delete(e.code);
    const action=Object.keys(this.binds).find(k=>this.binds[k]===e.code);
    if (action==='left' || action==='right') {
      if (this.moveState.dir===(action==='left' ? -1 : 1)) {
        this.moveState.dir=0;
        this.moveState.elapsed=0;
        this.moveState.repeatElapsed=0;
      }
    }
  }

  handleBlur() {
    this.downKeys.clear();
    this.moveState.dir=0;
  }

  keyLabel(code) {
    return keyNames[code] || code.replace(/^Key/,'').replace(/^Digit/,'');
  }

  say(s) {
    if (this.toastCallback) this.toastCallback(s);
  }

  setToastCallback(cb) {
    this.toastCallback=cb;
  }

  updateBindUI() {
    const root=document.getElementById('bindings');
    if (!root) return;
    root.innerHTML='';

    const row=document.createElement('div');
    row.className='bind';

    const btn=document.createElement('button');
    btn.textContent=this.rebinding==='half' ? 'PRESS KEY' : this.keyLabel(this.binds.half);
    if (this.rebinding==='half') btn.classList.add('listening');
    btn.setAttribute('aria-label','Change 180 degree rotation key');
    btn.onclick=()=>{
      this.rebinding='half';
      this.updateBindUI();
    };

    row.append(btn);
    root.append(row);
  }

  reset() {
    this.turns=0;
    this.placed=0;
    this.lines=0;
    this.stats={
      piecesPlaced:0,
      linesCleared:0,
      rotations:0,
      hardDropRows:0,
      softDropRows:0
    };
    this.softAcc=0;
    this.gravityAcc=0;
    this.lockAcc=0;
    this.lastTime=0;
    this.gameOver=false;
    this.downKeys.clear();
    this.moveState={dir:0,elapsed:0,repeatElapsed:0};
    this.session=this.mode.createSession ? this.mode.createSession() : {};
    if (this.generator.reset) this.generator.reset();
    this.emptyBoard();
    this.spawn();
    this.hook('reset');
    this.options.onReset();
    this.say('Practice reset');
  }

  setDepth(value){ this.depth=value; }
  setSoftScale(value){ this.softScale=value; }
  getSoftFactor(){ return this.rules.softFactors[this.softScale] ?? 1; }

  getState() {
    return {
      mode:this.mode.id || null,
      piece:this.piece ? {...this.piece} : null,
      turns:this.turns,
      placed:this.placed,
      lines:this.lines,
      stats:{...this.stats},
      gameOver:this.gameOver,
      session:this.session,
      board:this.board.map(row=>[...row])
    };
  }
}
