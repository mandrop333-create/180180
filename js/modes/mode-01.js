import { createMode } from './mode-base.js';
import { SevenBagGenerator, AfterBagGenerator } from '../trainer/generator.js';
import {
  BONUS_MAX,
  BONUS_PER_180,
  SUBSTITUTION_WINDOW_MS,
  createBonusState,
  onSpawn as onBonusSpawn,
  onInput as onBonusInput,
  onRotate as onBonusRotate,
  onPlace as onBonusPlace,
  onReset as onBonusReset
} from './mode-01-bonus.js';

function createSession() {
  return createBonusState();
}

const hooks = {
  spawn(trainer, piece) {
    onBonusSpawn(trainer.session, piece);
  },

  input(trainer, _event, action) {
    onBonusInput(trainer.session, action);
  },

  rotate(trainer, _before, _after, delta) {
    onBonusRotate(trainer.session, {
      delta,
      now: performance.now()
    });
  },

  place(trainer, lockedPiece, cleared, boards) {
    onBonusPlace(trainer.session, trainer, lockedPiece, cleared, boards);
  },

  reset(trainer) {
    onBonusReset(trainer.session);
  }
};

export default createMode({
  id: 'mode-01',
  number: 1,
  name: '180 Flip',
  description: 'Train the 180° rotation as one deliberate movement',
  color: '#a78bfa',
  createSession,
  createGenerator: () => new AfterBagGenerator(
    new SevenBagGenerator(),
    ['T', 'T']
  ),
  training: {
    bonusMax: BONUS_MAX,
    bonusPer180: BONUS_PER_180,
    substitutionWindowMs: SUBSTITUTION_WINDOW_MS
  },
  hooks
});
