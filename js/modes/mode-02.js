import { createMode } from './mode-base.js';
import { JolChunkGenerator } from '../trainer/generator.js';

export default createMode({
  id: 'mode-02',
  number: 2,
  name: 'JOL CHUNKS',
  description: 'Practice the J → O → L chunk repeatedly as one ordered unit',
  color: '#818cf8',
  createGenerator: () => new JolChunkGenerator(['J', 'O', 'L'])
});
