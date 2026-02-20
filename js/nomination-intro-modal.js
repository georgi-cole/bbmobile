// MODULE: nomination-intro-modal.js
// Clean-room rebuild of nomination ceremony intro modal with proper state machine
// Fixes: freeze after interaction, resolve-after-remove, dual-path resume, leaked listeners
// Design: Single responsibility, finite state machine, guaranteed resolution
//
// PAUSE + WATCHDOG SYSTEM:
// - Pauses phase timer when modal is shown to prevent player interruption
// - Uses PauseController if available, falls back to local refcount mechanism
// - Watchdog timer (30s default) auto-releases pause to prevent indefinite halt
// - Special handling for ad flow: extends watchdog, ignores visibility changes
// - Server-first design: modal always closes on phase change, never blocks game
// - All pause operations wrapped in try/catch for safety
// - Idempotent release ensures no double-release errors

(function(global) {
  'use strict';

  // Configuration constants
  const CONFIG = {
    FAILSAFE_TIMEOUT_MS: 10000,  // Absolute maximum time before force-resolve
    DISMISS_ANIMATION_MS: 300,   // Modal fade-out animation duration
    TOAST_DURATION_MS: 2000,     // Toast notification auto-dismiss time
    PLEA_DELAY_BEFORE_DISMISS_MS: 500,  // Delay before dismissing after plea completes
    CHECK_RISK_ENERGY_COST: 10,  // Energy required to check risk
    PLEA_ENERGY_COST: 5,         // Energy required to make a plea
    RECHARGE_ENERGY_AMOUNT: 5,   // Energy awarded from ad recharge
    VISIBILITY_THRESHOLD_MS: 500, // Minimum visibility time before allowing visibility-dismiss
    NOMS_MODAL_MAX_PAUSE_MS: 90000 // Watchdog timeout for pause (90 seconds)
  };

  // State machine states
  const STATE = {
    IDLE: 'idle',
    SHOWING: 'showing',
    RISK_VIEW: 'risk',
    PLEA: 'plea',
    DISMISSING: 'dismissing',
    DONE: 'done'
  };

  // Module state
  let currentState = STATE.IDLE;
  let abortController = null;
  let overlayElement = null;
  let styleElement = null;
  let resolvePromise = null;
  let resolved = false;
  let failsafeTimeout = null;
  let rafId = null;
  let modalShowTime = 0; // Timestamp when modal became visible
  let currentRiskData = null; // Cached risk data for post-plea update
  
  // Pause and watchdog state
  let pauseHandle = null; // Handle for releasing pause
  let watchdogTimer = null; // Watchdog timeout ID
  let modalAdActive = false; // Flag indicating ad is currently playing

  /**
   * Initialize local pause refcount fallback if needed
   * This provides a safety net when PauseController is not available
   */
  function initLocalPauseFallback() {
    if (!global.__modalTimerPause) {
      global.__modalTimerPause = {
        refCount: 0,
        owners: new Set()
      };
    }
  }

  /**
   * Request a phase timer pause
   * Prefers PauseController if available, falls back to local refcount
   * @returns {Object} pauseHandle - Object with release() method
   */
  function requestPause() {
    console.info('[NominationIntroModal] Requesting pause');
    
    const ownerId = 'modal:nomination-intro';
    let usedPauseController = false;
    
    // Try PauseController first
    try {
      if (global.PauseController && typeof global.PauseController.pause === 'function') {
        global.PauseController.pause(ownerId);
        usedPauseController = true;
        console.info('[NominationIntroModal] Pause requested via PauseController');
      }
    } catch (err) {
      console.warn('[NominationIntroModal] PauseController.pause failed:', err);
      usedPauseController = false;
    }
    
    // Fallback to local refcount mechanism
    if (!usedPauseController) {
      initLocalPauseFallback();
      global.__modalTimerPause.refCount++;
      global.__modalTimerPause.owners.add(ownerId);
      console.info(`[NominationIntroModal] Pause requested via local fallback (refCount: ${global.__modalTimerPause.refCount})`);
    }
    
    // Start watchdog timer
    startWatchdog();
    
    // Return handle for release
    return {
      ownerId: ownerId,
      usedPauseController: usedPauseController,
      released: false,
      release: function() {
        releasePause(this);
      }
    };
  }

  /**
   * Release a phase timer pause
   * Idempotent - safe to call multiple times
   * @param {Object} handle - The pause handle returned by requestPause()
   */
  function releasePause(handle) {
    if (!handle || handle.released) {
      return; // Already released or invalid
    }
    
    console.info('[NominationIntroModal] Releasing pause');
    
    // Mark as released to prevent double-release
    handle.released = true;
    
    // Clear watchdog
    clearWatchdog();
    
    // Release via PauseController if that's what we used
    if (handle.usedPauseController) {
      try {
        if (global.PauseController && typeof global.PauseController.resume === 'function') {
          global.PauseController.resume(handle.ownerId);
          console.info('[NominationIntroModal] Pause released via PauseController');
        }
      } catch (err) {
        console.warn('[NominationIntroModal] PauseController.resume failed:', err);
      }
    } else {
      // Release via local fallback
      if (global.__modalTimerPause) {
        global.__modalTimerPause.refCount = Math.max(0, global.__modalTimerPause.refCount - 1);
        global.__modalTimerPause.owners.delete(handle.ownerId);
        console.info(`[NominationIntroModal] Pause released via local fallback (refCount: ${global.__modalTimerPause.refCount})`);
      }
    }
  }

  /**
   * Start watchdog timer to auto-release pause after timeout
   * Default timeout from CONFIG.NOMS_MODAL_MAX_PAUSE_MS (30s)
   */
  function startWatchdog() {
    // Clear any existing watchdog
    clearWatchdog();
    
    // Get timeout from game config or use default
    const g = global.game;
    const timeout = g?.cfg?.NOMS_MODAL_MAX_PAUSE_MS || CONFIG.NOMS_MODAL_MAX_PAUSE_MS;
    
    console.info(`[NominationIntroModal] Starting watchdog timer (${timeout}ms)`);
    
    watchdogTimer = setTimeout(() => {
      console.warn('[NominationIntroModal] Watchdog timeout - auto-releasing pause');
      
      // Auto-release the pause
      if (pauseHandle && !pauseHandle.released) {
        releasePause(pauseHandle);
        pauseHandle = null;
        
        // Show non-blocking toast to user
        showToast('Timer resumed to keep the game moving', 3000);
      }
      
      watchdogTimer = null;
    }, timeout);
  }

  /**
   * Clear watchdog timer
   * Idempotent - safe to call multiple times
   */
  function clearWatchdog() {
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
      console.info('[NominationIntroModal] Watchdog timer cleared');
    }
  }

  /**
   * Extend or reset watchdog timer
   * Used during ad playback to prevent premature timeout
   */
  function extendWatchdog() {
    if (watchdogTimer) {
      console.info('[NominationIntroModal] Extending watchdog timer');
      clearWatchdog();
      startWatchdog();
    }
  }

  /**
   * Compute nomination risk for current player
   * @returns {Object} Risk data with percentage and explanation
   */
  function computeNominationRisk() {
    const g = global.game;
    if (!g) return { risk: 50, explanation: 'Unable to assess risk' };

    const hoh = global.getP?.(g.hohId);
    const player = global.getP?.(g.humanId);
    
    if (!hoh || !player) {
      return { risk: 50, explanation: 'Unable to assess risk' };
    }

    // Get available targets (alive, not HOH, not veto holder)
    const alive = global.alivePlayers?.() || [];
    const vetoHolderId = g.vetoWinner || g.vetoHolder;
    const availableTargets = alive.filter(p => 
      p.id !== g.hohId && 
      p.id !== vetoHolderId &&
      !p.evicted
    );
    
    const slots = Math.max(2, Math.min(4, g.__twistNomSlots || 2));
    
    // Base components (all 0..1 normalized)
    const threat = Math.min(1, Math.max(0, player.threat || 0));
    const affinityScore = hoh.affinity?.[player.id];
    const affinity = (affinityScore !== undefined && affinityScore !== null)
      ? Math.min(1, Math.max(0, affinityScore))
      : 0.5; // neutral if unknown
    const houseRep = Math.min(1, Math.max(0, global.game?.houseReputation || 0.5));

    // Weighted calculation with reduced threat impact
    const baseRisk =
      (threat * 35) +                  // threat: 0-35 points
      ((1 - affinity) * 40) +          // poor affinity with HOH: 0-40 points
      ((1 - houseRep) * 15);           // poor house standing: 0-15 points

    // Add small random variance (-5 to +5)
    const variance = (Math.random() * 10) - 5;
    const risk = Math.round(Math.min(100, Math.max(0, baseRisk + variance)));

    // Generate contextual explanation
    let explanation = '';
    if (threat > 0.6) {
      explanation += 'High threat level increases risk. ';
    } else if (threat < 0.4) {
      explanation += 'Low threat level reduces risk. ';
    }
    
    if (affinity < 0.4) {
      explanation += 'Strong relationship with HOH reduces risk. ';
    } else if (affinity > 0.6) {
      explanation += 'Weak relationship with HOH increases risk. ';
    }
    
    if (houseRep < 0.4) {
      explanation += 'Poor house reputation increases risk.';
    } else if (houseRep > 0.6) {
      explanation += 'Good house reputation reduces risk.';
    }
    
    if (!explanation) {
      explanation = 'Your position in the house is moderate.';
    }

    const numericRisk = risk;
    const label = getRiskCategory(numericRisk).category;
    console.info('[NominationIntroModal] Risk calculation:', { threat, affinity, houseRep, baseRisk, variance, numericRisk, label });

    return { risk, explanation, threat, affinity, houseReputation: houseRep };
  }

  /**
   * Map numeric risk (0-100) to categorical label
   * @param {number} risk - Numeric risk value
   * @returns {Object} { category, description }
   */
  function getRiskCategory(risk) {
    if (risk <= 5) {
      return { category: 'unknown', description: 'Your risk is currently unknown', color: '#8a9fb5' };
    } else if (risk <= 20) {
      return { category: 'very low', description: 'You are very unlikely to be nominated', color: '#44ff88' };
    } else if (risk <= 35) {
      return { category: 'low', description: 'You have a low chance of being nominated', color: '#77ff55' };
    } else if (risk <= 55) {
      return { category: 'medium', description: 'You have a moderate chance of being nominated', color: '#ffaa44' };
    } else if (risk <= 70) {
      return { category: 'high', description: 'You have a high chance of being nominated', color: '#ff8844' };
    } else if (risk <= 85) {
      return { category: 'very high', description: 'You are very likely to be nominated', color: '#ff5544' };
    } else {
      return { category: 'extreme', description: 'You are almost certainly being nominated', color: '#ff4444' };
    }
  }

  /**
   * Check if risk level requires plea option
   * @param {number} risk - Numeric risk value
   * @returns {boolean}
   */
  function isHighRisk(risk) {
    const { category } = getRiskCategory(risk);
    return category === 'high' || category === 'very high' || category === 'extreme';
  }

  /**
   * Get player social energy
   * @param {number} playerId - Player ID
   * @returns {number} Current energy
   */
  function getPlayerEnergy(playerId) {
    // Try SocialManeuvers energy bank first
    if (global.SocialManeuvers?.SocialEnergyBank?.get) {
      return global.SocialManeuvers.SocialEnergyBank.get(playerId);
    }
    
    // Fallback to SocialResources
    if (global.SocialManeuvers?.SocialResources?.get) {
      return global.SocialManeuvers.SocialResources.get(playerId, 'energy') || 0;
    }
    
    // Default fallback
    return 5;
  }

  /**
   * Deduct player social energy
   * @param {number} playerId - Player ID
   * @param {number} amount - Amount to deduct
   * @returns {boolean} Success
   */
  function deductPlayerEnergy(playerId, amount) {
    // Try SocialManeuvers energy bank first
    if (global.SocialManeuvers?.SocialEnergyBank?.adjust) {
      const newEnergy = global.SocialManeuvers.SocialEnergyBank.adjust(playerId, -amount);
      console.info(`[NominationIntroModal] Deducted ${amount} energy from player ${playerId}, new balance: ${newEnergy}`);
      return true;
    }
    
    // Fallback to SocialResources
    if (global.SocialManeuvers?.SocialResources?.adjust) {
      global.SocialManeuvers.SocialResources.adjust(playerId, 'energy', -amount);
      console.info(`[NominationIntroModal] Deducted ${amount} energy from player ${playerId} via SocialResources`);
      return true;
    }
    
    console.warn('[NominationIntroModal] Unable to deduct energy - no energy system available');
    return false;
  }

  /**
   * Add player social energy
   * @param {number} playerId - Player ID
   * @param {number} amount - Amount to add
   * @returns {boolean} Success
   */
  function addPlayerEnergy(playerId, amount) {
    // Try SocialManeuvers energy bank first
    if (global.SocialManeuvers?.SocialEnergyBank?.adjust) {
      const newEnergy = global.SocialManeuvers.SocialEnergyBank.adjust(playerId, amount);
      console.info(`[NominationIntroModal] Added ${amount} energy to player ${playerId}, new balance: ${newEnergy}`);
      return true;
    }
    
    // Fallback to SocialResources
    if (global.SocialManeuvers?.SocialResources?.adjust) {
      global.SocialManeuvers.SocialResources.adjust(playerId, 'energy', amount);
      console.info(`[NominationIntroModal] Added ${amount} energy to player ${playerId} via SocialResources`);
      return true;
    }
    
    console.warn('[NominationIntroModal] Unable to add energy - no energy system available');
    return false;
  }

  /**
   * Cleanup function - removes all DOM nodes, event listeners, and timeouts
   * Idempotent - safe to call multiple times
   */
  function cleanup() {
    console.info('[NominationIntroModal] Cleanup starting');

    // Release pause if still held
    if (pauseHandle && !pauseHandle.released) {
      try {
        releasePause(pauseHandle);
      } catch (err) {
        console.error('[NominationIntroModal] Error releasing pause during cleanup:', err);
      }
      pauseHandle = null;
    }

    // Clear watchdog timer
    clearWatchdog();

    // Clear failsafe timeout
    if (failsafeTimeout) {
      clearTimeout(failsafeTimeout);
      failsafeTimeout = null;
    }

    // Cancel pending RAF (prevents style access on removed DOM nodes after alt-tab)
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    // Abort all event listeners
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    // Remove overlay
    if (overlayElement && overlayElement.parentNode) {
      overlayElement.parentNode.removeChild(overlayElement);
    }
    overlayElement = null;

    // Remove style tag
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
    styleElement = null;

    // Clear plea active flag
    const g = global.game;
    if (g) {
      g.__nominationPleaActive = false;
    }

    // Clear ad active flag
    modalAdActive = false;

    // Reset module state to IDLE for next show
    currentState = STATE.IDLE;
    resolved = false;
    resolvePromise = null;
    modalShowTime = 0;
    currentRiskData = null;

    console.info('[NominationIntroModal] Cleanup complete - state reset to IDLE');
  }

  /**
   * Guarantee promise resolution - can only be called once
   */
  function guaranteeResolve() {
    if (resolved) return;
    resolved = true;

    console.info('[NominationIntroModal] Resolving promise');

    if (resolvePromise) {
      resolvePromise();
      resolvePromise = null;
    }

    // Transition to DONE state only if not already dismissing
    // This prevents state machine corruption when failsafe fires during dismiss
    if (currentState !== STATE.DISMISSING) {
      currentState = STATE.DONE;
    }
  }

  /**
   * Dismiss modal - animates out, resolves promise, then cleans up
   * Also forces phase advance if needed
   */
  function dismiss() {
    if (currentState === STATE.DISMISSING || currentState === STATE.DONE) {
      return;
    }

    console.info('[NominationIntroModal] Dismissing modal');
    currentState = STATE.DISMISSING;

    // Check for motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // CRITICAL: Resolve promise BEFORE animating out
    guaranteeResolve();

    // Animate out
    if (overlayElement) {
      overlayElement.style.opacity = '0';
      const modal = overlayElement.querySelector('.nomination-intro-modal-container');
      if (modal && !prefersReducedMotion) {
        modal.style.transform = 'scale(0.96)';
      }
    }

    // Dispatch dismissal event
    try {
      const event = new CustomEvent('bb:noms:intro:dismissed', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(event);
      console.info('[NominationIntroModal] Dispatched bb:noms:intro:dismissed event');
    } catch (err) {
      console.error('[NominationIntroModal] Error dispatching event:', err);
    }

    // Force phase advance to nominations
    forcePhaseAdvance();

    // Cleanup after animation (or immediately if no animation)
    setTimeout(() => {
      cleanup();
    }, CONFIG.DISMISS_ANIMATION_MS);
  }

  /**
   * Force phase advance to nominations
   * Sets timer to 1 second if phase cannot advance immediately
   */
  function forcePhaseAdvance() {
    const g = global.game;
    if (!g) return;

    console.info('[NominationIntroModal] Forcing phase advance to nominations');

    // Try to set phase directly if setPhase is available
    if (typeof g.setPhase === 'function') {
      try {
        // Set to nominations phase with 1 second timer
        g.setPhase('nominations', 1);
        console.info('[NominationIntroModal] Set phase to nominations with 1s timer');
        return;
      } catch (err) {
        console.warn('[NominationIntroModal] Error calling setPhase:', err);
      }
    }

    // Fallback: try to shorten current phase timer to 1 second
    if (g.phaseEndsAt || g.endAt) {
      const now = Date.now();
      const targetEndTime = now + 1000; // 1 second from now
      
      if (g.phaseEndsAt) {
        g.phaseEndsAt = targetEndTime;
      }
      if (g.endAt) {
        g.endAt = targetEndTime;
      }
      
      console.info('[NominationIntroModal] Set phase end time to 1s from now');
      return;
    }

    // Last resort: try global phase advance functions
    if (typeof global.schedulePhaseAdvanceIn === 'function') {
      try {
        global.schedulePhaseAdvanceIn(1000);
        console.info('[NominationIntroModal] Scheduled phase advance in 1s');
        return;
      } catch (err) {
        console.warn('[NominationIntroModal] Error scheduling phase advance:', err);
      }
    }

    console.warn('[NominationIntroModal] Unable to force phase advance - no suitable method found');
  }

  /**
   * Show in-modal toast notification (non-blocking)
   * @param {string} message - Toast message
   * @param {number} duration - Duration in ms (default: CONFIG.TOAST_DURATION_MS)
   */
  function showToast(message, duration = CONFIG.TOAST_DURATION_MS) {
    if (!overlayElement) return;

    const toast = document.createElement('div');
    toast.className = 'nomination-intro-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 0.9rem;
      z-index: 10000000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      animation: toastFadeIn 0.3s ease;
    `;

    overlayElement.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'toastFadeOut 0.3s ease';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }
    }, duration);
  }

  /**
   * Handle ad recharge flow
   * Calls global.showAdReward hook and awards energy on success
   * @returns {Promise<boolean>} Success status
   */
  async function handleRecharge() {
    const g = global.game;
    const humanId = g?.humanId;
    
    if (!humanId) {
      showToast('Unable to recharge energy');
      return false;
    }

    console.info('[NominationIntroModal] Starting recharge flow');

    try {
      // Set ad active flag
      modalAdActive = true;
      
      // Extend watchdog during ad playback
      extendWatchdog();
      
      // Call the ad hook (global.showAdReward)
      if (typeof global.showAdReward === 'function') {
        const result = await global.showAdReward();
        
        if (result && result.rewarded) {
          // Award energy
          const amount = result.amount || CONFIG.RECHARGE_ENERGY_AMOUNT;
          addPlayerEnergy(humanId, amount);
          showToast(`+${amount} social energy! You're recharged.`, 2500);
          return true;
        } else {
          showToast('Ad viewing cancelled');
          return false;
        }
      } else {
        // Fallback for testing: auto-award energy
        console.warn('[NominationIntroModal] global.showAdReward not available, using fallback');
        addPlayerEnergy(humanId, CONFIG.RECHARGE_ENERGY_AMOUNT);
        showToast(`+${CONFIG.RECHARGE_ENERGY_AMOUNT} social energy! You're recharged.`, 2500);
        return true;
      }
    } catch (err) {
      console.error('[NominationIntroModal] Recharge error:', err);
      showToast('Unable to recharge energy at this time');
      return false;
    } finally {
      // Clear ad active flag
      modalAdActive = false;
    }
  }

  /**
   * Show risk result view with categorical labels
   */
  function showRiskView() {
    if (currentState !== STATE.SHOWING) return;

    console.info('[NominationIntroModal] Transitioning to RISK_VIEW');
    currentState = STATE.RISK_VIEW;

    const riskData = computeNominationRisk();
    currentRiskData = riskData; // Cache for post-plea update
    const riskCategory = getRiskCategory(riskData.risk);
    const content = overlayElement.querySelector('#nomination-modal-content');
    
    if (!content) return;

    // Replace content with risk result
    content.innerHTML = '';

    // Icon
    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
      font-size: 4rem;
      margin-bottom: 20px;
      line-height: 1;
    `;
    iconEl.textContent = '🔑';
    content.appendChild(iconEl);

    // Title
    const titleEl = document.createElement('h2');
    titleEl.style.cssText = `
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      letter-spacing: 0.5px;
    `;
    titleEl.textContent = 'Your Nomination Risk';
    content.appendChild(titleEl);

    // Risk category label (instead of percentage)
    const riskLabelEl = document.createElement('div');
    riskLabelEl.style.cssText = `
      font-size: 2.5rem;
      font-weight: 700;
      color: ${riskCategory.color};
      margin: 10px 0;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    riskLabelEl.textContent = riskCategory.category;
    content.appendChild(riskLabelEl);

    // Category description
    const descEl = document.createElement('p');
    descEl.style.cssText = `
      font-size: 1.1rem;
      color: #b2c2d5;
      line-height: 1.6;
      margin: 10px 0 8px 0;
      font-weight: 500;
    `;
    descEl.textContent = riskCategory.description;
    content.appendChild(descEl);

    // Contextual explanation
    const tipEl = document.createElement('p');
    tipEl.style.cssText = `
      font-size: 0.85rem;
      color: #8a9fb5;
      line-height: 1.5;
      margin: 10px 0 20px 0;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
      font-style: italic;
    `;
    tipEl.textContent = riskData.explanation;
    content.appendChild(tipEl);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 24px;
    `;

    // Make a plea button (only for high/very high/extreme risk)
    if (isHighRisk(riskData.risk)) {
      const g = global.game;
      const humanId = g?.humanId;
      const currentEnergy = getPlayerEnergy(humanId);
      const canAffordPlea = currentEnergy >= CONFIG.PLEA_ENERGY_COST;

      if (canAffordPlea) {
        const pleaButton = document.createElement('button');
        pleaButton.textContent = `Make a Plea to HOH (${CONFIG.PLEA_ENERGY_COST} energy)`;
        pleaButton.style.cssText = `
          padding: 14px 28px;
          font-size: 1rem;
          font-weight: 600;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          color: #1a2f44;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        `;
        pleaButton.addEventListener('mouseenter', () => {
          pleaButton.style.transform = 'translateY(-2px)';
          pleaButton.style.boxShadow = '0 6px 16px rgba(255, 215, 0, 0.4)';
        }, { signal: abortController.signal });
        pleaButton.addEventListener('mouseleave', () => {
          pleaButton.style.transform = 'translateY(0)';
          pleaButton.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.3)';
        }, { signal: abortController.signal });
        pleaButton.addEventListener('click', (e) => {
          e.stopPropagation();
          handlePleaFlow();
        }, { signal: abortController.signal });
        buttonsContainer.appendChild(pleaButton);
      } else {
        // Show recharge button if can't afford plea
        const rechargeButton = document.createElement('button');
        rechargeButton.innerHTML = '▶️ Recharge Energy (Watch Ad)';
        rechargeButton.style.cssText = `
          padding: 14px 28px;
          font-size: 1rem;
          font-weight: 600;
          background: linear-gradient(135deg, #6b5dd6 0%, #8b7de6 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(107, 93, 214, 0.3);
        `;
        rechargeButton.addEventListener('mouseenter', () => {
          rechargeButton.style.transform = 'translateY(-2px)';
          rechargeButton.style.boxShadow = '0 6px 16px rgba(107, 93, 214, 0.4)';
        }, { signal: abortController.signal });
        rechargeButton.addEventListener('mouseleave', () => {
          rechargeButton.style.transform = 'translateY(0)';
          rechargeButton.style.boxShadow = '0 4px 12px rgba(107, 93, 214, 0.3)';
        }, { signal: abortController.signal });
        rechargeButton.addEventListener('click', async (e) => {
          e.stopPropagation();
          const success = await handleRecharge();
          if (success) {
            // Refresh the risk view to show updated buttons
            showRiskView();
          }
        }, { signal: abortController.signal });
        buttonsContainer.appendChild(rechargeButton);
      }
    }

    // OK button
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.cssText = `
      padding: 12px 28px;
      font-size: 0.95rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    okButton.addEventListener('mouseenter', () => {
      okButton.style.background = 'rgba(255, 255, 255, 0.15)';
    }, { signal: abortController.signal });
    okButton.addEventListener('mouseleave', () => {
      okButton.style.background = 'rgba(255, 255, 255, 0.1)';
    }, { signal: abortController.signal });
    okButton.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    }, { signal: abortController.signal });
    buttonsContainer.appendChild(okButton);

    content.appendChild(buttonsContainer);
  }

  /**
   * Handle plea flow - shows plea modal, processes result, displays toast
   * Deducts 5 energy and updates risk rating after completion
   */
  async function handlePleaFlow() {
    if (currentState !== STATE.RISK_VIEW) return;

    console.info('[NominationIntroModal] Starting plea flow');
    currentState = STATE.PLEA;

    const g = global.game;
    const humanId = g?.humanId;
    const player = global.getP?.(humanId);
    const hoh = global.getP?.(g.hohId);

    if (!player || !hoh) {
      console.error('[NominationIntroModal] Missing player or HOH');
      showToast('Unable to make a plea at this time');
      dismiss();
      return;
    }

    // Check energy and deduct cost
    const currentEnergy = getPlayerEnergy(humanId);
    if (currentEnergy < CONFIG.PLEA_ENERGY_COST) {
      console.warn('[NominationIntroModal] Insufficient energy for plea');
      showToast(`Need ${CONFIG.PLEA_ENERGY_COST} energy to make a plea`);
      // Offer recharge
      const success = await handleRecharge();
      if (success) {
        // Retry plea after recharge
        handlePleaFlow();
      } else {
        currentState = STATE.RISK_VIEW;
      }
      return;
    }

    // Deduct energy cost
    deductPlayerEnergy(humanId, CONFIG.PLEA_ENERGY_COST);
    console.info(`[NominationIntroModal] Deducted ${CONFIG.PLEA_ENERGY_COST} energy for plea`);

    // Set plea active flag
    g.__nominationPleaActive = true;

    try {
      // Check if NominationPlea module is available
      if (typeof global.NominationPlea?.show !== 'function') {
        throw new Error('NominationPlea module not available');
      }

      const pleaOpenTime = Date.now();
      console.info(`[NominationIntroModal] Plea opened at ${new Date(pleaOpenTime).toISOString()}`);

      // Show plea modal with 60s timeout failsafe
      const pleaPromise = global.NominationPlea.show({
        nominee: player,
        hoh: hoh
      });

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.warn('[NominationIntroModal] Plea timeout after 60s');
          resolve({ skipped: true, timedOut: true });
        }, 60000);
      });

      const pleaResult = await Promise.race([pleaPromise, timeoutPromise]);
      
      const pleaCloseTime = Date.now();
      console.info(`[NominationIntroModal] Plea completed at ${new Date(pleaCloseTime).toISOString()} (duration: ${pleaCloseTime - pleaOpenTime}ms)`);

      // Process result
      if (!pleaResult.skipped) {
        // Store influence
        if (!g.__nomsPleaInfluence) {
          g.__nomsPleaInfluence = {};
        }
        g.__nomsPleaInfluence[player.id] = pleaResult.influence;
        
        // Apply affinity adjustment (in-memory only)
        let affinityDelta = 0;
        if (pleaResult.successful) {
          if (!hoh.affinity) hoh.affinity = {};
          const currentAffinity = hoh.affinity[player.id] || 0.5;
          const influenceFactor = pleaResult.influence || 0.1;
          affinityDelta = influenceFactor * 0.5;
          hoh.affinity[player.id] = Math.max(0, Math.min(1, currentAffinity + affinityDelta));
          
          console.info('[NominationIntroModal] Applied affinity adjustment', {
            playerId: player.id,
            hohId: hoh.id,
            influence: pleaResult.influence,
            affinityDelta: affinityDelta,
            newAffinity: hoh.affinity[player.id]
          });
        } else {
          // Unsuccessful plea may slightly worsen relationship
          if (!hoh.affinity) hoh.affinity = {};
          const currentAffinity = hoh.affinity[player.id] || 0.5;
          affinityDelta = -0.05;
          hoh.affinity[player.id] = Math.max(0, Math.min(1, currentAffinity + affinityDelta));
          console.info('[NominationIntroModal] Plea unsuccessful, slight affinity decrease');
        }
        
        // Recalculate risk with updated affinity
        const oldRisk = currentRiskData?.risk || 50;
        currentRiskData = computeNominationRisk();
        const newRisk = currentRiskData.risk;
        const riskChange = newRisk - oldRisk;
        
        console.info('[NominationIntroModal] Risk updated after plea', {
          oldRisk,
          newRisk,
          riskChange
        });
        
        // Show non-blocking toast with result
        let resultMsg;
        if (pleaResult.successful) {
          resultMsg = `Your plea resonated with the HOH. Risk ${riskChange < 0 ? 'decreased' : 'changed'} to ${getRiskCategory(newRisk).category}.`;
        } else {
          resultMsg = 'You\'ve made your case, but the HOH seems unmoved.';
        }
        
        showToast(resultMsg, 3500);
      } else {
        console.info('[NominationIntroModal] Plea skipped or timed out');
      }

    } catch (err) {
      console.error('[NominationIntroModal] Plea error:', err);
      showToast('Unable to complete plea request');
    } finally {
      // Clear plea active flag
      g.__nominationPleaActive = false;

      // NOTE: Do NOT release pause here - modal stays open after plea for user to review updated risk
      // NOTE: Do NOT dismiss here - modal remains open, user must click outside to close
      // Return to SHOWING state and refresh risk view after small delay for toast
      setTimeout(() => {
        if (currentState === STATE.PLEA) {
          currentState = STATE.SHOWING;
          showRiskView();
        }
      }, CONFIG.PLEA_DELAY_BEFORE_DISMISS_MS);
    }
  }

  /**
   * Show nomination intro modal
   * @returns {Promise<void>} Resolves when modal is dismissed
   */
  function show() {
    // Check feature flag
    const g = global.game;
    if (g?.cfg?.useNewNominationModal === false) {
      console.info('[NominationIntroModal] Feature flag disabled, skipping new modal');
      // Fallback to old implementation
      if (typeof global.showNominationIntroModalWithRisk === 'function') {
        return global.showNominationIntroModalWithRisk();
      }
      return Promise.resolve();
    }

    // Prevent multiple simultaneous modals
    if (currentState !== STATE.IDLE && currentState !== STATE.DONE) {
      console.warn('[NominationIntroModal] Modal already showing, ignoring');
      return Promise.resolve();
    }

    const humanId = g?.humanId;
    const player = global.getP?.(humanId);

    // Skip if player is evicted
    if (player?.evicted) {
      console.info('[NominationIntroModal] Player evicted, skipping modal');
      return Promise.resolve();
    }

    console.info('[NominationIntroModal] Showing modal');
    currentState = STATE.SHOWING;
    resolved = false;

    // Request pause for phase timer
    try {
      console.info('[NominationIntroModal] Requesting timer pause');
      pauseHandle = requestPause();
      console.info('[NominationIntroModal] Pause handle:', pauseHandle);
    } catch (err) {
      console.error('[NominationIntroModal] Error requesting pause:', err);
      // Continue without pause if request fails
    }

    return new Promise((resolve) => {
      resolvePromise = resolve;

      try {
        // Create abort controller for event listeners
        abortController = new AbortController();

        // Check for motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const hohId = g?.hohId;
        const vetoHolderId = g?.vetoWinner || g?.vetoHolder;
        const alive = global.alivePlayers?.() || [];

        // Check if player is eligible for risk check
        const isEligible = humanId !== hohId && 
                           humanId !== vetoHolderId && 
                           !player?.evicted &&
                           alive.length > 4;

        // Create overlay
        overlayElement = document.createElement('div');
        overlayElement.className = 'phase-intro-overlay phase-intro-nomination';
        overlayElement.setAttribute('role', 'dialog');
        overlayElement.setAttribute('aria-modal', 'true');
        overlayElement.setAttribute('aria-labelledby', 'phase-intro-title-nomination');
        
        overlayElement.style.cssText = `
          position: fixed;
          inset: 0;
          background: rgba(4, 10, 18, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.3s ease;
          overflow: hidden;
        `;

        // Add key-themed background effects
        const keyEffectsContainer = document.createElement('div');
        keyEffectsContainer.className = 'phase-intro-key-bg';
        keyEffectsContainer.style.cssText = `
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        `;
        
        // Floating key icons
        for (let i = 0; i < 10; i++) {
          const key = document.createElement('div');
          key.textContent = '🔑';
          key.style.cssText = `
            position: absolute;
            font-size: ${40 + Math.random() * 60}px;
            opacity: ${0.08 + Math.random() * 0.12};
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float-drift ${15 + Math.random() * 15}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
          `;
          keyEffectsContainer.appendChild(key);
        }
        
        // Glowing particles for key theme
        for (let i = 0; i < 20; i++) {
          const particle = document.createElement('div');
          particle.style.cssText = `
            position: absolute;
            width: ${3 + Math.random() * 5}px;
            height: ${3 + Math.random() * 5}px;
            background: radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, transparent 70%);
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: pulse-glow ${3 + Math.random() * 4}s ease-in-out infinite;
            animation-delay: ${Math.random() * 3}s;
          `;
          keyEffectsContainer.appendChild(particle);
        }
        
        overlayElement.appendChild(keyEffectsContainer);

        // Add CSS animations
        styleElement = document.createElement('style');
        styleElement.textContent = `
          @keyframes float-drift {
            0%, 100% {
              transform: translate(0, 0) rotate(0deg);
            }
            25% {
              transform: translate(20px, -30px) rotate(5deg);
            }
            50% {
              transform: translate(-15px, -60px) rotate(-3deg);
            }
            75% {
              transform: translate(25px, -40px) rotate(4deg);
            }
          }
          @keyframes pulse-glow {
            0%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.5);
            }
          }
          @keyframes toastFadeIn {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
          @keyframes toastFadeOut {
            from {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
            to {
              opacity: 0;
              transform: translateX(-50%) translateY(10px);
            }
          }
        `;
        document.head.appendChild(styleElement);

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'nomination-intro-modal-container';
        modal.style.cssText = `
          position: relative;
          background: linear-gradient(135deg, #1a2f44 0%, #243a50 100%);
          border: 2px solid #ffd700;
          border-radius: 20px;
          padding: 40px 50px;
          max-width: 560px;
          width: 90%;
          box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 215, 0, 0.3);
          transform: scale(0.96);
          transition: all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: all;
          cursor: default;
        `;

        // Create dismiss hint
        const dismissHint = document.createElement('div');
        dismissHint.textContent = 'Click to dismiss';
        dismissHint.style.cssText = `
          position: absolute;
          top: 14px;
          right: 18px;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.35);
          font-weight: 500;
          pointer-events: none;
          z-index: 10;
        `;
        modal.appendChild(dismissHint);

        // Create content wrapper
        const content = document.createElement('div');
        content.id = 'nomination-modal-content';
        content.style.cssText = `
          position: relative;
          z-index: 1;
          text-align: center;
        `;

        // Create icon
        const iconEl = document.createElement('div');
        iconEl.style.cssText = `
          font-size: 4rem;
          margin-bottom: 20px;
          line-height: 1;
        `;
        iconEl.textContent = '🔑';
        content.appendChild(iconEl);

        // Create title
        const titleEl = document.createElement('h2');
        titleEl.id = 'phase-intro-title-nomination';
        titleEl.style.cssText = `
          font-size: 2.2rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 16px 0;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
          letter-spacing: 0.5px;
        `;
        titleEl.textContent = 'Nomination Ceremony';
        content.appendChild(titleEl);

        // Create body text
        const bodyEl = document.createElement('p');
        bodyEl.style.cssText = `
          font-size: 1rem;
          color: #d4dce5;
          line-height: 1.6;
          margin: 0 0 24px 0;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        `;
        
        // Announcement mode: read-only when players <= 4
        if (alive.length <= 4) {
          bodyEl.textContent = 'The Head of Household will now nominate houseguests for eviction. The end is near.';
          content.appendChild(bodyEl);
          
          // No interactive buttons in announcement mode
          console.info('[NominationIntroModal] Announcement mode - players <= 4');
        } else {
          bodyEl.textContent = 'The Head of Household will now nominate two houseguests for eviction. Your social game and relationships will be tested.';
          content.appendChild(bodyEl);

          // Add risk check button if eligible (not HOH, not veto holder)
          if (isEligible) {
            const currentEnergy = getPlayerEnergy(humanId);
            const canAffordCheck = currentEnergy >= CONFIG.CHECK_RISK_ENERGY_COST;

            // Button container for tooltip positioning
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
              position: relative;
              display: inline-block;
              margin-top: 8px;
            `;

            if (canAffordCheck) {
              // Create Check My Risk button with tooltip
              const riskButton = document.createElement('button');
              riskButton.textContent = `Check My Risk (${CONFIG.CHECK_RISK_ENERGY_COST} energy)`;
              riskButton.setAttribute('aria-describedby', 'risk-check-tooltip');
              riskButton.style.cssText = `
                padding: 12px 28px;
                font-size: 0.95rem;
                font-weight: 600;
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.25) 100%);
                color: #ffd700;
                border: 1px solid rgba(255, 215, 0, 0.4);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
              `;
              
              // Tooltip
              const tooltip = document.createElement('div');
              tooltip.id = 'risk-check-tooltip';
              tooltip.setAttribute('role', 'tooltip');
              tooltip.textContent = `Costs ${CONFIG.CHECK_RISK_ENERGY_COST} energy. Recharge available via ads.`;
              tooltip.style.cssText = `
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%) translateY(-8px);
                background: rgba(0, 0, 0, 0.9);
                color: #fff;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease;
                z-index: 10;
              `;
              buttonContainer.appendChild(tooltip);

              // Show/hide tooltip on hover and focus
              riskButton.addEventListener('mouseenter', () => {
                riskButton.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 215, 0, 0.35) 100%)';
                riskButton.style.borderColor = 'rgba(255, 215, 0, 0.6)';
                tooltip.style.opacity = '1';
              }, { signal: abortController.signal });
              
              riskButton.addEventListener('mouseleave', () => {
                riskButton.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.25) 100%)';
                riskButton.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                tooltip.style.opacity = '0';
              }, { signal: abortController.signal });
              
              riskButton.addEventListener('focus', () => {
                tooltip.style.opacity = '1';
              }, { signal: abortController.signal });
              
              riskButton.addEventListener('blur', () => {
                tooltip.style.opacity = '0';
              }, { signal: abortController.signal });
              
              // Click handler with energy deduction
              riskButton.addEventListener('click', (e) => {
                e.stopPropagation();
                // Deduct energy
                if (deductPlayerEnergy(humanId, CONFIG.CHECK_RISK_ENERGY_COST)) {
                  showToast(`-${CONFIG.CHECK_RISK_ENERGY_COST} energy`);
                  showRiskView();
                } else {
                  showToast('Unable to check risk at this time');
                }
              }, { signal: abortController.signal });
              
              buttonContainer.appendChild(riskButton);
            } else {
              // Show Recharge button when insufficient energy
              const rechargeButton = document.createElement('button');
              rechargeButton.innerHTML = '▶️ Recharge Energy (Watch Ad)';
              rechargeButton.setAttribute('aria-label', 'Recharge social energy by watching an ad');
              rechargeButton.style.cssText = `
                padding: 12px 28px;
                font-size: 0.95rem;
                font-weight: 600;
                background: linear-gradient(135deg, #6b5dd6 0%, #8b7de6 100%);
                color: #ffffff;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(107, 93, 214, 0.3);
              `;
              
              rechargeButton.addEventListener('mouseenter', () => {
                rechargeButton.style.transform = 'translateY(-2px)';
                rechargeButton.style.boxShadow = '0 6px 16px rgba(107, 93, 214, 0.4)';
              }, { signal: abortController.signal });
              
              rechargeButton.addEventListener('mouseleave', () => {
                rechargeButton.style.transform = 'translateY(0)';
                rechargeButton.style.boxShadow = '0 4px 12px rgba(107, 93, 214, 0.3)';
              }, { signal: abortController.signal });
              
              rechargeButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                const success = await handleRecharge();
                if (success) {
                  // Refresh modal to show Check button
                  // Re-render the button container
                  const newEnergy = getPlayerEnergy(humanId);
                  if (newEnergy >= CONFIG.CHECK_RISK_ENERGY_COST) {
                    // Reload modal content with Check button available
                    content.innerHTML = '';
                    
                    // Re-add icon
                    const iconEl2 = document.createElement('div');
                    iconEl2.style.cssText = `
                      font-size: 4rem;
                      margin-bottom: 20px;
                      line-height: 1;
                    `;
                    iconEl2.textContent = '🔑';
                    content.appendChild(iconEl2);
                    
                    // Re-add title
                    const titleEl2 = document.createElement('h2');
                    titleEl2.id = 'phase-intro-title-nomination';
                    titleEl2.style.cssText = `
                      font-size: 2.2rem;
                      font-weight: 700;
                      color: #ffffff;
                      margin: 0 0 16px 0;
                      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
                      letter-spacing: 0.5px;
                    `;
                    titleEl2.textContent = 'Nomination Ceremony';
                    content.appendChild(titleEl2);
                    
                    // Re-add body
                    const bodyEl2 = document.createElement('p');
                    bodyEl2.style.cssText = bodyEl.style.cssText;
                    bodyEl2.textContent = bodyEl.textContent;
                    content.appendChild(bodyEl2);
                    
                    // Add Check button (now affordable)
                    const riskButton2 = document.createElement('button');
                    riskButton2.textContent = `Check My Risk (${CONFIG.CHECK_RISK_ENERGY_COST} energy)`;
                    riskButton2.style.cssText = `
                      padding: 12px 28px;
                      font-size: 0.95rem;
                      font-weight: 600;
                      background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.25) 100%);
                      color: #ffd700;
                      border: 1px solid rgba(255, 215, 0, 0.4);
                      border-radius: 8px;
                      cursor: pointer;
                      transition: all 0.2s ease;
                      margin-top: 8px;
                    `;
                    riskButton2.addEventListener('click', (e) => {
                      e.stopPropagation();
                      if (deductPlayerEnergy(humanId, CONFIG.CHECK_RISK_ENERGY_COST)) {
                        showToast(`-${CONFIG.CHECK_RISK_ENERGY_COST} energy`);
                        showRiskView();
                      }
                    }, { signal: abortController.signal });
                    content.appendChild(riskButton2);
                  }
                }
              }, { signal: abortController.signal });
              
              buttonContainer.appendChild(rechargeButton);
            }

            content.appendChild(buttonContainer);
          }
        }

        modal.appendChild(content);
        overlayElement.appendChild(modal);

        // Add to document
        document.body.appendChild(overlayElement);

        // Focus trap
        modal.setAttribute('tabindex', '-1');
        modal.focus();

        // Animate in (with guards for alt-tab scenarios)
        rafId = requestAnimationFrame(() => {
          // Guard: Check if DOM nodes still exist and are connected
          // If cleanup() ran during alt-tab, these may be null or disconnected
          if (!overlayElement || !overlayElement.isConnected) {
            console.warn('[NominationIntroModal] RAF callback: overlayElement removed/disconnected, skipping animation');
            return;
          }
          const modalInRaf = overlayElement.querySelector('.nomination-intro-modal-container');
          if (!modalInRaf || !modalInRaf.isConnected) {
            console.warn('[NominationIntroModal] RAF callback: modal removed/disconnected, skipping animation');
            return;
          }

          overlayElement.style.opacity = '1';
          modalInRaf.style.transform = 'scale(1)';
          if (prefersReducedMotion) {
            modalInRaf.style.transition = 'none';
          }
          
          // Record show time for visibility threshold check
          modalShowTime = Date.now();
        });

        // Click outside overlay to dismiss
        overlayElement.addEventListener('click', (e) => {
          if (e.target === overlayElement) {
            dismiss();
          }
        }, { signal: abortController.signal });

        // Click modal itself to dismiss (only in initial state, no buttons)
        modal.addEventListener('click', (e) => {
          // Only dismiss if in initial state (SHOWING) and clicking modal directly (not descendants)
          if (currentState === STATE.SHOWING && e.target === modal) {
            dismiss();
          }
        }, { signal: abortController.signal });

        // Escape key to dismiss
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            dismiss();
          }
        }, { signal: abortController.signal });

        // Handle tab visibility changes (alt-tab protection with threshold)
        // Only dismiss if modal has been visible for more than 500ms
        // This prevents accidental dismissal on quick alt-tab
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            // Don't dismiss during ad playback
            if (modalAdActive) {
              console.info('[NominationIntroModal] Tab hidden during ad playback, not dismissing');
              return;
            }
            
            // Check if modal has been visible long enough
            const visibleDuration = Date.now() - modalShowTime;
            if (visibleDuration < CONFIG.VISIBILITY_THRESHOLD_MS) {
              console.info(`[NominationIntroModal] Tab hidden but modal only visible for ${visibleDuration}ms, not dismissing`);
              return;
            }
            
            // Tab became hidden while modal is showing
            const vulnerableStates = [STATE.SHOWING, STATE.RISK_VIEW, STATE.PLEA];
            if (vulnerableStates.includes(currentState)) {
              console.warn('[NominationIntroModal] Tab hidden while modal active (>500ms), dismissing to prevent freeze');
              dismiss();
            }
          }
        }, { signal: abortController.signal });

        // Listen for phase changes (server-driven) to close modal immediately
        // This ensures modal doesn't block game flow when phase advances
        const handlePhaseChange = () => {
          const currentPhase = global.game?.phase;
          console.info(`[NominationIntroModal] Phase changed to ${currentPhase}, dismissing modal`);
          dismiss();
        };
        
        // Try to use game event bus if available
        if (global.game?.bus && typeof global.game.bus.on === 'function') {
          global.game.bus.on('phase:change', handlePhaseChange);
          global.game.bus.on('phase:advanced', handlePhaseChange);
          
          // Cleanup listener when modal closes
          abortController.signal.addEventListener('abort', () => {
            if (global.game?.bus && typeof global.game.bus.off === 'function') {
              global.game.bus.off('phase:change', handlePhaseChange);
              global.game.bus.off('phase:advanced', handlePhaseChange);
            }
          });
        } else {
          // Fallback: poll for phase change
          const initialPhase = global.game?.phase;
          const phaseCheckInterval = setInterval(() => {
            if (global.game?.phase && global.game.phase !== initialPhase) {
              handlePhaseChange();
              clearInterval(phaseCheckInterval);
            }
          }, 500);
          
          // Cleanup polling when modal closes
          abortController.signal.addEventListener('abort', () => {
            clearInterval(phaseCheckInterval);
          });
        }

        // Failsafe timeout - guarantee resolution within configured time
        failsafeTimeout = setTimeout(() => {
          console.warn('[NominationIntroModal] Failsafe timeout reached, force resolving');
          guaranteeResolve();
          cleanup();
        }, CONFIG.FAILSAFE_TIMEOUT_MS);

      } catch (err) {
        console.error('[NominationIntroModal] Error showing modal:', err);
        // Always resolve, even on error
        guaranteeResolve();
        cleanup();
      }
    }).then(() => {
      // Final cleanup after promise resolution completes
      // Wait for dismiss animation (300ms) before final cleanup
      setTimeout(() => {
        if (currentState === STATE.DONE) {
          cleanup();
        }
      }, 350);
    });
  }

  // Public API
  global.NominationIntroModal = {
    show: show
  };

  console.info('[NominationIntroModal] Module loaded');

})(window);
