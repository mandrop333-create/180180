// Small, isolated guide-book controller for the trainer page.
// It intentionally has no dependencies on the trainer engine.

(() => {
  const root = document.querySelector('[data-trainer-guide-book]');
  if (!root) return;

  const cover = root.querySelector('[data-guide-cover]');
  const spread = root.querySelector('[data-guide-spread]');
  const close = root.querySelector('[data-guide-close]');
  if (!cover || !spread || !close) return;

  function openBook() {
    root.classList.add('is-open');
    root.setAttribute('aria-expanded', 'true');
    cover.setAttribute('aria-hidden', 'true');
    spread.hidden = false;
  }

  function closeBook() {
    root.classList.remove('is-open');
    root.setAttribute('aria-expanded', 'false');
    cover.setAttribute('aria-hidden', 'false');
    spread.hidden = true;
  }

  cover.addEventListener('click', openBook);
  close.addEventListener('click', closeBook);
  spread.addEventListener('click', event => event.stopPropagation());
})();
