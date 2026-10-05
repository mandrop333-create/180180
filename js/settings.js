import { defaultBinds, labels, keyNames } from './trainer/state.js';

const STORAGE_KEY = '180180.settings.v1';

const defaults = {
  depth: 0.55,
  softScale: 0,
  das: 127,
  arr: 0,
  binds: { ...defaultBinds }
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      ...defaults,
      ...(saved || {}),
      binds: { ...defaultBinds, ...(saved?.binds || {}) }
    };
  } catch {
    return { ...defaults, binds: { ...defaultBinds } };
  }
}

function save(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getSettings() {
  return load();
}

export function saveSettings(patch) {
  const next = {
    ...load(),
    ...patch,
    binds: { ...load().binds, ...(patch.binds || {}) }
  };
  save(next);
  return next;
}

export function resetSettings() {
  const next = { ...defaults, binds: { ...defaultBinds } };
  save(next);
  return next;
}

export function keyLabel(code) {
  return keyNames[code] || code.replace(/^Key/, '').replace(/^Digit/, '');
}

export function mountSettings({ trainer = null } = {}) {
  const root = document.querySelector('[data-settings-root]');
  const button = document.querySelector('[data-settings-open]');
  if (!root || !button) return null;

  const settings = getSettings();
  if (trainer) {
    trainer.depth = settings.depth;
    trainer.softScale = settings.softScale;
    trainer.rules.das = settings.das;
    trainer.rules.arr = settings.arr;
    trainer.binds = { ...trainer.binds, ...settings.binds };
    trainer.updateBindUI();
  }

  const depth = root.querySelector('[data-setting-depth]');
  const depthOut = root.querySelector('[data-setting-depth-out]');
  const soft = root.querySelector('[data-setting-soft]');
  const softOut = root.querySelector('[data-setting-soft-out]');
  const das = root.querySelector('[data-setting-das]');
  const dasOut = root.querySelector('[data-setting-das-out]');
  const arr = root.querySelector('[data-setting-arr]');
  const arrOut = root.querySelector('[data-setting-arr-out]');
  const bindsRoot = root.querySelector('[data-setting-binds]');
  const reset = root.querySelector('[data-settings-reset]');
  const close = root.querySelector('[data-settings-close]');
  const backdrop = root.querySelector('[data-settings-backdrop]');

  let current = getSettings();
  let rebinding = null;

  function sync() {
    if (depth) depth.value = Math.round(current.depth * 100);
    if (depthOut) depthOut.textContent = `${Math.round(current.depth * 100)}%`;
    if (soft) soft.value = current.softScale;
    if (softOut) {
      const factors = [1, 2, 5, 10, Infinity];
      const factor = factors[current.softScale] ?? 1;
      softOut.textContent = factor === Infinity ? '∞' : `${factor}×`;
    }
    if (das) das.value = current.das;
    if (dasOut) dasOut.textContent = `${current.das} ms`;
    if (arr) arr.value = current.arr;
    if (arrOut) arrOut.textContent = `${current.arr} ms`;
    renderBinds();
  }

  function renderBinds() {
    if (!bindsRoot) return;
    bindsRoot.innerHTML = '';
    Object.keys(labels).forEach(action => {
      const row = document.createElement('div');
      row.className = 'settings-bind-row';
      const name = document.createElement('span');
      name.className = 'settings-bind-name';
      name.textContent = labels[action];
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'settings-key';
      key.textContent = rebinding === action ? 'PRESS KEY' : keyLabel(current.binds[action]);
      if (rebinding === action) key.classList.add('listening');
      key.onclick = () => {
        rebinding = action;
        renderBinds();
      };
      row.append(name, key);
      bindsRoot.append(row);
    });
  }

  function open() {
    current = getSettings();
    sync();
    root.hidden = false;
    document.body.classList.add('settings-open');
    button.setAttribute('aria-expanded', 'true');
  }

  function shut() {
    rebinding = null;
    root.hidden = true;
    document.body.classList.remove('settings-open');
    button.setAttribute('aria-expanded', 'false');
  }

  button.onclick = open;
  close?.addEventListener('click', shut);
  backdrop?.addEventListener('click', shut);

  depth?.addEventListener('input', () => {
    current.depth = Number(depth.value) / 100;
    saveSettings({ depth: current.depth });
    if (trainer) { trainer.depth = current.depth; trainer.render(); }
    sync();
  });

  soft?.addEventListener('input', () => {
    current.softScale = Number(soft.value);
    saveSettings({ softScale: current.softScale });
    if (trainer) trainer.softScale = current.softScale;
    sync();
  });

  das?.addEventListener('input', () => {
    current.das = Number(das.value);
    saveSettings({ das: current.das });
    if (trainer) trainer.rules.das = current.das;
    sync();
  });

  arr?.addEventListener('input', () => {
    current.arr = Number(arr.value);
    saveSettings({ arr: current.arr });
    if (trainer) trainer.rules.arr = current.arr;
    sync();
  });

  reset?.addEventListener('click', () => {
    current = resetSettings();
    if (trainer) {
      trainer.depth = current.depth;
      trainer.softScale = current.softScale;
      trainer.rules.das = current.das;
      trainer.rules.arr = current.arr;
      trainer.binds = { ...current.binds };
      trainer.updateBindUI();
      trainer.render();
    }
    rebinding = null;
    sync();
    if (trainer) trainer.say('Settings reset');
  });

  window.addEventListener('keydown', e => {
    if (root.hidden) return;
    if (e.code === 'Escape') {
      e.preventDefault();
      shut();
      return;
    }
    if (!rebinding) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape') return;
    const other = Object.keys(current.binds).find(action => action !== rebinding && current.binds[action] === e.code);
    if (other) {
      if (trainer) trainer.say('That key is already assigned');
      return;
    }
    current.binds[rebinding] = e.code;
    saveSettings({ binds: current.binds });
    if (trainer) {
      trainer.binds[rebinding] = e.code;
      trainer.updateBindUI();
    }
    rebinding = null;
    renderBinds();
  }, true);

  sync();
  return { open, close: shut };
}
