import { SevenBagGenerator, JolBagGenerator } from './generator.js';
const modeHooks={};
const meta={id:'mode-05',number:5,name:"Pattern",description:"Normal Tetris focused on repeatable patterns."};
export default {
  ...meta,
  rules:{},
  hooks:modeHooks,
  createSession:()=>({}),
  createGenerator:({seed}={})=>new localGenerator.SevenBagGenerator({seed})
};