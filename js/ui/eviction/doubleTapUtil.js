// MODULE: doubleTapUtil.js
// Utility for detecting double-tap/double-click across pointer/touch/click events
// Provides robust detection with configurable timing window and prevents misfires

(function(global) {
  'use strict';

  /**
   * Default configuration for double-tap detection
   */
  const DEFAULT_CONFIG = {
    tapWindow: 350,        // Maximum time between taps (ms)
    moveTolerance: 10,     // Maximum movement allowed between taps (pixels)
    preventScroll: true,   // Prevent scroll on first tap
    debugMode: false       // Enable debug logging
  };

  /**
   * Creates a double-tap detector for an element
   * @param {HTMLElement} element - The element to attach the detector to
   * @param {Function} onDoubleTap - Callback fired on double-tap with (event, data)
   * @param {Object} config - Configuration options
   * @returns {Object} - Detector instance with destroy() method
   */
  function createDoubleTapDetector(element, onDoubleTap, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    
    let firstTap = null;
    let tapTimeout = null;

    const log = (...args) => {
      if (cfg.debugMode) {
        console.log('[DoubleTap]', ...args);
      }
    };

    /**
     * Get pointer coordinates from event
     */
    function getCoords(event) {
      const e = event.touches ? event.touches[0] : event;
      return { x: e.clientX, y: e.clientY };
    }

    /**
     * Calculate distance between two points
     */
    function distance(p1, p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Handle tap/click event
     */
    function handleTap(event) {
      const now = Date.now();
      const coords = getCoords(event);

      log('Tap detected', { coords, firstTap });

      if (!firstTap) {
        // First tap
        firstTap = {
          timestamp: now,
          coords: coords
        };

        log('First tap recorded', firstTap);

        // Set timeout to clear first tap if no second tap
        tapTimeout = setTimeout(() => {
          log('Tap window expired, clearing first tap');
          firstTap = null;
        }, cfg.tapWindow);

        // Prevent default to avoid accidental scrolling/zooming on mobile
        if (cfg.preventScroll) {
          event.preventDefault();
        }

        return;
      }

      // Second tap detected
      const timeDelta = now - firstTap.timestamp;
      const dist = distance(firstTap.coords, coords);

      log('Second tap detected', {
        timeDelta,
        dist,
        maxTime: cfg.tapWindow,
        maxDist: cfg.moveTolerance
      });

      // Clear timeout
      if (tapTimeout) {
        clearTimeout(tapTimeout);
        tapTimeout = null;
      }

      // Check if within time and distance tolerance
      if (timeDelta <= cfg.tapWindow && dist <= cfg.moveTolerance) {
        log('✓ Double-tap confirmed!');
        
        // Clear first tap
        firstTap = null;

        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();

        // Fire callback
        if (typeof onDoubleTap === 'function') {
          onDoubleTap(event, {
            coords,
            timeDelta,
            distance: dist
          });
        }
      } else {
        // Reset - this becomes the new first tap
        log('✗ Second tap out of bounds, treating as new first tap');
        firstTap = {
          timestamp: now,
          coords: coords
        };

        tapTimeout = setTimeout(() => {
          firstTap = null;
        }, cfg.tapWindow);

        if (cfg.preventScroll) {
          event.preventDefault();
        }
      }
    }

    /**
     * Handle double-click (desktop)
     */
    function handleDblClick(event) {
      log('Double-click detected (native)');
      
      event.preventDefault();
      event.stopPropagation();

      if (typeof onDoubleTap === 'function') {
        onDoubleTap(event, {
          coords: getCoords(event),
          native: true
        });
      }
    }

    // Attach event listeners
    // Use pointer events if available (modern browsers), fallback to touch/mouse
    const hasPointerEvents = 'PointerEvent' in window;

    if (hasPointerEvents) {
      log('Using pointer events');
      element.addEventListener('pointerdown', handleTap, { passive: false });
    } else {
      log('Using touch/mouse events');
      element.addEventListener('touchstart', handleTap, { passive: false });
      element.addEventListener('mousedown', handleTap);
    }

    // Also listen for native dblclick for desktop
    element.addEventListener('dblclick', handleDblClick);

    /**
     * Clean up and remove event listeners
     */
    function destroy() {
      log('Destroying detector');
      
      if (tapTimeout) {
        clearTimeout(tapTimeout);
        tapTimeout = null;
      }

      firstTap = null;

      if (hasPointerEvents) {
        element.removeEventListener('pointerdown', handleTap);
      } else {
        element.removeEventListener('touchstart', handleTap);
        element.removeEventListener('mousedown', handleTap);
      }
      element.removeEventListener('dblclick', handleDblClick);
    }

    // Return detector instance
    return {
      destroy,
      getFirstTap: () => firstTap,
      reset: () => {
        if (tapTimeout) {
          clearTimeout(tapTimeout);
          tapTimeout = null;
        }
        firstTap = null;
        log('Detector reset');
      }
    };
  }

  /**
   * Create a single-use double-tap detector that auto-destroys after first activation
   * @param {HTMLElement} element
   * @param {Function} onDoubleTap
   * @param {Object} config
   * @returns {Object} - Detector instance
   */
  function createSingleUseDetector(element, onDoubleTap, config = {}) {
    let detector = null;

    const wrappedCallback = (event, data) => {
      // Call user callback
      if (typeof onDoubleTap === 'function') {
        onDoubleTap(event, data);
      }

      // Auto-destroy after first use
      if (detector) {
        detector.destroy();
        detector = null;
      }
    };

    detector = createDoubleTapDetector(element, wrappedCallback, config);

    return detector;
  }

  // Export to global
  global.DoubleTapUtil = {
    createDoubleTapDetector,
    createSingleUseDetector,
    DEFAULT_CONFIG
  };

  console.info('[DoubleTapUtil] Module loaded');

})(window);
