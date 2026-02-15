// MODULE: ui.phase-intro-integration.js
// Integrates phase intro modals into the game flow by wrapping phase start functions

(function(global) {
  'use strict';

  // Configuration constants (matches nomination-intro-modal.js)
  const FAILSAFE_TIMEOUT_MS = 10000;

  /**
   * Helper: Neutralize empty TV overlay to prevent input blocking
   */
  function ensureOverlayNotBlocking() {
    try {
      const ov = document.getElementById('tvOverlay');
      if (!ov) return;
      const content = ov.querySelector('.tvOverlayContent');
      const hasActiveContent = !!(content && content.childElementCount > 0);
      if (!hasActiveContent) {
        ov.style.pointerEvents = 'none';
        document.getElementById('tv')?.classList.remove('tvTall');
      }
    } catch(e){ 
      console.warn('[phase-intro-integration] tvOverlay neutralization failed', e); 
    }
  }

  /**
   * Helper: Attempt to start nominations using fallback chain
   */
  function attemptNominationsStart(origStartNominations) {
    if (typeof global.renderNomsPanel === 'function') {
      global.renderNomsPanel();
    } else if (typeof origStartNominations === 'function') {
      origStartNominations.call(global);
    } else if (typeof global.setPhase === 'function') {
      const tNoms = (global.game?.cfg?.tNoms) || 25;
      const callback = () => global.lockNominationsAndProceed?.();
      global.setPhase('nominations', tNoms, callback);
    }
  }

  /**
   * Wrap startVetoComp to show intro modal first
   */
  function wrapStartVetoComp() {
    const origStartVetoComp = global.startVetoComp;
    
    if (typeof origStartVetoComp === 'function' && !origStartVetoComp.__wrappedForPhaseIntro) {
      global.startVetoComp = async function wrappedStartVetoComp() {
        const g = global.game || {};
        
        // Check if we should show the intro modal
        // Only show once per veto phase (not on subsequent calls)
        if (!g.__vetoIntroShownThisPhase) {
          g.__vetoIntroShownThisPhase = true;
          
          // Show veto intro modal if available
          if (typeof global.showVetoIntroModal === 'function') {
            try {
              await global.showVetoIntroModal();
            } catch (e) {
              console.error('[phase-intro-integration] Error showing veto intro modal:', e);
            }
          }
        }
        
        // Call original function
        return origStartVetoComp.apply(this, arguments);
      };
      
      global.startVetoComp.__wrappedForPhaseIntro = true;
      console.info('[phase-intro-integration] startVetoComp wrapped for intro modal');
    }
  }

  /**
   * Wrap startSocialIntermission to show intro modal first
   */
  function wrapStartSocialIntermission() {
    const origStartSocial = global.startSocialIntermission;
    
    if (typeof origStartSocial === 'function' && !origStartSocial.__wrappedForPhaseIntro) {
      global.startSocialIntermission = async function wrappedStartSocial(source, callback) {
        const g = global.game || {};
        
        // Check if we should show the intro modal
        // Only show once per social intermission
        if (!g.__socialIntroShownThisPhase) {
          g.__socialIntroShownThisPhase = true;
          
          // Show social intro modal if available
          if (typeof global.showSocialPhaseIntroModal === 'function') {
            try {
              await global.showSocialPhaseIntroModal();
            } catch (e) {
              console.error('[phase-intro-integration] Error showing social intro modal:', e);
            }
          }
        }
        
        // Call original function
        return origStartSocial.call(this, source, callback);
      };
      
      // Also update the alias
      global.startSocial = global.startSocialIntermission;
      
      global.startSocialIntermission.__wrappedForPhaseIntro = true;
      console.info('[phase-intro-integration] startSocialIntermission wrapped for intro modal');
    }
  }

  /**
   * Wrap startLiveVote to show intro modal first
   */
  function wrapStartLiveVote() {
    const origStartLiveVote = global.startLiveVote;
    
    if (typeof origStartLiveVote === 'function' && !origStartLiveVote.__wrappedForPhaseIntro) {
      global.startLiveVote = async function wrappedStartLiveVote() {
        const g = global.game || {};
        
        // Check if we should show the intro modal
        // Only show once per eviction vote phase
        if (!g.__evictionIntroShownThisPhase) {
          g.__evictionIntroShownThisPhase = true;
          
          // Show eviction intro modal if available
          if (typeof global.showEvictionVoteIntroModal === 'function') {
            try {
              await global.showEvictionVoteIntroModal();
            } catch (e) {
              console.error('[phase-intro-integration] Error showing eviction intro modal:', e);
            }
          }
        }
        
        // Call original function
        return origStartLiveVote.apply(this, arguments);
      };
      
      global.startLiveVote.__wrappedForPhaseIntro = true;
      console.info('[phase-intro-integration] startLiveVote wrapped for intro modal');
    }
  }

  /**
   * Wrap startNominations to show intro modal first (SIMPLIFIED for new modal system)
   */
  function wrapStartNominations() {
    const origStartNominations = global.startNominations;
    
    if (typeof origStartNominations === 'function' && !origStartNominations.__wrappedForPhaseIntro) {
      global.startNominations = async function wrappedStartNominations() {
        const g = global.game || {};
        
        // Check if we should show intro modal
        const shouldShowIntro = !g.__nominationsIntroShownThisPhase;
        
        if (shouldShowIntro && typeof global.showNominationIntroModal === 'function') {
          // Mark as shown BEFORE showing modal to prevent re-entry
          g.__nominationsIntroShownThisPhase = true;
          
          try {
            console.info('[phase-intro-integration] Showing nomination intro modal');
            // Simply await the modal - no dual path, no custom event, no Promise.race
            await global.showNominationIntroModal();
            console.info('[phase-intro-integration] Nomination intro modal dismissed');
          } catch (e) {
            console.error('[phase-intro-integration] Error showing nominations intro modal:', e);
          }
        }
        
        // Defensive: neutralize empty TV overlay before proceeding
        ensureOverlayNotBlocking();
        
        // Call renderNomsPanel directly after new modal dismisses
        if (typeof global.renderNomsPanel === 'function') {
          console.info('[phase-intro-integration] Calling renderNomsPanel directly after modal dismissed');
          global.renderNomsPanel();
        } else {
          // Fallback to original if renderNomsPanel not available
          try {
            await origStartNominations.apply(this, arguments);
          } catch (e) {
            console.error('[phase-intro-integration] Error calling original startNominations:', e);
          }
        }
        
        // Single failsafe watchdog: after configured timeout, ensure nominations have started
        setTimeout(() => {
          try {
            const currentPhase = global.game?.phase;
            const pleaActive = global.game?.__nominationPleaActive;
            
            if (currentPhase === 'nominations' && !pleaActive) {
              console.info(`[phase-intro-integration] Failsafe watchdog (${FAILSAFE_TIMEOUT_MS}ms): ensuring nominations start`);
              ensureOverlayNotBlocking();
              
              // Prioritize renderNomsPanel
              if (typeof global.renderNomsPanel === 'function') {
                global.renderNomsPanel();
              } else {
                attemptNominationsStart(origStartNominations);
              }
            }
          } catch (watchErr) {
            console.warn('[phase-intro-integration] Failsafe watchdog failed:', watchErr);
          }
        }, FAILSAFE_TIMEOUT_MS);
      };
      
      global.startNominations.__wrappedForPhaseIntro = true;
      console.info('[phase-intro-integration] startNominations wrapped (simplified)');
    }
  }

  /**
   * Reset phase intro flags when a new week starts
   */
  function resetPhaseIntroFlags() {
    const g = global.game;
    if (!g) return;
    
    g.__vetoIntroShownThisPhase = false;
    g.__socialIntroShownThisPhase = false;
    g.__evictionIntroShownThisPhase = false;
    g.__nominationsIntroShownThisPhase = false;
    
    console.info('[phase-intro-integration] Phase intro flags reset for new week');
  }

  /**
   * Initialize wrappers after all phase functions are loaded
   */
  function initializePhaseIntroWrappers() {
    // Wait a bit to ensure all modules are loaded
    setTimeout(() => {
      wrapStartVetoComp();
      wrapStartSocialIntermission();
      wrapStartLiveVote();
      wrapStartNominations();
      
      // Hook into week reset if available
      const origOnNewWeek = global.socialOnNewWeek;
      if (typeof origOnNewWeek === 'function') {
        global.socialOnNewWeek = function() {
          resetPhaseIntroFlags();
          return origOnNewWeek.apply(this, arguments);
        };
      }
      
      console.info('[phase-intro-integration] Phase intro integration complete');
    }, 100);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePhaseIntroWrappers, { once: true });
  } else {
    initializePhaseIntroWrappers();
  }

})(window);
