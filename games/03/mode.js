import { SevenBagGenerator, JolBagGenerator } from './generator.js';
const modeHooks={};
const meta={id:'mode-03',number:3,name:"Flow",description:"Normal Tetris focused on clean movement flow."};
export default {
  ...meta,
  rules:{},
  hooks:modeHooks,
  createSession:()=>({}),
  createGenerator:({seed}={})=>new localGenerator.SevenBagGenerator({seed})
};