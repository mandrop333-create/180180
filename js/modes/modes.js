// Six mini-games share one Trainer engine.
// A mode owns only its identity, rules, and optional hooks.
// The engine owns board state, movement, collision, rotation, timing,
// rendering, input, and lifecycle.

const baseRules = {
  width: 10,
  height: 20,
  gravity: 800,
  lockDelay: 500,
  das: 127,
  arr: 0,
  clearBoardAfterPlace: true
};

const makeMode = (id, number, name, description, color) => ({
  id, number, name, description, color,
  rules: { ...baseRules },
  hooks: {}
});

export const modes = [
  makeMode('mode-01', 1, 'Foundation', 'Master the basic 180° rotation and build spatial awareness', '#a78bfa'),
  makeMode('mode-02', 2, 'Precision', 'Train exact piece placement with minimal movement', '#818cf8'),
  makeMode('mode-03', 3, 'Flow', 'Develop smooth transitions between rotations', '#67e8f9'),
  makeMode('mode-04', 4, 'Speed', 'Push your rotation timing under pressure', '#f472b6'),
  makeMode('mode-05', 5, 'Pattern', 'Recognize and execute complex rotation sequences', '#fb923c'),
  makeMode('mode-06', 6, 'Mastery', 'Combine all skills into flawless execution', '#4ade80')
];

export function getModeById(id) {
  return modes.find(mode => mode.id === id);
}
