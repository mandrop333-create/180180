import { createMode } from './mode-base.js';
import { SevenBagGenerator, AfterBagGenerator } from '../trainer/generator.js';

const BONUS_MAX=100;
const BONUS_PER_180=10;
const SUBSTITUTION_WINDOW_MS=400;

function createSession(){
  return {
    bonus:0,
    substitutionCount:0,
    successful180s:0,
    rotationHistory:null,
    lastTrainingEventAt:0
  };
}

function setBonus(session,value){
  session.bonus=Math.max(0,Math.min(BONUS_MAX,value));
}

function clearRotationHistory(session){
  session.rotationHistory=null;
}

const hooks={
  spawn(trainer,piece){
    trainer.session.currentPieceKey=piece.type + ':' + piece.x + ':' + piece.y;
  },

  input(trainer,_event,action){
    if(action!=='cw' && action!=='ccw') clearRotationHistory(trainer.session);
  },

  rotate(trainer,before,after,delta){
    const session=trainer.session;
    const now=performance.now();

    if(delta===2 || delta===-2){
      session.successful180s++;
      setBonus(session,session.bonus+BONUS_PER_180);
      clearRotationHistory(session);
      session.lastTrainingEventAt=now;
      return;
    }

    const direction=delta===1 ? 'cw' : 'ccw';
    const previous=session.rotationHistory;

    if(
      previous &&
      previous.direction===direction &&
      previous.pieceKey===session.currentPieceKey &&
      now-previous.time<=SUBSTITUTION_WINDOW_MS
    ){
      session.substitutionCount++;
      setBonus(session,0);
      clearRotationHistory(session);
      session.lastTrainingEventAt=now;
      trainer.hook('bonusBreak',session.substitutionCount);
      return;
    }

    session.rotationHistory={
      direction,
      pieceKey:session.currentPieceKey,
      time:now,
      from:before.o,
      to:after.o
    };
    session.lastTrainingEventAt=now;
  },

  place(trainer){
    clearRotationHistory(trainer.session);
    trainer.session.currentPieceKey=null;
  },

  reset(trainer){
    clearRotationHistory(trainer.session);
  }
};

export default createMode({
  id:'mode-01',
  number:1,
  name:'180 Flip',
  description:'Train the 180° rotation as one deliberate movement',
  color:'#a78bfa',
  createSession,
  createGenerator:()=>new AfterBagGenerator(new SevenBagGenerator(),['T','T']),
  training:{
    bonusMax:BONUS_MAX,
    bonusPer180:BONUS_PER_180,
    substitutionWindowMs:SUBSTITUTION_WINDOW_MS
  },
  hooks
});
