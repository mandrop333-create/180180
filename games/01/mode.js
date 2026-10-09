import { SevenBagGenerator } from './generator.js';
import { FINESSE_PROFILES } from './finesse-rules.js';

class JOLGenerator {
  constructor(){this.reset();}
  reset(){this.index=0;}
  next(){const piece=['J','O','L'][this.index++%3];return piece;}
}

import { createBonusState, onSpawn, onInput, onRotate, onPlace, onReset } from './mode-01-bonus.js';
const modeHooks={
  spawn(t,p){onSpawn(t.session,p)},
  input(t,payload){onInput(t.session,payload)},
  rotate(t,payload){onRotate(t.session,payload)},
  place(t,payload){onPlace(t.session,payload)},
  reset(t){onReset(t.session)}
};
const meta={id:'mode-01',number:1,name:"180 Flip",description:"Train the 180° rotation as one deliberate movement"};
export default {
  ...meta,
  rules:{finesseProfile:FINESSE_PROFILES.TETRIO_SRS_PLUS_180},
  hooks:modeHooks,
  createSession:createBonusState,
  createGenerator:({seed}={})=>{try{if(localStorage.getItem('180180.jolOnly')==='1')return new JOLGenerator();}catch{}return new SevenBagGenerator({seed})}
};