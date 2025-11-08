// MODULE: overlay-manager.js
// Token-based ownership system for #tvOverlay management
// Prevents race conditions between nominations, veto, and other modules

(function(global) {
  'use strict';

  const LOG_PREFIX = '[overlay-mgr]';

  // Current owner token
  let currentOwner = null;

  // Feature flag for quick rollback
  const isEnabled = () => {
    return global.__enablePhaseOverlayTokens !== false;
  };

  /**
   * Acquire ownership of the TV overlay
   * @param {string} owner - Identifier for the owner (e.g., 'noms', 'veto')
   * @returns {boolean} True if ownership acquired, false if already owned by another
   */
  function acquire(owner) {
    if (!isEnabled()) {
      console.log(LOG_PREFIX, 'Token system disabled, skipping acquire');
      return true; // Allow operation when disabled
    }

    if (currentOwner && currentOwner !== owner) {
      console.warn(LOG_PREFIX, `Cannot acquire - already owned by ${currentOwner}, requested by ${owner}`);
      return false;
    }

    currentOwner = owner;
    console.log(LOG_PREFIX, `✓ Acquired by ${owner}`);
    return true;
  }

  /**
   * Release ownership of the TV overlay
   * @param {string} owner - Identifier for the owner releasing
   * @returns {boolean} True if released, false if not the owner
   */
  function release(owner) {
    if (!isEnabled()) {
      console.log(LOG_PREFIX, 'Token system disabled, skipping release');
      return true;
    }

    if (currentOwner !== owner) {
      console.warn(LOG_PREFIX, `Cannot release - not owned by ${owner} (current: ${currentOwner})`);
      return false;
    }

    currentOwner = null;
    console.log(LOG_PREFIX, `✓ Released by ${owner}`);
    return true;
  }

  /**
   * Ensure TV overlay is visible and ready for use
   * Creates or reactivates #tvOverlay without clearing content
   * @returns {HTMLElement|null} The tvOverlay element
   */
  function ensureVisible() {
    if (!isEnabled()) {
      console.log(LOG_PREFIX, 'Token system disabled, using legacy ensureVisible');
      return document.getElementById('tvOverlay');
    }

    console.log(LOG_PREFIX, 'Ensuring TV overlay is visible');

    let tvOverlay = document.getElementById('tvOverlay');

    // Create if missing
    if (!tvOverlay) {
      console.log(LOG_PREFIX, 'Creating #tvOverlay');
      tvOverlay = document.createElement('div');
      tvOverlay.id = 'tvOverlay';

      // Find best parent (prefer #tv)
      const tv = document.getElementById('tv');
      const parent = tv || document.body;
      parent.appendChild(tvOverlay);

      console.log(LOG_PREFIX, `✓ Created #tvOverlay as child of ${parent.id || 'body'}`);
    }

    // Ensure it's visible and interactive
    tvOverlay.style.display = '';
    tvOverlay.style.pointerEvents = '';
    tvOverlay.style.opacity = '1';

    // Remove any blocking classes
    tvOverlay.classList.remove('hidden', 'off');

    console.log(LOG_PREFIX, '✓ TV overlay is visible');
    return tvOverlay;
  }

  /**
   * Clear content only if owned by the specified owner
   * @param {string} owner - Identifier for the owner attempting to clear
   * @returns {boolean} True if cleared, false if not the owner
   */
  function clearOwned(owner) {
    if (!isEnabled()) {
      console.log(LOG_PREFIX, 'Token system disabled, allowing clear');
      const tvOverlay = document.getElementById('tvOverlay');
      if (tvOverlay) tvOverlay.innerHTML = '';
      return true;
    }

    if (currentOwner !== owner) {
      console.warn(LOG_PREFIX, `Cannot clear - not owned by ${owner} (current: ${currentOwner})`);
      return false;
    }

    const tvOverlay = document.getElementById('tvOverlay');
    if (tvOverlay) {
      tvOverlay.innerHTML = '';
      console.log(LOG_PREFIX, `✓ Cleared content owned by ${owner}`);
    }

    return true;
  }

  /**
   * Get current owner
   * @returns {string|null} Current owner identifier, or null if not owned
   */
  function getOwner() {
    return currentOwner;
  }

  /**
   * Check if a specific module owns the overlay
   * @param {string} owner - Identifier to check
   * @returns {boolean} True if owned by specified owner
   */
  function isOwnedBy(owner) {
    return currentOwner === owner;
  }

  /**
   * Force release (emergency cleanup)
   * Should only be used for cleanup or rollback scenarios
   */
  function forceRelease() {
    if (currentOwner) {
      console.warn(LOG_PREFIX, `Force releasing from ${currentOwner}`);
      currentOwner = null;
    }
  }

  /**
   * Get diagnostic information
   * @returns {object} Current state
   */
  function debug() {
    const tvOverlay = document.getElementById('tvOverlay');
    return {
      enabled: isEnabled(),
      currentOwner,
      overlayExists: !!tvOverlay,
      overlayVisible: tvOverlay ? (tvOverlay.style.display !== 'none') : false,
      overlayHasContent: tvOverlay ? (tvOverlay.innerHTML.length > 0) : false
    };
  }

  // Public API
  global.OverlayManager = {
    acquire,
    release,
    ensureVisible,
    clearOwned,
    getOwner,
    isOwnedBy,
    forceRelease,
    debug
  };

  console.log(LOG_PREFIX, 'Overlay manager loaded');

})(window);
