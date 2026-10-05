// Shared player settings. One owner for gameplay feel + keybinds across home and mini-games.
import { defaultBinds, labels } from './state.js';

const STORAGE_KEY = '180180-settings-v1';
const DEFAULTS = { depth: 0.55, softScale: 0, das: 127, arr: 0, binds: { ...defaultBinds } };
const clone = () => ({ ...DEFAULTS, binds: { ...DEFAULTS.binds } });

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return clone();
    return {
      depth: Number.isFinite(saved.depth) ? saved.depth : DEFAULTS.depth,
      softScale: Number.isFinite(saved.softScale) ? saved.softScale : DEFAULTS.softScale,
      das: Number.isFinite(saved.das) ? saved.das : DEFAULTS.das,
      arr: Number.isFinite(saved.arr) ? saved.arr : DEFAULTS.arr,
      binds: { ...DEFAULTS.binds, ...(saved.binds || {}) }
    };
  } catch { return clone(); }
}

export function saveSettings(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

export function resetSettings() { const settings = clone(); saveSettings(settings); return settings; }

export function applySettings(trainer, settings) {
  trainer.depth = settings.depth;
  trainer.softScale = settings.softScale;
  trainer.rules.das = settings.das;
  trainer.rules.arr = settings.arr;
  trainer.binds = { ...settings.binds };
  trainer.render();
}

export function snapshotSettings(trainer) {
  return { depth: trainer.depth, softScale: trainer.softScale, das: trainer.rules.das, arr: trainer.rules.arr, binds: { ...trainer.binds } };
}

export const SETTINGS_DEFAULTS = Object.freeze(clone());
export const ACTION_LABELS = Object.freeze({ ...labels });
