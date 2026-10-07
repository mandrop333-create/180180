import { createMode } from './mode-base.js';
import { JolBagGenerator } from '../trainer/generator.js';

const training = {
  pageTitle: '180180 — JOL CHUNKS',
  tagline: 'Practice normal Tetris with J, O, and L.',
  training: { kind: 'jol', label: 'JOL' }
};

export default createMode({
  id: 'mode-02',
  number: 2,
  name: 'JOL',
  description: 'Normal Tetris using a JOL-only bag.',
  color: '#818cf8',
  training,
  createGenerator: ({ seed } = {}) => new JolBagGenerator({ seed })
});
