// MODULE: livevote-helpers.js
// Centralized helpers for live vote UI lifecycle and scroll lock management
// Provides idempotent cleanup to prevent stuck scroll states on mobile

(function(global) {
  'use strict';

  /**
   * Centers the TV area in the viewport if it's not fully visible
   * Waits for scroll animation to complete before resolving
   * @param {HTMLElement|null} container - Optional container element (defaults to #tv)
   * @returns {Promise<void>}
   */
  function centerTVInViewport(container = null) {
    return new Promise((resolve) => {
      const targetContainer = container || document.querySelector('#tv');
      if (!targetContainer) {
        console.warn('[livevote-helpers] No container found to center');
        resolve();
        return;
      }

      const rect = targetContainer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Consider safe areas (top nav bar, bottom safe area on mobile)
      const safeTop = 60; // Approximate height of top bar
      const safeBottom = viewportHeight - 20; // Small bottom margin
      
      // Check if TV is fully visible
      const isFullyVisible = rect.top >= safeTop && rect.bottom <= safeBottom;
      
      if (!isFullyVisible) {
        console.debug('[livevote-helpers] TV not fully visible, centering...');
        
        // Scroll to center the TV
        targetContainer.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Wait for scroll animation to complete
        // Use requestAnimationFrame + setTimeout for smooth wait
        requestAnimationFrame(() => {
          setTimeout(() => {
            console.debug('[livevote-helpers] TV centered');
            resolve();
          }, 250);
        });
      } else {
        console.debug('[livevote-helpers] TV already visible');
        resolve();
      }
    });
  }

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

    // Clear countdown timer if it exists
    if (global.game?.eviction?._countdownInterval) {
      clearInterval(global.game.eviction._countdownInterval);
      global.game.eviction._countdownInterval = null;
      console.debug('[livevote-helpers] Countdown interval cleared');
    }
    if (global.game?.eviction?._countdownTimeout) {
      clearTimeout(global.game.eviction._countdownTimeout);
      global.game.eviction._countdownTimeout = null;
      console.debug('[livevote-helpers] Countdown timeout cleared');
    }

    // Close Choice Card if present
    try {
      const choiceCard = document.querySelector('.lv-choice-card');
      if (choiceCard) {
        choiceCard.remove();
        console.debug('[livevote-helpers] Choice card removed');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error removing choice card:', e);
    }

    // Close Vote Overlay if present
    try {
      const overlay = document.querySelector('.lv-overlay');
      if (overlay) {
        overlay.remove();
        console.debug('[livevote-helpers] Vote overlay removed');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error removing overlay:', e);
    }

    // Close Rollout UI if showing
    try {
      if (global.LiveVoteRollout?.isShowing?.()) {
        global.LiveVoteRollout.hide();
        console.debug('[livevote-helpers] Rollout hidden');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error hiding rollout:', e);
    }

    // Always unlock body scroll as final step
    // This ensures scroll is restored even if UI elements are already gone
    unlockBodyScroll();
  }

  // Export to global scope
  global.centerTVInViewport = centerTVInViewport;
  global.unlockBodyScroll = unlockBodyScroll;
  global.closeAllVoteUI = closeAllVoteUI;

  console.info('[livevote-helpers] Initialized');

})(window);
