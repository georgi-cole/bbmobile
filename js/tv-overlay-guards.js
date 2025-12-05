// MODULE: tv-overlay-guards.js
// ============================================================================
// TV Overlay Defensive Guards - Empty Overlay Neutralization
// ============================================================================
//
// Purpose: Prevent empty TV overlays from blocking interaction with underlying
// UI elements (competition buttons, etc.) by neutralizing pointer-events when
// the overlay has no active content.
//
// Context: Part of mobile faux-TV viewport overlap fix. Empty overlays can
// act as transparent click shields, blocking all interactions with elements
// underneath (e.g., competition Play/Rules buttons).
//
// Strategy:
// - Run on DOMContentLoaded and phase changes
// - Find all TV overlay elements (#tvOverlay, .tv-overlay-mount, .tvOverlayContent)
// - Check if overlay is empty (no child elements)
// - If empty: set pointer-events='none' and add data-tvoverlay-neutralized
// - If content added later: remove neutralized marker and restore pointer-events
// - Log actions for debugging
//
// Related: TVOVERLAY_FIX_SUMMARY.md, test_tvoverlay_neutralization.html
// ============================================================================

(function(global) {
  'use strict';

  const LOG_PREFIX = '[TVOverlayGuards]';

  // Configuration
  const OVERLAY_SELECTORS = [
    '#tvOverlay',
    '.tv-overlay-mount',
    '.tvOverlayContent'
  ];

  /**
   * Check if an overlay element is empty (has no active content)
   * @param {HTMLElement} overlay - The overlay element to check
   * @returns {boolean} - True if overlay is empty
   */
  function isOverlayEmpty(overlay) {
    if (!overlay) return true;

    // Check direct children first
    if (overlay.childElementCount > 0) {
      return false;
    }

    // Check for .tvOverlayContent container
    const content = overlay.querySelector('.tvOverlayContent');
    if (content && content.childElementCount > 0) {
      return false;
    }

    return true;
  }

  /**
   * Neutralize an empty overlay by setting pointer-events to none
   * @param {HTMLElement} overlay - The overlay element to neutralize
   */
  function neutralizeOverlay(overlay) {
    if (!overlay) return;

    try {
      const wasNeutralized = overlay.hasAttribute('data-tvoverlay-neutralized');
      
      if (!wasNeutralized) {
        overlay.style.pointerEvents = 'none';
        overlay.setAttribute('data-tvoverlay-neutralized', 'true');
        console.info(LOG_PREFIX, 'Neutralized empty overlay:', overlay.id || overlay.className);
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Failed to neutralize overlay:', err);
    }
  }

  /**
   * Restore an overlay with content by removing neutralization
   * @param {HTMLElement} overlay - The overlay element to restore
   */
  function restoreOverlay(overlay) {
    if (!overlay) return;

    try {
      const wasNeutralized = overlay.hasAttribute('data-tvoverlay-neutralized');
      
      if (wasNeutralized) {
        overlay.style.pointerEvents = '';
        overlay.removeAttribute('data-tvoverlay-neutralized');
        console.info(LOG_PREFIX, 'Restored overlay with content:', overlay.id || overlay.className);
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Failed to restore overlay:', err);
    }
  }

  /**
   * Process a single overlay element
   * @param {HTMLElement} overlay - The overlay element to process
   */
  function processOverlay(overlay) {
    if (!overlay) return;

    const empty = isOverlayEmpty(overlay);
    
    if (empty) {
      neutralizeOverlay(overlay);
    } else {
      restoreOverlay(overlay);
    }
  }

  /**
   * Scan and process all TV overlays in the document
   */
  function scanOverlays() {
    OVERLAY_SELECTORS.forEach(selector => {
      try {
        const overlays = document.querySelectorAll(selector);
        overlays.forEach(overlay => {
          processOverlay(overlay);
        });
      } catch (err) {
        console.warn(LOG_PREFIX, `Failed to scan selector "${selector}":`, err);
      }
    });
  }

  /**
   * Ensure .tvViewport has proper block-formatting context
   */
  function ensureTvViewportBFC() {
    try {
      const tvViewport = document.querySelector('.tvViewport');
      if (!tvViewport) return;

      // Check if BFC properties are missing (defensive)
      const computedStyle = window.getComputedStyle(tvViewport);
      const hasOverflow = computedStyle.overflow !== 'visible';
      
      if (!hasOverflow) {
        console.info(LOG_PREFIX, 'Applying BFC to .tvViewport (overflow:hidden)');
        tvViewport.style.overflow = 'hidden';
      }

      // Ensure flex properties are correct
      const flexShrink = computedStyle.flexShrink;
      if (flexShrink !== '0') {
        console.info(LOG_PREFIX, 'Applying flex:1 0 auto to .tvViewport');
        tvViewport.style.flex = '1 0 auto';
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Failed to ensure tvViewport BFC:', err);
    }
  }

  /**
   * Set up MutationObserver to watch for overlay content changes
   */
  function setupOverlayObserver() {
    try {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          // Check if the mutation affects an overlay
          if (mutation.target) {
            const overlay = mutation.target.closest(OVERLAY_SELECTORS.join(','));
            if (overlay) {
              processOverlay(overlay);
            }
          }
        });
      });

      // Observe #tv container for all overlay changes
      const tvContainer = document.getElementById('tv') || document.querySelector('.tv');
      if (tvContainer) {
        observer.observe(tvContainer, {
          childList: true,
          subtree: true,
          attributes: false
        });
        console.info(LOG_PREFIX, 'MutationObserver set up for overlay changes');
      }
    } catch (err) {
      console.warn(LOG_PREFIX, 'Failed to set up MutationObserver:', err);
    }
  }

  /**
   * Initialize TV overlay guards
   */
  function init() {
    console.info(LOG_PREFIX, 'Initializing TV overlay guards...');
    
    // Initial scan
    scanOverlays();
    
    // Ensure .tvViewport has BFC
    ensureTvViewportBFC();
    
    // Set up observer for dynamic changes
    setupOverlayObserver();
    
    console.info(LOG_PREFIX, 'TV overlay guards initialized');
  }

  /**
   * Re-scan overlays (called on phase changes)
   */
  function rescan() {
    console.info(LOG_PREFIX, 'Re-scanning overlays on phase change...');
    scanOverlays();
    ensureTvViewportBFC();
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Listen for phase change events
  if (global.game && global.game.bus) {
    global.game.bus.on('phaseChange', rescan);
    console.info(LOG_PREFIX, 'Registered for phaseChange events');
  } else {
    // Fallback: listen for custom events
    document.addEventListener('phaseChange', rescan);
    document.addEventListener('gamePhaseChange', rescan);
  }

  // Expose for manual testing/debugging
  global.TVOverlayGuards = {
    scan: scanOverlays,
    rescan: rescan,
    processOverlay: processOverlay,
    isOverlayEmpty: isOverlayEmpty
  };

})(window);
