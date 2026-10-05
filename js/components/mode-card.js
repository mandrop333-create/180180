// Mode card component
// Renders a training mode card on the home page

import { modes } from '../modes/modes.js';

const MODE_BOOKS = {
  'mode-01': {
    title: '180 FLIP',
    pages: [
      '180 flip is designed to process the illusion of visual rotation on a different axis.',
      'You will naturally use a 2d axis to rotate around instead of 3d for a flip. Start with the scaler at max 3d and slowly decrease it, play the mode until the piece feels like it is flipping not rotating twice.'
    ]
  }
};

function createBook(mode) {
  const book = document.createElement('div');
  const guide = MODE_BOOKS[mode.id];
  book.className = `mode-book${guide ? ' mode-book-available' : ' mode-book-future'}`;
  book.setAttribute('aria-label', guide ? `${mode.name} guide` : `Mode ${mode.number} guide`);

  if (!guide) {
    book.innerHTML = `
      <div class="book-cover book-cover-future">
        <span class="book-cover-mark">?</span>
        <span class="book-cover-number">${mode.number}</span>
      </div>
    `;
    return book;
  }

  book.innerHTML = `
    <button class="book-cover" type="button" aria-label="Open ${guide.title} guide">
      <span class="book-cover-small">guide</span>
      <span class="book-cover-title">180</span>
      <span class="book-cover-subtitle">FLIP</span>
      <span class="book-cover-star">✦</span>
    </button>
    <div class="book-pages" hidden>
      <button class="book-close" type="button" aria-label="Close guide">×</button>
      <div class="book-page-content"></div>
      <div class="book-page-controls">
        <button class="book-prev" type="button" aria-label="Previous page">‹</button>
        <span class="book-page-number">1 / ${guide.pages.length}</span>
        <button class="book-next" type="button" aria-label="Next page">›</button>
      </div>
    </div>
  `;

  const cover = book.querySelector('.book-cover');
  const pages = book.querySelector('.book-pages');
  const close = book.querySelector('.book-close');
  const content = book.querySelector('.book-page-content');
  const pageNumber = book.querySelector('.book-page-number');
  const prev = book.querySelector('.book-prev');
  const next = book.querySelector('.book-next');
  let page = 0;

  const renderPage = () => {
    content.textContent = guide.pages[page];
    pageNumber.textContent = `${page + 1} / ${guide.pages.length}`;
    prev.disabled = page === 0;
    next.disabled = page === guide.pages.length - 1;
  };

  const openBook = () => {
    pages.hidden = false;
    cover.hidden = true;
    page = 0;
    renderPage();
  };

  const closeBook = () => {
    pages.hidden = true;
    cover.hidden = false;
  };

  cover.addEventListener('click', event => {
    event.stopPropagation();
    openBook();
  });

  close.addEventListener('click', event => {
    event.stopPropagation();
    closeBook();
  });

  prev.addEventListener('click', event => {
    event.stopPropagation();
    if (page > 0) {
      page -= 1;
      renderPage();
    }
  });

  next.addEventListener('click', event => {
    event.stopPropagation();
    if (page < guide.pages.length - 1) {
      page += 1;
      renderPage();
    }
  });

  return book;
}

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
        <div class="mode-preview" aria-hidden="true"></div>
      `;
    } else {
      card.setAttribute('aria-label', `Mode ${mode.number} coming soon`);
      card.innerHTML = `
        <span class="mode-number">${mode.number}</span>
        <div class="mode-question" aria-hidden="true">?</div>
      `;
    }

    card.appendChild(createBook(mode));
    
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
