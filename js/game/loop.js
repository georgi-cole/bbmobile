import { PauseManager } from '../ui/pause-manager.js';

let lastTs = performance.now();
function tick(ts) {
  const dt = ts - lastTs;
  lastTs = ts;

  if (PauseManager.isPaused()) {
    requestAnimationFrame(tick);
    return;
  }

  // TODO: advance game progression here
  // progression.update(dt);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
