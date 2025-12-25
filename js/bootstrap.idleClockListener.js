// Register a small listener for clock fast-forward requests.
// This file can be required from bootstrap.js or imported during game init.
(function registerClockFastForwardListener() {
  if (!window.game) window.game = window.game || {};
  if (!window.game.bus) {
    // If the bus doesn't exist yet, retry after a short delay (defensive)
    setTimeout(registerClockFastForwardListener, 250);
    return;
  }

  // Handler: defensive — call available clock APIs if present
  function handleFastForwardRequest(payload) {
    try {
      // Primary: emit a clock-level event (if clock consumes events)
      if (window.game.clock && typeof window.game.clock.fastForward === 'function') {
        window.game.clock.fastForward(payload);
        return;
      }
      // If clock has setSpeed/timeScale
      if (window.game.clock && typeof window.game.clock.setSpeed === 'function') {
        window.game.clock.setSpeed(5); // example: speed=5x; tune as needed
        return;
      }
      // Fallback: emit a general event 'clock:fast-forward' for other systems to listen
      window.game.bus.emit && window.game.bus.emit('clock:fast-forward', payload || {});
    } catch (err) {
      console.error('[bootstrap.idleClockListener] fast-forward handler failed', err);
    }
  }

  // Use a stable event name so both new & patched code can use it.
  window.game.bus.on && window.game.bus.on('clock:request-fast-forward', handleFastForwardRequest);

  // Also accept old name variants for compatibility
  window.game.bus.on && window.game.bus.on('idle:request-fast-forward', handleFastForwardRequest);
})();
