// Six mini-game home entries.
// These are UI/navigation only. Each mini-game gets its own implementation later.

import { modes } from '../modes/modes.js';

export function renderModeCards(container, onModeSelect) {
  if (!container) return;

  container.replaceChildren();

  modes.forEach(mode => {
    const card = document.createElement('a');
    card.className = 'mode-card';
    card.href = `trainer.html?mode=${encodeURIComponent(mode.id)}`;
    card.dataset.mode = mode.number;
    card.dataset.modeId = mode.id;
    card.setAttribute('aria-label', `Open mini-game ${mode.number}: ${mode.name}`);

    card.innerHTML = `
      <span class="mode-number">${mode.number}</span>
      <div class="mode-icon" aria-hidden="true">${mode.number}</div>
      <h3 class="mode-name">${mode.name}</h3>
      <p class="mode-description">${mode.description}</p>
    `;

    card.addEventListener('click', (event) => {
      if (onModeSelect) {
        event.preventDefault();
        onModeSelect(mode);
      }
    });

    container.appendChild(card);
  });
}

export function getModeCard(modeId) {
  return document.querySelector(`.mode-card[data-mode-id="${modeId}"]`);
}
