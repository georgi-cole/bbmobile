// MODULE: phase-events.js
// Event-based phase change system to replace polling
// Emits 'phase:change' events when game phase transitions

(function(global) {
  'use strict';

  const LOG_PREFIX = '[phase-events]';

  /**
   * Set game phase and emit phase:change event
   * @param {string} newPhase - The new phase name
   * @param {object} options - Optional metadata
   */
  function setPhaseWithEvents(newPhase, options = {}) {
    const g = global.game;
    if (!g) {
      console.warn(LOG_PREFIX, 'Cannot set phase - game object not found');
      return;
    }

    const oldPhase = g.phase;
    
    // Set new phase
    g.phase = newPhase;
    
    // Emit event if phase actually changed
    if (oldPhase !== newPhase) {
      console.log(LOG_PREFIX, `Phase transition: ${oldPhase} → ${newPhase}`);
      
      const event = new CustomEvent('phase:change', {
        detail: {
          oldPhase,
          newPhase,
          timestamp: Date.now(),
          ...options
        }
      });
      
      global.dispatchEvent(event);
    }
  }

  /**
   * Listen for phase changes
   * @param {function} callback - Callback(oldPhase, newPhase, detail)
   * @returns {function} Unsubscribe function
   */
  function onPhaseChange(callback) {
    const handler = (event) => {
      const { oldPhase, newPhase, ...detail } = event.detail;
      callback(oldPhase, newPhase, detail);
    };
    
    global.addEventListener('phase:change', handler);
    
    // Return unsubscribe function
    return () => {
      global.removeEventListener('phase:change', handler);
    };
  }

  /**
   * Get current phase
   */
  function getCurrentPhase() {
    return global.game?.phase || null;
  }

  /**
   * Wrap an existing phase setter to emit events
   * This is a compatibility helper for existing code
   */
  function wrapExistingPhaseSetter() {
    const g = global.game;
    if (!g) return;

    // Create a proxy to intercept phase changes
    let internalPhase = g.phase;
    
    Object.defineProperty(g, 'phase', {
      get() {
        return internalPhase;
      },
      set(newPhase) {
        const oldPhase = internalPhase;
        internalPhase = newPhase;
        
        // Emit event if phase changed
        if (oldPhase !== newPhase && newPhase !== undefined && newPhase !== null) {
          console.log(LOG_PREFIX, `Phase transition detected: ${oldPhase} → ${newPhase}`);
          
          const event = new CustomEvent('phase:change', {
            detail: {
              oldPhase,
              newPhase,
              timestamp: Date.now()
            }
          });
          
          global.dispatchEvent(event);
        }
      },
      configurable: true,
      enumerable: true
    });
    
    console.log(LOG_PREFIX, '✓ Phase setter wrapped with event emission');
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(wrapExistingPhaseSetter, 50);
    });
  } else {
    setTimeout(wrapExistingPhaseSetter, 50);
  }

  // Export public API
  global.PhaseEvents = {
    setPhase: setPhaseWithEvents,
    onPhaseChange,
    getCurrentPhase,
    wrapExistingPhaseSetter
  };

  console.log(LOG_PREFIX, 'Phase events module loaded');

})(window);
