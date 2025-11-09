// MODULE: telemetry.js
// Global telemetry tracking system for game events
// Provides trackEvent function for logging user interactions and game events
// If no external tracker is available, buffers events to game.__telemetry array

(function(global){
  'use strict';

  // Only set up if trackEvent doesn't already exist
  if(typeof global.trackEvent === 'function'){
    return;
  }

  /**
   * Track a game event
   * @param {string} name - Event name (e.g., 'idle:panel:shown', 'idle:action:social')
   * @param {Object} data - Event data/payload
   */
  global.trackEvent = function(name, data){
    try {
      const g = global.game || {};
      if(!g.__telemetry){
        g.__telemetry = [];
      }
      g.__telemetry.push({
        t: Date.now(),
        name: name,
        data: data || {}
      });
    } catch(e){
      // Silently fail - telemetry should never break the game
    }
  };

})(window);
