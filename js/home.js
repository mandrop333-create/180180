// Home page logic
// The site now has one Tetris game. The former six-mode selector is intentionally gone.
(() => {
  const playCard = document.querySelector('.home-play-card');
  if (playCard) {
    playCard.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') playCard.classList.add('home-play-card-active');
    });
  }

  const decorations = document.querySelectorAll('.decoration');
  decorations.forEach((deco, index) => {
    deco.style.opacity = '0';
    deco.style.transition = 'opacity 0.6s ease-out';
    setTimeout(() => { deco.style.opacity = '0.3'; }, 200 + (index * 150));
  });
})();
