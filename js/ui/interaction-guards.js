// MODULE: ui/interaction-guards.js
// Utility to guard gesture handlers from swallowing interactions with interactive controls

(function(global) {
  'use strict';

  /**
   * Check if an element or its ancestors are interactive controls
   * @param {HTMLElement} el - Element to check
   * @returns {boolean} true if element is inside an interactive control
   */
  function isInteractive(el) {
    if (!el) return false;
    
    // Check if element itself or closest ancestor is an interactive control
    return !!el.closest('button, [role="button"], a, input, select, textarea, [data-action]');
  }

  /**
   * Check if an event target is an interactive control
   * @param {Event} event - Event object
   * @returns {boolean} true if event target is inside an interactive control
   */
  function isInteractiveEvent(event) {
    if (!event || !event.target) return false;
    return isInteractive(event.target);
  }

  // Export to global
  global.isInteractive = isInteractive;
  global.isInteractiveEvent = isInteractiveEvent;

})(window);
