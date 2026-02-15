// MODULE: ui.phase-intro-modals.js
// Phase-specific intro modals for Veto, Social Phase, and Live Eviction Vote
// Features: Improved copy, themed styling, click-to-dismiss, accessibility

(function(global) {
  'use strict';

  /**
   * Show Power of Veto Competition intro modal
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showVetoIntroModal() {
    return showPhaseIntroModal({
      type: 'veto',
      icon: '🛡️',
      title: 'Power of Veto Competition',
      body: 'The Power of Veto is up for grabs. Win it to remove a nominee from the block or keep nominations the same. Strategic timing matters—protect allies or force shifts in the game.',
      theme: 'neutral'
    });
  }

  /**
   * Show Social Phase intro modal with flying emojis
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showSocialPhaseIntroModal() {
    return showPhaseIntroModal({
      type: 'social',
      icon: '💬',
      title: 'Social Phase',
      body: 'It\'s time to build influence and shape relationships. Your social actions affect how other players see you and can unlock advantages later.',
      theme: 'social',
      animate: true
    });
  }

  /**
   * Show Live Eviction Vote intro modal with Diary Room styling
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showEvictionVoteIntroModal() {
    return showPhaseIntroModal({
      type: 'eviction',
      icon: '🎤',
      title: 'Live Eviction Vote',
      body: 'You are casting a vote to evict. Choose carefully—your decision affects alliances, trust, and future targets. There is no undo.',
      theme: 'diaryroom'
    });
  }

  /**
   * Show Nomination Ceremony intro modal with Key theme
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showNominationIntroModal() {
    // Use new clean-room implementation if available and not disabled by feature flag
    if (typeof global.NominationIntroModal?.show === 'function') {
      const useNewModal = global.game?.cfg?.useNewNominationModal !== false; // default true
      if (useNewModal) {
        console.info('[phase-intro-modals] Using new NominationIntroModal implementation');
        return global.NominationIntroModal.show();
      }
    }
    
    // Fallback to old implementation
    console.info('[phase-intro-modals] Using legacy nomination modal implementation');
    return showNominationIntroModalWithRisk();
  }

  /* ============================================================================
   * LEGACY NOMINATION MODAL IMPLEMENTATION (KEPT FOR ROLLBACK SAFETY)
   * 
   * This implementation has been replaced by nomination-intro-modal.js
   * Preserved here for one release to allow instant rollback via feature flag.
   * To rollback: Set game.cfg.useNewNominationModal = false
   * 
   * Known issues in this implementation:
   * - Resolve-after-remove anti-pattern (L402-408)
   * - Dual-path resume with custom event (L410-414) 
   * - Unguarded alert() blocking JS runtime (L624)
   * - Leaked event listeners (L670-688)
   * - Multiple competing watchdogs (L418-449)
   * ============================================================================ */

  /**
   * Compute nomination risk for current player (LEGACY)
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
   * Show nomination intro modal with risk checking capability
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showNominationIntroModalWithRisk() {
    const g = global.game;
    const humanId = g?.humanId;
    const hohId = g?.hohId;
    const vetoHolderId = g?.vetoWinner || g?.vetoHolder;
    const alive = global.alivePlayers?.() || [];
    const player = global.getP?.(humanId);

    // Check if player is eligible for risk check
    const isEligible = humanId !== hohId && 
                       humanId !== vetoHolderId && 
                       !player?.evicted &&
                       alive.length > 4;

    return new Promise((resolve) => {
      let dismissed = false;

      // Check for motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      console.info('[phase-intro] Showing nominations intro modal');

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'phase-intro-overlay phase-intro-nomination';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'phase-intro-title-nomination');
      
      overlay.style.cssText = `
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
      
      overlay.appendChild(keyEffectsContainer);

      // Add CSS animations if needed
      const style = document.createElement('style');
      style.textContent = `
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
      `;
      document.head.appendChild(style);

      // Create modal container
      const modal = document.createElement('div');
      modal.className = 'phase-intro-modal phase-intro-modal-nomination';
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
        font-size: 2rem;
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
        color: #b2c2d5;
        line-height: 1.6;
        margin: 0 0 20px 0;
        font-weight: 400;
      `;
      bodyEl.textContent = 'The Head of Household will nominate houseguests for eviction. These nominations can change the course of the game and test alliances.';
      content.appendChild(bodyEl);

      // Add "Check risk" button if eligible
      if (isEligible) {
        const riskButton = document.createElement('button');
        riskButton.textContent = 'Check risk';
        riskButton.style.cssText = `
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          background: #3a7bd5;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          margin-top: 8px;
        `;
        
        riskButton.addEventListener('click', (e) => {
          e.stopPropagation();
          showRiskResult();
        });
        
        content.appendChild(riskButton);
      }

      modal.appendChild(content);
      overlay.appendChild(modal);

      // Add to document
      document.body.appendChild(overlay);

      // Focus trap - focus the modal
      modal.setAttribute('tabindex', '-1');
      modal.focus();

      // Animate in
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        if (!prefersReducedMotion) {
          modal.style.transform = 'scale(1)';
        } else {
          modal.style.transform = 'scale(1)';
          modal.style.transition = 'none';
        }
      });

      // Dismiss handler (defined early so nested functions can use it)
      const dismiss = () => {
        if (dismissed) return;
        dismissed = true;

        console.info('[phase-intro] Nomination modal dismissed, resolving immediately');

        // Defensive: neutralize empty TV overlay before dispatching event
        try {
          const ov = document.getElementById('tvOverlay');
          if (ov) {
            const content = ov.querySelector('.tvOverlayContent');
            const hasActiveContent = !!(content && content.childElementCount > 0);
            if (!hasActiveContent) {
              ov.style.pointerEvents = 'none';
              document.getElementById('tv')?.classList.remove('tvTall');
            }
          }
        } catch(e) { 
          console.warn('[phase-intro] tvOverlay neutralization failed during dismiss', e); 
        }

        // Animate out
        overlay.style.opacity = '0';
        if (!prefersReducedMotion) {
          modal.style.transform = 'scale(0.96)';
        }

        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          
          // Resolve immediately (tap-anywhere dismisses and resolves immediately)
          resolve();

          // Dispatch event for event-driven resume (NEW)
          if (g?.phase === 'nominations' && !g?.__nominationPleaActive) {
            console.info('[phase-intro] Dispatching bb:noms:intro:dismissed event');
            window.dispatchEvent(new CustomEvent('bb:noms:intro:dismissed'));
          }
          
          // Schedule safety watchdog after dismissal
          // This fires 3 seconds after modal is dismissed to ensure game progresses
          setTimeout(() => {
            // Check if game has progressed
            const currentPhase = g?.phase;
            const pleaActive = g?.__nominationPleaActive;
            
            // Only fire watchdog if still on nominations phase and no plea active
            if (currentPhase === 'nominations' && !pleaActive) {
              console.info('[phase-intro] Safety watchdog: nominations phase not started after 3s, forcing start');
              
              // Try to force nominations to start
              try {
                if (typeof global.startNominations === 'function') {
                  console.info('[phase-intro] Safety watchdog: calling startNominations directly');
                  global.startNominations();
                } else if (typeof global.setPhase === 'function') {
                  console.info('[phase-intro] Safety watchdog: falling back to setPhase');
                  const tNoms = g.cfg?.tNoms || 25;
                  const callback = () => global.lockNominationsAndProceed?.();
                  global.setPhase('nominations', tNoms, callback);
                } else {
                  console.warn('[phase-intro] Safety watchdog: no recovery methods available');
                }
              } catch (err) {
                console.error('[phase-intro] Safety watchdog error:', err);
              }
            } else {
              console.info('[phase-intro] Safety watchdog: game progressed normally or plea active, no action needed', {
                currentPhase,
                pleaActive
              });
            }
          }, 3000);
        }, 300);
      };

      // Show risk result in the modal
      function showRiskResult() {
        const riskData = computeNominationRisk();
        
        // Replace modal content with risk result
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

        // Friendly tip text (no technical base chance shown)
        const tipEl = document.createElement('p');
        tipEl.style.cssText = `
          font-size: 0.9rem;
          color: #8a9fb5;
          line-height: 1.6;
          margin: 0 0 20px 0;
          font-weight: 400;
        `;
        tipEl.textContent = 'Good reputation and strategic relationships can help reduce your chance. However, backstabbing is lurking all around the BB house.';
        content.appendChild(tipEl);

        // Action buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
        `;

        // Make a deal button
        const dealButton = document.createElement('button');
        dealButton.textContent = 'Make a deal';
        dealButton.style.cssText = `
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          background: #5aa575;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;
        
        dealButton.addEventListener('click', (e) => {
          e.stopPropagation();
          handleMakeADeal();
        });
        
        buttonsContainer.appendChild(dealButton);

        // OK button
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = `
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          background: #3a7bd5;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;
        
        okButton.addEventListener('click', (e) => {
          e.stopPropagation();
          dismiss();
        });
        
        buttonsContainer.appendChild(okButton);
        content.appendChild(buttonsContainer);
      }

      // Handle "Make a deal" button
      async function handleMakeADeal() {
        const hoh = global.getP?.(g.hohId);
        const player = global.getP?.(humanId);

        if (!hoh || !player) {
          console.error('[phase-intro] Cannot open plea: missing HOH or player');
          return;
        }

        // Set plea active flag
        g.__nominationPleaActive = true;
        const pleaOpenTime = Date.now();
        console.info(`[phase-intro] Nomination plea opened at ${new Date(pleaOpenTime).toISOString()}`);
        
        try {
          // Call external NominationPlea module
          if (typeof global.NominationPlea === 'undefined' || typeof global.NominationPlea.show !== 'function') {
            console.error('[phase-intro] window.NominationPlea not available, using fallback');
            throw new Error('NominationPlea module not loaded');
          }

          // Show NominationPlea and await its completion
          const pleaResult = await global.NominationPlea.show({
            nominee: player,
            hoh: hoh
          });
          
          const pleaCloseTime = Date.now();
          console.info(`[phase-intro] Nomination plea closed at ${new Date(pleaCloseTime).toISOString()} (duration: ${pleaCloseTime - pleaOpenTime}ms)`);
          
          if (pleaResult && !pleaResult.skipped) {
            console.info('[phase-intro] NominationPlea completed', pleaResult);
            
            // Store influence data in game state
            if (!g.__nomsPleaInfluence) {
              g.__nomsPleaInfluence = {};
            }
            g.__nomsPleaInfluence[player.id] = pleaResult.influence;
            
            // Apply small in-memory adjustments
            if (pleaResult.successful) {
              // Bounded affinity bump (in-memory only)
              if (!hoh.affinity) hoh.affinity = {};
              const currentAffinity = hoh.affinity[player.id] || 0.5;
              hoh.affinity[player.id] = Math.min(1, currentAffinity + pleaResult.influence * 0.5);
              
              console.info('[phase-intro] Applied affinity adjustment', {
                playerId: player.id,
                hohId: hoh.id,
                influence: pleaResult.influence,
                newAffinity: hoh.affinity[player.id]
              });
            }
            
            // Show result feedback to user
            const resultMsg = pleaResult.successful 
              ? 'Your plea resonated with the HOH. Your relationship has improved slightly.'
              : 'You\'ve made your case, but the HOH seems unmoved.';
            
            // Use non-blocking toast instead of alert() to prevent UI freeze
            try {
              if (typeof window.tv?.showToast === 'function') {
                window.tv.showToast(resultMsg, { duration: 3000 });
              } else {
                // Inline fallback toast (matches nomination-intro-modal.js pattern)
                const toast = document.createElement('div');
                toast.textContent = resultMsg;
                toast.style.cssText = `
                  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
                  background: rgba(0,0,0,0.8); color: #fff; padding: 10px 16px; border-radius: 6px;
                  font-size: 14px; z-index: 99999; pointer-events: none; backdrop-filter: blur(4px);
                `;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
              }
            } catch (e) {
              console.warn('[phase-intro] Toast error (non-critical):', e);
            }
          } else {
            console.info('[phase-intro] NominationPlea skipped');
          }
          
          // Now dismiss the nomination modal (immediately, non-blocking)
          dismiss();
        } catch (err) {
          console.error('[phase-intro] NominationPlea error:', err);
          
          // On error, skip plea (no native prompt fallback)
          const pleaCloseTime = Date.now();
          console.info(`[phase-intro] Nomination plea failed/skipped at ${new Date(pleaCloseTime).toISOString()} (duration: ${pleaCloseTime - pleaOpenTime}ms)`);
          
          dismiss();
        } finally {
          // Clear plea active flag
          g.__nominationPleaActive = false;
        }
      }

      // Click outside or on overlay to dismiss
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          dismiss();
        }
      });

      // Click anywhere on modal to dismiss (only in initial state)
      modal.addEventListener('click', (e) => {
        // Only dismiss if clicking the modal itself, not its children with stopPropagation
        if (e.target === modal || e.target.closest('.phase-intro-modal') === modal) {
          // Don't dismiss if risk result is showing (has buttons that stop propagation)
          const hasButtons = modal.querySelector('button');
          if (!hasButtons || e.target === modal) {
            dismiss();
          }
        }
      });

      // Escape key to dismiss
      const keyHandler = (e) => {
        if (e.key === 'Escape') {
          dismiss();
        }
      };
      document.addEventListener('keydown', keyHandler);

      // Cleanup on dismiss
      const cleanup = () => {
        document.removeEventListener('keydown', keyHandler);
      };
      
      overlay.addEventListener('transitionend', cleanup, { once: true });
    });
  }

  /**
   * Core function to display a phase intro modal
   * @param {Object} options - Modal configuration
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showPhaseIntroModal(options) {
    const {
      type,
      icon,
      title,
      body,
      theme = 'neutral',
      animate = false
    } = options;

    return new Promise((resolve) => {
      let dismissed = false;

      // Check for motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const shouldAnimate = animate && !prefersReducedMotion;

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = `phase-intro-overlay phase-intro-${type}`;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', `phase-intro-title-${type}`);
      
      // Apply theme-specific overlay styling
      let overlayBg = 'rgba(4, 10, 18, 0.85)';
      
      if (theme === 'diaryroom') {
        // Diary Room: darker background for full-screen effect
        overlayBg = 'rgba(20, 25, 35, 0.95)';
      }
      
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: ${overlayBg};
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

      // Add full-screen effects to overlay (behind modal)
      
      // Veto/POV effects - floating shields and strategic elements
      if (theme === 'neutral' && type === 'veto') {
        const vetoEffectsContainer = document.createElement('div');
        vetoEffectsContainer.className = 'phase-intro-veto-bg';
        vetoEffectsContainer.style.cssText = `
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        `;
        
        // Floating shield icons
        const shields = ['🛡️'];
        for (let i = 0; i < 8; i++) {
          const shield = document.createElement('div');
          shield.textContent = shields[0];
          shield.style.cssText = `
            position: absolute;
            font-size: ${40 + Math.random() * 60}px;
            opacity: ${0.08 + Math.random() * 0.12};
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float-drift ${15 + Math.random() * 15}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
          `;
          vetoEffectsContainer.appendChild(shield);
        }
        
        // Glowing particles for strategic/power theme
        for (let i = 0; i < 20; i++) {
          const particle = document.createElement('div');
          particle.style.cssText = `
            position: absolute;
            width: ${3 + Math.random() * 5}px;
            height: ${3 + Math.random() * 5}px;
            background: radial-gradient(circle, rgba(100, 149, 237, 0.6) 0%, transparent 70%);
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: pulse-glow ${3 + Math.random() * 4}s ease-in-out infinite;
            animation-delay: ${Math.random() * 3}s;
          `;
          vetoEffectsContainer.appendChild(particle);
        }
        
        overlay.appendChild(vetoEffectsContainer);
      }
      
      // Flying emojis for social phase
      if (shouldAnimate && theme === 'social') {
        const emojiContainer = document.createElement('div');
        emojiContainer.className = 'phase-intro-emoji-bg';
        emojiContainer.style.cssText = `
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        `;
        
        // Flying emojis
        const emojis = ['😎', '🤝', '🎉', '🔥', '💬', '⭐', '🧠', '🤔', '💥', '✨'];
        for (let i = 0; i < 25; i++) {
          const emoji = document.createElement('div');
          emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          emoji.style.cssText = `
            position: absolute;
            font-size: ${30 + Math.random() * 50}px;
            opacity: ${0.2 + Math.random() * 0.3};
            left: ${Math.random() * 100}%;
            animation: float-emoji ${10 + Math.random() * 10}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
          `;
          emojiContainer.appendChild(emoji);
        }
        
        overlay.appendChild(emojiContainer);
      }

      // Diary Room effects for eviction phase
      if (theme === 'diaryroom') {
        // Add LED light strips to overlay (full height)
        const leftLED = document.createElement('div');
        leftLED.style.cssText = `
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, transparent 0%, #6495ed 15%, #6495ed 85%, transparent 100%);
          opacity: 0.7;
          box-shadow: 0 0 20px rgba(100, 149, 237, 0.6);
          pointer-events: none;
          animation: led-pulse 3s ease-in-out infinite;
        `;
        overlay.appendChild(leftLED);
        
        const rightLED = document.createElement('div');
        rightLED.style.cssText = `
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, transparent 0%, #6495ed 15%, #6495ed 85%, transparent 100%);
          opacity: 0.7;
          box-shadow: 0 0 20px rgba(100, 149, 237, 0.6);
          pointer-events: none;
          animation: led-pulse 3s ease-in-out infinite;
          animation-delay: 0.3s;
        `;
        overlay.appendChild(rightLED);
        
        // Add subtle spotlight effect
        const spotlight = document.createElement('div');
        spotlight.style.cssText = `
          position: absolute;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 80%;
          background: radial-gradient(ellipse at center top, rgba(100, 149, 237, 0.15) 0%, transparent 60%);
          pointer-events: none;
          animation: spotlight-fade 4s ease-in-out infinite;
        `;
        overlay.appendChild(spotlight);
        
        // Add large microphone watermark to overlay
        const micWatermark = document.createElement('div');
        micWatermark.innerHTML = '🎤';
        micWatermark.style.cssText = `
          position: absolute;
          bottom: 5%;
          right: 5%;
          font-size: 15rem;
          opacity: 0.05;
          pointer-events: none;
          user-select: none;
        `;
        overlay.appendChild(micWatermark);
        
        // Add camera recording indicator (subtle)
        const recordingDot = document.createElement('div');
        recordingDot.style.cssText = `
          position: absolute;
          top: 3%;
          right: 3%;
          width: 12px;
          height: 12px;
          background: #ff4444;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(255, 68, 68, 0.6);
          pointer-events: none;
          animation: recording-blink 2s ease-in-out infinite;
        `;
        overlay.appendChild(recordingDot);
      }

      // Create modal container
      const modal = document.createElement('div');
      modal.className = `phase-intro-modal phase-intro-modal-${theme}`;
      modal.style.cssText = `
        position: relative;
        background: linear-gradient(135deg, #1a2f44 0%, #243a50 100%);
        border: 2px solid #3d5a75;
        border-radius: 20px;
        padding: 40px 50px;
        max-width: 560px;
        width: 90%;
        box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.9);
        transform: scale(0.96);
        transition: all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: all;
        cursor: default;
      `;

      // Apply theme-specific modal styling
      if (theme === 'diaryroom') {
        modal.style.background = 'linear-gradient(135deg, #2a1f2f 0%, #3a2f3f 100%)';
        modal.style.border = '2px solid #5a4f6f';
      }

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
      iconEl.textContent = icon;
      content.appendChild(iconEl);

      // Create title
      const titleEl = document.createElement('h2');
      titleEl.id = `phase-intro-title-${type}`;
      titleEl.style.cssText = `
        font-size: 2rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 16px 0;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        letter-spacing: 0.5px;
      `;
      titleEl.textContent = title;
      content.appendChild(titleEl);

      // Create body text
      const bodyEl = document.createElement('p');
      bodyEl.style.cssText = `
        font-size: 1rem;
        color: #b2c2d5;
        line-height: 1.6;
        margin: 0;
        font-weight: 400;
      `;
      bodyEl.textContent = body;
      content.appendChild(bodyEl);

      modal.appendChild(content);
      overlay.appendChild(modal);

      // Add CSS animations based on theme
      const animationsNeeded = [];
      
      if (theme === 'neutral' && type === 'veto') {
        animationsNeeded.push('veto');
      }
      if (shouldAnimate && theme === 'social') {
        animationsNeeded.push('social');
      }
      if (theme === 'diaryroom') {
        animationsNeeded.push('diaryroom');
      }
      
      if (animationsNeeded.length > 0) {
        const style = document.createElement('style');
        let animations = '';
        
        if (animationsNeeded.includes('veto')) {
          animations += `
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
          `;
        }
        
        if (animationsNeeded.includes('social')) {
          animations += `
            @keyframes float-emoji {
              0% {
                transform: translateY(100vh) rotate(0deg);
              }
              100% {
                transform: translateY(-100px) rotate(360deg);
              }
            }
          `;
        }
        
        if (animationsNeeded.includes('diaryroom')) {
          animations += `
            @keyframes led-pulse {
              0%, 100% {
                opacity: 0.6;
              }
              50% {
                opacity: 0.9;
              }
            }
            @keyframes spotlight-fade {
              0%, 100% {
                opacity: 0.8;
              }
              50% {
                opacity: 1;
              }
            }
            @keyframes recording-blink {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.3;
              }
            }
          `;
        }
        
        style.textContent = animations;
        document.head.appendChild(style);
      }

      // Add to document
      document.body.appendChild(overlay);

      // Focus trap - focus the modal
      modal.setAttribute('tabindex', '-1');
      modal.focus();

      // Animate in
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        if (!prefersReducedMotion) {
          modal.style.transform = 'scale(1)';
        } else {
          modal.style.transform = 'scale(1)';
          modal.style.transition = 'none';
        }
      });

      // Dismiss handler
      const dismiss = () => {
        if (dismissed) return;
        dismissed = true;

        // Animate out
        overlay.style.opacity = '0';
        if (!prefersReducedMotion) {
          modal.style.transform = 'scale(0.96)';
        }

        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          resolve();
        }, 300);
      };

      // Click outside or on overlay to dismiss
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          dismiss();
        }
      });

      // Click anywhere on modal to dismiss
      modal.addEventListener('click', dismiss);

      // Escape key to dismiss
      const keyHandler = (e) => {
        if (e.key === 'Escape') {
          dismiss();
        }
      };
      document.addEventListener('keydown', keyHandler, { once: true });

      // Cleanup on dismiss
      overlay.addEventListener('transitionend', () => {
        document.removeEventListener('keydown', keyHandler);
      }, { once: true });
    });
  }

  // Expose functions globally
  global.showVetoIntroModal = showVetoIntroModal;
  global.showSocialPhaseIntroModal = showSocialPhaseIntroModal;
  global.showEvictionVoteIntroModal = showEvictionVoteIntroModal;
  global.showNominationIntroModal = showNominationIntroModal;

  console.info('[ui.phase-intro-modals] Phase intro modal system initialized');

})(window);
