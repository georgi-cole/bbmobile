// MODULE: tv-fit.js
// TV Layout Engine - Global TV Fit Contract
// Ensures all game screens fit inside the faux TV safe area without scrolling,
// cut-offs, or unreadable scaling on mobile devices.
//
// Provides:
// - TV safe area measurement
// - Layout mode detection (reflow | paginate | modal)
// - Viewport classification
// - Safe area constraint utilities

(function(global) {
  'use strict';

  const TVFit = global.TVFit || {};

  // Layout modes
  const MODES = {
    REFLOW: 'reflow',     // Natural layout fits at 1.0 scale (desktop/tablet landscape)
    PAGINATE: 'paginate', // Single-item carousel with arrows/dots (phone portrait)
    MODAL: 'modal'        // Overflow content in popup (dense content scenarios)
  };

  // Viewport classifications
  const VIEWPORT_TYPES = {
    DESKTOP: 'desktop',           // Wide screen, landscape
    TABLET_LANDSCAPE: 'tablet-landscape',
    TABLET_PORTRAIT: 'tablet-portrait',
    PHONE_LANDSCAPE: 'phone-landscape',
    PHONE_PORTRAIT: 'phone-portrait'
  };

  // Minimum design requirements (per problem statement)
  const MIN_FONT_SIZE = 16;      // Base font minimum
  const MIN_TAP_TARGET = 44;     // Minimum tap target height in px
  const SAFE_AREA_GUTTER = 8;    // Additional gutter inside safe area

  // Cache for measurements
  let safeAreaCache = null;
  let viewportTypeCache = null;
  let resizeDebounceTimer = null;

  /**
   * Get TV safe area dimensions
   * @returns {Object} { top, right, bottom, left, width, height, innerWidth, innerHeight }
   */
  function getTVSafeArea() {
    const tv = document.getElementById('tv');
    if (!tv) {
      console.warn('[tv-fit] TV element not found');
      return null;
    }

    const tvRect = tv.getBoundingClientRect();
    
    // Get CSS custom properties for safe area
    const style = getComputedStyle(tv);
    const safeTop = parseInt(style.getPropertyValue('--tv-safe-top') || '44', 10);
    const safeBottom = parseInt(style.getPropertyValue('--tv-safe-bottom') || '42', 10);
    const safeX = parseInt(style.getPropertyValue('--tv-safe-x') || '16', 10);

    // Calculate inner safe dimensions
    const innerWidth = tvRect.width - (safeX * 2) - (SAFE_AREA_GUTTER * 2);
    const innerHeight = tvRect.height - safeTop - safeBottom - (SAFE_AREA_GUTTER * 2);

    const safeArea = {
      top: safeTop + SAFE_AREA_GUTTER,
      right: safeX + SAFE_AREA_GUTTER,
      bottom: safeBottom + SAFE_AREA_GUTTER,
      left: safeX + SAFE_AREA_GUTTER,
      width: tvRect.width,
      height: tvRect.height,
      innerWidth: innerWidth,
      innerHeight: innerHeight,
      aspectRatio: innerWidth / innerHeight
    };

    safeAreaCache = safeArea;
    return safeArea;
  }

  /**
   * Classify viewport type based on dimensions
   * @returns {string} One of VIEWPORT_TYPES
   */
  function getViewportType() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    const aspectRatio = width / height;

    // Phone detection (width < 768px or narrow aspect ratio)
    const isPhone = width < 768;
    
    if (isPhone) {
      return isPortrait ? VIEWPORT_TYPES.PHONE_PORTRAIT : VIEWPORT_TYPES.PHONE_LANDSCAPE;
    }

    // Tablet detection (768px - 1024px)
    const isTablet = width >= 768 && width <= 1024;
    
    if (isTablet) {
      return isPortrait ? VIEWPORT_TYPES.TABLET_PORTRAIT : VIEWPORT_TYPES.TABLET_LANDSCAPE;
    }

    // Desktop
    return VIEWPORT_TYPES.DESKTOP;
  }

  /**
   * Determine layout mode for current context
   * @param {Object} options - { contentType, itemCount, estimatedHeight }
   * @returns {string} One of MODES (reflow | paginate | modal)
   */
  function getLayoutMode(options = {}) {
    const viewportType = getViewportType();
    const safeArea = getTVSafeArea();
    
    if (!safeArea) {
      console.warn('[tv-fit] Cannot determine layout mode: safe area unavailable');
      return MODES.REFLOW;
    }

    const {
      contentType = 'generic',
      itemCount = 2,
      estimatedHeight = 0
    } = options;

    // Phone portrait: default to paginate for multi-item content
    if (viewportType === VIEWPORT_TYPES.PHONE_PORTRAIT) {
      // For 2-item comparisons (nominees, finalists), use paginate
      if (itemCount === 2 && contentType === 'vote') {
        return MODES.PAGINATE;
      }
      
      // For dense content that exceeds safe area, use modal
      if (estimatedHeight > safeArea.innerHeight * 0.9) {
        return MODES.MODAL;
      }
      
      // Default to paginate for phone portrait
      return MODES.PAGINATE;
    }

    // Phone landscape: paginate if content is tight
    if (viewportType === VIEWPORT_TYPES.PHONE_LANDSCAPE) {
      if (safeArea.innerHeight < 400) {
        return MODES.PAGINATE;
      }
    }

    // Tablet portrait: use paginate if content is cramped
    if (viewportType === VIEWPORT_TYPES.TABLET_PORTRAIT) {
      if (itemCount > 2 || estimatedHeight > safeArea.innerHeight * 0.85) {
        return MODES.PAGINATE;
      }
    }

    // Desktop and tablet landscape: use reflow (natural layout)
    return MODES.REFLOW;
  }

  /**
   * Check if viewport should use carousel mode
   * @returns {boolean}
   */
  function shouldUseCarousel() {
    const mode = getLayoutMode({ contentType: 'vote', itemCount: 2 });
    return mode === MODES.PAGINATE;
  }

  /**
   * Check if viewport is mobile (phone)
   * @returns {boolean}
   */
  function isMobile() {
    const type = getViewportType();
    return type === VIEWPORT_TYPES.PHONE_PORTRAIT || 
           type === VIEWPORT_TYPES.PHONE_LANDSCAPE;
  }

  /**
   * Check if viewport is narrow (should use single column layout)
   * @returns {boolean}
   */
  function isNarrow() {
    return window.innerWidth < 820;
  }

  /**
   * Apply safe area constraints to an element
   * @param {HTMLElement} element - Element to constrain
   * @param {Object} options - { additionalGutter }
   */
  function applySafeAreaConstraints(element, options = {}) {
    if (!element) return;

    const safeArea = getTVSafeArea();
    if (!safeArea) return;

    const { additionalGutter = 0 } = options;
    
    element.style.setProperty('--local-safe-top', `${safeArea.top + additionalGutter}px`);
    element.style.setProperty('--local-safe-right', `${safeArea.right + additionalGutter}px`);
    element.style.setProperty('--local-safe-bottom', `${safeArea.bottom + additionalGutter}px`);
    element.style.setProperty('--local-safe-left', `${safeArea.left + additionalGutter}px`);
    element.style.setProperty('--local-safe-width', `${safeArea.innerWidth}px`);
    element.style.setProperty('--local-safe-height', `${safeArea.innerHeight}px`);
  }

  /**
   * Ensure element meets minimum tap target size
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if meets requirement
   */
  function ensureMinTapTarget(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    
    if (rect.height < MIN_TAP_TARGET) {
      element.style.minHeight = `${MIN_TAP_TARGET}px`;
      return false; // Was adjusted
    }
    
    return true; // Already meets requirement
  }

  /**
   * Ensure element meets minimum font size
   * @param {HTMLElement} element - Element to check
   * @param {number} minSize - Minimum font size in px (default: 16)
   * @returns {boolean} True if meets requirement
   */
  function ensureMinFontSize(element, minSize = MIN_FONT_SIZE) {
    if (!element) return false;

    const computed = getComputedStyle(element);
    const fontSize = parseFloat(computed.fontSize);
    
    if (fontSize < minSize) {
      element.style.fontSize = `${minSize}px`;
      return false; // Was adjusted
    }
    
    return true; // Already meets requirement
  }

  /**
   * Check if content fits in safe area without overflow
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if fits
   */
  function fitsInSafeArea(element) {
    if (!element) return false;

    const safeArea = getTVSafeArea();
    if (!safeArea) return false;

    const rect = element.getBoundingClientRect();
    
    return rect.width <= safeArea.innerWidth && 
           rect.height <= safeArea.innerHeight;
  }

  /**
   * Setup resize observer to invalidate cache on viewport changes
   */
  function setupResizeObserver() {
    const onResize = () => {
      if (resizeDebounceTimer) {
        clearTimeout(resizeDebounceTimer);
      }

      resizeDebounceTimer = setTimeout(() => {
        // Invalidate cache
        safeAreaCache = null;
        viewportTypeCache = null;

        // Dispatch event for modules to respond to layout changes
        const event = new CustomEvent('tvfit:resize', {
          detail: {
            viewportType: getViewportType(),
            safeArea: getTVSafeArea(),
            layoutMode: getLayoutMode()
          }
        });
        window.dispatchEvent(event);
      }, 150);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  /**
   * Initialize TV Fit system
   */
  function init() {
    setupResizeObserver();
    
    // Initial measurement
    getTVSafeArea();
    getViewportType();
    
    console.info('[tv-fit] TV Fit Contract initialized');
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Public API
  TVFit.MODES = MODES;
  TVFit.VIEWPORT_TYPES = VIEWPORT_TYPES;
  TVFit.MIN_FONT_SIZE = MIN_FONT_SIZE;
  TVFit.MIN_TAP_TARGET = MIN_TAP_TARGET;
  
  TVFit.getTVSafeArea = getTVSafeArea;
  TVFit.getViewportType = getViewportType;
  TVFit.getLayoutMode = getLayoutMode;
  TVFit.shouldUseCarousel = shouldUseCarousel;
  TVFit.isMobile = isMobile;
  TVFit.isNarrow = isNarrow;
  TVFit.applySafeAreaConstraints = applySafeAreaConstraints;
  TVFit.ensureMinTapTarget = ensureMinTapTarget;
  TVFit.ensureMinFontSize = ensureMinFontSize;
  TVFit.fitsInSafeArea = fitsInSafeArea;
  TVFit.init = init;

  global.TVFit = TVFit;

  console.info('[tv-fit] module loaded');

})(window);
