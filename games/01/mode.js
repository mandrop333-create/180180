import { SevenBagGenerator, JolBagGenerator } from './generator.js';

import { createBonusState, onSpawn, onInput, onRotate, onPlace, onReset } from './mode-01-bonus.js';
const modeHooks={
  spawn(t,p){onSpawn(t.session,p)},
  input(t,_e,a){onInput(t.session,a)},
  rotate(t,_b,_a,d){onRotate(t.session,{delta:d,now:performance.now()})},
  place(t,p,c,b){onPlace(t.session,t,p,c,b)},
  reset(t){onReset(t.session)}
};
const meta={id:'mode-01',number:1,name:"180 Flip",description:"Train the 180° rotation as one deliberate movement"};
export default {
  ...meta,
  rules:{},
  hooks:modeHooks,
  createSession:createBonusState,
  createGenerator:({seed}={})=>new localGenerator.SevenBagGenerator({seed})
};