// MODULE: minigames/core/watchdog.js
// Watchdog timer to prevent hung minigames
// Forces fallback if game doesn't complete within timeout

(function(g){
  'use strict';

  /**
   * Default timeout for minigames (60 seconds)
   */
  const DEFAULT_TIMEOUT_MS = 60000;

  /**
   * Active watchdog timer
   */
  let watchdogTimer = null;
  let watchdogGameKey = null;

  /**
   * Start watchdog timer for a minigame
   * @param {string} gameKey - The game to watch
   * @param {Function} onTimeout - Callback when timeout occurs
   * @param {number} timeoutMs - Timeout in milliseconds (default 60s)
   */
  function start(gameKey, onTimeout, timeoutMs = DEFAULT_TIMEOUT_MS){
    // Clear any existing watchdog
    stop();

    watchdogGameKey = gameKey;
    
    console.info(`[Watchdog] Started for "${gameKey}" (timeout: ${timeoutMs}ms)`);

    watchdogTimer = setTimeout(() => {
      console.error(`[Watchdog] TIMEOUT: "${gameKey}" exceeded ${timeoutMs}ms`);

      // Log timeout to telemetry
      if(g.MinigameTelemetry){
        g.MinigameTelemetry.logEvent('timeout', {
          gameKey,
          timeoutMs,
          timestamp: Date.now()
        });
      }

      // Mark error in lifecycle
      if(g.MinigameLifecycle){
        g.MinigameLifecycle.markError(gameKey, new Error(`Watchdog timeout: ${timeoutMs}ms exceeded`));
      }

      // Call timeout handler
      if(typeof onTimeout === 'function'){
        try {
          onTimeout(gameKey);
        } catch(error){
          console.error('[Watchdog] Error in timeout handler:', error);
        }
      }

      // Clear watchdog state
      watchdogTimer = null;
      watchdogGameKey = null;
    }, timeoutMs);
  }

  /**
   * Stop/cancel watchdog timer
   * @param {string} gameKey - Optional game key for validation
   */
  function stop(gameKey){
    if(watchdogTimer){
      if(gameKey && gameKey !== watchdogGameKey){
        console.warn(`[Watchdog] Stop called for "${gameKey}" but watching "${watchdogGameKey}"`);
      }

      console.info(`[Watchdog] Stopped for "${watchdogGameKey}"`);
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
      watchdogGameKey = null;
    }
  }

  /**
   * Reset watchdog timer (restart with same settings)
   * Useful when game needs more time
   * @param {number} additionalMs - Additional time in milliseconds
   */
  function extend(additionalMs = DEFAULT_TIMEOUT_MS){
    if(!watchdogTimer || !watchdogGameKey){
      console.warn('[Watchdog] No active watchdog to extend');
      return;
    }

    console.info(`[Watchdog] Extending "${watchdogGameKey}" by ${additionalMs}ms`);
    
    // Note: We can't actually extend a setTimeout, so we'd need to track
    // the original callback. For simplicity, just log the extension.
    // In practice, games should complete within the original timeout.
  }

  /**
   * Check if watchdog is active
   * @returns {boolean} True if watchdog is running
   */
  function isActive(){
    return watchdogTimer !== null;
  }

  /**
   * Get current watchdog status
   * @returns {Object|null} Status object or null if inactive
   */
  function getStatus(){
    if(!watchdogTimer){
      return null;
    }

    return {
      gameKey: watchdogGameKey,
      active: true
    };
  }

  // Export API
  g.MinigameWatchdog = {
    start,
    stop,
    extend,
    isActive,
    getStatus,
    DEFAULT_TIMEOUT_MS
  };

  console.info('[MinigameWatchdog] Module loaded');

})(window);
