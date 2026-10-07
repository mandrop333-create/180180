import { createMode } from './mode-base.js';
import { JolChunkGenerator } from '../trainer/generator.js';

function createSession() {
  return {};
}

const training = {
  pageTitle: '180180 — JOL',
  tagline: 'J → O → L. Repeat.',
  jolHud: true,
  training: { kind: 'sequence', label: 'JOL' }
};

export default createMode({
  id: 'mode-02',
  number: 2,
  name: 'JOL',
  description: 'J → O → L, repeating in the special three-piece bag.',
  color: '#818cf8',
  rules: {
    clearLines: false,
    clearBoardAfterPlace: false,
    showGhost: true
  },
  training,
  createSession,
  createGenerator: () => new JolChunkGenerator(['J', 'O', 'L']),
  capabilities: {
    rhythm: false,
    spatial: false
  }
});
