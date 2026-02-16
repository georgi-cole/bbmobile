// MODULE: nomination-intro-modal.js
// Clean-room rebuild of nomination ceremony intro modal with proper state machine
// Fixes: freeze after interaction, resolve-after-remove, dual-path resume, leaked listeners
// Design: Single responsibility, finite state machine, guaranteed resolution

(function(global) {
  'use strict';

  // Configuration constants
  const CONFIG = {
    FAILSAFE_TIMEOUT_MS: 10000,  // Absolute maximum time before force-resolve
    DISMISS_ANIMATION_MS: 300,   // Modal fade-out animation duration
    TOAST_DURATION_MS: 2000,     // Toast notification auto-dismiss time
    PLEA_DELAY_BEFORE_DISMISS_MS: 500  // Delay before dismissing after plea completes
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
    
    // Base chance: probability based on slots and available targets
    let base = Math.round((slots / Math.max(1, availableTargets.length)) * 100);
    base = Math.max(6, Math.min(90, base));

    // Affinity/bond effect: check relationship between HOH and player
    const bond = hoh.affinity?.[player.id] ?? player.affinity?.[hoh.id] ?? 0.5;
    const affinityEffect = (0.5 - bond) * 0.8; // Friendly = negative (lowers risk), enemy = positive (raises risk)

    // Reputation/threat effect: higher threat increases risk
    if (typeof player.reputation === 'undefined') {
      player.reputation = player.threat ?? 0.5;
    }
    const rep = player.reputation;
    const repEffect = (rep - 0.5) * 0.6;

    // Calculate adjusted risk
    let risk = base * (1 + affinityEffect + repEffect);
    
    // Smooth toward base to avoid extreme swings
    risk = risk * 0.7 + base * 0.3;
    
    // Clamp and round
    risk = Math.max(5, Math.min(95, Math.round(risk)));

    // Generate explanation
    let explanation = `Base chance: ${base}%`;
    if (bond < 0.4) {
      explanation += ` | Strong relationship reduces risk`;
    } else if (bond > 0.6) {
      explanation += ` | Weak relationship increases risk`;
    }
    if (rep > 0.6) {
      explanation += ` | High threat level increases risk`;
    } else if (rep < 0.4) {
      explanation += ` | Low threat level reduces risk`;
    }

    return { risk, explanation, base, bond, reputation: rep };
  }

  /**
   * Cleanup function - removes all DOM nodes, event listeners, and timeouts
   * Idempotent - safe to call multiple times
   */
  function cleanup() {
    console.info('[NominationIntroModal] Cleanup starting');

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

    console.info('[NominationIntroModal] Cleanup complete');
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

    // Cleanup after animation (or immediately if no animation)
    setTimeout(() => {
      cleanup();
    }, CONFIG.DISMISS_ANIMATION_MS);
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
   * Show risk result view
   */
  function showRiskView() {
    if (currentState !== STATE.SHOWING) return;

    console.info('[NominationIntroModal] Transitioning to RISK_VIEW');
    currentState = STATE.RISK_VIEW;

    const riskData = computeNominationRisk();
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

    // Risk percentage
    const riskPercentEl = document.createElement('div');
    riskPercentEl.style.cssText = `
      font-size: 3rem;
      font-weight: 700;
      color: ${riskData.risk > 70 ? '#ff4444' : riskData.risk > 40 ? '#ffaa44' : '#44ff88'};
      margin: 10px 0;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    `;
    riskPercentEl.textContent = `${riskData.risk}%`;
    content.appendChild(riskPercentEl);

    // Tip text
    const tipEl = document.createElement('p');
    tipEl.style.cssText = `
      font-size: 0.9rem;
      color: #8a9fb5;
      line-height: 1.6;
      margin: 10px 0 20px 0;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    `;
    tipEl.textContent = 'This estimate considers your relationships, threat level, and available nomination slots.';
    content.appendChild(tipEl);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 24px;
    `;

    // Make a deal button (plea)
    const pleaButton = document.createElement('button');
    pleaButton.textContent = 'Make a Deal with HOH';
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
   */
  async function handlePleaFlow() {
    if (currentState !== STATE.RISK_VIEW) return;

    console.info('[NominationIntroModal] Starting plea flow');
    currentState = STATE.PLEA;

    const g = global.game;
    const player = global.getP?.(g.humanId);
    const hoh = global.getP?.(g.hohId);

    if (!player || !hoh) {
      console.error('[NominationIntroModal] Missing player or HOH');
      showToast('Unable to make a deal at this time');
      dismiss();
      return;
    }

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
        if (pleaResult.successful) {
          if (!hoh.affinity) hoh.affinity = {};
          const currentAffinity = hoh.affinity[player.id] || 0.5;
          hoh.affinity[player.id] = Math.min(1, currentAffinity + pleaResult.influence * 0.5);
          
          console.info('[NominationIntroModal] Applied affinity adjustment', {
            playerId: player.id,
            hohId: hoh.id,
            influence: pleaResult.influence,
            newAffinity: hoh.affinity[player.id]
          });
        }
        
        // Show non-blocking toast instead of alert()
        const resultMsg = pleaResult.successful 
          ? 'Your plea resonated with the HOH. Your relationship has improved slightly.'
          : 'You\'ve made your case, but the HOH seems unmoved.';
        
        showToast(resultMsg, 3000);
      } else {
        console.info('[NominationIntroModal] Plea skipped or timed out');
      }

    } catch (err) {
      console.error('[NominationIntroModal] Plea error:', err);
      showToast('Unable to complete plea request');
    } finally {
      // Clear plea active flag
      g.__nominationPleaActive = false;

      // Dismiss modal after plea completes (with small delay for toast)
      setTimeout(() => {
        dismiss();
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
        bodyEl.textContent = 'The Head of Household will now nominate two houseguests for eviction. Your social game and relationships will be tested.';
        content.appendChild(bodyEl);

        // Add risk check button if eligible
        if (isEligible) {
          const riskButton = document.createElement('button');
          riskButton.textContent = 'Check My Risk';
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
            margin-top: 8px;
          `;
          riskButton.addEventListener('mouseenter', () => {
            riskButton.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 215, 0, 0.35) 100%)';
            riskButton.style.borderColor = 'rgba(255, 215, 0, 0.6)';
          }, { signal: abortController.signal });
          riskButton.addEventListener('mouseleave', () => {
            riskButton.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.25) 100%)';
            riskButton.style.borderColor = 'rgba(255, 215, 0, 0.4)';
          }, { signal: abortController.signal });
          riskButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showRiskView();
          }, { signal: abortController.signal });
          content.appendChild(riskButton);
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

        // Handle tab visibility changes (alt-tab protection)
        // If user switches tabs while modal is showing, proactively dismiss
        // to avoid returning to a broken intermediate state
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            // Tab became hidden while modal is showing
            const vulnerableStates = [STATE.SHOWING, STATE.RISK_VIEW, STATE.PLEA];
            if (vulnerableStates.includes(currentState)) {
              console.warn('[NominationIntroModal] Tab hidden while modal active, dismissing to prevent freeze');
              dismiss();
            }
          }
        }, { signal: abortController.signal });

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
