// Small, isolated guide-book controller for the trainer page.
// It intentionally has no dependencies on the trainer engine.

(() => {
  const root = document.querySelector('[data-trainer-guide-book]');
  if (!root) return;

  const cover = root.querySelector('[data-guide-cover]');
  const spread = root.querySelector('[data-guide-spread]');
  const close = root.querySelector('[data-guide-close]');
  const prev = root.querySelector('[data-guide-prev]');
  const next = root.querySelector('[data-guide-next]');
  const pageText = root.querySelector('[data-guide-page-text]');
  const pageNumber = root.querySelector('[data-guide-page-number]');

  if (!cover || !spread || !close || !prev || !next || !pageText || !pageNumber) return;

  const pages = [
    '180 flip is designed to process the illusion of visual rotation on a different axis.',
    'You will naturally use a 2d axis to rotate around instead of 3d for a flip. Start with the scaler at max 3d and slowly decrease it, play the mode until the piece feels like it is flipping not rotating twice.'
  ];

  let page = 0;

  function render() {
    pageText.textContent = pages[page];
    pageNumber.textContent = `${page + 1} / ${pages.length}`;
    prev.disabled = page === 0;
    next.disabled = page === pages.length - 1;
  }

  function openBook() {
    root.classList.add('is-open');
    root.setAttribute('aria-expanded', 'true');
    cover.setAttribute('aria-hidden', 'true');
    spread.hidden = false;
    page = 0;
    render();
  }

  function closeBook() {
    root.classList.remove('is-open');
    root.setAttribute('aria-expanded', 'false');
    cover.setAttribute('aria-hidden', 'false');
    spread.hidden = true;
  }

  cover.addEventListener('click', openBook);
  close.addEventListener('click', closeBook);

  prev.addEventListener('click', () => {
    if (page > 0) {
      page -= 1;
      render();
    }
  });

  next.addEventListener('click', () => {
    if (page < pages.length - 1) {
      page += 1;
      render();
    }
  });

  root.addEventListener('click', event => event.stopPropagation());
  render();
})();
