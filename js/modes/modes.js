// Central registry for the six mini-games.
// Each mini-game is a mode definition consumed by the same Trainer engine.

import mode01 from './mode-01.js';
import mode02 from './mode-02.js';
import mode03 from './mode-03.js';
import mode04 from './mode-04.js';
import mode05 from './mode-05.js';
import mode06 from './mode-06.js';

export const modes = [mode01, mode02, mode03, mode04, mode05, mode06];

export function getModeById(id) {
  return modes.find(mode => mode.id === id);
}
