import { SevenBagGenerator, JolBagGenerator } from './generator.js';
const modeHooks={};
const meta={id:'mode-02',number:2,name:"JOL",description:"Normal Tetris using a JOL-only bag."};
export default {
  ...meta,
  rules:{},
  hooks:modeHooks,
  createSession:()=>({}),
  createGenerator:({seed}={})=>new localGenerator.JolBagGenerator({seed})
};