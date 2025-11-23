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

    // Call the appropriate results function
    if (compType === 'HOH' || compType === 'hoh') {
      // Jump to HOH results
      if (typeof global.finishCompPhase === 'function') {
        console.info('[PhaseTimerBridge] → Calling finishCompPhase (HOH results)');
        global.finishCompPhase();
      } else {
        console.warn('[PhaseTimerBridge] finishCompPhase not available');
      }
    } else if (compType === 'Veto' || compType === 'veto' || compType === 'pov') {
      // Jump to Veto results
      if (typeof global.finishVetoPhase === 'function') {
        console.info('[PhaseTimerBridge] → Calling finishVetoPhase (Veto results)');
        global.finishVetoPhase();
      } else {
        console.warn('[PhaseTimerBridge] finishVetoPhase not available');
      }
    } else {
      console.warn(`[PhaseTimerBridge] Unknown compType: ${compType}, cannot skip to results`);
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

  // Export API
  PhaseTimerBridge.init = init;
  PhaseTimerBridge.isSuspended = isSuspended;
  PhaseTimerBridge.getSuspendReason = getSuspendReason;
  PhaseTimerBridge.manualResume = manualResume;
  PhaseTimerBridge.handleSuspend = handleSuspend;
  PhaseTimerBridge.handleSkipToResults = handleSkipToResults;

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
