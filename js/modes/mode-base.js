// Shared mode contract. Modes describe rules and training capabilities; Trainer owns the universal runtime.

import { W, H, GRAVITY_MS_PER_ROW, LOCK_DELAY_MS, softFactors } from '../trainer/state.js';

export const baseRules = Object.freeze({
  width: W,
  height: H,
  gravity: GRAVITY_MS_PER_ROW,
  lockDelay: LOCK_DELAY_MS,
  das: 127,
  arr: 0,
  softFactors,
  clearBoardAfterPlace: false,
  scoring: {
    single: 100,
    double: 300,
    triple: 500,
    tetris: 800,
    tspin: 400,
    tspinSingle: 800,
    tspinDouble: 1200,
    tspinTriple: 1600,
    mini: 100,
    miniSingle: 200,
    miniDouble: 400,
    miniTriple: 800,
    b2bMultiplier: 1.5,
    softDropPerRow: 1,
    hardDropPerRow: 2
  }
});

export const baseCapabilities = Object.freeze({
  input: true,
  timing: true,
  rhythm: false,
  spatial: false,
  progression: true,
  feedback: true
});

export function createMode({
  id,
  number,
  name,
  description,
  color,
  rules = {},
  hooks = {},
  createSession,
  createGenerator,
  training = {},
  capabilities = {}
}) {
  return {
    id,
    number,
    name,
    description,
    color,
    rules: Object.freeze({ ...baseRules, ...rules, softFactors: Object.freeze([...(rules.softFactors || baseRules.softFactors)]), scoring: Object.freeze({ ...baseRules.scoring, ...(rules.scoring || {}) }) }),
    hooks,
    training,
    capabilities: { ...baseCapabilities, ...capabilities },
    ...(createSession ? { createSession } : {}),
    ...(createGenerator ? { createGenerator } : {})
  };
}
