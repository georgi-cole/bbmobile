/**
 * MODULE: global-pause.js
 * 
 * GlobalPauseController - Singleton pause system that freezes game progression
 * when blocking modals are open.
 * 
 * FEATURES:
 * - Tracks open modal IDs using a Set (only pauses when at least one modal is open)
 * - Emits game:pause and game:resume events (via game bus + DOM CustomEvent)
 * - Renders a dim overlay to visually indicate paused state and block interaction
 * - Defensive event emission (falls back gracefully if event bus unavailable)
 * - Exposes on window.game.pauseController for global access
 * 
 * USAGE:
 * 
 *   // In modal code (e.g., openSettingsModal):
 *   if (window.game?.pauseController) {
 *     window.game.pauseController.open('modal:settings');
 *   }
 * 
 *   // When closing modal:
 *   if (window.game?.pauseController) {
 *     window.game.pauseController.close('modal:settings');
 *   }
 * 
 *   // In game loop or timer code:
 *   if (window.game?.pauseController?.isPaused()) {
 *     return; // Skip this tick
 *   }
 * 
 *   // Listen to events:
 *   window.addEventListener('game:pause', () => {
 *     console.log('Game paused');
 *   });
 *   window.addEventListener('game:resume', () => {
 *     console.log('Game resumed');
 *   });
 * 
 * API:
 *   - open(id: string): void - Register a blocking modal as open
 *   - close(id: string): void - Unregister a blocking modal
 *   - isPaused(): boolean - Check if game is currently paused
 *   - getOpenModals(): string[] - Get array of currently open modal IDs
 *   - reset(): void - Clear all open modals and resume game
 * 
 * EVENTS EMITTED:
 *   - game:pause - Emitted when transitioning from running to paused (first modal opens)
 *   - game:resume - Emitted when transitioning from paused to running (last modal closes)
 * 
 * INTEGRATION:
 *   - Imported in bootstrap.js to ensure early availability
 *   - Used by HubModalBridge for hub/3-dots modals
 *   - Used by settings modal (render.js)
 *   - Timer functions check isPaused() to halt progression
 */

(function(global) {
  'use strict';

  // Set of currently open blocking modal IDs
  const openModals = new Set();
  
  // Reference to overlay element
  let overlayElement = null;

  /**
   * Emit events via game bus and DOM CustomEvent
   * @param {string} eventName - Event name (e.g., 'game:pause')
   */
  function emitEvent(eventName) {
    try {
      // Try game bus first (if available)
      if (global.game?.bus) {
        if (typeof global.game.bus.emit === 'function') {
          global.game.bus.emit(eventName);
        } else if (typeof global.game.bus.trigger === 'function') {
          global.game.bus.trigger(eventName);
        }
      }
    } catch (err) {
      console.warn('[GlobalPauseController] Failed to emit on game bus:', eventName, err);
    }

    try {
      // Always emit DOM CustomEvent as fallback
      const event = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: false,
        detail: { timestamp: Date.now(), openModals: Array.from(openModals) }
      });
      global.dispatchEvent(event);
    } catch (err) {
      console.error('[GlobalPauseController] Failed to emit CustomEvent:', eventName, err);
    }
  }

  /**
   * Create and show the pause overlay
   */
  function showOverlay() {
    if (overlayElement) return; // Already shown

    overlayElement = document.createElement('div');
    overlayElement.id = 'global-pause-overlay';
    overlayElement.className = 'global-pause-overlay';
    
    document.body.appendChild(overlayElement);
    
    // Force reflow to enable transition
    void overlayElement.offsetHeight;
    overlayElement.classList.add('visible');
  }

  /**
   * Hide and remove the pause overlay
   */
  function hideOverlay() {
    if (!overlayElement) return;

    overlayElement.classList.remove('visible');
    
    // Wait for CSS transition to complete before removing (matches transition: opacity 0.3s)
    const TRANSITION_DURATION_MS = 300;
    setTimeout(() => {
      if (overlayElement && overlayElement.parentNode) {
        overlayElement.parentNode.removeChild(overlayElement);
        overlayElement = null;
      }
    }, TRANSITION_DURATION_MS);
  }

  /**
   * Register a blocking modal as open
   * @param {string} id - Unique modal identifier
   */
  function open(id) {
    if (!id || typeof id !== 'string') {
      console.error('[GlobalPauseController] open() requires a valid string id');
      return;
    }

    try {
      const wasPaused = openModals.size > 0;
      openModals.add(id);

      // Only emit pause event on transition from running -> paused
      if (!wasPaused && openModals.size > 0) {
        console.info('[GlobalPauseController] Pausing game (modal opened):', id);
        showOverlay();
        emitEvent('game:pause');
      }
    } catch (err) {
      console.error('[GlobalPauseController] Error in open():', err);
    }
  }

  /**
   * Unregister a blocking modal
   * @param {string} id - Unique modal identifier
   */
  function close(id) {
    if (!id || typeof id !== 'string') {
      console.error('[GlobalPauseController] close() requires a valid string id');
      return;
    }

    try {
      if (!openModals.has(id)) {
        return; // Modal wasn't registered, nothing to do
      }

      openModals.delete(id);

      // Only emit resume event on transition from paused -> running
      if (openModals.size === 0) {
        console.info('[GlobalPauseController] Resuming game (all modals closed)');
        hideOverlay();
        emitEvent('game:resume');
      }
    } catch (err) {
      console.error('[GlobalPauseController] Error in close():', err);
    }
  }

  /**
   * Check if game is currently paused
   * @returns {boolean} - True if at least one modal is open
   */
  function isPaused() {
    return openModals.size > 0;
  }

  /**
   * Get array of currently open modal IDs
   * @returns {string[]} - Array of modal IDs
   */
  function getOpenModals() {
    return Array.from(openModals);
  }

  /**
   * Clear all open modals and force resume
   */
  function reset() {
    try {
      const hadModals = openModals.size > 0;
      openModals.clear();
      
      if (hadModals) {
        console.info('[GlobalPauseController] Reset - clearing all modals and resuming');
        hideOverlay();
        emitEvent('game:resume');
      }
    } catch (err) {
      console.error('[GlobalPauseController] Error in reset():', err);
    }
  }

  // Create the controller API
  const GlobalPauseController = {
    open,
    close,
    isPaused,
    getOpenModals,
    reset
  };

  // Expose on global game object
  try {
    global.game = global.game || {};
    global.game.pauseController = GlobalPauseController;
    console.info('[GlobalPauseController] Initialized and attached to window.game.pauseController');
  } catch (err) {
    console.error('[GlobalPauseController] Failed to attach to window.game:', err);
  }

  // Also export for ES module usage
  if (typeof global.define === 'function' && global.define.amd) {
    global.define([], function() { return GlobalPauseController; });
  }

})(window);
