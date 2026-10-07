// Isolated in-game guide-book controller. It owns only opening, closing, and page navigation.

(() => {
  const root = document.querySelector('[data-trainer-guide-book]');
  if (!root) return;

  const cover = root.querySelector('[data-guide-cover]');
  const spread = root.querySelector('[data-guide-spread]');
  const close = root.querySelector('[data-guide-close]');
  const pagesRoot = root.querySelector('[data-guide-pages]');
  const prev = root.querySelector('[data-guide-prev]');
  const next = root.querySelector('[data-guide-next]');
  const pageCount = root.querySelector('[data-guide-page-count]');
  if (!cover || !spread || !close) return;

  let pageIndex = 0;

  function pages() {
    return pagesRoot ? [...pagesRoot.querySelectorAll('[data-guide-page]')] : [];
  }

  function renderPages() {
    const all = pages();
    const total = all.length;
    const start = Math.min(pageIndex, Math.max(0, total - 1));
    pageIndex = start % 2 === 0 ? start : Math.max(0, start - 1);
    all.forEach((page, index) => {
      const visible = index === pageIndex || index === pageIndex + 1;
      page.hidden = !visible;
      page.setAttribute('aria-hidden', String(!visible));
    });
    if (prev) prev.disabled = pageIndex <= 0;
    if (next) next.disabled = pageIndex + 2 >= total;
    if (pageCount) pageCount.textContent = total ? `${pageIndex + 1}–${Math.min(pageIndex + 2, total)} / ${total}` : '0';
  }

  function openBook() {
    pageIndex = 0;
    root.classList.add('is-open');
    root.setAttribute('aria-expanded', 'true');
    cover.setAttribute('aria-hidden', 'true');
    spread.hidden = false;
    renderPages();
  }

  function closeBook() {
    root.classList.remove('is-open');
    root.setAttribute('aria-expanded', 'false');
    cover.setAttribute('aria-hidden', 'false');
    spread.hidden = true;
  }

  cover.addEventListener('click', openBook);
  close.addEventListener('click', closeBook);
  prev?.addEventListener('click', () => { pageIndex = Math.max(0, pageIndex - 2); renderPages(); });
  next?.addEventListener('click', () => { pageIndex += 2; renderPages(); });
  spread.addEventListener('click', event => event.stopPropagation());
})();
