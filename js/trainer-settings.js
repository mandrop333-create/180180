// Gameplay settings are mounted by the selected isolated mini-game.
// Kept as a page script for backward compatibility with the existing trainer shell.
if (window.trainer && !window.trainerSettings) {
  window.dispatchEvent(new Event('isolated-game-ready'));
}
