// PauseManager - singleton to coordinate global pause while modals are open.
// Usage:
//   import { PauseManager } from './ui/pause-manager.js';
//   PauseManager.open('settings');
//   PauseManager.close('settings');
//   if (PauseManager.isPaused()) { /* halt time-based logic */ }

export const PauseManager = (() => {
  // Set of ids of currently open blocking modals
  const openModals = new Set();

  // Helper to emit on window.game.bus if present
  function emit(eventName) {
    try {
      if (window.game && window.game.bus && typeof window.game.bus.emit === 'function') {
        window.game.bus.emit(eventName);
      } else if (window.game && window.game.bus && typeof window.game.bus.trigger === 'function') {
        // other event emitter styles
        window.game.bus.trigger(eventName);
      } else {
        // fallback: CustomEvent on window
        window.dispatchEvent(new CustomEvent(eventName));
      }
    } catch (err) {
      console.error('[PauseManager] emit error', err);
    }
  }

  function open(id) {
    try {
      if (!id) throw new Error('PauseManager.open requires an id');
      const wasPaused = openModals.size > 0;
      openModals.add(id);
      if (!wasPaused && openModals.size > 0) {
        // Transition from running -> paused
        emit('game:pause');
      }
    } catch (err) {
      console.error('[PauseManager] open', err);
    }
  }

  function close(id) {
    try {
      if (!id) throw new Error('PauseManager.close requires an id');
      if (!openModals.has(id)) return;
      openModals.delete(id);
      if (openModals.size === 0) {
        // Transition from paused -> running
        emit('game:resume');
      }
    } catch (err) {
      console.error('[PauseManager] close', err);
    }
  }

  function isPaused() {
    return openModals.size > 0;
  }

  function getOpenModals() {
    return Array.from(openModals);
  }

  function reset() {
    openModals.clear();
    emit('game:resume');
  }

  // Expose on global game object for convenient access
  try {
    window.game = window.game || {};
    window.game.pauseManager = window.game.pauseManager || {
      isPaused: () => false
    };
    // Replace only if not present to avoid stomping during hot reloads/tests
    window.game.pauseManager = {
      open,
      close,
      isPaused,
      getOpenModals,
      reset
    };
  } catch (err) {
    // ignore
  }

  return {
    open,
    close,
    isPaused,
    getOpenModals,
    reset
  };
})();
