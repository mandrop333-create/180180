// Tetris-specific orchestration layer. Universal movement, rotation, timing and lock rules live in engine.js.
import { Trainer as BaseTrainer } from './engine.js';
import { SevenBagGenerator } from './generator.js';
import { spawnFor } from './pieces.js';

const QUEUE_PREVIEW_SIZE=5;
export class Trainer extends BaseTrainer {
  constructor(boardEl,options={}){
    const inherited={...options};
    if(!inherited.generator) inherited.generator=inherited.mode?.createGenerator
      ? inherited.mode.createGenerator({seed:options.seed})
      : new SevenBagGenerator({seed:options.seed});
    super(boardEl,inherited);
    this.phase='active';
    this.pieceQueue=[];
    this.toastCallback=null;
    this.ensureQueue();
  }
  setToastCallback(callback){this.toastCallback=typeof callback==='function'?callback:null;return this;}
  say(message){if(this.toastCallback)this.toastCallback(String(message));}
  ensureQueue(){while(this.pieceQueue.length<QUEUE_PREVIEW_SIZE)this.pieceQueue.push(this.generator.next());}
  nextPieceType(){this.ensureQueue();const type=this.pieceQueue.shift();this.ensureQueue();return type;}
  getNextQueue(){this.ensureQueue();return [...this.pieceQueue];}
  spawn(){
    if(this.anim?.layer)this.anim.layer.remove();
    const type=this.nextPieceType();
    this.piece=spawnFor(type);this.gravityAcc=0;this.softAcc=0;this.lockAcc=0;this.lockResets=0;this.anim=null;this.phase='active';
    if(this.collides(this.piece.x,this.piece.y,this.piece.o,this.piece.type)){this.gameOver=true;this.phase='gameover';this.hook('gameOver',{...this.piece});this.render();return;}
    this.hook('spawn',{...this.piece});this.render();
  }
  lockPiece(){if(this.gameOver||!this.piece||this.phase!=='active')return;this.phase='locking';super.lockPiece();}
  reset(...args){this.pieceQueue=[];this.phase='active';const result=super.reset(...args);this.ensureQueue();return result;}
}
export { QUEUE_PREVIEW_SIZE };
