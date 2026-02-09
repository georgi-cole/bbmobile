// MODULE: ui.phase-intro-integration.js
// Integrates phase intro modals into the game flow by wrapping phase start functions

(function(global) {
  'use strict';

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
   * Wrap startNominations to show intro modal first
   */
  function wrapStartNominations() {
    const origStartNominations = global.startNominations;
    
    if (typeof origStartNominations === 'function' && !origStartNominations.__wrappedForPhaseIntro) {
      // NEW: Immediate resume when intro modal is dismissed
      window.addEventListener('bb:noms:intro:dismissed', () => {
        const g = global.game || {};
        if (g.phase === 'nominations' && !g.__nominationPleaActive) {
          console.info('[phase-intro-integration] Intro dismissed event → resuming nominations');
          ensureOverlayNotBlocking();
          attemptNominationsStart(origStartNominations);
        }
      });

      global.startNominations = async function wrappedStartNominations() {
        const g = global.game || {};
        
        // Decide whether to show intro (mark as shown only after progression)
        const shouldShowIntro = !g.__nominationsIntroShownThisPhase;
        
        if (shouldShowIntro && typeof global.showNominationIntroModal === 'function') {
          try {
            const TIMEOUT_MS = 30000;
            let modalResolved = false;
            
            const modalPromise = global.showNominationIntroModal().then(() => {
              modalResolved = true;
            });
            
            const timeoutPromise = new Promise((resolve) => {
              setTimeout(() => {
                if (!modalResolved && !g.__nominationPleaActive) {
                  console.warn('[phase-intro-integration] Modal timeout reached (30s), resuming flow');
                  resolve();
                }
              }, TIMEOUT_MS);
            });
            
            await Promise.race([modalPromise, timeoutPromise]);
            
            // Wait up to 10s more if plea remains active
            if (g.__nominationPleaActive) {
              console.info('[phase-intro-integration] Waiting for plea to complete...');
              const pleaTimeout = new Promise((resolve) => setTimeout(resolve, 10000));
              const pleaWait = new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                  if (!g.__nominationPleaActive) {
                    clearInterval(checkInterval);
                    resolve();
                  }
                }, 100);
              });
              await Promise.race([pleaWait, pleaTimeout]);
            }
          } catch (e) {
            console.error('[phase-intro-integration] Error showing nominations intro modal:', e);
          }
        }
        
        // Defensive: neutralize empty TV overlay before proceeding
        ensureOverlayNotBlocking();
        
        // Try original startNominations first
        let started = false;
        try {
          await origStartNominations.apply(this, arguments);
          started = true;
          // Mark intro as shown once we have attempted to progress
          g.__nominationsIntroShownThisPhase = true;
        } catch (e) {
          console.error('[phase-intro-integration] Error calling original startNominations:', e);
          // Fallback: set phase directly
          try {
            if (typeof global.setPhase === 'function') {
              console.info('[phase-intro-integration] Falling back to setPhase');
              const tNoms = g.cfg?.tNoms || 25;
              const callback = () => global.lockNominationsAndProceed?.();
              global.setPhase('nominations', tNoms, callback);
              started = true;
            }
          } catch (fallbackErr) {
            console.error('[phase-intro-integration] Fallback setPhase also failed:', fallbackErr);
          }
          if (started) g.__nominationsIntroShownThisPhase = true;
        }
        
        // Primary watchdog: after 2s, ensure nominations begin if phase is still nominations
        setTimeout(() => {
          try {
            const currentPhase = global.game?.phase;
            const pleaActive = global.game?.__nominationPleaActive;
            
            if (currentPhase === 'nominations' && !pleaActive) {
              console.info('[phase-intro-integration] Watchdog(2s): ensuring nominations start');
              attemptNominationsStart(origStartNominations);
            }
          } catch (watchErr) {
            console.warn('[phase-intro-integration] Watchdog(2s) failed:', watchErr);
          }
        }, 2000);
        
        // Secondary watchdog: after 5s, hard-kick and re-neutralize overlay
        setTimeout(() => {
          try {
            const currentPhase = global.game?.phase;
            const pleaActive = global.game?.__nominationPleaActive;
            
            if (currentPhase === 'nominations' && !pleaActive) {
              console.info('[phase-intro-integration] Watchdog(5s): hard kick nominations start');
              // Re-neutralize empty overlay
              ensureOverlayNotBlocking();
              attemptNominationsStart(origStartNominations);
            }
          } catch (watchErr) {
            console.warn('[phase-intro-integration] Watchdog(5s) failed:', watchErr);
          }
        }, 5000);
      };
      
      global.startNominations.__wrappedForPhaseIntro = true;
      console.info('[phase-intro-integration] startNominations wrapped with event-driven resume + watchdogs');
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
