// Core piece-generation abstractions.

import { PIECE_TYPES } from './pieces.js';

function shuffle(values) {
  const result = [...values];
  for (let i=result.length-1; i>0; i--) {
    const j=Math.floor(Math.random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export class SevenBagGenerator {
  constructor(){ this.reset(); }
  reset(){ this.queue=[]; }
  next(){
    if(!this.queue.length) this.queue.push(...shuffle(PIECE_TYPES));
    return this.queue.shift();
  }
}
