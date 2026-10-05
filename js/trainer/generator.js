// Core piece-generation abstractions.
// The default generator remains a true 7-bag, with an optional deterministic
// seed for reproducible trainer sessions and engine testing.

import { PIECE_TYPES } from './pieces.js';

function createRng(seed) {
  if (seed === undefined || seed === null || seed === '') return Math.random;

  let state = Number(seed) >>> 0;
  if (state === 0) state = 0x6d2b79f5;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, rng) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class SevenBagGenerator {
  constructor(options = {}) {
    this.seed = options.seed ?? null;
    this.rng = createRng(this.seed);
    this.reset();
  }

  reset() {
    this.queue = [];
    this.bagCount = 0;
    this.rng = createRng(this.seed);
  }

  next() {
    if (!this.queue.length) {
      this.queue.push(...shuffle(PIECE_TYPES, this.rng));
      this.bagCount++;
    }
    return this.queue.shift();
  }

  peek(count = 1) {
    while (this.queue.length < count) {
      this.queue.push(...shuffle(PIECE_TYPES, this.rng));
      this.bagCount++;
    }
    return this.queue.slice(0, count);
  }

  get remainingInBag() {
    return this.queue.length;
  }
}

export class AfterBagGenerator {
  constructor(source, injectedTypes = ['T', 'T']) {
    this.source = source;
    this.injectedTypes = [...injectedTypes];
    this.afterBag = [];
  }

  reset() {
    this.source.reset();
    this.afterBag = [];
  }

  next() {
    if (this.afterBag.length) return this.afterBag.shift();

    const type = this.source.next();
    if (this.source.remainingInBag === 0) this.afterBag = [...this.injectedTypes];
    return type;
  }

  peek(count = 1) {
    // Generic wrappers cannot safely predict injected sequences without
    // consuming state, so only expose this when the wrapped source supports it.
    if (!this.afterBag.length && typeof this.source.peek !== 'function') return [];
    return this.afterBag.slice(0, count);
  }
}
