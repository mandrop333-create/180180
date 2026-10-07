import { SevenBagGenerator, JolBagGenerator } from './generator.js';
const modeHooks={};
const meta={id:'mode-06',number:6,name:"Mastery",description:"Open-ended Tetris mastery trainer."};
export default {
  ...meta,
  rules:{},
  hooks:modeHooks,
  createSession:()=>({}),
  createGenerator:({seed}={})=>new localGenerator.SevenBagGenerator({seed})
};