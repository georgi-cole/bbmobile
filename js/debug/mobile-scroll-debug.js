/**
 * mobile-scroll-debug.js
 * 
 * DEBUG ASSET - Mobile scroll debugging helper
 * Can be safely removed after issue is resolved
 * 
 * Loaded conditionally via ?scroll_debug=1 query parameter
 * 
 * Purpose:
 * - Add passive touch listeners to hint browser for native scrolling
 * - Detect and warn about problematic touch handlers
 * - Provide toggle function for scroll-debug CSS mode
 * - Log touch event flow for debugging
 */

(function(window) {
  'use strict';

  const DEBUG_PREFIX = '[MobileScrollDebug]';
  
  // Configuration
  const config = {
    enableLogging: true,
    enableWarnings: true,
    scanInterval: 2000, // Re-scan DOM every 2 seconds
    autoEnable: true // Auto-enable scroll-debug class
  };

  // State
  let isActive = false;
  let scanTimer = null;
  const touchHandlers = new Set();

  /**
   * Initialize the debug system
   */
  function init() {
    log('Initializing mobile scroll debug system...');
    
    // Auto-enable scroll debug mode
    if (config.autoEnable) {
      enableScrollDebugMode();
    }
    
    // Add passive touch listener to game root
    addPassiveTouchListeners();
    
    // Scan for problematic touch handlers
    scanForProblematicHandlers();
    
    // Set up periodic scanning
    if (config.scanInterval > 0) {
      scanTimer = setInterval(scanForProblematicHandlers, config.scanInterval);
    }
    
    // Add keyboard shortcut (Ctrl+Shift+S) to toggle
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        toggleScrollDebugMode();
      }
    });
    
    // Expose public API
    window.MobileScrollDebug = {
      enable: enableScrollDebugMode,
      disable: disableScrollDebugMode,
      toggle: toggleScrollDebugMode,
      scan: scanForProblematicHandlers,
      isActive: () => isActive,
      getHandlers: () => Array.from(touchHandlers)
    };
    
    log('Debug system initialized. Press Ctrl+Shift+S to toggle debug mode.');
    log('Active:', isActive);
  }

  /**
   * Enable scroll debug CSS mode
   */
  function enableScrollDebugMode() {
    document.documentElement.classList.add('scroll-debug-active');
    document.body.classList.add('scroll-debug-active');
    isActive = true;
    log('Scroll debug mode ENABLED');
  }

  /**
   * Disable scroll debug CSS mode
   */
  function disableScrollDebugMode() {
    document.documentElement.classList.remove('scroll-debug-active');
    document.body.classList.remove('scroll-debug-active');
    isActive = false;
    log('Scroll debug mode DISABLED');
  }

  /**
   * Toggle scroll debug mode
   */
  function toggleScrollDebugMode() {
    if (isActive) {
      disableScrollDebugMode();
    } else {
      enableScrollDebugMode();
    }
  }

  /**
   * Add passive touch listeners to hint the browser
   */
  function addPassiveTouchListeners() {
    const root = document.querySelector('.game-root') || 
                 document.querySelector('.wrap') || 
                 document.body;
    
    if (!root) {
      warn('Could not find game root element');
      return;
    }
    
    // Add passive listeners to hint browser for native scrolling
    const passiveOpts = { passive: true, capture: false };
    
    root.addEventListener('touchstart', (e) => {
      if (config.enableLogging) {
        log('Touch start:', e.touches.length, 'touches');
      }
    }, passiveOpts);
    
    root.addEventListener('touchmove', (e) => {
      if (config.enableLogging && e.touches.length === 1) {
        // Log scroll attempts (single finger vertical swipes)
        const touch = e.touches[0];
        log('Touch move:', Math.round(touch.clientY), 'y-position');
      }
    }, passiveOpts);
    
    root.addEventListener('touchend', () => {
      if (config.enableLogging) {
        log('Touch end');
      }
    }, passiveOpts);
    
    log('Added passive touch listeners to:', root.className || root.tagName);
  }

  /**
   * Scan DOM for elements with inline touch handlers
   */
  function scanForProblematicHandlers() {
    const problematicAttrs = [
      'ontouchstart',
      'ontouchmove',
      'ontouchend',
      'ontouchcancel'
    ];
    
    const allElements = document.querySelectorAll('*');
    const found = [];
    
    allElements.forEach((el) => {
      problematicAttrs.forEach((attr) => {
        if (el.hasAttribute(attr) || el[attr]) {
          const handler = el.getAttribute(attr) || el[attr]?.toString() || '';
          
          // Check if handler calls preventDefault
          if (handler.includes('preventDefault')) {
            const info = {
              element: el.tagName.toLowerCase(),
              id: el.id || '(no id)',
              class: el.className || '(no class)',
              attribute: attr,
              callsPreventDefault: true
            };
            
            found.push(info);
            touchHandlers.add(JSON.stringify(info));
            
            if (config.enableWarnings) {
              warn('Found touch handler with preventDefault:', info);
            }
          }
        }
      });
    });
    
    // Also check for programmatic listeners (limited detection)
    checkProgrammaticListeners();
    
    if (found.length > 0) {
      warn(`Found ${found.length} potentially problematic touch handlers`);
    }
  }

  /**
   * Check for programmatically added listeners
   * Note: This is limited as we can't inspect actual event listeners in detail
   */
  function checkProgrammaticListeners() {
    // Check known problematic patterns
    const suspects = [
      '.lv2-overlay',
      '.lv-overlay',
      '#panel',
      '.tvViewport',
      '.vote-panel',
      '.game-panel'
    ];
    
    suspects.forEach((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        const styles = window.getComputedStyle(el);
        
        // Check for overflow:hidden which blocks scrolling
        if (styles.overflow === 'hidden' || styles.overflowY === 'hidden') {
          warn(`Element '${selector}' has overflow:hidden which may block scrolling`);
        }
        
        // Check for pointer-events:none
        if (styles.pointerEvents === 'none') {
          warn(`Element '${selector}' has pointer-events:none which blocks touch`);
        }
      }
    });
  }

  /**
   * Log a message
   */
  function log(...args) {
    if (config.enableLogging) {
      console.log(DEBUG_PREFIX, ...args);
    }
  }

  /**
   * Warn about an issue
   */
  function warn(...args) {
    if (config.enableWarnings) {
      console.warn(DEBUG_PREFIX, ...args);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Clean up on unload
  window.addEventListener('beforeunload', () => {
    if (scanTimer) {
      clearInterval(scanTimer);
    }
  });

})(window);
