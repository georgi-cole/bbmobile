// MODULE: tv-inline-status.js
// Unified inline status bar for TV header
// Renders status messages beside Skip/Timer pill, replacing legacy below-TV status strips
//
// Features:
// - Single inline status API: set(message, tone)
// - Auto-clear on phase changes via bb:phase:changed event
// - Accessibility via aria-live polite region
// - Graceful degradation if module fails to load
// - Responsive text truncation for mobile

(function(global) {
  'use strict';

  const TVInlineStatus = global.TVInlineStatus || (global.TVInlineStatus = {});

  let statusElement = null;
  let ariaLiveRegion = null;
  let currentMessage = '';
  let currentTone = 'muted';

  /**
   * Initialize the inline status system
   * Creates DOM elements and sets up event listeners
   */
  function init() {
    // Find or create the status element in the TV header
    const tvHead = document.querySelector('.tvHead');
    if (!tvHead) {
      console.warn('[TVInlineStatus] .tvHead not found - cannot initialize');
      return false;
    }

    // Check if status element already exists
    statusElement = tvHead.querySelector('.tv-inline-status');
    if (!statusElement) {
      // Create new status element
      statusElement = document.createElement('div');
      statusElement.className = 'tv-inline-status';
      statusElement.setAttribute('role', 'status');
      statusElement.setAttribute('data-tone', 'muted');
      
      // Find skip-timer pill to insert after it
      const skipPill = tvHead.querySelector('.tv-skip-timer-pill');
      if (skipPill) {
        // Insert after skip pill
        if (skipPill.nextSibling) {
          tvHead.insertBefore(statusElement, skipPill.nextSibling);
        } else {
          tvHead.appendChild(statusElement);
        }
      } else {
        // Fallback: append to tvHead
        tvHead.appendChild(statusElement);
      }
    }

    // Create off-screen aria-live region for screen readers
    if (!ariaLiveRegion) {
      ariaLiveRegion = document.createElement('div');
      ariaLiveRegion.className = 'sr-only';
      ariaLiveRegion.setAttribute('aria-live', 'polite');
      ariaLiveRegion.setAttribute('aria-atomic', 'false');
      ariaLiveRegion.style.position = 'absolute';
      ariaLiveRegion.style.left = '-10000px';
      ariaLiveRegion.style.width = '1px';
      ariaLiveRegion.style.height = '1px';
      ariaLiveRegion.style.overflow = 'hidden';
      document.body.appendChild(ariaLiveRegion);
    }

    // Listen for phase change events to auto-clear
    global.addEventListener('bb:phase:changed', handlePhaseChange);

    console.info('[TVInlineStatus] Initialized');
    return true;
  }

  /**
   * Set status message with optional tone
   * @param {string} message - Status message to display (max 80 chars recommended)
   * @param {string} tone - Visual tone: 'muted' (default), 'warn', 'error', 'success'
   */
  function set(message, tone = 'muted') {
    if (!statusElement) {
      if (!init()) {
        console.warn('[TVInlineStatus] Cannot set status - initialization failed');
        return;
      }
    }

    // Normalize inputs
    const msg = String(message || '').trim();
    const validTones = ['muted', 'warn', 'error', 'success'];
    const safeTone = validTones.includes(tone) ? tone : 'muted';

    // Update state
    currentMessage = msg;
    currentTone = safeTone;

    // Update DOM
    if (msg) {
      statusElement.textContent = msg;
      statusElement.setAttribute('data-tone', safeTone);
      statusElement.style.display = 'inline-flex';

      // Update aria-live region for screen readers
      if (ariaLiveRegion) {
        ariaLiveRegion.textContent = msg;
      }
    } else {
      // Empty message = clear
      clear();
    }
  }

  /**
   * Clear the status message
   */
  function clear() {
    if (!statusElement) return;

    currentMessage = '';
    currentTone = 'muted';
    
    statusElement.textContent = '';
    statusElement.style.display = 'none';
    statusElement.setAttribute('data-tone', 'muted');

    // Clear aria-live region
    if (ariaLiveRegion) {
      ariaLiveRegion.textContent = '';
    }
  }

  /**
   * Handle phase change events - auto-clear status
   * @param {CustomEvent} event - Phase change event with detail.phase
   */
  function handlePhaseChange(event) {
    const phaseName = event?.detail?.phase || 'unknown';
    console.info(`[TVInlineStatus] Phase changed to "${phaseName}" - clearing status`);
    clear();
  }

  /**
   * Get current status (for debugging/testing)
   * @returns {{message: string, tone: string}}
   */
  function getStatus() {
    return {
      message: currentMessage,
      tone: currentTone
    };
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Export public API
  TVInlineStatus.set = set;
  TVInlineStatus.clear = clear;
  TVInlineStatus.getStatus = getStatus;
  TVInlineStatus.init = init; // Expose for manual re-init if needed

  global.TVInlineStatus = TVInlineStatus;

})(window);
