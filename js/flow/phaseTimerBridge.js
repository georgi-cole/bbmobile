// MODULE: flow/phaseTimerBridge.js
// Bridge between intermission flow and phase timer system
// Handles timer suspension and skip-to-results logic

(function(global) {
  'use strict';

  const PhaseTimerBridge = {};

  // Track suspension state
  let timerSuspended = false;
  let suspendReason = null;
  let originalTimerDisplay = null;

  // Pause/resume state
  let isPaused = false;
  let remainingMs = 0;
  let pausedTimeoutId = null;
  let pausedIntervalId = null;

  /**
   * Initialize the bridge and set up event listeners
   */
  function init() {
    const bus = global.game?.bus;
    if (!bus) {
      console.warn('[PhaseTimerBridge] Game event bus not available, bridge disabled');
      return;
    }

    // Listen for suspend events
    bus.on('phase:timer:suspend', handleSuspend);

    // Listen for skip-to-results events
    bus.on('phase:timer:skip-to-results', handleSkipToResults);

    console.info('[PhaseTimerBridge] ✓ Initialized');
  }

  /**
   * Handle timer suspension
   * @param {Object} data - Event data with reason
   */
  function handleSuspend(data = {}) {
    const game = global.game;
    if (!game) return;

    timerSuspended = true;
    suspendReason = data.reason || 'unknown';

    console.info(`[PhaseTimerBridge] ⏸ Timer suspended (reason: ${suspendReason})`);

    // Pause the phase timer if it's running
    if (game.timerPaused !== undefined) {
      game.timerPaused = true;
      
      // Store remaining time
      if (game.endAt && !game.pausedTimeRemaining) {
        game.pausedTimeRemaining = Math.max(0, game.endAt - Date.now());
      }
    }

    // Hide/dim timer UI
    hideTimerUI();
  }

  /**
   * Handle skip to results (no timer resume)
   * @param {Object} data - Event data with reason and compType
   */
  function handleSkipToResults(data = {}) {
    const game = global.game;
    if (!game) return;

    const { reason, compType } = data;

    console.info(`[PhaseTimerBridge] ⏭ Skip to results (reason: ${reason}, compType: ${compType})`);

    // Ensure timer is stopped
    if (game.timerPaused !== undefined) {
      game.timerPaused = false;
    }
    
    // Clear any pending timer
    game.pausedTimeRemaining = null;

    // Reset suspension state
    timerSuspended = false;
    suspendReason = null;

    // Restore timer UI visibility (even though we're skipping)
    restoreTimerUI();

    // Call the phase timeout callback if available (works for both HOH and Veto)
    if (typeof game.phaseTimeoutCallback === 'function') {
      console.info('[PhaseTimerBridge] → Calling phase timeout callback to trigger results');
      try {
        game.phaseTimeoutCallback();
      } catch (err) {
        console.error('[PhaseTimerBridge] Error calling phase timeout callback:', err);
      }
    } else {
      console.warn('[PhaseTimerBridge] No phase timeout callback available, cannot skip to results');
    }
  }

  /**
   * Hide/dim the timer UI
   */
  function hideTimerUI() {
    // Hide tvTimer
    const tvTimer = document.getElementById('tvTimer');
    if (tvTimer && !originalTimerDisplay) {
      originalTimerDisplay = tvTimer.style.display || '';
      tvTimer.style.opacity = '0.3';
      tvTimer.style.pointerEvents = 'none';
    }

    // Hide countdown
    const countdown = document.getElementById('countdown');
    if (countdown) {
      countdown.style.opacity = '0.3';
      countdown.style.pointerEvents = 'none';
    }

    // Dim progress elements
    const progressFill = document.getElementById('tvProgressFill');
    if (progressFill) {
      progressFill.style.opacity = '0.3';
    }

    const hourglassSandTop = document.getElementById('hourglassSandTop');
    const hourglassSandBottom = document.getElementById('hourglassSandBottom');
    const hourglassSandFlow = document.getElementById('hourglassSandFlow');
    
    if (hourglassSandTop) hourglassSandTop.style.opacity = '0.3';
    if (hourglassSandBottom) hourglassSandBottom.style.opacity = '0.3';
    if (hourglassSandFlow) hourglassSandFlow.style.opacity = '0.1';

    console.info('[PhaseTimerBridge] ✓ Timer UI hidden/dimmed');
  }

  /**
   * Restore the timer UI visibility
   */
  function restoreTimerUI() {
    // Restore tvTimer
    const tvTimer = document.getElementById('tvTimer');
    if (tvTimer) {
      if (originalTimerDisplay !== null) {
        tvTimer.style.display = originalTimerDisplay;
        originalTimerDisplay = null;
      }
      tvTimer.style.opacity = '1';
      tvTimer.style.pointerEvents = '';
    }

    // Restore countdown
    const countdown = document.getElementById('countdown');
    if (countdown) {
      countdown.style.opacity = '1';
      countdown.style.pointerEvents = '';
    }

    // Restore progress elements
    const progressFill = document.getElementById('tvProgressFill');
    if (progressFill) {
      progressFill.style.opacity = '1';
    }

    const hourglassSandTop = document.getElementById('hourglassSandTop');
    const hourglassSandBottom = document.getElementById('hourglassSandBottom');
    const hourglassSandFlow = document.getElementById('hourglassSandFlow');
    
    if (hourglassSandTop) hourglassSandTop.style.opacity = '1';
    if (hourglassSandBottom) hourglassSandBottom.style.opacity = '1';
    if (hourglassSandFlow) hourglassSandFlow.style.opacity = '1';

    console.info('[PhaseTimerBridge] ✓ Timer UI restored');
  }

  /**
   * Check if timer is currently suspended
   * @returns {boolean}
   */
  function isSuspended() {
    return timerSuspended;
  }

  /**
   * Get the current suspension reason
   * @returns {string|null}
   */
  function getSuspendReason() {
    return suspendReason;
  }

  /**
   * Manually resume timer (emergency use only)
   */
  function manualResume() {
    const game = global.game;
    if (!game) return;

    console.warn('[PhaseTimerBridge] ⚠ Manual resume called');

    timerSuspended = false;
    suspendReason = null;

    if (game.timerPaused !== undefined) {
      game.timerPaused = false;
    }

    restoreTimerUI();
  }

  /**
   * Pause the phase timer (for Settings mode)
   * Stores remaining time and clears active timeout/interval
   */
  function pause() {
    if (isPaused) {
      console.warn('[PhaseTimerBridge] Already paused, ignoring duplicate pause');
      return;
    }

    const game = global.game;
    if (!game) return;

    const now = Date.now();
    
    // Calculate remaining time
    if (game.endAt && game.endAt > now) {
      remainingMs = Math.max(0, game.endAt - now);
    } else if (game.phaseEndsAt && game.phaseEndsAt > now) {
      remainingMs = Math.max(0, game.phaseEndsAt - now);
    } else {
      remainingMs = 0;
    }

    // Store current timeout/interval IDs for cleanup
    if (game.phaseTimeoutId) {
      clearTimeout(game.phaseTimeoutId);
      pausedTimeoutId = game.phaseTimeoutId;
      game.phaseTimeoutId = null;
    }

    if (game.phaseIntervalId) {
      clearInterval(game.phaseIntervalId);
      pausedIntervalId = game.phaseIntervalId;
      game.phaseIntervalId = null;
    }

    isPaused = true;

    console.info(`[PhaseTimerBridge] ⏸ Paused with ${remainingMs}ms remaining`);

    // Dim timer UI to indicate paused state
    hideTimerUI();
  }

  /**
   * Resume the phase timer (for Settings mode)
   * Restores remaining time and reschedules timeout/interval
   */
  function resume() {
    if (!isPaused) {
      console.warn('[PhaseTimerBridge] Not paused, ignoring resume');
      return;
    }

    const game = global.game;
    if (!game) return;

    const now = Date.now();

    console.info(`[PhaseTimerBridge] ▶ Resuming with ${remainingMs}ms remaining`);

    // Handle timer already overdue
    if (remainingMs <= 0) {
      console.info('[PhaseTimerBridge] Timer overdue, invoking timeout callback immediately');
      
      // Invoke callback immediately on next tick
      if (typeof game.phaseTimeoutCallback === 'function') {
        setTimeout(() => {
          try {
            game.phaseTimeoutCallback();
          } catch (err) {
            console.error('[PhaseTimerBridge] Error invoking timeout callback:', err);
          }
        }, 0);
      } else {
        console.warn('[PhaseTimerBridge] No phaseTimeoutCallback available');
      }
    } else {
      // Reschedule timer with remaining time
      game.endAt = now + remainingMs;
      if (game.phaseEndsAt) {
        game.phaseEndsAt = now + remainingMs;
      }

      // Reschedule timeout if callback exists
      if (typeof game.phaseTimeoutCallback === 'function') {
        game.phaseTimeoutId = setTimeout(() => {
          try {
            game.phaseTimeoutCallback();
          } catch (err) {
            console.error('[PhaseTimerBridge] Error invoking timeout callback:', err);
          }
        }, remainingMs);
      }

      console.info(`[PhaseTimerBridge] Timer rescheduled for ${remainingMs}ms (endAt: ${new Date(game.endAt).toISOString()})`);
    }

    // Clear pause state
    isPaused = false;
    remainingMs = 0;
    pausedTimeoutId = null;
    pausedIntervalId = null;

    // Restore timer UI
    restoreTimerUI();
  }

  /**
   * Force timeout immediately (for FFWD or manual phase advance)
   * Cancels any pending timer and invokes callback on next tick
   */
  function forceTimeout() {
    const game = global.game;
    if (!game) return;

    console.info('[PhaseTimerBridge] ⏭ Forcing timeout immediately');

    // Clear any active timers
    if (game.phaseTimeoutId) {
      clearTimeout(game.phaseTimeoutId);
      game.phaseTimeoutId = null;
    }
    if (game.phaseIntervalId) {
      clearInterval(game.phaseIntervalId);
      game.phaseIntervalId = null;
    }

    // Set endAt to past to indicate timer expired
    game.endAt = Date.now() - 1;
    if (game.phaseEndsAt) {
      game.phaseEndsAt = Date.now() - 1;
    }

    // Invoke callback immediately on next tick
    if (typeof game.phaseTimeoutCallback === 'function') {
      setTimeout(() => {
        try {
          game.phaseTimeoutCallback();
        } catch (err) {
          console.error('[PhaseTimerBridge] Error invoking forced timeout callback:', err);
        }
      }, 0);
    } else {
      console.warn('[PhaseTimerBridge] No phaseTimeoutCallback to invoke');
    }
  }

  // Export API
  PhaseTimerBridge.init = init;
  PhaseTimerBridge.isSuspended = isSuspended;
  PhaseTimerBridge.getSuspendReason = getSuspendReason;
  PhaseTimerBridge.manualResume = manualResume;
  PhaseTimerBridge.handleSuspend = handleSuspend;
  PhaseTimerBridge.handleSkipToResults = handleSkipToResults;
  PhaseTimerBridge.pause = pause;
  PhaseTimerBridge.resume = resume;
  PhaseTimerBridge.forceTimeout = forceTimeout;

  // Export to global namespace
  global.PhaseTimerBridge = PhaseTimerBridge;

  // Auto-initialize if game bus is available
  if (global.game?.bus) {
    init();
  } else {
    // Wait for game to be ready
    const checkReady = setInterval(() => {
      if (global.game?.bus) {
        clearInterval(checkReady);
        init();
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkReady);
      if (!global.game?.bus) {
        console.warn('[PhaseTimerBridge] Game bus not available after 5s, bridge not initialized');
      }
    }, 5000);
  }

})(window);
