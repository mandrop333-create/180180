// Core game constants
export const W = 10;
export const H = 20;
export const CELL = 28;
export const GRAVITY_MS_PER_ROW = 800;
export const LOCK_DELAY_MS = 500;

// SVG namespace
export const NS = 'http://www.w3.org/2000/svg';

// Key name mappings
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

// Default key bindings
export const defaultBinds = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  soft: 'ArrowDown',
  hard: 'Space',
  cw: 'ArrowUp',
  ccw: 'KeyZ',
  half: 'KeyC'
};

// Binding labels
export const labels = {
  left: 'Move left',
  right: 'Move right',
  soft: 'Soft drop',
  hard: 'Hard drop',
  cw: 'Rotate CW',
  ccw: 'Rotate CCW',
  half: 'Rotate 180°'
};

// Soft drop speed multipliers
export const softFactors = [1, 2, 5, 10, Infinity];
