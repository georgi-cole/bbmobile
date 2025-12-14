// MODULE: game-control.js
// Simple GameControl API for pausing and resuming the game during cinematic moments
// Saves/restores game.endAt and game.phaseEndsAt for timer consistency

(function(global) {
  'use strict';

  const GameControl = {};

  // Internal state
  let pausedState = null;

  /**
   * Pause the game for a voting sequence or cinematic moment
   * Saves timer state and sets a pause flag
   */
  function pauseForVoting() {
    const g = global.game;
    if (!g) {
      console.warn('[GameControl] Cannot pause - game object not available');
      return;
    }

    if (pausedState) {
      console.info('[GameControl] Already paused');
      return;
    }

    const now = Date.now();

    // Capture current timer state
    pausedState = {
      pausedAt: now,
      endAt: g.endAt || null,
      phaseEndsAt: g.phaseEndsAt || null,
      remainingMs: null
    };

    // Calculate remaining time
    if (g.endAt && typeof g.endAt === 'number') {
      pausedState.remainingMs = Math.max(0, g.endAt - now);
    } else if (g.phaseEndsAt && typeof g.phaseEndsAt === 'number') {
      pausedState.remainingMs = Math.max(0, g.phaseEndsAt - now);
    }

    // Set pause flag
    g.__jurorVotingPaused = true;

    // Add visual class for debugging
    if (document.body) {
      document.body.classList.add('juror-voting-active');
    }

    console.info('[GameControl] ⏸ Game paused for voting', {
      remainingMs: pausedState.remainingMs,
      endAt: pausedState.endAt,
      phaseEndsAt: pausedState.phaseEndsAt
    });
  }

  /**
   * Resume the game after voting completes
   * Restores timer state with adjusted endAt values
   */
  function resumeFromVoting() {
    const g = global.game;
    if (!g) {
      console.warn('[GameControl] Cannot resume - game object not available');
      return;
    }

    if (!pausedState) {
      console.info('[GameControl] Not paused, ignoring resume');
      return;
    }

    const now = Date.now();
    const pauseDuration = now - pausedState.pausedAt;

    // Restore timer state with adjusted endAt
    if (pausedState.remainingMs !== null && pausedState.remainingMs > 0) {
      const newEndAt = now + pausedState.remainingMs;

      if (pausedState.endAt) {
        g.endAt = newEndAt;
      }
      if (pausedState.phaseEndsAt) {
        g.phaseEndsAt = newEndAt;
      }

      console.info('[GameControl] ▶ Game resumed', {
        pauseDuration,
        remainingMs: pausedState.remainingMs,
        newEndAt
      });
    } else {
      console.info('[GameControl] ▶ Game resumed (timer already expired)');
    }

    // Clear pause flag
    g.__jurorVotingPaused = false;

    // Remove visual class
    if (document.body) {
      document.body.classList.remove('juror-voting-active');
    }

    // Clear state
    pausedState = null;
  }

  /**
   * Check if game is currently paused
   * @returns {boolean}
   */
  function isPaused() {
    return pausedState !== null;
  }

  /**
   * Get current pause state for debugging
   * @returns {Object|null}
   */
  function getState() {
    return pausedState;
  }

  // Export API
  GameControl.pauseForVoting = pauseForVoting;
  GameControl.resumeFromVoting = resumeFromVoting;
  GameControl.isPaused = isPaused;
  GameControl.getState = getState;

  // Export to global namespace
  global.GameControl = GameControl;

  console.info('[GameControl] Module loaded');

})(window);
