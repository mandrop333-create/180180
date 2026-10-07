import { SevenBagGenerator, JolBagGenerator } from './generator.js';
const modeHooks={};
const meta={id:'mode-04',number:4,name:"Speed",description:"Normal Tetris focused on speed and handling."};
export default {
  ...meta,
  rules:{},
  hooks:modeHooks,
  createSession:()=>({}),
  createGenerator:({seed}={})=>new localGenerator.SevenBagGenerator({seed})
};