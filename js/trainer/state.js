// Core game constants and shared input configuration.

export const W = 10;
export const H = 20;
export const CELL = 28;
export const CELL_GAP = 2;
export const CELL_PITCH = CELL + CELL_GAP;
export const GRAVITY_MS_PER_ROW = 800;
export const LOCK_DELAY_MS = 500;
export const NS = 'http://www.w3.org/2000/svg';

export const keyNames = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowDown: '↓',
  ArrowUp: '↑',
  Space: 'Space',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  Escape: 'Esc'
};

export const defaultBinds = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  soft: 'ArrowDown',
  hard: 'Space',
  cw: 'ArrowUp',
  ccw: 'KeyZ',
  half: 'KeyC',
  hold: 'ShiftLeft'
};

export const labels = {
  left: 'Move left',
  right: 'Move right',
  soft: 'Soft drop',
  hard: 'Hard drop',
  cw: 'Rotate CW',
  ccw: 'Rotate CCW',
  half: 'Rotate 180°',
  hold: 'Hold piece'
};

export const softFactors = [1, 2, 5, 10, Infinity];
