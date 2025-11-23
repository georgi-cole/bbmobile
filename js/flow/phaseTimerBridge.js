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
  
  // Track global pause state (for settings modal, etc.)
  let globalPauseActive = false;
  let globalPauseReason = null;

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
   * Globally pause the entire game (used by Settings modal)
   * Pauses phase timer, disables game advancement, and blocks interactions
   * @param {string} reason - Why the pause was triggered
   */
  function pause(reason = 'settings') {
    const game = global.game;
    if (!game) {
      console.warn('[PhaseTimerBridge] Cannot pause - game not initialized');
      return false;
    }
    
    if (globalPauseActive) {
      console.info('[PhaseTimerBridge] Already paused');
      return true;
    }
    
    console.info(`[PhaseTimerBridge] ⏸️ GLOBAL PAUSE (reason: ${reason})`);
    
    // Set global pause flag
    globalPauseActive = true;
    globalPauseReason = reason;
    game.isGloballyPaused = true;
    
    // Pause phase timer if it exists
    if (typeof global.pausePhaseTimer === 'function') {
      global.pausePhaseTimer();
    } else if (game.timerPaused !== undefined) {
      // Store remaining time before pausing (always update to current remaining time)
      if (game.endAt) {
        game.pausedTimeRemaining = Math.max(0, game.endAt - Date.now());
      }
      game.timerPaused = true;
    }
    
    // Disable game advancement UI
    disableGameAdvancementUI();
    
    // Emit pause event
    if (game.bus) {
      game.bus.emit('game:paused', { reason });
    }
    
    return true;
  }
  
  /**
   * Resume the globally paused game
   * Restores phase timer, re-enables game advancement, and unblocks interactions
   */
  function resume() {
    const game = global.game;
    if (!game) {
      console.warn('[PhaseTimerBridge] Cannot resume - game not initialized');
      return false;
    }
    
    if (!globalPauseActive) {
      console.info('[PhaseTimerBridge] Not currently paused');
      return true;
    }
    
    console.info('[PhaseTimerBridge] ▶️ GLOBAL RESUME');
    
    // Clear global pause flag
    globalPauseActive = false;
    globalPauseReason = null;
    game.isGloballyPaused = false;
    
    // Resume phase timer if it exists
    if (typeof global.resumePhaseTimer === 'function') {
      global.resumePhaseTimer();
    } else if (game.timerPaused !== undefined) {
      game.timerPaused = false;
      if (game.pausedTimeRemaining != null) {
        game.endAt = Date.now() + game.pausedTimeRemaining;
        if (game.phaseEndsAt !== undefined) {
          game.phaseEndsAt = game.endAt;
        }
        // Clear pausedTimeRemaining after restoring timer to avoid confusion
        game.pausedTimeRemaining = null;
      }
    }
    
    // Re-enable game advancement UI
    enableGameAdvancementUI();
    
    // Emit resume event
    if (game.bus) {
      game.bus.emit('game:resumed', { reason: globalPauseReason });
    }
    
    return true;
  }
  
  /**
   * Force the current phase timer to timeout immediately
   * Used when user wants to skip the current phase
   */
  function forceTimeout() {
    const game = global.game;
    if (!game) {
      console.warn('[PhaseTimerBridge] Cannot force timeout - game not initialized');
      return false;
    }
    
    console.info('[PhaseTimerBridge] ⏭️ Force timeout triggered');
    
    // If phase timeout callback exists, call it directly
    if (typeof game.phaseTimeoutCallback === 'function') {
      try {
        game.phaseTimeoutCallback();
        return true;
      } catch (err) {
        console.error('[PhaseTimerBridge] Error forcing timeout:', err);
        return false;
      }
    }
    
    // Fallback: set endAt to expired
    if (game.endAt !== undefined) {
      game.endAt = Date.now() - 1000; // Set to past
      return true;
    }
    
    console.warn('[PhaseTimerBridge] No timeout mechanism available');
    return false;
  }
  
  /**
   * Check if game is currently globally paused
   * @returns {boolean}
   */
  function isGloballyPaused() {
    return globalPauseActive;
  }
  
  /**
   * Get the current global pause reason
   * @returns {string|null}
   */
  function getGlobalPauseReason() {
    return globalPauseReason;
  }
  
  /**
   * Disable all game advancement UI elements
   * Disables FFWD, skip buttons, card manager interactions
   */
  function disableGameAdvancementUI() {
    // Disable fast-forward button
    const ffBtn = document.getElementById('btnFastForward') || 
                  document.querySelector('[data-action="fast-forward"]') ||
                  document.querySelector('.btn-fast-forward');
    if (ffBtn) {
      ffBtn.disabled = true;
      ffBtn.dataset.pausedDisabled = 'true';
      ffBtn.style.opacity = '0.5';
      ffBtn.style.pointerEvents = 'none';
    }
    
    // Disable skip phase button
    const skipBtn = document.getElementById('btnSkipPhase') ||
                    document.querySelector('[data-action="skip-phase"]') ||
                    document.querySelector('.btn-skip-phase');
    if (skipBtn) {
      skipBtn.disabled = true;
      skipBtn.dataset.pausedDisabled = 'true';
      skipBtn.style.opacity = '0.5';
      skipBtn.style.pointerEvents = 'none';
    }
    
    // Disable card manager skip buttons
    const cardSkipBtns = document.querySelectorAll('[data-action="skip-cards"], .btn-skip-cards, #btnSkipCards');
    cardSkipBtns.forEach(btn => {
      btn.disabled = true;
      btn.dataset.pausedDisabled = 'true';
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
    });
    
    // Add paused overlay to TV screen
    addPausedOverlay();
  }
  
  /**
   * Re-enable all game advancement UI elements
   */
  function enableGameAdvancementUI() {
    // Re-enable fast-forward button
    const ffBtn = document.getElementById('btnFastForward') || 
                  document.querySelector('[data-action="fast-forward"]') ||
                  document.querySelector('.btn-fast-forward');
    if (ffBtn && ffBtn.dataset.pausedDisabled === 'true') {
      delete ffBtn.dataset.pausedDisabled;
      ffBtn.disabled = false;
      ffBtn.style.opacity = '';
      ffBtn.style.pointerEvents = '';
    }
    
    // Re-enable skip phase button
    const skipBtn = document.getElementById('btnSkipPhase') ||
                    document.querySelector('[data-action="skip-phase"]') ||
                    document.querySelector('.btn-skip-phase');
    if (skipBtn && skipBtn.dataset.pausedDisabled === 'true') {
      delete skipBtn.dataset.pausedDisabled;
      skipBtn.disabled = false;
      skipBtn.style.opacity = '';
      skipBtn.style.pointerEvents = '';
    }
    
    // Re-enable card manager skip buttons
    const cardSkipBtns = document.querySelectorAll('[data-action="skip-cards"], .btn-skip-cards, #btnSkipCards');
    cardSkipBtns.forEach(btn => {
      if (btn.dataset.pausedDisabled === 'true') {
        delete btn.dataset.pausedDisabled;
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
      }
    });
    
    // Remove paused overlay
    removePausedOverlay();
  }
  
  /**
   * Add visual "paused" overlay to TV screen
   */
  function addPausedOverlay() {
    // Don't add duplicate overlay
    if (document.getElementById('gamePausedOverlay')) return;
    
    const tv = document.getElementById('tv');
    if (!tv) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'gamePausedOverlay';
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      pointer-events: none;
    `;
    
    const message = document.createElement('div');
    message.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      color: #1a1a1a;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    message.innerHTML = '⏸️ Game Paused<br><span style="font-size: 0.85rem; font-weight: 400; opacity: 0.8;">Close settings to resume</span>';
    
    overlay.appendChild(message);
    tv.appendChild(overlay);
  }
  
  /**
   * Remove the visual "paused" overlay from TV screen
   */
  function removePausedOverlay() {
    const overlay = document.getElementById('gamePausedOverlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Export API
  PhaseTimerBridge.init = init;
  PhaseTimerBridge.isSuspended = isSuspended;
  PhaseTimerBridge.getSuspendReason = getSuspendReason;
  PhaseTimerBridge.manualResume = manualResume;
  PhaseTimerBridge.handleSuspend = handleSuspend;
  PhaseTimerBridge.handleSkipToResults = handleSkipToResults;
  
  // Export new global pause/resume API
  PhaseTimerBridge.pause = pause;
  PhaseTimerBridge.resume = resume;
  PhaseTimerBridge.forceTimeout = forceTimeout;
  PhaseTimerBridge.isGloballyPaused = isGloballyPaused;
  PhaseTimerBridge.getGlobalPauseReason = getGlobalPauseReason;

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
