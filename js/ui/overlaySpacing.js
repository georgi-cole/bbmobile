/**
 * overlaySpacing.js
 * 
 * Manages dynamic spacing between the mobile roster grid and TV overlay.
 * Measures the TV overlay height and updates CSS variables to ensure
 * the last row of avatar tiles is never covered by the overlay.
 * 
 * Features:
 * - Dynamic measurement of TV overlay height (ResizeObserver + MutationObserver)
 * - CSS variable updates for spacer calculation (--overlay-effective-height)
 * - Last-row visibility verification using IntersectionObserver
 * - Adds up to +24px compensation if last row is partially hidden
 * - Recalculates on: load, resize, orientation change, phase change, overlay mutation
 * - No negative margins on overlay - uses spacer element approach
 */

(function(global) {
  'use strict';

  // ============================
  // Configuration
  // ============================

  const CONFIG = {
    TV_SELECTORS: ['.tv', '#tv', '.tvViewport', '[data-faux-tv]'],
    OVERLAY_SELECTORS: ['#tvOverlay', '.tvOverlayContent', '#tvNow'],
    RESIZE_DEBOUNCE_MS: 100,
    MUTATION_DEBOUNCE_MS: 50,
    MIN_OVERLAY_HEIGHT: 100,
    DEFAULT_OVERLAY_HEIGHT: 200,
    ROW_GAP: 6, // Should match --mobile-roster-gap
    MAX_COMPENSATION: 24, // Maximum additional padding if last row is obscured (px)
    VISIBILITY_THRESHOLD: 0.95, // Consider visible if at least 95% visible
  };

  // ============================
  // State
  // ============================

  const state = {
    initialized: false,
    resizeObserver: null,
    mutationObserver: null,
    intersectionObserver: null,
    currentOverlayHeight: CONFIG.DEFAULT_OVERLAY_HEIGHT,
    currentCompensation: 0, // Additional compensation added for last row visibility
    lastRowVisible: true, // Track if last row is fully visible
    resizeTimeout: null,
    mutationTimeout: null,
  };

  // ============================
  // Utility Functions
  // ============================

  /**
   * Debounce function execution
   */
  function debounce(func, wait, timeoutKey) {
    return function executedFunction(...args) {
      clearTimeout(state[timeoutKey]);
      state[timeoutKey] = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Find the TV container element
   */
  function findTvContainer() {
    for (const selector of CONFIG.TV_SELECTORS) {
      const el = document.querySelector(selector);
      if (el && el.isConnected) {
        return el;
      }
    }
    return null;
  }

  /**
   * Find the TV overlay element
   */
  function findTvOverlay() {
    for (const selector of CONFIG.OVERLAY_SELECTORS) {
      const el = document.querySelector(selector);
      if (el && el.isConnected) {
        return el;
      }
    }
    return null;
  }

  /**
   * Check if mobile roster is active
   */
  function isMobileRosterActive() {
    return document.body.hasAttribute('data-mobile-roster-active');
  }

  // ============================
  // Core Functions
  // ============================

  /**
   * Measure the TV overlay height
   * @returns {number} Overlay height in pixels
   */
  function measureOverlayHeight() {
    const tv = findTvContainer();
    const overlay = findTvOverlay();

    let height = CONFIG.DEFAULT_OVERLAY_HEIGHT;

    if (tv && tv.isConnected) {
      // Use the TV container height as the base
      height = tv.offsetHeight || tv.getBoundingClientRect().height;
    } else if (overlay && overlay.isConnected) {
      // Fallback to overlay height
      height = overlay.offsetHeight || overlay.getBoundingClientRect().height;
    }

    // Clamp to minimum
    height = Math.max(height, CONFIG.MIN_OVERLAY_HEIGHT);

    return Math.round(height);
  }

  /**
   * Update CSS variables for spacer calculation
   * @param {number} overlayHeight - Measured overlay height
   * @param {number} compensation - Additional compensation for last row visibility
   */
  function updateCSSVariables(overlayHeight, compensation = 0) {
    const root = document.documentElement;
    
    // Calculate effective height including any compensation
    const effectiveHeight = overlayHeight + compensation;
    
    // Update overlay height variable
    root.style.setProperty('--tv-overlay-height', `${overlayHeight}px`);
    
    // Update effective height including compensation
    // This variable is exposed for external consumption (debugging, diagnostics, custom layouts)
    // and is used by the spacer element height calculation
    root.style.setProperty('--overlay-effective-height', `${effectiveHeight}px`);
    
    // Ensure row gap is set
    root.style.setProperty('--avatar-row-gap', `${CONFIG.ROW_GAP}px`);

    state.currentOverlayHeight = overlayHeight;
    state.currentCompensation = compensation;

    console.info(`[OverlaySpacing] Updated CSS vars: --tv-overlay-height=${overlayHeight}px, --overlay-effective-height=${effectiveHeight}px, compensation=${compensation}px`);
  }

  /**
   * Create or get the grid spacer element
   * @returns {HTMLElement|null} The spacer element
   */
  function ensureSpacerElement() {
    const container = document.querySelector('.mobile-roster-container');
    if (!container) return null;

    let spacer = container.querySelector('.mobile-roster-grid-spacer');
    
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = 'mobile-roster-grid-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      
      // Insert spacer after the active grid
      const grid = container.querySelector('.mobile-roster-active-grid');
      if (grid && grid.nextSibling) {
        container.insertBefore(spacer, grid.nextSibling);
      } else if (grid) {
        container.appendChild(spacer);
      }
      
      console.info('[OverlaySpacing] Created grid spacer element');
    }

    return spacer;
  }

  /**
   * Find the last row of tiles in the roster grid
   * @returns {Array<HTMLElement>} Array of tile elements in the last row
   */
  function findLastRowTiles() {
    const grid = document.querySelector('.mobile-roster-active-grid');
    if (!grid) return [];

    const tiles = Array.from(grid.querySelectorAll('.mobile-roster-tile'));
    if (tiles.length === 0) return [];

    // Get the computed number of columns
    const computedStyle = getComputedStyle(grid);
    const cols = parseInt(computedStyle.getPropertyValue('--mobile-roster-cols'), 10) || 4;

    // Calculate tiles in the last row
    const lastRowCount = tiles.length % cols || cols;
    return tiles.slice(-lastRowCount);
  }

  /**
   * Check if the last row of tiles is fully visible (not obscured by TV overlay)
   * Uses direct DOM measurement for a compact post-measure check
   * @returns {Object} { visible: boolean, gapToOverlay: number, needed: number }
   */
  function checkLastRowVisibility() {
    const lastRowTiles = findLastRowTiles();
    if (lastRowTiles.length === 0) {
      return { visible: true, gapToOverlay: 0, needed: 0 };
    }

    const tv = findTvContainer();
    if (!tv) {
      return { visible: true, gapToOverlay: 0, needed: 0 };
    }

    // Get the bottom edge of the last row (max of all last row tiles)
    let maxBottom = 0;
    for (const tile of lastRowTiles) {
      const rect = tile.getBoundingClientRect();
      maxBottom = Math.max(maxBottom, rect.bottom);
    }

    // Get the top edge of the TV overlay
    const tvRect = tv.getBoundingClientRect();
    const tvTop = tvRect.top;

    // Calculate gap between last row bottom and TV top
    const gapToOverlay = tvTop - maxBottom;

    // We want at least ROW_GAP pixels of visible gap (like the gap between rows)
    const minGap = CONFIG.ROW_GAP;
    const visible = gapToOverlay >= minGap;

    // Calculate how much compensation is needed if not visible
    let needed = 0;
    if (!visible) {
      // We need enough to make the gap equal to minGap
      needed = Math.min(minGap - gapToOverlay, CONFIG.MAX_COMPENSATION);
      needed = Math.max(0, Math.ceil(needed));
    }

    return { visible, gapToOverlay: Math.round(gapToOverlay), needed };
  }

  /**
   * Main function to update spacing
   * Called on load, resize, orientation change, phase change, etc.
   */
  function updateSpacing() {
    if (!isMobileRosterActive()) {
      console.info('[OverlaySpacing] Mobile roster not active, skipping update');
      return;
    }

    // Ensure spacer exists
    const spacer = ensureSpacerElement();

    // Measure and update
    const overlayHeight = measureOverlayHeight();
    
    // First update with zero compensation
    updateCSSVariables(overlayHeight, 0);
    
    // Apply spacer height based on overlay + row gap
    if (spacer) {
      spacer.style.height = `${overlayHeight + CONFIG.ROW_GAP}px`;
    }

    // After layout settles, check last row visibility and add compensation if needed
    requestAnimationFrame(() => {
      const visibility = checkLastRowVisibility();
      state.lastRowVisible = visibility.visible;

      if (!visibility.visible && visibility.needed > 0) {
        // Add compensation to spacer
        const totalHeight = overlayHeight + CONFIG.ROW_GAP + visibility.needed;
        if (spacer) {
          spacer.style.height = `${totalHeight}px`;
        }
        updateCSSVariables(overlayHeight, visibility.needed);
        console.info(`[OverlaySpacing] Added ${visibility.needed}px compensation for last row visibility (gap was ${visibility.gapToOverlay}px)`);
      } else {
        console.info(`[OverlaySpacing] Last row visible (gap: ${visibility.gapToOverlay}px)`);
      }
    });

    console.info(`[OverlaySpacing] Spacing updated: overlay=${overlayHeight}px`);
  }

  // Debounced versions
  const debouncedUpdateOnResize = debounce(updateSpacing, CONFIG.RESIZE_DEBOUNCE_MS, 'resizeTimeout');
  const debouncedUpdateOnMutation = debounce(updateSpacing, CONFIG.MUTATION_DEBOUNCE_MS, 'mutationTimeout');

  // ============================
  // Event Handlers
  // ============================

  /**
   * Handle resize events
   */
  function handleResize() {
    debouncedUpdateOnResize();
  }

  /**
   * Handle orientation change
   */
  function handleOrientationChange() {
    // Use a small delay for orientation change to let layout settle
    setTimeout(updateSpacing, 100);
  }

  /**
   * Handle phase change events
   * Called when game phase changes (e.g., HOH, nominations, veto, etc.)
   */
  function handlePhaseChange() {
    console.info('[OverlaySpacing] Phase change detected, updating spacing');
    // Delay to allow phase UI to render
    setTimeout(updateSpacing, 150);
  }

  /**
   * Setup MutationObserver for overlay content changes
   */
  function setupMutationObserver() {
    if (state.mutationObserver) {
      state.mutationObserver.disconnect();
    }

    const overlay = findTvOverlay();
    const tv = findTvContainer();
    const target = overlay || tv;

    if (!target) {
      console.warn('[OverlaySpacing] No overlay target found for MutationObserver');
      return;
    }

    state.mutationObserver = new MutationObserver((mutations) => {
      // Check if any mutation affects size
      let sizeAffected = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          sizeAffected = true;
          break;
        }
      }

      if (sizeAffected) {
        debouncedUpdateOnMutation();
      }
    });

    state.mutationObserver.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    console.info('[OverlaySpacing] MutationObserver active on', target.tagName || target.id);
  }

  /**
   * Setup ResizeObserver for TV container
   */
  function setupResizeObserver() {
    if (!window.ResizeObserver) {
      console.warn('[OverlaySpacing] ResizeObserver not supported');
      return;
    }

    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
    }

    state.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          debouncedUpdateOnMutation();
        }
      }
    });

    const tv = findTvContainer();
    if (tv) {
      state.resizeObserver.observe(tv);
      console.info('[OverlaySpacing] ResizeObserver active on TV container');
    }
  }

  // ============================
  // Initialization
  // ============================

  /**
   * Initialize the overlay spacing module
   */
  function init() {
    if (state.initialized) {
      console.warn('[OverlaySpacing] Already initialized');
      return;
    }

    console.info('[OverlaySpacing] Initializing...');

    // Initial spacing update
    updateSpacing();

    // Window resize handler
    window.addEventListener('resize', handleResize);

    // Orientation change handler
    const mql = window.matchMedia('(orientation: landscape)');
    if (mql.addEventListener) {
      mql.addEventListener('change', handleOrientationChange);
    } else if (mql.addListener) {
      mql.addListener(handleOrientationChange);
    }

    // Setup observers
    setupMutationObserver();
    setupResizeObserver();

    // Listen for phase change events
    if (global.bbGameBus) {
      global.bbGameBus.on('phase:change', handlePhaseChange);
      global.bbGameBus.on('phase:changed', handlePhaseChange);
      console.info('[OverlaySpacing] Subscribed to phase change events');
    }

    // Custom event listener for phase changes
    global.addEventListener('bb:phase:changed', handlePhaseChange);

    state.initialized = true;
    console.info('[OverlaySpacing] Initialization complete');
  }

  /**
   * Cleanup the module
   */
  function cleanup() {
    window.removeEventListener('resize', handleResize);
    
    if (state.mutationObserver) {
      state.mutationObserver.disconnect();
      state.mutationObserver = null;
    }

    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
      state.resizeObserver = null;
    }

    clearTimeout(state.resizeTimeout);
    clearTimeout(state.mutationTimeout);

    state.initialized = false;
    console.info('[OverlaySpacing] Cleanup complete');
  }

  /**
   * Force a recalculation of spacing
   */
  function recalculate() {
    updateSpacing();
  }

  /**
   * Get current status for diagnostics
   */
  function getStatus() {
    const visibility = checkLastRowVisibility();
    return {
      initialized: state.initialized,
      currentOverlayHeight: state.currentOverlayHeight,
      currentCompensation: state.currentCompensation,
      lastRowVisible: state.lastRowVisible,
      lastRowGapToOverlay: visibility.gapToOverlay,
      mobileRosterActive: isMobileRosterActive(),
      tvContainerFound: !!findTvContainer(),
      overlayFound: !!findTvOverlay(),
      spacerExists: !!document.querySelector('.mobile-roster-grid-spacer'),
    };
  }

  // ============================
  // Auto-initialization
  // ============================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, init after a short delay
    setTimeout(init, 50);
  }

  // Also init on window load as fallback
  window.addEventListener('load', () => {
    if (!state.initialized) {
      init();
    }
  });

  // ============================
  // Public API
  // ============================

  global.OverlaySpacing = {
    init,
    cleanup,
    recalculate,
    getStatus,
    measureOverlayHeight,
    checkLastRowVisibility, // Expose for testing
  };

  console.info('[OverlaySpacing] Module loaded');

})(window);
