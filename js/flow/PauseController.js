// MODULE: flow/PauseController.js
// Global pause controller for settings modal and other system-level pauses
// Coordinates pause/resume across all game systems: timers, competitions, social AI, etc.

(function(global) {
  'use strict';

  const PauseController = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  let pauseState = {
    isPaused: false,
    reason: null,
    pausedAt: null,
    refCount: 0, // Prevent double-pause from nested calls
    
    // Timer state captured on pause
    timerState: {
      endAt: null,
      remainingMs: null,
      phaseTimeoutCallback: null
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Pause all game systems
   * @param {string} reason - Why the pause was triggered (e.g., "settings", "modal")
   */
  function pause(reason = 'unknown') {
    const game = global.game;
    if (!game) {
      console.warn('[PauseController] Cannot pause - game object not available');
      return;
    }

    // Increment ref count to handle nested calls
    pauseState.refCount++;

    if (pauseState.isPaused) {
      console.info(`[PauseController] Already paused (refCount: ${pauseState.refCount})`);
      return;
    }

    console.info(`[PauseController] ⏸ Pausing game (reason: ${reason})`);

    // Set pause state
    pauseState.isPaused = true;
    pauseState.reason = reason;
    pauseState.pausedAt = Date.now();

    // Set global flag
    game.isGloballyPaused = true;

    // Capture timer state
    captureTimerState();

    // Pause PhaseTimerBridge if available
    if (global.PhaseTimerBridge && typeof global.PhaseTimerBridge.handleSuspend === 'function') {
      global.PhaseTimerBridge.handleSuspend({ reason });
    }

    // Pause social AI scheduler if running
    pauseSocialAI();

    // Broadcast pause event
    if (game.bus && typeof game.bus.emit === 'function') {
      game.bus.emit('game:paused', {
        reason,
        pausedAt: pauseState.pausedAt,
        phase: game.phase,
        week: game.week,
        remainingMs: pauseState.timerState.remainingMs
      });
    }

    // Log telemetry
    logPauseEvent('pause', {
      reason,
      phase: game.phase,
      week: game.week,
      remainingMs: pauseState.timerState.remainingMs
    });
  }

  /**
   * Resume all game systems
   */
  function resume() {
    const game = global.game;
    if (!game) {
      console.warn('[PauseController] Cannot resume - game object not available');
      return;
    }

    // Decrement ref count
    pauseState.refCount = Math.max(0, pauseState.refCount - 1);

    if (pauseState.refCount > 0) {
      console.info(`[PauseController] Resume called but still paused (refCount: ${pauseState.refCount})`);
      return;
    }

    if (!pauseState.isPaused) {
      console.info('[PauseController] Not paused, ignoring resume');
      return;
    }

    console.info('[PauseController] ▶ Resuming game');

    const pauseDuration = Date.now() - pauseState.pausedAt;

    // Clear global flag
    game.isGloballyPaused = false;

    // Restore timer state
    restoreTimerState();

    // Resume PhaseTimerBridge if available
    if (global.PhaseTimerBridge && typeof global.PhaseTimerBridge.manualResume === 'function') {
      global.PhaseTimerBridge.manualResume();
    }

    // Resume social AI scheduler if it was running
    resumeSocialAI();

    // Broadcast resume event
    if (game.bus && typeof game.bus.emit === 'function') {
      game.bus.emit('game:resumed', {
        reason: pauseState.reason,
        pauseDuration,
        phase: game.phase,
        week: game.week
      });
    }

    // Log telemetry
    logPauseEvent('resume', {
      reason: pauseState.reason,
      pauseDuration,
      phase: game.phase,
      week: game.week
    });

    // Reset pause state
    pauseState.isPaused = false;
    pauseState.reason = null;
    pauseState.pausedAt = null;
    pauseState.timerState = {
      endAt: null,
      remainingMs: null,
      phaseTimeoutCallback: null
    };
  }

  /**
   * Check if game is currently paused
   * @returns {boolean}
   */
  function isPaused() {
    return pauseState.isPaused;
  }

  /**
   * Get current pause state details
   * @returns {Object}
   */
  function getState() {
    return {
      isPaused: pauseState.isPaused,
      reason: pauseState.reason,
      pausedAt: pauseState.pausedAt,
      refCount: pauseState.refCount
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Capture current timer state before pausing
   */
  function captureTimerState() {
    const game = global.game;
    if (!game) return;

    const now = Date.now();

    // Capture endAt and calculate remaining time
    if (game.endAt && typeof game.endAt === 'number') {
      pauseState.timerState.endAt = game.endAt;
      pauseState.timerState.remainingMs = Math.max(0, game.endAt - now);
    } else if (game.phaseEndsAt && typeof game.phaseEndsAt === 'number') {
      pauseState.timerState.endAt = game.phaseEndsAt;
      pauseState.timerState.remainingMs = Math.max(0, game.phaseEndsAt - now);
    }

    // Capture phase timeout callback
    if (typeof game.phaseTimeoutCallback === 'function') {
      pauseState.timerState.phaseTimeoutCallback = game.phaseTimeoutCallback;
    }

    // Set timer paused flag
    game.timerPaused = true;

    // Store remaining time on game object for PhaseTimerBridge compatibility
    if (pauseState.timerState.remainingMs !== null) {
      game.pausedTimeRemaining = pauseState.timerState.remainingMs;
    }

    console.info('[PauseController] Captured timer state:', {
      remainingMs: pauseState.timerState.remainingMs,
      endAt: pauseState.timerState.endAt,
      hasCallback: !!pauseState.timerState.phaseTimeoutCallback
    });
  }

  /**
   * Restore timer state after resuming
   */
  function restoreTimerState() {
    const game = global.game;
    if (!game) return;

    const now = Date.now();

    // Clear timer paused flag
    game.timerPaused = false;

    // Restore timer with adjusted endAt
    if (pauseState.timerState.remainingMs !== null) {
      // Check if timer already expired (remainingMs <= 0)
      if (pauseState.timerState.remainingMs <= 0) {
        console.info('[PauseController] Timer expired during pause, triggering immediate timeout');
        
        // Trigger phase timeout callback immediately
        if (typeof pauseState.timerState.phaseTimeoutCallback === 'function') {
          try {
            // Use setTimeout to avoid blocking and allow UI updates
            setTimeout(() => {
              pauseState.timerState.phaseTimeoutCallback();
            }, 10);
          } catch (err) {
            console.error('[PauseController] Error calling phase timeout callback:', err);
          }
        }
      } else {
        // Timer has time remaining, restore with adjusted endAt
        const newEndAt = now + pauseState.timerState.remainingMs;
        
        if (game.endAt) {
          game.endAt = newEndAt;
        }
        if (game.phaseEndsAt) {
          game.phaseEndsAt = newEndAt;
        }

        console.info('[PauseController] Restored timer:', {
          remainingMs: pauseState.timerState.remainingMs,
          newEndAt
        });
      }
    }

    // Clear stored remaining time
    game.pausedTimeRemaining = null;
  }

  /**
   * Pause social AI scheduler
   */
  function pauseSocialAI() {
    // Check if social AI scheduler is available and running
    // Use pause() instead of stop() to keep loop running
    if (global.SocialAIScheduler && typeof global.SocialAIScheduler.pauseAiSocialPhase === 'function') {
      console.info('[PauseController] Pausing social AI scheduler');
      global.SocialAIScheduler.pauseAiSocialPhase('pause-controller');
    } else if (global.SocialAIScheduler && typeof global.SocialAIScheduler.stop === 'function') {
      // Fallback to stop if pause not available
      console.info('[PauseController] Pausing social AI scheduler (fallback to stop)');
      global.SocialAIScheduler.stop('pause-controller');
    }
  }

  /**
   * Resume social AI scheduler
   */
  function resumeSocialAI() {
    const game = global.game;
    
    // Check if we should resume social AI (only if in social phase)
    if (game && game.phase === 'social') {
      // Use resume() instead of start() to resume from pause
      if (global.SocialAIScheduler && typeof global.SocialAIScheduler.resumeAiSocialPhase === 'function') {
        console.info('[PauseController] Resuming social AI scheduler');
        global.SocialAIScheduler.resumeAiSocialPhase('pause-controller-resume');
      } else if (global.SocialAIScheduler && typeof global.SocialAIScheduler.start === 'function') {
        // Fallback to start if resume not available
        console.info('[PauseController] Resuming social AI scheduler (fallback to start)');
        global.SocialAIScheduler.start('social');
      }
    }
  }

  /**
   * Log pause/resume event for telemetry
   */
  function logPauseEvent(type, data) {
    const logEntry = {
      type,
      timestamp: Date.now(),
      ...data
    };

    // Log to console in development
    console.info('[PauseController] Event:', logEntry);

    // Store in telemetry if available
    if (global.game && !global.game.__pauseTelemetry) {
      global.game.__pauseTelemetry = [];
    }
    if (global.game && global.game.__pauseTelemetry) {
      global.game.__pauseTelemetry.push(logEntry);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GUARD HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if an action should be blocked due to pause
   * @param {string} action - Description of the action being checked
   * @returns {boolean} - True if action should proceed, false if blocked
   */
  function checkGuard(action) {
    if (pauseState.isPaused) {
      console.info(`[PauseController] Blocked action while paused: ${action}`);
      return false;
    }
    return true;
  }

  /**
   * Guard decorator for functions that should not run while paused
   * @param {Function} fn - Function to guard
   * @param {string} actionName - Name of the action for logging
   * @returns {Function} - Guarded function
   */
  function guardFunction(fn, actionName) {
    return function(...args) {
      if (!checkGuard(actionName)) {
        return;
      }
      return fn.apply(this, args);
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  PauseController.pause = pause;
  PauseController.resume = resume;
  PauseController.isPaused = isPaused;
  PauseController.getState = getState;
  PauseController.checkGuard = checkGuard;
  PauseController.guardFunction = guardFunction;

  // Export to global namespace
  global.PauseController = PauseController;

  // Debug helpers
  global.__debugPauseGame = () => pause('debug');
  global.__debugResumeGame = () => resume();

  console.info('[PauseController] Module loaded');

})(window);
