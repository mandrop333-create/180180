// Universal low-latency Tetris runtime. Modes supply training rules/hooks; this file stays mode-agnostic.
import { W,H,NS,defaultBinds,softFactors as defaultSoftFactors } from './state.js';
import { cellsFor as defaultCellsFor,spawnFor } from './pieces.js';
import { SevenBagGenerator } from './generator.js';
import { collides,move } from './collision.js';
import { tryRotate } from './rotation.js';
import { drawActivePiece,renderBoard,startHalfTurn } from './renderer.js';
import { createTrainingState,recordTrainingAction,recordTrainingRotation,tickTrainingState } from './training-state.js';

const defaultMode={id:null,rules:{},hooks:{}};
const SCORE={single:100,double:300,triple:500,tetris:800,tspin:400,tspinSingle:800,tspinDouble:1200,tspinTriple:1600,mini:100,miniSingle:200,miniDouble:400,miniTriple:800,hardDropPerRow:2,softDropPerRow:1};

function cloneBoard(board){return board.map(row=>[...row]);}
function countFilled(board){let n=0;for(const row of board)for(const cell of row)if(cell)n++;return n;}

export class Trainer {
  constructor(boardEl,options={}){
    this.boardEl=boardEl; this.mode=options.mode||defaultMode;
    this.rules={width:W,height:H,gravity:800,lockDelay:500,softFactors:[...defaultSoftFactors],das:127,arr:0,dcd:0,maxLockResets:15,safeLock:true,cancelDas:false,preferSoftDrop:false,clearBoardAfterPlace:false,clearLines:true,showGhost:true,queueSize:5,hold:true, ...this.mode.rules, softFactors:[...(this.mode.rules.softFactors || defaultSoftFactors)], scoring:{...(this.mode.rules.scoring || {})}};
    if(Number.isFinite(options.das))this.rules.das=options.das;
    if(Number.isFinite(options.arr))this.rules.arr=options.arr;
    if(Number.isFinite(options.dcd))this.rules.dcd=options.dcd;
    if(Number.isFinite(options.gravity))this.rules.gravity=options.gravity;
    if(Number.isFinite(options.lockDelay))this.rules.lockDelay=options.lockDelay;
    this.options={onTurn:options.onTurn||(()=>{}),onPlace:options.onPlace||(()=>{}),onReset:options.onReset||(()=>{}),onState:options.onState||(()=>{})};
    this.W=this.rules.width;this.H=this.rules.height;this.cellsFor=options.cellsFor||defaultCellsFor;
    this.board=[];this.piece=null;this.generator=options.generator||(this.mode.createGenerator?this.mode.createGenerator({seed:options.seed}):new SevenBagGenerator({seed:options.seed}));
    this.queue=[];this.holdType=null;this.holdUsed=false;
    this.turns=0;this.placed=0;this.lines=0;this.combo=-1;this.b2b=false;
    this.stats={piecesPlaced:0,linesCleared:0,rotations:0,halfTurns:0,pieceInputs:0,finessePerfect:0,finesseFaults:0,hardDropRows:0,softDropRows:0,lockResets:0,score:0,combos:0,tetrises:0,tspins:0,perfectClears:0,piecesWithLineClear:0};
    this.gameOver=false;this.session=this.mode.createSession?this.mode.createSession():{};this.training=createTrainingState();
    this.lastTime=0;this.gravityAcc=0;this.softAcc=0;this.lockAcc=0;this.lockResets=0;this.pieceInputCount=0;this.hardDropBlockedUntil=0;this.dasCutRemaining=0;this.anim=null;
    this.downKeys=new Set();this.moveState={dir:0,elapsed:0,repeatElapsed:0};this.lastAction=null;this.lastRotation=false;
    this.binds={...defaultBinds,...(this.rules.binds||{})};this.depth=options.depth??.55;this.softScale=options.softScale??0;this.shadowOpacity=options.shadowOpacity??.6;this.shadowBrightness=options.shadowBrightness??1;
    this.cells=[];this.pieceSvg=null;this.toastCallback=null;if(!options.deferInit)this.init();
  }
  hook(name,...args){const fn=this.mode.hooks?.[name];return typeof fn==='function'?fn(this,...args):undefined;}
  init(){this.pieceSvg=document.createElementNS(NS,'svg');this.pieceSvg.setAttribute('class','active-piece-svg');this.pieceSvg.setAttribute('width','100%');this.pieceSvg.setAttribute('height','100%');this.pieceSvg.setAttribute('aria-hidden','true');this.boardEl.appendChild(this.pieceSvg);for(let y=0;y<this.H;y++)for(let x=0;x<this.W;x++){const el=document.createElement('div');el.className='cell';this.boardEl.appendChild(el);this.cells.push(el);}this.emptyBoard();this.ensureQueue();this.hook('init');this.spawn();}
  emptyBoard(){this.board=Array.from({length:this.H},()=>Array(this.W).fill(0));}
  ensureQueue(){while(this.queue.length<(this.rules.queueSize??5)){this.queue.push(this.generator.next());}}
  spawn(forcedType=null){
    if(this.anim?.layer)this.anim.layer.remove();
    this.ensureQueue();
    const type=forcedType||this.queue.shift();
    this.ensureQueue();
    this.piece=spawnFor(type);this.pieceInputCount=0;this.gravityAcc=0;this.softAcc=0;this.lockAcc=0;this.lockResets=0;this.dasCutRemaining=this.rules.dcd||0;this.anim=null;this.lastRotation=false;this.lastAction=null;
    this.hook('beforeSpawn',{...this.piece});if(this.collides(this.piece.x,this.piece.y,this.piece.o,this.piece.type)){this.gameOver=true;this.hook('gameOver',{...this.piece});this.render();return;}
    this.hook('spawn',{...this.piece});this.render();this.emitState();
  }
  collides(px,py,o,type=this.piece?.type){return collides(px,py,o,this.board,this.W,this.H,this.cellsFor,type);}
  movePiece(dx,dy,{countSoftDrop=false}={}){
    if(this.gameOver||!this.piece)return false;const previous={...this.piece};
    const moved=move(this.piece,dx,dy,this.board,this.W,this.H,this.cellsFor);
    if(moved){this.lastAction='move';this.lastRotation=false;if(countSoftDrop&&dy>0){this.stats.softDropRows+=dy;this.stats.score+=dy*(this.rules.scoring?.softDropPerRow??SCORE.softDropPerRow);}if(dy===0)this.resetLockAfterAction();this.hook('move',previous,{...this.piece},{dx,dy});}
    return moved;
  }
  resetLockAfterAction(){if(!this.piece||!this.collides(this.piece.x,this.piece.y+1,this.piece.o,this.piece.type)){this.lockAcc=0;return;}if(this.lockResets<(this.rules.maxLockResets??15)){this.lockAcc=0;this.lockResets++;this.stats.lockResets++;}}
  rotate(delta){
    if(this.gameOver||!this.piece)return false;const before={...this.piece};let halfTurnOld=null;
    const success=tryRotate(this.piece,delta,this.board,this.W,this.H,this.cellsFor,old=>{halfTurnOld=old;});
    if(!success)return false;
    this.resetLockAfterAction();this.turns++;this.stats.rotations++;if(Math.abs(delta)===2)this.stats.halfTurns++;
    this.options.onTurn(this.turns);this.lastAction='rotate';this.lastRotation=true;this.dasCutRemaining=this.rules.dcd||0;
    recordTrainingRotation(this.training,delta,before,this.piece);this.hook('rotate',before,{...this.piece},delta);
    if(halfTurnOld)this.startHalfTurn(halfTurnOld,{...this.piece});this.emitState();return true;
  }
  startHalfTurn(old,next){const animation={from:{...old},to:{...next},layer:null,started:0,duration:240};if(this.anim?.layer)this.anim.layer.remove();this.anim=animation;startHalfTurn(animation,this.boardEl,this.cellsFor,NS,()=>{if(this.anim!==animation)return;this.anim=null;this.render();});}
  hold(){
    if(this.gameOver||!this.piece||this.rules.hold===false||this.holdUsed)return false;
    const current=this.piece.type;this.holdUsed=true;
    if(this.holdType){const incoming=this.holdType;this.holdType=current;this.spawn(incoming);}
    else{this.holdType=current;this.ensureQueue();this.spawn();}
    this.hook('hold',current,this.holdType);this.emitState();return true;
  }
  applySoftDrop(){if(this.gameOver||!this.piece)return;const factor=this.rules.softFactors[this.softScale]??1;if(factor===Infinity){while(this.movePiece(0,1,{countSoftDrop:true})){}this.softAcc=0;return;}if(this.movePiece(0,1,{countSoftDrop:true})){this.softAcc=0;this.lockAcc=0;}}
  hardDrop(){if(this.gameOver||!this.piece)return;if(this.rules.safeLock&&performance.now()<this.hardDropBlockedUntil)return;const startY=this.piece.y;while(this.movePiece(0,1)){}const rows=this.piece.y-startY;this.stats.hardDropRows+=rows;this.stats.score+=rows*(this.rules.scoring?.hardDropPerRow??SCORE.hardDropPerRow);this.hook('hardDrop',startY,this.piece.y);this.lockPiece(false);}
  isTSpin(piece){
    if(!piece||piece.type!=='T'||!this.lastRotation)return null;
    const cx=piece.x+1,cy=piece.y+1;let corners=0;
    for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=cx+dx,y=cy+dy;if(x<0||x>=this.W||y<0||y>=this.H||this.board[y][x])corners++;}
    if(corners<3)return null;
    return corners===4?'full':'mini';
  }
  lockPiece(automatic=false){
    if(this.gameOver||!this.piece)return;
    if(automatic&&this.rules.safeLock)this.hardDropBlockedUntil=performance.now()+50;
    const lockedPiece={...this.piece},lockedCells=this.cellsFor(lockedPiece.type,lockedPiece.o);
    if(lockedCells.some(([cx,cy])=>lockedPiece.y+cy<0)){this.gameOver=true;this.hook('gameOver',{...lockedPiece});this.render();return;}
    const before=this.board.map(r=>[...r]);
    for(const[cx,cy]of lockedCells){const x=lockedPiece.x+cx,y=lockedPiece.y+cy;if(y>=0&&y<this.H&&x>=0&&x<this.W)this.board[y][x]=lockedPiece.type;}
    const afterLock=this.board.map(r=>[...r]);let cleared=0;let shouldClear=this.rules.clearLines!==false;
    const beforeClear=this.hook('beforeClear',lockedPiece,afterLock);if(beforeClear===false)shouldClear=false;
    const spin=this.isTSpin(lockedPiece);let clearRows=[];
    if(shouldClear){const remaining=this.board.filter(row=>{const full=row.every(Boolean);if(full){cleared++;clearRows.push(row);}return!full;});if(cleared){while(remaining.length<this.H)remaining.unshift(Array(this.W).fill(0));this.board=remaining;this.lines+=cleared;this.stats.linesCleared+=cleared;}}
    if(cleared===0)this.combo=-1;else{this.combo++;if(this.combo>0)this.stats.combos++;}
    if(cleared>0)this.stats.piecesWithLineClear++;\n    if(cleared===4)this.stats.tetrises++;
    if(spin)this.stats.tspins++;
    if(cleared===0&&spin===null)this.b2b=false;
    const difficult=(cleared===4)||!!spin;
    if(difficult&&cleared>0){if(this.b2b)this.stats.score+=Math.round((this.rules.scoring?.b2bMultiplier??1.5)*this.spinOrLineScore(cleared,spin));else this.stats.score+=this.spinOrLineScore(cleared,spin);this.b2b=true;}
    else if(cleared>0){this.stats.score+=this.spinOrLineScore(cleared,spin);this.b2b=false;}
    if(this.combo>0)this.stats.score+=50*this.combo;
    const afterClear=this.board.map(r=>[...r]);
    if(countFilled(this.board)===0&&cleared>0){this.stats.perfectClears++;this.stats.score+=3500;}
    this.placed++;this.stats.piecesPlaced++;
    this.holdUsed=false;
    this.stats.pieceInputs=this.pieceInputCount;if(this.pieceInputCount<=2)this.stats.finessePerfect++;else this.stats.finesseFaults++;
    this.hook('place',lockedPiece,cleared,{beforeLock:before,afterLock,afterClear,spin});
    this.options.onPlace(this.placed);if(this.rules.clearBoardAfterPlace)this.emptyBoard();
    this.spawn();this.emitState();
  }
  spinOrLineScore(cleared,spin){
    const s=this.rules.scoring||SCORE;
    if(spin==='full')return ({0:s.tspin,1:s.tspinSingle,2:s.tspinDouble,3:s.tspinTriple}[cleared]??s.tspin);
    if(spin==='mini')return ({0:s.mini,1:s.miniSingle,2:s.miniDouble,3:s.miniTriple}[cleared]??s.mini);
    return ({1:s.single,2:s.double,3:s.triple,4:s.tetris}[cleared]??0);
  }
  render(){renderBoard(this.board,this.piece,this.anim,this.cells,this.W,this.H,this.cellsFor,this.collides.bind(this),this.depth,this.shadowOpacity,this.shadowBrightness,this.rules.showGhost);drawActivePiece(this.piece,this.pieceSvg,this.anim,this.W,this.H,this.depth,this.cellsFor,NS);this.hook('render');this.emitState();}
  emitState(){this.options.onState({piece:this.piece?{...this.piece}:null,queue:[...this.queue],hold:this.holdType,holdUsed:this.holdUsed,lines:this.lines,stats:{...this.stats},combo:this.combo,b2b:this.b2b,gameOver:this.gameOver});}
  tick(t){
    if(!this.lastTime)this.lastTime=t;const dt=Math.min(50,t-this.lastTime);this.lastTime=t;tickTrainingState(this.training,t);if(this.gameOver||!this.piece){this.hook('tick',dt,t);return;}
    if(this.dasCutRemaining>0)this.dasCutRemaining=Math.max(0,this.dasCutRemaining-dt);
    if(this.moveState.dir&&this.dasCutRemaining<=0&&!((this.downKeys.has(this.binds.soft))&&this.rules.preferSoftDrop)){this.moveState.elapsed+=dt;if(this.moveState.elapsed>=this.das()){if(this.arr()===0){while(this.movePiece(this.moveState.dir,0)){};}else{this.moveState.repeatElapsed+=dt;while(this.moveState.repeatElapsed>=this.arr()){this.moveState.repeatElapsed-=this.arr();if(!this.movePiece(this.moveState.dir,0))break;}}}}
    const softHeld=this.downKeys.has(this.binds.soft);if(softHeld){const factor=this.rules.softFactors[this.softScale]??1;if(factor===Infinity){while(this.movePiece(0,1,{countSoftDrop:true})){}this.softAcc=0;}else{const interval=Math.max(8,this.rules.gravity/factor);this.softAcc+=dt;while(this.softAcc>=interval){this.softAcc-=interval;if(!this.movePiece(0,1,{countSoftDrop:true})){this.softAcc=0;break;}}}this.gravityAcc=0;}
    else if(this.rules.gravity!==Infinity){this.softAcc=0;this.gravityAcc+=dt;while(this.gravityAcc>=this.rules.gravity){this.gravityAcc-=this.rules.gravity;if(!this.movePiece(0,1))break;}}
    if(!this.collides(this.piece.x,this.piece.y+1,this.piece.o,this.piece.type))this.lockAcc=0;else this.lockAcc+=dt;
    if(this.lockAcc>=this.rules.lockDelay)this.lockPiece(true);this.hook('tick',dt,t);this.render();
  }
  das(){return this.rules.das;}arr(){return this.rules.arr;}
  handleKeydown(e){
    if(this.gameOver)return;const action=Object.keys(this.binds).find(k=>this.binds[k]===e.code);if(!action)return;
    if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space'].includes(e.code))e.preventDefault();if(this.downKeys.has(e.code))return;
    this.downKeys.add(e.code);recordTrainingAction(this.training,action,performance.now(),{code:e.code});
    if(this.hook('input',e,action)===true)return;
    if(action==='left'||action==='right'){if(this.downKeys.has(this.binds.soft)&&this.rules.preferSoftDrop)return;this.pieceInputCount++;this.moveState.dir=action==='left'?-1:1;this.moveState.elapsed=this.rules.cancelDas?0:this.moveState.elapsed;this.moveState.repeatElapsed=0;this.movePiece(this.moveState.dir,0);this.render();}
    else if(action==='soft'){this.applySoftDrop();this.render();}
    else if(action==='hard'){this.hardDrop();this.render();}
    else if(action==='cw'){this.pieceInputCount++;this.rotate(1);this.render();}
    else if(action==='ccw'){this.pieceInputCount++;this.rotate(-1);this.render();}
    else if(action==='half'){this.pieceInputCount++;this.rotate(2);this.render();}
    else if(action==='hold'){this.hold();}
  }
  handleKeyup(e){this.downKeys.delete(e.code);const action=Object.keys(this.binds).find(k=>this.binds[k]===e.code);if(action==='left'||action==='right')if(this.moveState.dir===(action==='left'?-1:1)){this.moveState.dir=0;this.moveState.elapsed=0;this.moveState.repeatElapsed=0;}}
  handleBlur(){this.downKeys.clear();this.moveState.dir=0;}
  say(s){if(this.toastCallback)this.toastCallback(s);}setToastCallback(cb){this.toastCallback=cb;}
  reset(){
    this.turns=0;this.placed=0;this.lines=0;this.combo=-1;this.b2b=false;this.stats={piecesPlaced:0,linesCleared:0,rotations:0,halfTurns:0,pieceInputs:0,finessePerfect:0,finesseFaults:0,hardDropRows:0,softDropRows:0,lockResets:0,score:0,combos:0,tetrises:0,tspins:0,perfectClears:0,piecesWithLineClear:0};
    this.softAcc=0;this.gravityAcc=0;this.lockAcc=0;this.lockResets=0;this.dasCutRemaining=0;this.lastTime=0;this.gameOver=false;this.downKeys.clear();this.moveState={dir:0,elapsed:0,repeatElapsed:0};this.training=createTrainingState();
    this.holdUsed=false;
    this.session=this.mode.createSession?this.mode.createSession():{};if(this.generator.reset)this.generator.reset();this.queue=[];this.holdType=null;this.holdUsed=false;this.emptyBoard();this.piece=null;this.anim=null;this.ensureQueue();this.spawn();this.hook('reset');this.options.onReset();this.emitState();
  }
  start(){this.lastTime=performance.now();const loop=t=>{this.tick(t);if(!this.gameOver)requestAnimationFrame(loop);};requestAnimationFrame(loop);}
}
