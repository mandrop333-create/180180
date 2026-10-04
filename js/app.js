// Main application entry point
// Initializes the trainer and handles UI events

import { Trainer } from './trainer/engine.js';
import { getModeById } from './modes/modes.js';

(() => {
  const boardEl = document.getElementById('board');
  if (!boardEl) {
    console.error('Board element not found');
    return;
  }
  
  // Get mode from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const modeId = urlParams.get('mode');
  const mode = modeId ? getModeById(modeId) : null;
  
  // Update header if mode is selected
  if (mode) {
    const titleEl = document.querySelector('.brand-title');
    const taglineEl = document.querySelector('.tagline');
    if (titleEl) titleEl.textContent = `180180 — ${mode.name}`;
    if (taglineEl) taglineEl.textContent = mode.description;
    console.log('Training mode:', mode.name, mode.id);
  }
  
  // Create trainer instance
  const trainer = new Trainer(boardEl, {
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
  
  // Apply mode-specific rules (placeholder for future implementation)
  if (mode) {
    // Future: Apply mode-specific rules, constraints, scoring, etc.
    console.log('Mode rules would be applied here for:', mode.id);
  }
  
  // Toast notification
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
  
  // Settings UI
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
      const f = trainer.getSoftFactor();
      softScaleOutput.textContent = f === Infinity ? '∞' : f + '×';
      trainer.setSoftScale(Number(softScaleInput.value));
    });
  }
  
  const resetBtn = document.getElementById('reset');
  if (resetBtn) {
    resetBtn.onclick = () => trainer.reset();
  }
  
  // Hidden settings (for future expansion)
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
  
  // Orientation display
  function updateOrientation() {
    const orientEl = document.getElementById('orient');
    const orientNameEl = document.getElementById('orientName');
    if (orientEl && orientNameEl) {
      const arrows = ['↑', '→', '↓', '←'];
      const names = ['Spawn', 'Right', '180°', 'Left'];
      orientEl.textContent = arrows[trainer.piece ? trainer.piece.o : 0];
      orientNameEl.textContent = names[trainer.piece ? trainer.piece.o : 0];
    }
  }
  
  // Override render to update orientation display
  const originalRender = trainer.render.bind(trainer);
  trainer.render = function() {
    originalRender();
    updateOrientation();
  };
  
  // Initialize key binding UI
  trainer.updateBindUI();
  
  // Event listeners
  window.addEventListener('keydown', (e) => trainer.handleKeydown(e), { passive: false });
  window.addEventListener('keyup', (e) => trainer.handleKeyup(e));
  window.addEventListener('blur', () => trainer.handleBlur());
  
  // Game loop
  function tick(t) {
    trainer.tick(t);
    requestAnimationFrame(tick);
  }
  
  requestAnimationFrame(tick);
  
  // Expose trainer globally for debugging (optional)
  window.trainer = trainer;
})();
