// Application entry point.
// The page selects a mini-game definition; Trainer remains the shared runtime.

import { Trainer } from './trainer/engine.js';
import { getModeById } from './modes/modes.js';

(() => {
  const boardEl = document.getElementById('board');
  if (!boardEl) {
    console.error('Board element not found');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const modeId = urlParams.get('mode') || 'mode-01';
  const mode = getModeById(modeId);

  if (!mode) {
    console.error('Unknown training mode:', modeId);
    window.location.href = 'index.html';
    return;
  }

  const titleEl = document.querySelector('.brand-title');
  const taglineEl = document.querySelector('.tagline');
  if (titleEl) titleEl.textContent = `180180 — ${mode.name}`;
  if (taglineEl) taglineEl.textContent = mode.description;

  const trainer = new Trainer(boardEl, {
    mode,
    onTurn: (turns) => {
      const el = document.getElementById('turns');
      if (el) el.textContent = turns;
    },
    onPlace: (placed) => {
      const el = document.getElementById('placed');
      if (el) el.textContent = placed;
    },
    onReset: () => {
      const turnsEl = document.getElementById('turns');
      const placedEl = document.getElementById('placed');
      if (turnsEl) turnsEl.textContent = '0';
      if (placedEl) placedEl.textContent = '0';
    }
  });

  let toastTimer;
  function say(s) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = s;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1500);
  }
  trainer.setToastCallback(say);

  const depthInput = document.getElementById('depth');
  const depthOutput = document.getElementById('depthOut');
  if (depthInput && depthOutput) {
    depthInput.addEventListener('input', () => {
      depthOutput.textContent = depthInput.value + '%';
      trainer.setDepth(Number(depthInput.value) / 100);
    });
  }

  const softScaleInput = document.getElementById('softScale');
  const softScaleOutput = document.getElementById('softScaleOut');
  if (softScaleInput && softScaleOutput) {
    softScaleInput.addEventListener('input', () => {
      trainer.setSoftScale(Number(softScaleInput.value));
      const f = trainer.getSoftFactor();
      softScaleOutput.textContent = f === Infinity ? '∞' : f + '×';
    });
  }

  const resetBtn = document.getElementById('reset');
  if (resetBtn) resetBtn.onclick = () => trainer.reset();

  const dasInput = document.getElementById('das');
  const dasOutput = document.getElementById('dasOut');
  if (dasInput && dasOutput) {
    dasInput.addEventListener('input', () => {
      dasOutput.textContent = dasInput.value + ' ms';
    });
  }

  const arrInput = document.getElementById('arr');
  const arrOutput = document.getElementById('arrOut');
  if (arrInput && arrOutput) {
    arrInput.addEventListener('input', () => {
      arrOutput.textContent = arrInput.value + ' ms';
    });
  }

  let lastBonusBreakToken = 0;

  function updateBonus() {
    const meter = document.getElementById('bonusMeter');
    const fill = document.getElementById('bonusFill');
    if (!meter || !fill) return;

    const isMode01 = mode.id === 'mode-01';
    meter.hidden = !isMode01;
    if (!isMode01) return;

    const bonus = Number(trainer.session?.bonus ?? 0);
    fill.style.height = Math.max(0, Math.min(100, bonus)) + '%';

    const token = Number(trainer.session?.bonusBreakToken ?? 0);
    if (token !== lastBonusBreakToken) {
      lastBonusBreakToken = token;
      meter.classList.remove('breaking');
      void meter.offsetWidth;
      meter.classList.add('breaking');
      setTimeout(() => meter.classList.remove('breaking'), 300);
    }
  }

  function updateOrientation() {
    const orientEl = document.getElementById('orient');
    const orientNameEl = document.getElementById('orientName');
    if (orientEl && orientNameEl) {
      const arrows = ['↑', '→', '↓', '←'];
      const names = ['Spawn', 'Right', '180°', 'Left'];
      const o = trainer.piece ? trainer.piece.o : 0;
      orientEl.textContent = arrows[o];
      orientNameEl.textContent = names[o];
    }
  }

  const originalRender = trainer.render.bind(trainer);
  trainer.render = function() {
    originalRender();
    updateOrientation();
    updateBonus();
  };

  trainer.updateBindUI();
  window.addEventListener('keydown', (e) => trainer.handleKeydown(e), { passive: false });
  window.addEventListener('keyup', (e) => trainer.handleKeyup(e));
  window.addEventListener('blur', () => trainer.handleBlur());

  function tick(t) {
    trainer.tick(t);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  window.trainer = trainer;
})();
