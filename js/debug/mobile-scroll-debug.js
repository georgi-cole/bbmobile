// mobile-scroll-debug.js
// DEBUG/TEMPORARY helper to diagnose and fix mobile scrolling issues
//
// This module:
//   1. Adds passive touchmove listener to hint browser to allow scrolling
//   2. Scans DOM for problematic touch handlers that call preventDefault
//   3. Provides utility to toggle debug CSS class on body
//
// To revert: Remove from index.html or delete this file

(function(global) {
  'use strict';

  console.log('[Mobile Scroll Debug] Initializing...');

  // State
  const state = {
    enabled: false,
    passiveListenerAdded: false,
    scannedElements: new Set()
  };

  /**
   * Add a passive touchmove listener to the game root to hint the browser
   * that touch scrolling should be allowed
   */
  function addPassiveTouchListener() {
    if (state.passiveListenerAdded) return;

    const gameRoot = document.querySelector('.game-root') ||
                     document.querySelector('.wrap') ||
                     document.body;

    if (!gameRoot) {
      console.warn('[Mobile Scroll Debug] No game root element found');
      return;
    }

    // Add passive listener to enable smooth scrolling
    gameRoot.addEventListener('touchmove', function(e) {
      // Just a hint to the browser - do nothing
    }, { passive: true });

    console.log('[Mobile Scroll Debug] Added passive touchmove listener to:', gameRoot.className || gameRoot.tagName);
    state.passiveListenerAdded = true;
  }

  /**
   * Scan DOM for elements with inline touch handlers that might call preventDefault
   * These can block native scrolling
   */
  function scanForProblematicHandlers() {
    console.log('[Mobile Scroll Debug] Scanning for problematic touch handlers...');
    
    const problematicElements = [];
    const allElements = document.querySelectorAll('*');

    allElements.forEach(el => {
      // Skip if already scanned
      if (state.scannedElements.has(el)) return;
      state.scannedElements.add(el);

      // Check for inline touch event attributes
      const hasTouchStart = el.hasAttribute('ontouchstart');
      const hasTouchMove = el.hasAttribute('ontouchmove');
      const hasTouchEnd = el.hasAttribute('ontouchend');

      if (hasTouchStart || hasTouchMove || hasTouchEnd) {
        problematicElements.push({
          element: el,
          tag: el.tagName.toLowerCase(),
          classes: el.className || '(no class)',
          id: el.id || '(no id)',
          handlers: {
            touchstart: hasTouchStart,
            touchmove: hasTouchMove,
            touchend: hasTouchEnd
          }
        });
      }
    });

    if (problematicElements.length > 0) {
      console.warn('[Mobile Scroll Debug] Found elements with inline touch handlers:');
      problematicElements.forEach(item => {
        console.warn('  -', item.tag, {
          id: item.id,
          classes: item.classes,
          handlers: item.handlers,
          element: item.element
        });
      });
      console.warn('[Mobile Scroll Debug] These handlers may call preventDefault and block scrolling');
    } else {
      console.log('[Mobile Scroll Debug] No inline touch handlers found');
    }

    return problematicElements;
  }

  /**
   * Check for elements with CSS that might block scrolling
   */
  function scanForScrollBlockingCSS() {
    console.log('[Mobile Scroll Debug] Checking for scroll-blocking CSS...');

    const problematicStyles = [];

    // Check html/body
    const html = document.documentElement;
    const body = document.body;

    const htmlOverflow = window.getComputedStyle(html).overflow;
    const bodyOverflow = window.getComputedStyle(body).overflow;

    if (htmlOverflow === 'hidden') {
      console.warn('[Mobile Scroll Debug] <html> has overflow:hidden');
      problematicStyles.push({ element: 'html', property: 'overflow', value: 'hidden' });
    }

    if (bodyOverflow === 'hidden') {
      console.warn('[Mobile Scroll Debug] <body> has overflow:hidden');
      problematicStyles.push({ element: 'body', property: 'overflow', value: 'hidden' });
    }

    // Check live vote containers
    const liveVoteSelectors = [
      '.lv2-overlay',
      '.lv-overlay',
      '.lv2-panel',
      '.vote-panel',
      '.tvViewport'
    ];

    liveVoteSelectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        const styles = window.getComputedStyle(el);
        if (styles.overflow === 'hidden' || styles.overflowY === 'hidden') {
          console.warn(`[Mobile Scroll Debug] ${selector} has overflow:hidden`);
          problematicStyles.push({ 
            element: selector, 
            property: 'overflow', 
            value: styles.overflow 
          });
        }
      }
    });

    if (problematicStyles.length === 0) {
      console.log('[Mobile Scroll Debug] No obvious scroll-blocking CSS found');
    }

    return problematicStyles;
  }

  /**
   * Toggle debug mode CSS class on body
   * When enabled, outlines scrollable containers
   */
  function toggleDebugMode(enabled) {
    state.enabled = enabled !== undefined ? enabled : !state.enabled;

    if (state.enabled) {
      document.body.classList.add('scroll-debug-active');
      console.log('[Mobile Scroll Debug] Debug mode ENABLED - scrollable containers outlined');
    } else {
      document.body.classList.remove('scroll-debug-active');
      console.log('[Mobile Scroll Debug] Debug mode DISABLED');
    }

    return state.enabled;
  }

  /**
   * Log touch event listeners (requires Chrome DevTools)
   */
  function logTouchEventListeners() {
    console.log('[Mobile Scroll Debug] To inspect touch event listeners:');
    console.log('  1. Open Chrome DevTools');
    console.log('  2. Select an element in Elements tab');
    console.log('  3. In Console, type: getEventListeners($0)');
    console.log('  4. Look for touchstart/touchmove with passive:false');
  }

  /**
   * Run all diagnostic checks
   */
  function runDiagnostics() {
    console.log('='.repeat(60));
    console.log('[Mobile Scroll Debug] Running diagnostics...');
    console.log('='.repeat(60));

    addPassiveTouchListener();
    const handlers = scanForProblematicHandlers();
    const styles = scanForScrollBlockingCSS();
    logTouchEventListeners();

    console.log('='.repeat(60));
    console.log('[Mobile Scroll Debug] Diagnostics complete');
    console.log(`  - Found ${handlers.length} elements with inline touch handlers`);
    console.log(`  - Found ${styles.length} elements with scroll-blocking CSS`);
    console.log('='.repeat(60));

    return {
      handlers,
      styles
    };
  }

  /**
   * Initialize on DOMContentLoaded
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    console.log('[Mobile Scroll Debug] Initializing diagnostics...');
    
    // Check for debug mode query param
    const urlParams = new URLSearchParams(window.location.search);
    const shouldEnableDebugMode = urlParams.get('scroll_debug') === '1';
    
    // Run diagnostics after a short delay to let the page fully render
    setTimeout(() => {
      runDiagnostics();
      
      // Auto-enable debug mode if query param is present
      if (shouldEnableDebugMode) {
        toggleDebugMode(true);
      }
    }, 1000);

    // Re-scan when new elements are added (e.g., modals, overlays)
    // Use debouncing to avoid performance issues with frequent DOM changes
    let rescanTimeout;
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          shouldRescan = true;
        }
      });
      
      if (shouldRescan) {
        // Debounce: Clear previous timeout and set new one
        if (rescanTimeout) {
          clearTimeout(rescanTimeout);
        }
        rescanTimeout = setTimeout(() => {
          console.log('[Mobile Scroll Debug] DOM changed, re-scanning...');
          runDiagnostics();
        }, 1000); // Wait 1s after last DOM change
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Expose API to global scope for manual testing
  global.MobileScrollDebug = {
    runDiagnostics,
    toggleDebugMode,
    scanForProblematicHandlers,
    scanForScrollBlockingCSS,
    addPassiveTouchListener,
    getState: () => ({ ...state })
  };

  // Auto-initialize
  init();

  console.log('[Mobile Scroll Debug] Module loaded. Available commands:');
  console.log('  - MobileScrollDebug.runDiagnostics()');
  console.log('  - MobileScrollDebug.toggleDebugMode()');
  console.log('  - MobileScrollDebug.scanForProblematicHandlers()');
  console.log('  - MobileScrollDebug.scanForScrollBlockingCSS()');

})(window);
