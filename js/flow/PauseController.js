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
    owners: new Set(), // Track active pause owners for reference counting
    
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
   * @param {string} ownerId - Unique identifier for the pause owner (e.g., "settings", "modal:profile", "social-maneuvers")
   */
  function pause(ownerId = 'unknown') {
    const game = global.game;
    if (!game) {
      console.warn('[PauseController] Cannot pause - game object not available');
      return;
    }

    // Add owner to active set
    const wasEmpty = pauseState.owners.size === 0;
    pauseState.owners.add(ownerId);
    
    // Increment ref count to handle nested calls (backward compatibility)
    pauseState.refCount++;

    if (pauseState.isPaused) {
      console.info(`[PauseController] Pause owner '${ownerId}' added (owners: ${Array.from(pauseState.owners).join(', ')}, refCount: ${pauseState.refCount})`);
      return;
    }
    
    // Only capture state on first pause (transition 0 -> 1 owners)
    if (!wasEmpty) {
      console.warn(`[PauseController] Inconsistent state: isPaused=false but had owners`);
    }

    console.info(`[PauseController] ⏸ Pausing game (owner: ${ownerId}, owners: ${Array.from(pauseState.owners).join(', ')})`);

    // Set pause state
    pauseState.isPaused = true;
    pauseState.reason = ownerId; // Store first owner as reason for backward compatibility
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
        reason: ownerId,
        owners: Array.from(pauseState.owners),
        pausedAt: pauseState.pausedAt,
        phase: game.phase,
        week: game.week,
        remainingMs: pauseState.timerState.remainingMs
      });
    }

    // Log telemetry
    logPauseEvent('pause', {
      reason: ownerId,
      owners: Array.from(pauseState.owners),
      phase: game.phase,
      week: game.week,
      remainingMs: pauseState.timerState.remainingMs
    });
  }

  /**
   * Resume all game systems
   * @param {string} ownerId - Unique identifier for the pause owner to remove (optional for backward compatibility)
   */
  function resume(ownerId = null) {
    const game = global.game;
    if (!game) {
      console.warn('[PauseController] Cannot resume - game object not available');
      return;
    }

    // If ownerId provided, remove it from owners set
    if (ownerId && pauseState.owners.has(ownerId)) {
      pauseState.owners.delete(ownerId);
      console.info(`[PauseController] Removed pause owner '${ownerId}' (remaining owners: ${Array.from(pauseState.owners).join(', ') || 'none'})`);
    } else if (ownerId) {
      console.warn(`[PauseController] Resume called for unknown owner '${ownerId}'`);
    }
    
    // Decrement ref count (backward compatibility)
    pauseState.refCount = Math.max(0, pauseState.refCount - 1);

    // Only resume if no owners remain
    if (pauseState.owners.size > 0) {
      console.info(`[PauseController] Still paused by owners: ${Array.from(pauseState.owners).join(', ')} (refCount: ${pauseState.refCount})`);
      return;
    }
    
    // Backward compatibility: also check refCount
    if (pauseState.refCount > 0) {
      console.info(`[PauseController] Still paused (refCount: ${pauseState.refCount})`);
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
        ownerId: ownerId,
        pauseDuration,
        phase: game.phase,
        week: game.week
      });
    }

    // Log telemetry
    logPauseEvent('resume', {
      reason: pauseState.reason,
      ownerId: ownerId,
      pauseDuration,
      phase: game.phase,
      week: game.week
    });

    // Reset pause state
    pauseState.isPaused = false;
    pauseState.reason = null;
    pauseState.pausedAt = null;
    pauseState.owners.clear();
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
      refCount: pauseState.refCount,
      owners: Array.from(pauseState.owners)
    };
  }
  
  /**
   * Get list of active pause owners
   * @returns {string[]}
   */
  function getOwners() {
    return Array.from(pauseState.owners);
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
  PauseController.getOwners = getOwners;
  PauseController.checkGuard = checkGuard;
  PauseController.guardFunction = guardFunction;

  // Export to global namespace
  global.PauseController = PauseController;

  // Debug helpers
  global.__debugPauseGame = () => pause('debug');
  global.__debugResumeGame = () => resume();

  console.info('[PauseController] Module loaded');

})(window);
