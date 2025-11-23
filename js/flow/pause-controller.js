// MODULE: flow/pause-controller.js
// Global pause orchestrator for Settings mode and other pause contexts
// Manages game pause state, coordinates phase timer suspension, and guards game actions

(function(global) {
  'use strict';

  const PauseController = (() => {
    // State
    let pauseReason = null;
    let pausedAt = null;

    /**
     * Check if game is currently paused
     * @returns {boolean}
     */
    function isPaused() {
      return global.game?.isGloballyPaused === true;
    }

    /**
     * Get the reason for current pause
     * @returns {string|null}
     */
    function getReason() {
      return pauseReason;
    }

    /**
     * Pause the game globally
     * @param {Object} options - Pause options
     * @param {string} options.reason - Reason for pause (e.g., 'settings', 'modal', 'debug')
     */
    function pause(options = {}) {
      if (isPaused()) {
        console.warn('[PauseController] Already paused, ignoring duplicate pause request');
        return;
      }

      const game = global.game;
      if (!game) {
        console.error('[PauseController] window.game not available, cannot pause');
        return;
      }

      pauseReason = options.reason || 'unknown';
      pausedAt = Date.now();
      game.isGloballyPaused = true;

      console.info(`[PauseController] ⏸ Game PAUSED (reason: ${pauseReason})`);

      // Pause phase timer via PhaseTimerBridge
      if (global.PhaseTimerBridge?.pause) {
        try {
          global.PhaseTimerBridge.pause();
          console.info('[PauseController] → PhaseTimerBridge paused');
        } catch (err) {
          console.error('[PauseController] Error pausing PhaseTimerBridge:', err);
        }
      }

      // Disable FFWD/Skip UI
      disableSkipUI();

      // Emit pause event for other subsystems
      if (game.bus?.emit) {
        game.bus.emit('game:paused', { reason: pauseReason, at: pausedAt });
      }

      // Add telemetry log
      if (global.addLog) {
        global.addLog(`Game paused (${pauseReason})`, 'muted');
      }
    }

    /**
     * Resume the game from paused state
     */
    function resume() {
      if (!isPaused()) {
        console.warn('[PauseController] Not paused, ignoring resume request');
        return;
      }

      const game = global.game;
      if (!game) {
        console.error('[PauseController] window.game not available, cannot resume');
        return;
      }

      const pauseDuration = pausedAt ? Date.now() - pausedAt : 0;
      console.info(`[PauseController] ▶ Game RESUMED (was paused for ${pauseDuration}ms, reason: ${pauseReason})`);

      game.isGloballyPaused = false;

      // Resume phase timer via PhaseTimerBridge
      if (global.PhaseTimerBridge?.resume) {
        try {
          global.PhaseTimerBridge.resume();
          console.info('[PauseController] → PhaseTimerBridge resumed');
        } catch (err) {
          console.error('[PauseController] Error resuming PhaseTimerBridge:', err);
        }
      }

      // Re-enable FFWD/Skip UI
      enableSkipUI();

      // Emit resume event
      if (game.bus?.emit) {
        game.bus.emit('game:resumed', { reason: pauseReason, pauseDuration });
      }

      // Add telemetry log
      if (global.addLog) {
        global.addLog(`Game resumed (${pauseReason}, paused ${pauseDuration}ms)`, 'muted');
      }

      // Reset pause state
      pauseReason = null;
      pausedAt = null;
    }

    /**
     * Disable FFWD/Skip UI elements
     */
    function disableSkipUI() {
      const skipBtn = document.getElementById('btnSkip');
      const ffwdBtn = document.getElementById('btnFastForward');

      if (skipBtn) {
        skipBtn.disabled = true;
        skipBtn.style.opacity = '0.5';
        skipBtn.style.cursor = 'not-allowed';
        skipBtn.setAttribute('title', 'Game is paused while Settings is open');
      }

      if (ffwdBtn) {
        ffwdBtn.disabled = true;
        ffwdBtn.style.opacity = '0.5';
        ffwdBtn.style.cursor = 'not-allowed';
        ffwdBtn.setAttribute('title', 'Game is paused while Settings is open');
      }

      console.info('[PauseController] → Skip/FFWD UI disabled');
    }

    /**
     * Re-enable FFWD/Skip UI elements
     */
    function enableSkipUI() {
      const skipBtn = document.getElementById('btnSkip');
      const ffwdBtn = document.getElementById('btnFastForward');

      if (skipBtn) {
        skipBtn.disabled = false;
        skipBtn.style.opacity = '';
        skipBtn.style.cursor = '';
        skipBtn.removeAttribute('title');
      }

      if (ffwdBtn) {
        ffwdBtn.disabled = false;
        ffwdBtn.style.opacity = '';
        ffwdBtn.style.cursor = '';
        ffwdBtn.removeAttribute('title');
      }

      console.info('[PauseController] → Skip/FFWD UI enabled');
    }

    /**
     * Guard function for phase-advance operations
     * Returns true if action should be blocked
     * @param {string} actionName - Name of the action being guarded
     * @returns {boolean}
     */
    function shouldBlockAction(actionName) {
      if (isPaused()) {
        console.warn(`[PauseController] ⛔ Blocked action "${actionName}" (game is paused: ${pauseReason})`);
        
        // Show user-facing notification if available
        if (global.addLog) {
          global.addLog(`Action blocked: game is paused`, 'warn');
        }
        
        return true;
      }
      return false;
    }

    return {
      pause,
      resume,
      isPaused,
      getReason,
      shouldBlockAction
    };
  })();

  // Export to global namespace
  global.PauseController = PauseController;
  console.info('[pause-controller] Module loaded');

})(window);
