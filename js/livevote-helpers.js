// MODULE: livevote-helpers.js
// Centralized helpers for live vote UI lifecycle and scroll lock management
// Provides idempotent cleanup to prevent stuck scroll states on mobile

(function(global) {
  'use strict';

  /**
   * Forcefully unlock body scroll regardless of current state
   * This is idempotent and safe to call multiple times
   */
  function unlockBodyScroll() {
    const body = document.body;
    if (!body) return;

    // Clear all scroll lock properties
    const scrollY = parseInt(body.dataset.scrollY || '0', 10);
    
    body.style.position = '';
    body.style.top = '';
    body.style.width = '';
    body.style.overflow = '';
    
    // Clear dataset flags
    delete body.dataset.scrollLocked;
    delete body.dataset.scrollY;
    
    // Restore scroll position if it was saved
    if (scrollY > 0) {
      window.scrollTo(0, scrollY);
    }
    
    console.debug('[livevote-helpers] Body scroll unlocked');
  }

  /**
   * Close all live vote UI components and ensure body scroll is unlocked
   * This is the single source of truth for cleanup - call it whenever:
   * - Starting a new vote flow
   * - Submitting a vote
   * - Closing/canceling a vote
   * - Ending the voting phase
   * - Any error or interrupt occurs
   * 
   * This function is idempotent and safe to call multiple times
   */
  function closeAllVoteUI() {
    console.debug('[livevote-helpers] closeAllVoteUI called');

    // Close Choice Card if present (check all possible locations)
    try {
      const choiceCards = document.querySelectorAll('.lv-choice-card');
      choiceCards.forEach(card => {
        card.remove();
        console.debug('[livevote-helpers] Choice card removed');
      });
    } catch (e) {
      console.warn('[livevote-helpers] Error removing choice card:', e);
    }

    // Close Vote Overlay if present (check all possible locations)
    try {
      const overlays = document.querySelectorAll('.lv-overlay');
      overlays.forEach(overlay => {
        overlay.remove();
        console.debug('[livevote-helpers] Vote overlay removed');
      });
    } catch (e) {
      console.warn('[livevote-helpers] Error removing overlay:', e);
    }

    // Close Rollout UI if showing
    try {
      // First check via API
      if (global.LiveVoteRollout?.isShowing?.()) {
        global.LiveVoteRollout.hide();
        console.debug('[livevote-helpers] Rollout hidden via API');
      }
      
      // Also do a direct DOM cleanup in case of stale elements
      const rolloutOverlays = document.querySelectorAll('.lv-rollout-overlay');
      rolloutOverlays.forEach(rollout => {
        rollout.remove();
        console.debug('[livevote-helpers] Rollout overlay removed from DOM');
      });
    } catch (e) {
      console.warn('[livevote-helpers] Error hiding rollout:', e);
    }

    // Always unlock body scroll as final step
    // This ensures scroll is restored even if UI elements are already gone
    unlockBodyScroll();
  }

  // Export to global scope
  global.unlockBodyScroll = unlockBodyScroll;
  global.closeAllVoteUI = closeAllVoteUI;

  console.info('[livevote-helpers] Initialized');

})(window);
