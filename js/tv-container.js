// MODULE: tv-container.js
// Shared utilities for resolving faux TV containers across the app
// Provides consistent container selection priority for TV-mounted UI elements

(function(global) {
  'use strict';

  /**
   * Container selector priority list (from HOH_POV_FIX_SUMMARY.md)
   * Ordered from most specific to most general
   */
  const TV_CONTAINER_SELECTORS = [
    '[data-faux-tv]',      // Primary TV container
    '[data-sm-faux-tv]',   // Social maneuvers TV
    '.tvViewport',         // TV viewport class
    '#tv',                 // TV ID
    '.tv',                 // TV class
    '.faux-tv',            // Faux TV class
    '.tv-screen',          // TV screen class
    '#panel'               // Panel ID
  ];

  /**
   * Get the first attached TV container from priority list
   * @returns {HTMLElement} Attached container or document.body as fallback
   */
  function getTvContainer() {
    for (const selector of TV_CONTAINER_SELECTORS) {
      try {
        const el = document.querySelector(selector);
        if (el && el.isConnected) {
          console.info('[TvContainer] ✓ Resolved container:', selector);
          return el;
        }
      } catch (e) {
        console.warn('[TvContainer] Selector failed:', selector, e);
      }
    }

    console.warn('[TvContainer] ⚠ No TV container found, falling back to document.body');
    return document.body;
  }

  /**
   * Wait for TV container to be ready with retry logic
   * @param {number} maxAttempts - Maximum number of retry attempts
   * @param {number} delayMs - Delay between attempts in milliseconds
   * @returns {Promise<HTMLElement>} Resolved container
   */
  async function waitForTvContainer(maxAttempts = 20, delayMs = 100) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      const container = getTvContainer();
      
      // Accept any attached container (even body fallback)
      if (container && container.isConnected) {
        if (attempts > 1) {
          console.info(`[TvContainer] ✓ Container ready after ${attempts} attempt(s)`);
        }
        return container;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.warn(`[TvContainer] ⚠ Container not ready after ${maxAttempts} attempts`);
    return document.body;
  }

  /**
   * Get or create an overlay container inside the TV
   * Creates a positioned overlay if one doesn't exist
   * @param {HTMLElement} tvContainer - The TV container element
   * @param {string} className - Class name for the overlay (default: 'tv-overlay-mount')
   * @returns {HTMLElement} The overlay container
   */
  function getOrCreateTvOverlay(tvContainer, className = 'tv-overlay-mount') {
    if (!tvContainer) {
      tvContainer = getTvContainer();
    }

    // Check for existing overlay
    let overlay = tvContainer.querySelector(`.${className}`);
    
    if (!overlay) {
      // Create new overlay container
      overlay = document.createElement('div');
      overlay.className = className;
      
      // Position as overlay inside TV (absolute positioning)
      overlay.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;
      
      tvContainer.appendChild(overlay);
      console.info('[TvContainer] ✓ Created TV overlay container');
    }
    
    return overlay;
  }

  /**
   * Ensure container has relative or absolute positioning for overlays
   * @param {HTMLElement} container - Container to check
   */
  function ensurePositioned(container) {
    if (!container) return;
    
    const position = window.getComputedStyle(container).position;
    if (position === 'static') {
      container.style.position = 'relative';
      console.info('[TvContainer] ✓ Set container position to relative');
    }
  }

  // Export to global namespace
  global.TvContainer = {
    getTvContainer,
    waitForTvContainer,
    getOrCreateTvOverlay,
    ensurePositioned,
    // Expose selector list for reference
    SELECTORS: TV_CONTAINER_SELECTORS
  };

})(window);
