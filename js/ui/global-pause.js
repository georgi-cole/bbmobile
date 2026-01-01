// Compatibility shim: define a global PauseManager when loaded as a classic script.
// This mirrors the PR's module implementation but runs in a non-module context,
// and attaches the manager to window.game.pauseManager so bootstrap.js's script tag works.

(function () {
  // Avoid duplicating if already present
  try {
    if (!window.game) window.game = {};
    if (window.game.pauseManager && typeof window.game.pauseManager.isPaused === 'function') {
      // already installed
      return;
    }
  } catch (e) {
    // ignore
  }

  // Implementation (self-contained)
  const PauseManager = (function () {
    const openModals = new Set();

    function emit(eventName) {
      try {
        if (window.game && window.game.bus && typeof window.game.bus.emit === 'function') {
          window.game.bus.emit(eventName);
        } else if (window.game && window.game.bus && typeof window.game.bus.trigger === 'function') {
          window.game.bus.trigger(eventName);
        } else {
          try {
            window.dispatchEvent(new CustomEvent(eventName));
          } catch (err) {
            let ev;
            try {
              ev = document.createEvent('Event');
              ev.initEvent(eventName, true, true);
              window.dispatchEvent(ev);
            } catch (e) {
              // give up quietly
            }
          }
        }
      } catch (err) {
        if (window.console && typeof window.console.error === 'function') {
          console.error('[PauseManager] emit error', err);
        }
      }
    }

    function open(id) {
      try {
        if (!id) throw new Error('PauseManager.open requires an id');
        const wasPaused = openModals.size > 0;
        openModals.add(id);
        if (!wasPaused && openModals.size > 0) {
          emit('game:pause');
        }
      } catch (err) {
        if (window.console && typeof window.console.error === 'function') {
          console.error('[PauseManager] open', err);
        }
      }
    }

    function close(id) {
      try {
        if (!id) throw new Error('PauseManager.close requires an id');
        if (!openModals.has(id)) return;
        openModals.delete(id);
        if (openModals.size === 0) {
          emit('game:resume');
        }
      } catch (err) {
        if (window.console && typeof window.console.error === 'function') {
          console.error('[PauseManager] close', err);
        }
      }
    }

    function isPaused() { return openModals.size > 0; }
    function getOpenModals() { return Array.prototype.slice.call(Array.from(openModals || [])); }
    function reset() { openModals.clear(); emit('game:resume'); }

    return { open: open, close: close, isPaused: isPaused, getOpenModals: getOpenModals, reset: reset };
  })();

  try {
    if (!window.game) window.game = {};
    window.game.pauseManager = window.game.pauseManager || PauseManager;
    // Alias for compatibility - pauseController is the same as pauseManager
    window.game.pauseController = window.game.pauseController || window.game.pauseManager;
  } catch (e) {
    // Silently ignore errors when attaching to window.game
  }
})();
