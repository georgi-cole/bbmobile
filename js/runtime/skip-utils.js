// MODULE: skip-utils.js
// Skip-aware timeout utilities
// Provides sleep() that resolves instantly under skip and registerTimeout() that tracks timeouts for cancellation

(function(g) {
  'use strict';

  const SkipUtils = (() => {
    // Track all registered timeouts for cancellation
    const activeTimeouts = new Set();

    /**
     * Sleep for specified milliseconds
     * Resolves instantly if SkipController is active
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    function sleep(ms) {
      if (g.SkipController && g.SkipController.isActive()) {
        // Skip mode: resolve instantly
        return Promise.resolve();
      }
      
      return new Promise(resolve => {
        const timeoutId = setTimeout(resolve, ms);
        activeTimeouts.add(timeoutId);
        
        // Auto-cleanup when resolved
        Promise.resolve().then(() => {
          activeTimeouts.delete(timeoutId);
        });
      });
    }

    /**
     * Register a timeout that can be cancelled and is skip-aware
     * Returns immediately with fn() result if skip is active
     * @param {Function} fn - Function to execute after delay
     * @param {number} ms - Delay in milliseconds
     * @returns {number|null} Timeout ID or null if skip triggered immediate execution
     */
    function registerTimeout(fn, ms) {
      if (g.SkipController && g.SkipController.isActive()) {
        // Skip mode: execute immediately
        try {
          fn();
        } catch (e) {
          console.error('[skip-utils] Error executing immediate function:', e);
        }
        return null;
      }

      const timeoutId = setTimeout(() => {
        activeTimeouts.delete(timeoutId);
        try {
          fn();
        } catch (e) {
          console.error('[skip-utils] Error in timeout callback:', e);
        }
      }, ms);

      activeTimeouts.add(timeoutId);
      return timeoutId;
    }

    /**
     * Cancel a specific registered timeout
     * @param {number} timeoutId - ID returned by registerTimeout
     */
    function cancelTimeout(timeoutId) {
      if (timeoutId && activeTimeouts.has(timeoutId)) {
        clearTimeout(timeoutId);
        activeTimeouts.delete(timeoutId);
      }
    }

    /**
     * Cancel all registered timeouts
     * @returns {number} Number of timeouts cancelled
     */
    function cancelAllTimeouts() {
      const count = activeTimeouts.size;
      activeTimeouts.forEach(id => clearTimeout(id));
      activeTimeouts.clear();
      
      if (count > 0) {
        console.info(`[skip-utils] Cancelled ${count} timeout(s)`);
      }
      
      return count;
    }

    /**
     * Get count of active timeouts (for debugging)
     * @returns {number}
     */
    function getActiveTimeoutCount() {
      return activeTimeouts.size;
    }

    /**
     * Drainer function for SkipController
     * Cancels all registered timeouts
     * @returns {boolean} True if any timeouts were cancelled
     */
    function timeoutDrainer() {
      const count = cancelAllTimeouts();
      return count > 0;
    }

    return {
      sleep,
      registerTimeout,
      cancelTimeout,
      cancelAllTimeouts,
      getActiveTimeoutCount,
      timeoutDrainer
    };
  })();

  // Export to global scope
  g.SkipUtils = SkipUtils;
  console.info('[skip-utils] Module loaded');

})(window);
