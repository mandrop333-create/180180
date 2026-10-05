// Home page logic
// Initializes the home page and handles mode card interactions

import { renderModeCards } from './components/mode-card.js?v=guide-books';

(() => {
  const modeCardsContainer = document.getElementById('modeCards');
  
  if (!modeCardsContainer) {
    console.error('Mode cards container not found');
    return;
  }
  
  // Render mode cards
  renderModeCards(modeCardsContainer, (mode) => {
    console.log('Mode selected:', mode.id);
    // For now, modes will link to trainer.html
    // In the future, this will open the mode's book or start the training
    window.location.href = `trainer.html?mode=${mode.id}`;
  });
  
  // Add subtle animation to decorations on load
  const decorations = document.querySelectorAll('.decoration');
  decorations.forEach((deco, index) => {
    deco.style.opacity = '0';
    deco.style.transition = 'opacity 0.6s ease-out';
    setTimeout(() => {
      deco.style.opacity = '0.3';
    }, 200 + (index * 150));
  });
  
  // Add subtle animation to mode cards on load
  const cards = document.querySelectorAll('.mode-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 300 + (index * 100));
  });
})();
