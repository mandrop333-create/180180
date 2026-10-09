// Universal low-latency Tetris runtime. Modes supply training rules/hooks; this file stays mode-agnostic.
import { W,H,NS,defaultBinds,softFactors as defaultSoftFactors } from './state.js';
import { cellsFor as defaultCellsFor,spawnFor } from './pieces.js';
import { SevenBagGenerator } from './generator.js';
import { keyNames } from './state.js';
import { collides,move } from './collision.js';
import { tryRotate } from './rotation.js';
import { drawActivePiece,renderBoard,startHalfTurn } from './renderer.js';
import { createTrainingState,recordTrainingAction,recordTrainingRotation,tickTrainingState } from './training-state.js';
import { RhythmTracker } from './rhythm.js';
import { planFinesse } from './finesse.js';

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
    this.options={onTurn:options.onTurn||(()=>{}),onPlace:options.onPlace||(()=>{}),onReset:options.onReset||(()=>{}),onState:options.onState||(()=>{}),onRhythmReport:options.onRhythmReport||(()=>{})};
    this.W=this.rules.width;this.H=this.rules.height;this.cellsFor=options.cellsFor||defaultCellsFor;
    this.board=[];this.piece=null;this.generator=options.generator||(this.mode.createGenerator?this.mode.createGenerator({seed:options.seed}):new SevenBagGenerator({seed:options.seed}));
    this.queue=[];this.holdType=null;this.holdUsed=false;
    this.turns=0;this.placed=0;this.lines=0;this.combo=-1;this.b2b=false;
    this.stats={piecesPlaced:0,linesCleared:0,rotations:0,halfTurns:0,pieceInputs:0,finessePerfect:0,finesseFaults:0,hardDropRows:0,softDropRows:0,lockResets:0,score:0,combos:0,tetrises:0,tspins:0,perfectClears:0};
    this.gameOver=false;this.rhythm=new RhythmTracker(options.calculateRhythm===true);this.session=this.mode.createSession?this.mode.createSession():{};this.training=createTrainingState();
    this.lastTime=0;this.gravityAcc=0;this.softAcc=0;this.lockAcc=0;this.lockResets=0;this.pieceInputCount=0;this.dasCutRemaining=0;this.anim=null;
    this.downKeys=new Set();this.moveState={dir:0,elapsed:0,repeatElapsed:0,startedAt:0,nextRepeatAt:Infinity};this.lastAction=null;this.lastRotation=false;this.finesseEnabled=!!options.finesseEnabled;this.colorOnlyFocalPiece=!!options.colorOnlyFocalPiece;this.finesseActions=[];this.finesseRouteCandidates=[];this.finesseObservedActions=[];this.finesseProgress=0;this.finesseMistakes=0;this.finesseFaulted=false;
    this.binds={...defaultBinds,...(this.rules.binds||{})};this.depth=options.depth??.55;this.softScale=options.softScale??0;this.shadowOpacity=options.shadowOpacity??.6;this.shadowBrightness=options.shadowBrightness??1;
    this.cells=[];this.pieceSvg=null;this.toastCallback=null;this.renderDirty=true;this.running=false;this.renderCache={cellClasses:[],activeKey:null};if(!options.deferInit)this.init();
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
    this.piece=spawnFor(type);this.pieceInputCount=0;this.gravityAcc=0;this.softAcc=0;this.lockAcc=0;this.finesseProgress=0;this.finesseFaulted=false;this.lockResets=0;this.dasCutRemaining=this.rules.dcd||0;this.anim=null;this.lastRotation=false;this.lastAction=null;this.moveState={dir:0,elapsed:0,repeatElapsed:0,startedAt:0,nextRepeatAt:Infinity};this.moveSuppressedAt=0;
    this.hook('beforeSpawn',{...this.piece});if(this.collides(this.piece.x,this.piece.y,this.piece.o,this.piece.type)){this.gameOver=true;this.hook('gameOver',{...this.piece});this.finishRhythm();this.render();queueMicrotask(()=>{if(this.gameOver)this.reset('gameover');});return;}
    this.hook('spawn',{...this.piece});this.reapplyHeldHorizontalInput();this.generateFinessePrompt();this.markRender();
  }
  collides(px,py,o,type=this.piece?.type){return collides(px,py,o,this.board,this.W,this.H,this.cellsFor,type);}
  movePiece(dx,dy,{countSoftDrop=false}={}){
    if(this.gameOver||!this.piece)return false;const previous={...this.piece};
    const moved=move(this.piece,dx,dy,this.board,this.W,this.H,this.cellsFor);
    if(moved){this.lastAction='move';this.lastRotation=false;if(countSoftDrop&&dy>0){this.stats.softDropRows+=dy;this.stats.score+=dy*(this.rules.scoring?.softDropPerRow??SCORE.softDropPerRow);}if(dy===0)this.resetLockAfterAction();this.rhythm?.move(dx,dy,performance.now());this.hook('move',previous,{...this.piece},{dx,dy});this.markRender();}
    return moved;
  }
  resetLockAfterAction(){if(!this.piece||!this.collides(this.piece.x,this.piece.y+1,this.piece.o,this.piece.type)){this.lockAcc=0;return;}if(this.lockResets<(this.rules.maxLockResets??15)){this.lockAcc=0;this.lockResets++;this.stats.lockResets++;}}
  isLockDelayed(){return !!this.piece&&this.collides(this.piece.x,this.piece.y+1,this.piece.o,this.piece.type)&&this.lockAcc>0;}
  rotate(delta){
    if(this.gameOver||!this.piece)return false;
    const before={...this.piece};let halfTurnOld=null;
    const success=tryRotate(this.piece,delta,this.board,this.W,this.H,this.cellsFor,old=>{halfTurnOld=old;});
    if(!success)return false;
    this.resetLockAfterAction();this.turns++;this.stats.rotations++;if(Math.abs(delta)===2)this.stats.halfTurns++;
    this.options.onTurn(this.turns);this.lastAction='rotate';this.lastRotation=true;
    // Rotation preserves horizontal DAS/ARR elapsed time. DCD temporarily blocks
    // repeats without resetting the underlying hold schedule.
    this.dasCutRemaining=this.rules.dcd||0; // Rotation preserves the active horizontal DAS clock; DCD is the only intentional cut.
    recordTrainingRotation(this.training,delta,before,this.piece);this.rhythm?.rotate(delta,performance.now());this.hook('rotate',{before,after:{...this.piece},delta,now:performance.now()});
    if(this.finesseEnabled&&delta){const finesseAction=delta===2||delta===-2?'half':delta===1?'cw':delta===-1?'ccw':null;if(finesseAction)this.recordFinesseObservation(finesseAction);}
    if(halfTurnOld)this.startHalfTurn(halfTurnOld,{...this.piece});this.markRender();return true;
  }
  startHalfTurn(old,next){const animation={from:{...old},to:{...next},layer:null,started:0,duration:240};if(this.anim?.layer)this.anim.layer.remove();this.anim=animation;startHalfTurn(animation,this.boardEl,this.cellsFor,NS,()=>{if(this.anim!==animation)return;this.anim=null;this.render();});}
  hold(){
    if(this.gameOver||!this.piece||this.rules.hold===false||this.holdUsed)return false;
    const current=this.piece.type;this.holdUsed=true;
    // Rhythm ownership belongs to the piece being held, so record the input
    // before spawn() switches the active piece. handleKeydown() already records
    // the same input; RhythmTracker dedupes the near-identical event.
    this.rhythm?.hold(performance.now());
    if(this.holdType){const incoming=this.holdType;this.holdType=current;this.spawn(incoming);}
    else{this.holdType=current;this.ensureQueue();this.spawn();}
    this.hook('hold',current,this.holdType);this.emitState();return true;
  }
  setColorOnlyFocalPiece(enabled){this.colorOnlyFocalPiece=!!enabled;this.render();}
  setCalculateRhythm(enabled){this.rhythm.enabled=!!enabled;this.rhythm.reset();}
  finishRhythm(){const report=this.rhythm?.report();if(report)this.options.onRhythmReport(report);}
  setFinesseEnabled(enabled){
    this.finesseEnabled=!!enabled;
    this.finesseActions=[];
    this.finesseRouteCandidates=[];
    this.finesseObservedActions=[];
    this.finesseProgress=0;
    this.finesseMistakes=0;
    this.finesseFaulted=false;
    this.finessePlacementResolved=false;
    this.finesseDASPending=null;
    this.finesseTarget=null;
    // Enabling mid-piece must create a prompt for the current live piece;
    // otherwise the toggle turns on but the visual trainer stays empty.
    if(this.finesseEnabled)this.generateFinessePrompt();
    this.emitState();
  }
  finesseFault(){
    if(this.finesseFaulted)return;
    this.finesseMistakes++;this.stats.finesseFaults++;this.finesseFaulted=true;
    this.emitState();
  }
  recordFinesseObservation(action){
    if(!this.finesseEnabled||this.finesseFaulted)return;
    const next=[...this.finesseObservedActions,action];
    const matches=this.finesseRouteCandidates.filter(route=>
      route.length>=next.length&&next.every((observed,index)=>{
        const step=route[index];
        return (typeof step==='string'?step:step.action)===observed;
      })
    );
    if(!matches.length){this.finesseFault();return;}
    this.finesseObservedActions=next;
    this.finesseRouteCandidates=matches;
    this.finesseDASPending=null;
    this.finesseProgress=next.length;
    this.emitState();
  }
  observeFinesseDAS(action){
    if(!this.finesseEnabled||this.finesseFaulted)return;
    const expected=this.finesseActions[this.finesseProgress];
    if(!expected||typeof expected!=='object'||expected.action!==action||expected.mode!=='das')return;
    const dir=action==='left'?-1:1;
    const wall=this.dasWallX(dir);
    if(wall!==null&&this.piece?.x===wall)this.recordFinesseObservation(action);
  }
  finesseLabel(step){
    const action=typeof step==='string'?step:step.action;
    const code=this.binds?.[action];
    const key=keyNames[code]||String(code||action).replace(/^Key/,'').replace(/^Digit/,'');
    return typeof step==='object'&&step.mode==='das'?key+' HOLD':key;
  }
  generateFinessePrompt(){
    this.finesseActions=[];
    this.finesseRouteCandidates=[];
    this.finesseObservedActions=[];
    this.finesseProgress=0;
    this.finesseTarget=null;
    this.finessePlacementResolved=false;
    this.finesseDASPending=null;
    if(!this.finesseEnabled||this.gameOver||!this.piece)return;

    // The shared planner uses the same collision and rotation transitions as
    // gameplay. It returns the minimum-input route for the chosen reachable
    // placement; hard drop and gravity are deliberately outside finesse cost.
    const plan=planFinesse({
      piece:{...this.piece},
      board:this.board,
      W:this.W,
      H:this.H,
      cellsFor:this.cellsFor,
      move:(piece,dx,dy,board,W,H,cellsFor)=>move(piece,dx,dy,board,W,H,cellsFor),
      tryRotate:(piece,delta,board,W,H,cellsFor)=>tryRotate(piece,delta,board,W,H,cellsFor),
      maxCost:this.mode.rules?.finesseProfile?.maxCost??2,
      seed:this.placed,
      profile:this.mode.rules?.finesseProfile
    });
    if(!plan)return;
    this.finesseTarget={...plan.target};
    this.finesseActions=plan.actions.map(step=>({...step}));
    this.finesseRouteCandidates=(plan.routes||[plan.actions]).map(route=>route.map(step=>({...step})));
  }
  reapplyHeldHorizontalInput(){
    if(this.gameOver||!this.piece)return;
    const left=this.downKeys.has(this.binds.left),right=this.downKeys.has(this.binds.right);
    if(left===right)return;
    const action=left?'left':'right',dir=left?-1:1,now=performance.now();
    this.moveState.dir=dir;this.moveState.elapsed=0;this.moveState.repeatElapsed=0;this.moveState.startedAt=now;this.moveState.nextRepeatAt=now+this.das();
    // A held key inherited across spawn is existing gameplay state, not a
    // new deliberate input for the new piece. Let normal DAS/ARR run, but do
    // not let the visual trainer count it as a fresh finesse step.
    this.movePiece(dir,0);
  }
  applySoftDrop(){if(this.gameOver||!this.piece)return;const factor=this.rules.softFactors[this.softScale]??1;if(factor===Infinity){while(this.movePiece(0,1,{countSoftDrop:true})){}this.softAcc=0;return;}if(this.movePiece(0,1,{countSoftDrop:true})){this.softAcc=0;this.lockAcc=0;}}
  hardDrop(){if(this.gameOver||!this.piece)return;const startY=this.piece.y;while(this.movePiece(0,1)){}const rows=this.piece.y-startY;this.stats.hardDropRows+=rows;this.stats.score+=rows*(this.rules.scoring?.hardDropPerRow??SCORE.hardDropPerRow);this.rhythm?.hardDrop(performance.now());this.hook('hardDrop',startY,this.piece.y);this.lockPiece(false);}
  isTSpin(piece){
    if(!piece||piece.type!=='T'||!this.lastRotation)return null;
    const cx=piece.x+1,cy=piece.y+1;let corners=0;
    for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=cx+dx,y=cy+dy;if(x<0||x>=this.W||y<0||y>=this.H||this.board[y][x])corners++;}
    if(corners<3)return null;
    return corners===4?'full':'mini';
  }
  lockPiece(automatic=false){
    if(this.gameOver||!this.piece)return;
        const lockedPiece={...this.piece},lockedCells=this.cellsFor(lockedPiece.type,lockedPiece.o);
    if(lockedCells.some(([cx,cy])=>lockedPiece.y+cy<0)){this.gameOver=true;this.hook('gameOver',{...lockedPiece});this.render();queueMicrotask(()=>{if(this.gameOver)this.reset();});return;}
    const before=this.board.map(r=>[...r]);
    for(const[cx,cy]of lockedCells){const x=lockedPiece.x+cx,y=lockedPiece.y+cy;if(y>=0&&y<this.H&&x>=0&&x<this.W)this.board[y][x]=lockedPiece.type;}
    const afterLock=this.board.map(r=>[...r]);let cleared=0;let shouldClear=this.rules.clearLines!==false;
    const beforeClear=this.hook('beforeClear',lockedPiece,afterLock);if(beforeClear===false)shouldClear=false;
    const spin=this.isTSpin(lockedPiece);let clearRows=[];
    if(shouldClear){const remaining=this.board.filter(row=>{const full=row.every(Boolean);if(full){cleared++;clearRows.push(row);}return!full;});if(cleared){while(remaining.length<this.H)remaining.unshift(Array(this.W).fill(0));this.board=remaining;this.lines+=cleared;this.stats.linesCleared+=cleared;}}
    if(cleared===0)this.combo=-1;else{this.combo++;if(this.combo>0)this.stats.combos++;}
    if(cleared===4)this.stats.tetrises++;
    if(spin)this.stats.tspins++;
    const difficult=(cleared===4)||!!spin;
    if(cleared>0&&!difficult)this.b2b=false;
    if(difficult&&cleared>0){if(this.b2b)this.stats.score+=Math.round((this.rules.scoring?.b2bMultiplier??1.5)*this.spinOrLineScore(cleared,spin));else this.stats.score+=this.spinOrLineScore(cleared,spin);this.b2b=true;}
    else if(cleared>0){this.stats.score+=this.spinOrLineScore(cleared,spin);this.b2b=false;}
    if(this.combo>0)this.stats.score+=50*this.combo;
    const afterClear=this.board.map(r=>[...r]);
    if(countFilled(this.board)===0&&cleared>0){this.stats.perfectClears++;this.stats.score+=3500;}
    this.placed++;this.stats.piecesPlaced++;
    this.holdUsed=false;
    this.stats.pieceInputs=this.pieceInputCount;
    if(this.finesseEnabled&&!this.finessePlacementResolved){
      const target=this.finesseTarget;
      const targetOk=!target||(lockedPiece.x===target.x&&(lockedPiece.type==='O'?0:lockedPiece.o)===target.o&&(!Number.isInteger(target.y)||lockedPiece.y===target.y));
      const sequenceComplete=this.finesseProgress>=this.finesseActions.length;
      this.finessePlacementResolved=true;
      if(!this.finesseFaulted&&sequenceComplete&&targetOk)this.stats.finessePerfect++;
      else if(!this.finesseFaulted){
        // Resolve a lock-time failure through the same observer-owned fault
        // path as an input mismatch, so stats/state remain exactly once.
        this.finessePlacementResolved=false;
        this.finesseFault();
        this.finessePlacementResolved=true;
      }
    }
    this.rhythm?.place(lockedPiece,performance.now());this.hook('place',{lockedPiece,cleared,spin,beforeLock:before,afterLock,afterClear});
    this.options.onPlace(this.placed);if(this.rules.clearBoardAfterPlace)this.emptyBoard();
    this.spawn();this.emitState();
  }
  spinOrLineScore(cleared,spin){
    const s=this.rules.scoring||SCORE;
    if(spin==='full')return ({0:s.tspin,1:s.tspinSingle,2:s.tspinDouble,3:s.tspinTriple}[cleared]??s.tspin);
    if(spin==='mini')return ({0:s.mini,1:s.miniSingle,2:s.miniDouble,3:s.miniTriple}[cleared]??s.mini);
    return ({1:s.single,2:s.double,3:s.triple,4:s.tetris}[cleared]??0);
  }
  markRender(){this.renderDirty=true;}
  flushRender(){if(!this.renderDirty)return;this.renderDirty=false;renderBoard(this.board,this.piece,this.anim,this.cells,this.W,this.H,this.cellsFor,this.collides.bind(this),this.depth,this.shadowOpacity,this.shadowBrightness,this.rules.showGhost,this.renderCache);drawActivePiece(this.piece,this.pieceSvg,this.anim,this.W,this.H,this.depth,this.cellsFor,NS,this.renderCache,this.colorOnlyFocalPiece);this.hook('render');this.emitState();}
  render(){this.markRender();this.flushRender();}
  emitState(){
    const finesseSteps=this.finesseEnabled?this.finesseActions.map((step,i)=>({
      action:typeof step==='string'?step:step.action,
      mode:typeof step==='string'?'tap':(step.mode||'tap'),
      label:this.finesseLabel(step),
      state:i<this.finesseProgress?'done':i===this.finesseProgress&&!this.finesseFaulted?'next':'pending'
    })):[];
    this.options.onState({
      finesse:finesseSteps,
      finesseState:this.finesseEnabled?{
        target:this.finesseTarget?{...this.finesseTarget}:null,
        progress:this.finesseProgress,
        total:this.finesseActions.length,
        faulted:this.finesseFaulted,
        mistakes:this.finesseMistakes
      }:null,
      piece:this.piece?{...this.piece}:null,
      queue:[...this.queue],hold:this.holdType,holdUsed:this.holdUsed,lines:this.lines,
      stats:{...this.stats},combo:this.combo,b2b:this.b2b,gameOver:this.gameOver,
      training:this.session&&typeof this.session==='object'?{...this.session}:null
    });
  }
  tick(t){
    if(!this.lastTime)this.lastTime=t;const dt=Math.min(50,Math.max(0,t-this.lastTime));this.lastTime=t;tickTrainingState(this.training,t);if(this.gameOver||!this.piece){this.hook('tick',dt,t);return;}
    if(this.dasCutRemaining>0)this.dasCutRemaining=Math.max(0,this.dasCutRemaining-dt);
    // Soft drop owns the vertical clock while held. Horizontal input/DAS
    // must never reset or suppress that clock, so moving sideways while
    // holding soft drop cannot make the piece appear to float.
    const softHeld=this.downKeys.has(this.binds.soft);
    if(softHeld){
      const factor=this.rules.softFactors[this.softScale]??1;
      if(factor===Infinity){
        while(this.movePiece(0,1,{countSoftDrop:true})){}
        this.softAcc=0;
      }else{
        const interval=Math.max(8,this.rules.gravity/factor);
        this.softAcc+=dt;
        while(this.softAcc>=interval){
          this.softAcc-=interval;
          if(!this.movePiece(0,1,{countSoftDrop:true})){
            // We are on the floor. Keep the timer alive for lock-delay
            // handling instead of treating a blocked soft step as a pause.
            this.softAcc=0;
            break;
          }
        }
      }
      this.gravityAcc=0;
    }else if(this.rules.gravity===0){
      // 20G: settle vertically immediately. This is automatic gravity,
      // never a finesse input, and lock delay still owns floor timing.
      this.softAcc=0;
      this.gravityAcc=0;
      while(this.movePiece(0,1)){}
    }else if(this.rules.gravity!==Infinity){
      this.softAcc=0;
      this.gravityAcc+=dt;
      while(this.gravityAcc>=this.rules.gravity){
        this.gravityAcc-=this.rules.gravity;
        if(!this.movePiece(0,1))break;
      }
    }
    // Soft drop never suppresses horizontal handling. TETR.IO keeps
    // left/right DAS/ARR active while soft drop is held, including during
    // lock delay after the piece reaches the floor.
    this.moveSuppressedAt=0;
    // Horizontal movement remains fully active during lock delay; successful
    // moves reset the lock timer subject to the configured reset cap.
    if(this.moveState.dir&&this.dasCutRemaining<=0){
      const das=this.das();
      const arr=this.arr();
      if(this.moveState.nextRepeatAt===Infinity)this.moveState.nextRepeatAt=this.moveState.startedAt+das;
      if(t>=this.moveState.nextRepeatAt){
        if(arr===0){
          while(this.movePiece(this.moveState.dir,0)){}
          this.moveState.nextRepeatAt=Infinity;
        }else{
          let guard=0;
          while(t>=this.moveState.nextRepeatAt&&guard<64){
            this.moveState.elapsed=Math.max(0,t-this.moveState.startedAt);
            this.moveState.repeatElapsed=Math.max(0,t-this.moveState.nextRepeatAt);
            if(!this.movePiece(this.moveState.dir,0))break;
            this.moveState.nextRepeatAt+=arr;
            guard++;
          }
        }
      }else{
        this.moveState.elapsed=Math.max(0,t-this.moveState.startedAt);
      }
    }
    if(this.finesseDASPending)this.observeFinesseDAS(this.finesseDASPending.action);
    if(!this.collides(this.piece.x,this.piece.y+1,this.piece.o,this.piece.type))this.lockAcc=0;else this.lockAcc+=dt;
    if(this.lockAcc>=this.rules.lockDelay)this.lockPiece(true);this.hook('tick',dt,t);this.flushRender();
  }
  dasWallX(dir){
    if(!this.piece)return null;
    const p={...this.piece};
    while(move(p,dir,0,this.board,this.W,this.H,this.cellsFor)){}
    return p.x;
  }
  das(){return this.rules.das;}arr(){return this.rules.arr;}
  handleKeydown(e){
    if(this.gameOver)return;const action=Object.keys(this.binds).find(k=>this.binds[k]===e.code);if(!action)return;
    if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space'].includes(e.code))e.preventDefault();if(this.downKeys.has(e.code))return;
    this.downKeys.add(e.code);const inputNow=performance.now();recordTrainingAction(this.training,action,inputNow,{code:e.code});this.rhythm?.input(action,inputNow,e.code);
    if(this.hook('input',{event:e,action})===true)return;
    if(action==='left'||action==='right'){
      this.pieceInputCount++;
      const nextDir=action==='left'?-1:1;
      // A direction used as a DAS step must be allowed to remain held.
      // Only a tap step is completed on keydown; the DAS step completes
      // when the held piece actually reaches the wall.
      this.moveState.dir=nextDir;this.moveState.elapsed=0;this.moveState.repeatElapsed=0;this.moveState.startedAt=performance.now();this.moveState.nextRepeatAt=this.moveState.startedAt+this.das();
      const moved=this.movePiece(nextDir,0);
      if(this.finesseEnabled){
        const expected=this.finesseActions[this.finesseProgress];
        const expectedAction=expected&&(typeof expected==='string'?expected:expected.action);
        const expectedMode=expected&&typeof expected==='object'?(expected.mode||'tap'):'tap';
        if(!moved){
          this.finesseFault();
        }else if(expectedAction===action&&expectedMode==='das'){
          this.finesseDASPending={action};
          this.observeFinesseDAS(action);
        }else{
          this.recordFinesseObservation(action);
        }
      }
    }else if(action==='soft'){
      // Soft drop is gameplay input, not a horizontal finesse step. Never
      // let Show Finesse alter its vertical clock or block the input.
      this.applySoftDrop();
    }
    else if(action==='hard'){
      // Hard drop is a gameplay action, not a finesse input. The lock that it
      // causes resolves the already-observed movement/rotation sequence.
      this.hardDrop();
    }
    else if(action==='cw'){
      this.pieceInputCount++;
      if(!this.rotate(1)&&this.finesseEnabled)this.finesseFault();
    }
    else if(action==='ccw'){
      this.pieceInputCount++;
      if(!this.rotate(-1)&&this.finesseEnabled)this.finesseFault();
    }
    else if(action==='half'){
      this.pieceInputCount++;
      if(!this.rotate(2)&&this.finesseEnabled)this.finesseFault();
    }
    else if(action==='hold'){this.hold();}
  }
  handleKeyup(e){this.downKeys.delete(e.code);const action=Object.keys(this.binds).find(k=>this.binds[k]===e.code);if((action==='left'||action==='right')&&this.finesseDASPending?.action===action){this.observeFinesseDAS(action);if(this.finesseDASPending&&!this.finesseFaulted)this.finesseFault();}if(action!=='left'&&action!=='right')return;const released=action==='left'?-1:1;const otherCode=action==='left'?this.binds.right:this.binds.left;if(this.downKeys.has(otherCode)){if(this.moveState.dir===released){const now=performance.now();this.moveState.dir=-released;this.moveState.elapsed=0;this.moveState.repeatElapsed=0;this.moveState.startedAt=now;this.moveState.nextRepeatAt=now+this.das();}return;}if(this.moveState.dir===released){this.moveState.dir=0;this.moveState.elapsed=0;this.moveState.repeatElapsed=0;this.moveState.startedAt=0;this.moveState.nextRepeatAt=Infinity;}}
  handleBlur(){
    this.downKeys.clear();this.moveState.dir=0;this.moveState.elapsed=0;this.moveState.repeatElapsed=0;this.moveState.startedAt=0;this.moveState.nextRepeatAt=Infinity;
  }
  say(s){if(this.toastCallback)this.toastCallback(s);}setToastCallback(cb){this.toastCallback=cb;}
  reset(reason='manual'){
    this.turns=0;this.placed=0;this.lines=0;this.combo=-1;this.b2b=false;this.stats={piecesPlaced:0,linesCleared:0,rotations:0,halfTurns:0,pieceInputs:0,finessePerfect:0,finesseFaults:0,hardDropRows:0,softDropRows:0,lockResets:0,score:0,combos:0,tetrises:0,tspins:0,perfectClears:0};
    this.softAcc=0;this.gravityAcc=0;this.lockAcc=0;this.lockResets=0;this.rhythm?.reset();this.dasCutRemaining=0;this.lastTime=0;this.gameOver=false;this.downKeys.clear();this.moveState={dir:0,elapsed:0,repeatElapsed:0,startedAt:0,nextRepeatAt:Infinity};this.moveSuppressedAt=0;this.training=createTrainingState();
    this.holdUsed=false;
    this.session=this.mode.createSession?this.mode.createSession():{};this.generator=this.mode.createGenerator?this.mode.createGenerator({}):this.generator;if(this.generator.reset)this.generator.reset();this.queue=[];this.holdType=null;this.holdUsed=false;this.emptyBoard();this.piece=null;this.anim=null;this.ensureQueue();this.spawn();this.hook('reset');this.options.onReset(reason);this.markRender();this.flushRender();if(!this.running)this.start();
  }
  start(){if(this.running)return;this.running=true;this.flushRender();this.lastTime=performance.now();const loop=t=>{this.tick(t);if(!this.gameOver){requestAnimationFrame(loop);}else{this.running=false;}};requestAnimationFrame(loop);}
}
