// MODULE: minigames/core/timer-config.js
// Timer configuration for minigame categories
// Defines default timing behavior for arcade, endurance, logic, and trivia games

(function(g){
  'use strict';

  /**
   * Timer configuration by game category
   * 
   * Fields:
   * - default: Default duration in milliseconds (null for countup/no limit)
   * - min: Minimum allowed duration in milliseconds
   * - max: Maximum allowed duration in milliseconds
   * - hiddenMax: For endurance games, hidden maximum duration
   * - showTimer: Whether to display timer UI by default
   * - countDirection: 'down' for countdown, 'up' for countup
   * - perQuestion: For trivia, time limit per question in milliseconds
   */
  const TIMER_CONFIG = {
    arcade: {
      default: 60000,        // 60 seconds
      min: 30000,            // 30 seconds minimum
      max: 90000,            // 90 seconds maximum
      showTimer: true,
      countDirection: 'down'
    },
    
    endurance: {
      default: null,         // No fixed duration (game-controlled)
      hiddenMax: 180000,     // 3 minutes hidden maximum
      showTimer: false,      // Timer typically hidden for endurance
      countDirection: 'up'   // Count up from 0
    },
    
    logic: {
      default: 120000,       // 2 minutes
      min: 60000,            // 1 minute minimum
      max: 180000,           // 3 minutes maximum
      showTimer: true,
      countDirection: 'down'
    },
    
    trivia: {
      perQuestion: 15000,    // 15 seconds per question
      showTimer: true,
      countDirection: 'down'
    }
  };

  /**
   * Get timer configuration for a specific category
   * @param {string} category - Game category (arcade, endurance, logic, trivia)
   * @returns {Object} Timer configuration object
   */
  function getTimerConfig(category){
    const config = TIMER_CONFIG[category];
    if(!config){
      console.warn(`[TimerConfig] Unknown category "${category}", using logic defaults`);
      return TIMER_CONFIG.logic;
    }
    return { ...config }; // Return a copy to prevent mutation
  }

  /**
   * Get default duration for a category
   * @param {string} category - Game category
   * @param {number} fallback - Fallback duration if category has no default
   * @returns {number|null} Duration in milliseconds or null
   */
  function getDefaultDuration(category, fallback = 60000){
    const config = getTimerConfig(category);
    return config.default !== undefined ? config.default : fallback;
  }

  /**
   * Check if timer should be visible for a category
   * @param {string} category - Game category
   * @returns {boolean} True if timer should be shown
   */
  function shouldShowTimer(category){
    const config = getTimerConfig(category);
    return config.showTimer !== false;
  }

  /**
   * Get count direction for a category
   * @param {string} category - Game category
   * @returns {string} 'up' or 'down'
   */
  function getCountDirection(category){
    const config = getTimerConfig(category);
    return config.countDirection || 'down';
  }

  // Export to global namespace
  g.TimerConfig = {
    TIMER_CONFIG,
    getTimerConfig,
    getDefaultDuration,
    shouldShowTimer,
    getCountDirection
  };

})(window.game = window.game || {});
