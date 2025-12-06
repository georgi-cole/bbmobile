// Game loop - handles animation frame ticking
// Checks for global pause state via window.game.pauseController

let lastTs = performance.now();
function tick(ts) {
  const dt = ts - lastTs;
  lastTs = ts;

  // Check if game is paused by modal system
  if (window.game?.pauseController?.isPaused()) {
    requestAnimationFrame(tick);
    return;
  }

  // TODO: advance game progression here
  // progression.update(dt);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
