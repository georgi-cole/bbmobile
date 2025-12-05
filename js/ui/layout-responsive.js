// MODULE: layout-responsive.js
// ============================================================================
// Responsive Layout Manager - Dynamic Height Calculation for Mobile
// ============================================================================
//
// Purpose: Dynamically compute and adjust available vertical space for the
// avatar grid to prevent it from extending under the faux-TV area on mobile
// viewports. Responds to window resize, orientation changes, and dynamic
// content changes (pills, social cards appearing/disappearing).
//
// Context: Part of mobile faux-TV viewport overlap fix. The avatar grid must
// scroll internally when it exceeds available space, rather than pushing the
// TV area down or overlapping with it.
//
// Strategy:
// 1. Calculate total viewport height minus safe areas
// 2. Measure fixed elements (header, topbar, phase pills, TV height)
// 3. Compute remaining space for avatar grid
// 4. Set --houseguests-grid-max-height CSS variable
// 5. Apply inline max-height to roster elements as fallback
// 6. Re-run calculation on resize, orientationchange, and DOM mutations
//
// Related: css/roster-responsive.css, PR_SUMMARY_LAYOUT_FIX.md
// ============================================================================

(function(global) {
  'use strict';

  const LOG_PREFIX = '[LayoutResponsive]';

  // Configuration
  const CONFIG = {
    // Minimum height for faux TV area (prevents collapsing)
    fauxTvMinHeight: 480,
    
    // Minimum height for houseguests section (pills + title remain visible)
    houseguestsSectionMinHeight: 80,
    
    // Buffer/padding around elements for breathing room
    verticalBuffer: 16,
    
    // Debounce delay for resize events (ms)
    resizeDebounceMs: 150,
    
    // Only apply responsive layout on mobile (max-width)
    mobileMaxWidth: 900,
    
    // Selectors for elements we need to measure
    selectors: {
      viewport: 'body',
      header: '.houseguests-header',
      compactHud: '.compact-hud',
      rosterBar: '#rosterBar',
      topRoster: '.top-roster-row',
      avatarGrid: '.avatar-grid',
      tv: '.tv',
      tvViewport: '.tvViewport',
      actionCard: '#actionCard'
    }
  };

  // State
  let resizeTimeout = null;
  let observer = null;
  let lastCalculatedHeight = 0;

  /**
   * Check if we're on a mobile viewport
   * @returns {boolean}
   */
  function isMobileViewport() {
    return window.innerWidth <= CONFIG.mobileMaxWidth;
  }

  /**
   * Get safe area insets from CSS env() variables
   * @returns {Object} - {top, bottom, left, right}
   */
  function getSafeAreaInsets() {
    const root = document.documentElement;
    const computed = window.getComputedStyle(root);
    
    const parseInset = (varName) => {
      const value = computed.getPropertyValue(varName).trim();
      return parseInt(value, 10) || 0;
    };

    return {
      top: parseInset('--safe-inset-top'),
      bottom: parseInset('--safe-inset-bottom'),
      left: parseInset('--safe-inset-left'),
      right: parseInset('--safe-inset-right')
    };
  }

  /**
   * Get the height of an element, or 0 if not found
   * @param {string} selector
   * @returns {number}
   */
  function getElementHeight(selector) {
    try {
      const el = document.querySelector(selector);
      if (!el) return 0;
      
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const marginTop = parseInt(style.marginTop, 10) || 0;
      const marginBottom = parseInt(style.marginBottom, 10) || 0;
      
      return rect.height + marginTop + marginBottom;
    } catch (err) {
      console.warn(LOG_PREFIX, `Failed to get height for "${selector}":`, err);
      return 0;
    }
  }

  /**
   * Calculate available height for avatar grid
   * @returns {number} - Height in pixels
   */
  function calculateAvailableHeight() {
    try {
      // Total viewport height
      const viewportHeight = window.innerHeight;
      
      // Safe area insets (for devices with notches)
      const safeInsets = getSafeAreaInsets();
      const safeTop = safeInsets.top;
      const safeBottom = safeInsets.bottom;
      
      // Measure fixed elements
      const headerHeight = getElementHeight(CONFIG.selectors.header);
      const compactHudHeight = getElementHeight(CONFIG.selectors.compactHud);
      const tvHeight = Math.max(
        getElementHeight(CONFIG.selectors.tv),
        CONFIG.fauxTvMinHeight
      );
      
      // Calculate consumed vertical space
      const consumedHeight = 
        safeTop +
        safeBottom +
        headerHeight +
        compactHudHeight +
        tvHeight +
        CONFIG.verticalBuffer;
      
      // Remaining space for avatar grid
      const availableHeight = Math.max(
        viewportHeight - consumedHeight,
        CONFIG.houseguestsSectionMinHeight
      );
      
      console.info(LOG_PREFIX, 'Height calculation:', {
        viewportHeight,
        safeTop,
        safeBottom,
        headerHeight,
        compactHudHeight,
        tvHeight,
        consumedHeight,
        availableHeight
      });
      
      return Math.floor(availableHeight);
    } catch (err) {
      console.error(LOG_PREFIX, 'Failed to calculate available height:', err);
      return CONFIG.houseguestsSectionMinHeight;
    }
  }

  /**
   * Apply calculated height to avatar grid elements
   * @param {number} height - Height in pixels
   */
  function applyHeight(height) {
    if (height === lastCalculatedHeight) {
      return; // No change, skip update
    }

    try {
      // Set CSS variable for responsive CSS to use
      document.documentElement.style.setProperty(
        '--houseguests-grid-max-height',
        `${height}px`
      );
      
      // Also apply inline max-height as fallback
      const selectors = [
        CONFIG.selectors.rosterBar,
        CONFIG.selectors.topRoster,
        CONFIG.selectors.avatarGrid
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.style.maxHeight = `${height}px`;
        });
      });
      
      lastCalculatedHeight = height;
      console.info(LOG_PREFIX, `Applied max-height: ${height}px`);
    } catch (err) {
      console.error(LOG_PREFIX, 'Failed to apply height:', err);
    }
  }

  /**
   * Main layout adjustment function
   */
  function adjustLayout() {
    // Only run on mobile viewports
    if (!isMobileViewport()) {
      console.info(LOG_PREFIX, 'Desktop viewport detected, skipping mobile layout adjustments');
      return;
    }

    console.info(LOG_PREFIX, 'Running layout adjustment...');
    
    const availableHeight = calculateAvailableHeight();
    applyHeight(availableHeight);
    
    console.info(LOG_PREFIX, 'Layout adjustment complete');
  }

  /**
   * Debounced layout adjustment (for resize events)
   */
  function debouncedAdjustLayout() {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    
    resizeTimeout = setTimeout(() => {
      adjustLayout();
      resizeTimeout = null;
    }, CONFIG.resizeDebounceMs);
  }

  /**
   * Set up MutationObserver to watch for dynamic content changes
   */
  function setupObserver() {
    try {
      observer = new MutationObserver((mutations) => {
        // Check if mutations affect relevant elements
        let shouldRecalculate = false;
        
        mutations.forEach(mutation => {
          const target = mutation.target;
          
          // Check if mutation affects header, compact HUD, or roster
          if (target.matches && (
            target.matches(CONFIG.selectors.header) ||
            target.matches(CONFIG.selectors.compactHud) ||
            target.closest(CONFIG.selectors.header) ||
            target.closest(CONFIG.selectors.compactHud)
          )) {
            shouldRecalculate = true;
          }
          
          // Check if pills or social cards were added/removed
          if (mutation.type === 'childList') {
            const addedNodes = Array.from(mutation.addedNodes);
            const removedNodes = Array.from(mutation.removedNodes);
            
            const relevantChange = [...addedNodes, ...removedNodes].some(node => {
              if (node.nodeType !== Node.ELEMENT_NODE) return false;
              return node.classList && (
                node.classList.contains('phase-pill') ||
                node.classList.contains('social-card') ||
                node.classList.contains('socialize-launcher') ||
                node.matches('[data-sm-social-card-wrap]')
              );
            });
            
            if (relevantChange) {
              shouldRecalculate = true;
            }
          }
        });
        
        if (shouldRecalculate) {
          console.info(LOG_PREFIX, 'DOM mutation detected, recalculating layout...');
          debouncedAdjustLayout();
        }
      });

      // Observe the action card container
      const actionCard = document.querySelector(CONFIG.selectors.actionCard);
      if (actionCard) {
        observer.observe(actionCard, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style']
        });
        console.info(LOG_PREFIX, 'MutationObserver set up for layout changes');
      } else {
        console.warn(LOG_PREFIX, 'Could not find action card container for observer');
      }
    } catch (err) {
      console.error(LOG_PREFIX, 'Failed to set up MutationObserver:', err);
    }
  }

  /**
   * Clean up observer
   */
  function cleanupObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
      console.info(LOG_PREFIX, 'MutationObserver cleaned up');
    }
  }

  /**
   * Initialize responsive layout manager
   */
  function init() {
    console.info(LOG_PREFIX, 'Initializing responsive layout manager...');
    
    // Initial adjustment
    adjustLayout();
    
    // Set up event listeners
    window.addEventListener('resize', debouncedAdjustLayout);
    window.addEventListener('orientationchange', () => {
      // Wait for orientation change to complete
      setTimeout(adjustLayout, 200);
    });
    
    // Listen for phase changes
    if (global.game && global.game.bus) {
      global.game.bus.on('phaseChange', adjustLayout);
      console.info(LOG_PREFIX, 'Registered for phaseChange events');
    } else {
      document.addEventListener('phaseChange', adjustLayout);
      document.addEventListener('gamePhaseChange', adjustLayout);
    }
    
    // Set up MutationObserver
    setupObserver();
    
    console.info(LOG_PREFIX, 'Responsive layout manager initialized');
  }

  /**
   * Cleanup function (for testing/debugging)
   */
  function cleanup() {
    console.info(LOG_PREFIX, 'Cleaning up responsive layout manager...');
    
    window.removeEventListener('resize', debouncedAdjustLayout);
    window.removeEventListener('orientationchange', adjustLayout);
    
    if (global.game && global.game.bus) {
      global.game.bus.off('phaseChange', adjustLayout);
    }
    
    cleanupObserver();
    
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
    
    console.info(LOG_PREFIX, 'Cleanup complete');
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    init();
  }

  // Expose API for manual testing/debugging
  global.LayoutResponsive = {
    adjust: adjustLayout,
    calculate: calculateAvailableHeight,
    cleanup: cleanup,
    config: CONFIG
  };

})(window);
