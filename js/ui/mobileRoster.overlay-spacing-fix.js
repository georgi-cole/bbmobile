/**
 * mobileRoster.overlay-spacing-fix.js
 * 
 * Integration wrapper for overlaySpacing.js that ensures proper initialization
 * with the mobile roster system.
 * 
 * This module:
 * 1. Ensures overlaySpacing.js is initialized after MobileRoster
 * 2. Provides additional last-row visibility checks
 * 3. Handles edge cases for iOS Safari and orientation changes
 * 
 * The overlaySpacing module handles:
 * - Dynamic measurement of TV overlay height via ResizeObserver/MutationObserver
 * - CSS variable updates for spacer calculation (--overlay-effective-height)
 * - Last-row visibility verification with up to +24px compensation
 * - Recalculation on load, resize, orientation change, and phase change
 */

(function(global) {
  'use strict';

  // ============================
  // Configuration
  // ============================

  const CONFIG = {
    // Minimum gap required between last row and TV overlay (in pixels)
    MIN_GAP_PX: 6,
    
    // Maximum compensation to add if last row is obscured
    MAX_COMPENSATION_PX: 24,
    
    // Debounce delay for recalculation (ms)
    RECALC_DEBOUNCE_MS: 100,
    
    // Check interval for visibility (ms)
    VISIBILITY_CHECK_INTERVAL: 500,
  };

  // ============================
  // State
  // ============================

  const state = {
    initialized: false,
    visibilityCheckTimer: null,
  };

  // ============================
  // Initialization
  // ============================

  /**
   * Initialize the overlay spacing fix
   * Ensures overlaySpacing.js is properly integrated with mobile roster
   */
  function init() {
    if (state.initialized) {
      return;
    }

    // Check if overlaySpacing module is available
    if (!global.OverlaySpacing) {
      console.warn('[OverlaySpacingFix] OverlaySpacing module not found, waiting...');
      
      // Wait for it to load
      const checkOverlay = setInterval(() => {
        if (global.OverlaySpacing) {
          clearInterval(checkOverlay);
          completeInit();
        }
      }, 100);
      
      // Timeout after 3 seconds
      setTimeout(() => {
        clearInterval(checkOverlay);
        if (!state.initialized) {
          console.error('[OverlaySpacingFix] OverlaySpacing module not available after 3s');
        }
      }, 3000);
      
      return;
    }

    completeInit();
  }

  /**
   * Complete initialization after dependencies are ready
   */
  function completeInit() {
    // Initialize overlaySpacing if not already done
    if (global.OverlaySpacing && typeof global.OverlaySpacing.init === 'function') {
      const status = global.OverlaySpacing.getStatus?.() || {};
      if (!status.initialized) {
        global.OverlaySpacing.init();
      }
    }

    // Subscribe to orientation changes for additional checks
    const mql = window.matchMedia('(orientation: landscape)');
    const handleOrientation = () => {
      setTimeout(recalculate, 150);
    };
    
    if (mql.addEventListener) {
      mql.addEventListener('change', handleOrientation);
    } else if (mql.addListener) {
      mql.addListener(handleOrientation);
    }

    // Subscribe to phase changes
    if (global.bbGameBus) {
      global.bbGameBus.on('phase:change', () => recalculate());
      global.bbGameBus.on('phase:changed', () => recalculate());
    }
    
    global.addEventListener('bb:phase:changed', () => recalculate());

    // Initial visibility check after layout settles
    setTimeout(ensureLastRowVisible, 500);

    state.initialized = true;
    console.info('[OverlaySpacingFix] Initialized');
  }

  // ============================
  // Core Functions
  // ============================

  /**
   * Force recalculation of overlay spacing
   */
  function recalculate() {
    if (global.OverlaySpacing && typeof global.OverlaySpacing.recalculate === 'function') {
      global.OverlaySpacing.recalculate();
    }
  }

  /**
   * Ensure the last row of tiles is fully visible
   * Adds compensation if needed
   */
  function ensureLastRowVisible() {
    if (!global.OverlaySpacing) return;

    const visibility = global.OverlaySpacing.checkLastRowVisibility?.();
    if (!visibility) return;

    if (!visibility.visible && visibility.needed > 0) {
      console.info(`[OverlaySpacingFix] Last row needs ${visibility.needed}px compensation (gap: ${visibility.gapToOverlay}px)`);
      
      // Trigger recalculation which will add compensation
      recalculate();
    }
  }

  /**
   * Get current status
   */
  function getStatus() {
    const overlayStatus = global.OverlaySpacing?.getStatus?.() || {};
    
    return {
      initialized: state.initialized,
      overlaySpacingStatus: overlayStatus,
    };
  }

  // ============================
  // Auto-initialization
  // ============================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait a tick for overlaySpacing to load
      setTimeout(init, 50);
    });
  } else {
    setTimeout(init, 50);
  }

  // Also try on window load as fallback
  window.addEventListener('load', () => {
    if (!state.initialized) {
      init();
    }
  });

  // ============================
  // Public API
  // ============================

  global.OverlaySpacingFix = {
    init,
    recalculate,
    ensureLastRowVisible,
    getStatus,
  };

  console.info('[OverlaySpacingFix] Module loaded');

})(window);
