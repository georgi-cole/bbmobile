// MODULE: mobileControlsLayout.js
// Mobile UI Controls Layout Manager
//
// Purpose: Clean up UI controls for mobile viewports
//
// Changes (per user feedback):
// - Hide ALL topbar buttons on mobile (≤768px) to save space
// - No buttons should appear above the Houseguests header
// - DR button only appears once in compact HUD (next to 3-dot menu)
// - Settings and sound controls accessible via action menu (3-dot button)
//
// Note: This module is now minimal as CSS handles most hiding.
// Keeping module structure for potential future enhancements.

(function(global) {
  'use strict';

  const MobileControlsLayout = global.MobileControlsLayout || (global.MobileControlsLayout = {});

  let initialized = false;

  /**
   * Initialize mobile controls layout
   * Note: Main functionality now handled via CSS in mobile-ui-controls-fix.css
   */
  function init() {
    if (initialized) {
      console.warn('[MobileControlsLayout] Already initialized');
      return;
    }

    console.info('[MobileControlsLayout] Initialized (CSS-based implementation)');
    
    initialized = true;
  }

  /**
   * Cleanup and destroy (minimal implementation)
   */
  function destroy() {
    initialized = false;
    console.info('[MobileControlsLayout] Destroyed');
  }

  // Public API
  MobileControlsLayout.init = init;
  MobileControlsLayout.destroy = destroy;

  global.MobileControlsLayout = MobileControlsLayout;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, use setTimeout to ensure other modules are ready
    setTimeout(init, 100);
  }

})(window);
