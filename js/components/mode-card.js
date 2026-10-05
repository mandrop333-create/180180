// Mode card component
// Renders a training mode card on the home page

import { modes } from '../modes/modes.js';

/**
 * Render all mode cards into the specified container
 * @param {HTMLElement} container - Container element to render cards into
 * @param {Function} onModeSelect - Callback when an active mode is selected
 */
export function renderModeCards(container, onModeSelect) {
  if (!container) return;
  
  container.innerHTML = '';
  
  modes.forEach(mode => {
    const card = document.createElement('div');
    const isAvailable = mode.number === 1;
    
    card.className = `mode-card${isAvailable ? '' : ' mode-card-locked'}`;
    card.dataset.mode = mode.number;
    card.dataset.modeId = mode.id;
    
    if (isAvailable) {
      card.innerHTML = `
        <span class="mode-number">${mode.number}</span>
        <h3 class="mode-name">${mode.name}</h3>
        <p class="mode-description">${mode.description}</p>
      `;
    } else {
      card.setAttribute('aria-label', `Mode ${mode.number} coming soon`);
      card.innerHTML = `
        <span class="mode-number">${mode.number}</span>
        <div class="mode-question" aria-hidden="true">?</div>
      `;
    }
    
    card.addEventListener('click', () => {
      if (!isAvailable) {
        card.classList.remove('mode-card-shake');
        void card.offsetWidth;
        card.classList.add('mode-card-shake');
        return;
      }
      
      if (onModeSelect) {
        onModeSelect(mode);
      }
    });
    
    container.appendChild(card);
  });
}

/**
 * Get a mode card element by mode ID
 * @param {string} modeId - Mode ID
 * @returns {HTMLElement|null} Mode card element or null
 */
export function getModeCard(modeId) {
  return document.querySelector(`.mode-card[data-mode-id="${modeId}"]`);
}
