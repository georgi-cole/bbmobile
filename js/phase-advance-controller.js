// MODULE: phase-advance-controller.js
// Controls manual phase advance via "Next ▶" button
// Three-state model: blocked, ready, waiting
// Supports auto/manual mode toggle for backward compatibility

(function(global) {
  'use strict';

  // ======= STATE =======
  
  let state = 'blocked'; // 'blocked' | 'ready' | 'waiting'
  let mode = 'manual'; // 'manual' | 'auto'
  let pendingAdvance = null; // Function to call when user clicks Next
  let blockReasons = new Set(); // Reference-counted blocking reasons
  let watchdogTimer = null;
  let longPressTimer = null;
  let longPressStartTime = 0;
  
  // ======= CONSTANTS =======
  
  const WATCHDOG_TIMEOUT_MS = 60000; // 60 seconds
  const LONG_PRESS_DURATION_MS = 1500; // 1.5 seconds
  
  // ======= HELPERS =======
  
  /**
   * Log with module prefix
   */
  function log(message, ...args) {
    console.info('[PhaseAdvanceController]', message, ...args);
  }
  
  /**
   * Warn with module prefix
   */
  function warn(message, ...args) {
    console.warn('[PhaseAdvanceController]', message, ...args);
  }
  
  /**
   * Update UI to reflect current state
   */
  function updateUI() {
    const btn = document.getElementById('btnNextPhase');
    if (!btn) return;
    
    // Remove all state classes
    btn.classList.remove('phase-btn--blocked', 'phase-btn--ready', 'phase-btn--waiting');
    
    // Add current state class
    btn.classList.add(`phase-btn--${state}`);
    
    // Update disabled and aria attributes
    if (state === 'blocked') {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.style.pointerEvents = 'none';
    } else if (state === 'waiting') {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.style.pointerEvents = 'none';
    } else {
      btn.disabled = false;
      btn.setAttribute('aria-disabled', 'false');
      btn.style.pointerEvents = 'auto';
    }
    
    // Update button text based on phase
    updateButtonText();
    
    log('UI updated:', { state, blockReasons: Array.from(blockReasons) });
  }
  
  /**
   * Update button text based on current phase
   */
  function updateButtonText() {
    const btn = document.getElementById('btnNextPhase');
    if (!btn) return;
    
    const game = global.game || {};
    const phase = game.phase;
    
    // Special text for social phase
    if (phase === 'social' || phase === 'social_intermission') {
      btn.textContent = 'Done Socializing ▶';
    } else {
      btn.textContent = 'Next ▶';
    }
  }
  
  /**
   * Start watchdog timer to auto-unblock if stuck
   */
  function startWatchdog() {
    stopWatchdog();
    watchdogTimer = setTimeout(() => {
      if (state === 'blocked' && blockReasons.size > 0) {
        warn('Watchdog: Auto-unblocking after timeout. Blocked by:', Array.from(blockReasons));
        blockReasons.clear();
        setState('ready');
      }
    }, WATCHDOG_TIMEOUT_MS);
  }
  
  /**
   * Stop watchdog timer
   */
  function stopWatchdog() {
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
  }
  
  /**
   * Set state and update UI
   */
  function setState(newState) {
    if (state === newState) return;
    
    log(`State transition: ${state} → ${newState}`);
    state = newState;
    updateUI();
    
    // Start watchdog if blocked
    if (state === 'blocked') {
      startWatchdog();
    } else {
      stopWatchdog();
    }
    
    // Dispatch event
    try {
      const event = new CustomEvent('phaseadvance:statechange', {
        detail: { state: newState }
      });
      window.dispatchEvent(event);
    } catch (e) {
      warn('Failed to dispatch statechange event:', e);
    }
  }
  
  // ======= PUBLIC API =======
  
  /**
   * Block phase advance with a reason
   * Reference counted - multiple blocks stack
   */
  function block(reason) {
    if (!reason) {
      warn('block() called without reason, using "unknown"');
      reason = 'unknown';
    }
    
    blockReasons.add(reason);
    log('Blocked:', reason, '| Total reasons:', blockReasons.size);
    
    if (state !== 'waiting') {
      setState('blocked');
    }
  }
  
  /**
   * Unblock phase advance by removing a reason
   * Only transitions to ready when all reasons are cleared
   */
  function unblock(reason) {
    if (!reason) {
      warn('unblock() called without reason, using "unknown"');
      reason = 'unknown';
    }
    
    blockReasons.delete(reason);
    log('Unblocked:', reason, '| Remaining reasons:', blockReasons.size);
    
    // Only transition to ready if all blocks are cleared and not waiting
    if (blockReasons.size === 0 && state === 'blocked') {
      setState('ready');
    }
  }
  
  /**
   * Set the pending advance function to call when user clicks Next
   */
  function setPendingAdvance(fn) {
    if (typeof fn !== 'function') {
      warn('setPendingAdvance called with non-function:', typeof fn);
      return;
    }
    
    pendingAdvance = fn;
    log('Pending advance function set');
  }
  
  /**
   * Execute pending advance if state is ready
   */
  function advance() {
    if (mode === 'auto') {
      warn('advance() called but mode is auto');
      return;
    }
    
    if (state !== 'ready') {
      warn('advance() called but state is not ready:', state);
      return;
    }
    
    if (!pendingAdvance) {
      warn('advance() called but no pending advance function set');
      return;
    }
    
    log('Advancing to next phase...');
    setState('waiting');
    
    try {
      pendingAdvance();
    } catch (e) {
      console.error('[PhaseAdvanceController] Error executing pending advance:', e);
      // Reset to ready on error
      setState('ready');
    }
  }
  
  /**
   * Force advance even when blocked (debug safety net)
   */
  function forceAdvance() {
    if (!pendingAdvance) {
      warn('forceAdvance() called but no pending advance function set');
      return;
    }
    
    warn('FORCE ADVANCE - Clearing all blocks and advancing');
    blockReasons.clear();
    stopWatchdog();
    setState('waiting');
    
    try {
      pendingAdvance();
    } catch (e) {
      console.error('[PhaseAdvanceController] Error executing force advance:', e);
      setState('ready');
    }
  }
  
  /**
   * Reset controller for new phase
   * Called at the start of setPhase
   */
  function reset() {
    log('Resetting for new phase');
    blockReasons.clear();
    stopWatchdog();
    pendingAdvance = null;
    setState('blocked');
  }
  
  /**
   * Set mode (manual or auto)
   */
  function setMode(newMode) {
    if (newMode !== 'manual' && newMode !== 'auto') {
      warn('Invalid mode:', newMode);
      return;
    }
    
    if (mode === newMode) return;
    
    log(`Mode changed: ${mode} → ${newMode}`);
    mode = newMode;
    
    // Update game flag
    if (global.game) {
      global.game.manualAdvanceMode = (mode === 'manual');
    }
    
    // Update UI visibility
    updateUIVisibility();
    
    // Persist to localStorage
    try {
      localStorage.setItem('bb.manualAdvance', mode === 'manual' ? 'true' : 'false');
    } catch (e) {
      warn('Failed to persist mode to localStorage:', e);
    }
    
    // Dispatch event
    try {
      const event = new CustomEvent('phaseadvance:modechange', {
        detail: { mode: newMode }
      });
      window.dispatchEvent(event);
    } catch (e) {
      warn('Failed to dispatch modechange event:', e);
    }
  }
  
  /**
   * Get current mode
   */
  function getMode() {
    return mode;
  }
  
  /**
   * Get current state
   */
  function getState() {
    return state;
  }
  
  /**
   * Update UI visibility based on mode
   */
  function updateUIVisibility() {
    const btn = document.getElementById('btnNextPhase');
    const hourglass = document.querySelector('.hourglass-container, #hourglassContainer');
    
    if (mode === 'manual') {
      if (btn) btn.style.display = 'block';
      if (hourglass) hourglass.style.display = 'none';
    } else {
      if (btn) btn.style.display = 'none';
      if (hourglass) hourglass.style.display = 'block';
    }
  }
  
  /**
   * Initialize controller
   */
  function init() {
    log('Initializing...');
    
    // Load mode from localStorage
    try {
      const saved = localStorage.getItem('bb.manualAdvance');
      if (saved !== null) {
        mode = saved === 'true' ? 'manual' : 'auto';
        log('Loaded mode from localStorage:', mode);
      }
    } catch (e) {
      warn('Failed to load mode from localStorage:', e);
    }
    
    // Set game flag
    if (global.game) {
      global.game.manualAdvanceMode = (mode === 'manual');
    }
    
    // Wire button click handler
    const btn = document.getElementById('btnNextPhase');
    if (btn) {
      // Regular click
      btn.addEventListener('click', () => {
        if (state === 'ready') {
          advance();
        }
      });
      
      // Long-press for force advance
      btn.addEventListener('mousedown', handleLongPressStart);
      btn.addEventListener('touchstart', handleLongPressStart);
      btn.addEventListener('mouseup', handleLongPressEnd);
      btn.addEventListener('touchend', handleLongPressEnd);
      btn.addEventListener('mouseleave', handleLongPressEnd);
      
      log('Button handlers wired');
    } else {
      warn('Button #btnNextPhase not found in DOM');
    }
    
    // Initial UI update
    updateUI();
    updateUIVisibility();
    
    log('Initialized successfully:', { mode, state });
  }
  
  /**
   * Handle long-press start
   */
  function handleLongPressStart(e) {
    longPressStartTime = Date.now();
    longPressTimer = setTimeout(() => {
      log('Long-press detected - force advancing');
      forceAdvance();
    }, LONG_PRESS_DURATION_MS);
  }
  
  /**
   * Handle long-press end
   */
  function handleLongPressEnd(e) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }
  
  // ======= EXPORT =======
  
  const PhaseAdvanceController = {
    init,
    block,
    unblock,
    setPendingAdvance,
    advance,
    forceAdvance,
    reset,
    setMode,
    getMode,
    getState,
    updateButtonText
  };
  
  // Expose to global
  global.PhaseAdvanceController = PhaseAdvanceController;
  
  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    setTimeout(init, 0);
  }
  
  log('Module loaded');
  
})(window);
