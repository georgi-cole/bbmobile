// MODULE: livevote-helpers.js
// Centralized helpers for live vote UI lifecycle and scroll lock management
// Provides idempotent cleanup to prevent stuck scroll states on mobile

(function(global) {
  'use strict';

  /**
   * Format time in MM:SS format
   * @param {number} seconds - Total seconds
   * @returns {string} Formatted time string (e.g., "00:30")
   */
  function formatCountdownTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Clear vote countdown timer
   * Safely clears both interval and timeout handles
   */
  function clearVoteCountdown() {
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
  }

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
        // Use scrollend event if available (modern browsers), fallback to setTimeout
        const hasScrollEnd = typeof window.onscrollend !== 'undefined';
        
        if (hasScrollEnd) {
          let scrollEnded = false;
          
          const scrollEndHandler = () => {
            if (!scrollEnded) {
              scrollEnded = true;
              console.debug('[livevote-helpers] TV centered (scrollend)');
              resolve();
            }
          };
          
          window.addEventListener('scrollend', scrollEndHandler, { once: true });
          
          // Fallback timeout in case scrollend doesn't fire
          setTimeout(() => {
            if (!scrollEnded) {
              scrollEnded = true;
              window.removeEventListener('scrollend', scrollEndHandler);
              console.debug('[livevote-helpers] TV centered (timeout fallback)');
              resolve();
            }
          }, 500);
        } else {
          // Fallback: Use requestAnimationFrame + setTimeout for older browsers
          requestAnimationFrame(() => {
            setTimeout(() => {
              console.debug('[livevote-helpers] TV centered (timeout)');
              resolve();
            }, 250);
          });
        }
      } else {
        console.debug('[livevote-helpers] TV already visible');
        resolve();
      }
    });
  }

  // Module-private scroll lock counter for reference-counted locking
  let __scrollLockCount = 0;

  /**
   * Lock body scroll with reference counting
   * Multiple components can call this safely - scroll is only locked on first call
   * iOS-safe: uses overflow:hidden instead of position:fixed
   */
  function lockBodyScroll() {
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) return;

    __scrollLockCount++;
    console.debug(`[livevote-helpers] lockBodyScroll called (count: ${__scrollLockCount})`);

    // Only lock on first call
    if (__scrollLockCount === 1) {
      // Store current scroll position
      const scrollY = window.scrollY;
      body.dataset.scrollY = String(scrollY);
      body.dataset.scrollLocked = 'true';

      // Use overflow-based lock (iOS-safe)
      body.style.overflow = 'hidden';
      body.style.touchAction = 'none';
      html.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'contain';

      console.debug('[livevote-helpers] Body scroll locked');
    }
  }

  /**
   * Unlock body scroll with reference counting
   * Only unlocks when all callers have called unlock (count reaches 0)
   * @param {boolean} force - If true, immediately unlocks regardless of count
   */
  function unlockBodyScroll(force = false) {
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) return;

    if (force) {
      __scrollLockCount = 0;
      console.debug('[livevote-helpers] Body scroll force unlocked');
    } else {
      __scrollLockCount = Math.max(0, __scrollLockCount - 1);
      console.debug(`[livevote-helpers] unlockBodyScroll called (count: ${__scrollLockCount})`);
    }

    // Only unlock when count reaches 0
    if (__scrollLockCount === 0) {
      // Restore scroll position if saved
      const scrollY = parseInt(body.dataset.scrollY || '0', 10);

      // Clear overflow-based lock
      body.style.overflow = '';
      body.style.touchAction = '';
      html.style.overflow = '';
      html.style.overscrollBehavior = '';

      // Clear old position-based lock (backwards compatibility)
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';

      // Clear dataset flags
      delete body.dataset.scrollLocked;
      delete body.dataset.scrollY;

      // Restore scroll position
      if (scrollY > 0) {
        window.scrollTo(0, scrollY);
      }

      console.debug('[livevote-helpers] Body scroll unlocked');
    }
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

    // Clear countdown timer
    clearVoteCountdown();
    
    // Clean up LiveVoteFullscreen timer (authoritative timer)
    try {
      if (global.LiveVoteFullscreen?.clearTimer) {
        global.LiveVoteFullscreen.clearTimer();
        console.debug('[livevote-helpers] LiveVoteFullscreen timer cleared');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error clearing LiveVoteFullscreen timer:', e);
    }
    
    // Hide houseguest profile modal if available
    try {
      if (typeof global.hideHouseguestProfile === 'function') {
        global.hideHouseguestProfile();
        console.debug('[livevote-helpers] Houseguest profile hidden via API');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error hiding houseguest profile:', e);
    }
    
    // Call hide() on modals to ensure their internal state is reset
    try {
      if (global.LiveVoteChoiceCard?.isOpen?.()) {
        global.LiveVoteChoiceCard.hide();
        console.debug('[livevote-helpers] Choice Card hidden via API');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error hiding Choice Card via API:', e);
    }
    
    try {
      if (global.LiveVoteOverlay?.isOpen?.()) {
        global.LiveVoteOverlay.hide();
        console.debug('[livevote-helpers] Vote Overlay hidden via API');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error hiding Vote Overlay via API:', e);
    }

    // Remove all known overlay types (belt-and-suspenders cleanup)
    const overlaySelectors = [
      '.lv-root',              // Live vote modal root
      '.lv-choice-card',       // Live vote choice card (legacy)
      '.lv-overlay',           // Live vote overlay
      '.carousel-picker-overlay', // POV carousel picker
      '.fullscreen-pov-selector',  // POV fullscreen selector
      '.eviction-manager-root', // EvictionManager UI
      '.fullscreen-eviction-vote',  // Fullscreen eviction vote overlay (new)
      '.houseguest-profile-modal',  // Houseguest profile modal (new)
      '.fev-emoji-layer'       // Emoji layer (if orphaned)
    ];

    overlaySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.remove();
          console.debug(`[livevote-helpers] Removed ${selector}`);
        });
      } catch (e) {
        console.warn(`[livevote-helpers] Error removing ${selector}:`, e);
      }
    });

    // Close Rollout UI if showing
    try {
      if (global.LiveVoteRollout?.isShowing?.()) {
        global.LiveVoteRollout.hide();
        console.debug('[livevote-helpers] Rollout hidden');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error hiding rollout:', e);
    }

    // COMMIT 3: Exit external overlay mode before cleanup (if active)
    try {
      if (global.lv2?.exitExternalOverlayMode) {
        global.lv2.exitExternalOverlayMode();
        console.debug('[livevote-helpers] External overlay mode exited');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error exiting external overlay mode:', e);
    }

    // Clear TV overlay content
    try {
      if (typeof global.clearTVOverlayContent === 'function') {
        global.clearTVOverlayContent();
        console.debug('[livevote-helpers] TV overlay content cleared');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error clearing TV overlay content:', e);
    }

    // COMMIT 3: Clean up lv2 UI if active
    try {
      if (global.lv2?.cleanup) {
        global.lv2.cleanup();
        console.debug('[livevote-helpers] lv2 UI cleaned up');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error cleaning up lv2:', e);
    }

    try {
      if (global.lv2?.cleanupTriple) {
        global.lv2.cleanupTriple();
        console.debug('[livevote-helpers] lv2 triple UI cleaned up');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error cleaning up lv2 triple:', e);
    }

    // COMMIT 3 & 4: Restore panel visibility if hidden
    try {
      const panel = document.querySelector('#panel');
      if (panel) {
        // Remove class-based hide
        panel.classList.remove('voteOverlayOpen');
        // Also clear any inline style (backwards compatibility)
        if (panel.style.display === 'none') {
          panel.style.display = '';
        }
        console.debug('[livevote-helpers] Panel visibility restored');
      }
    } catch (e) {
      console.warn('[livevote-helpers] Error restoring panel visibility:', e);
    }
    
    // Remove eviction-vote-open class from html element (body scroll lock)
    try {
      document.documentElement.classList.remove('eviction-vote-open');
      console.debug('[livevote-helpers] eviction-vote-open class removed');
    } catch (e) {
      console.warn('[livevote-helpers] Error removing eviction-vote-open class:', e);
    }

    // Always force-unlock body scroll as final step
    // This ensures scroll is restored even if UI elements are already gone
    // and handles mismatched lock/unlock calls
    unlockBodyScroll(true);
  }

  // Export to global scope
  global.formatCountdownTime = formatCountdownTime;
  global.clearVoteCountdown = clearVoteCountdown;
  global.centerTVInViewport = centerTVInViewport;
  global.lockBodyScroll = lockBodyScroll;
  global.unlockBodyScroll = unlockBodyScroll;
  global.closeAllVoteUI = closeAllVoteUI;

  console.info('[livevote-helpers] Initialized');

})(window);
