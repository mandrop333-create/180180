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
    rules: { ...baseRules, ...rules },
    hooks,
    training,
    capabilities: { ...baseCapabilities, ...capabilities },
    ...(createSession ? { createSession } : {}),
    ...(createGenerator ? { createGenerator } : {})
  };
}
