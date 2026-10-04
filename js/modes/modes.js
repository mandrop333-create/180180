// Mode registry and configuration
// This file will manage the six training modes and their configurations

export const modes = [
  {
    id: 'mode-01',
    number: 1,
    name: 'Foundation',
    description: 'Master the basic 180° rotation and build spatial awareness',
    color: '#a78bfa',
    // Future: rules, constraints, scoring, book content, etc.
  },
  {
    id: 'mode-02',
    number: 2,
    name: 'Precision',
    description: 'Train exact piece placement with minimal movement',
    color: '#818cf8',
  },
  {
    id: 'mode-03',
    number: 3,
    name: 'Flow',
    description: 'Develop smooth transitions between rotations',
    color: '#67e8f9',
  },
  {
    id: 'mode-04',
    number: 4,
    name: 'Speed',
    description: 'Push your rotation timing under pressure',
    color: '#f472b6',
  },
  {
    id: 'mode-05',
    number: 5,
    name: 'Pattern',
    description: 'Recognize and execute complex rotation sequences',
    color: '#fb923c',
  },
  {
    id: 'mode-06',
    number: 6,
    name: 'Mastery',
    description: 'Combine all skills into flawless execution',
    color: '#4ade80',
  },
];

export function getModeById(id) {
  return modes.find(mode => mode.id === id);
}
