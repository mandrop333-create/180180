// Core piece-generation abstractions.

import { PIECE_TYPES } from './pieces.js';

function shuffle(values) {
  const result=[...values];
  for (let i=result.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export class SevenBagGenerator {
  constructor(){ this.reset(); }

  reset(){
    this.queue=[];
    this.bagCount=0;
  }

  next(){
    if(!this.queue.length){
      this.queue.push(...shuffle(PIECE_TYPES));
      this.bagCount++;
    }
    return this.queue.shift();
  }

  get remainingInBag(){
    return this.queue.length;
  }
}

export class AfterBagGenerator {
  constructor(source, injectedTypes=['T','T']){
    this.source=source;
    this.injectedTypes=[...injectedTypes];
    this.afterBag=[];
  }

  reset(){
    this.source.reset();
    this.afterBag=[];
  }

  next(){
    if(this.afterBag.length) return this.afterBag.shift();

    const type=this.source.next();
    if(this.source.remainingInBag===0) this.afterBag=[...this.injectedTypes];
    return type;
  }
}
