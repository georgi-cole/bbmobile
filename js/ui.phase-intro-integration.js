// MODULE: ui.phase-intro-integration.js
// Integrates phase intro modals into the game flow by wrapping phase start functions

(function(global) {
  'use strict';

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
   * Reset phase intro flags when a new week starts
   */
  function resetPhaseIntroFlags() {
    const g = global.game;
    if (!g) return;
    
    g.__vetoIntroShownThisPhase = false;
    g.__socialIntroShownThisPhase = false;
    g.__evictionIntroShownThisPhase = false;
    
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
