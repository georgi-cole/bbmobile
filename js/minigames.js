// MODULE: minigames.js
// LEGACY STUB - PHASE 8 CLEANUP
// 
// This file has been cleaned up as part of Phase 8 of the minigame refactor.
// All 15 legacy minigame functions have been removed and migrated to individual
// module files in js/minigames/*.js
// 
// The renderMinigame() function is now only a stub that provides a fallback
// if the bridge in minigames/index.js hasn't loaded yet.
// 
// All minigame routing happens through:
//   1. js/minigames/registry.js - Game metadata and filtering
//   2. js/minigames/selector.js - Non-repeating pool selection
//   3. js/minigames/index.js - Legacy key mapping bridge
// 
// DO NOT ADD NEW GAMES HERE - Create new modules in js/minigames/ instead.
// See docs/minigames.md for complete documentation.

(function(global){
  'use strict';

  /**
   * Legacy renderMinigame function - STUB ONLY
   * 
   * This is kept for backwards compatibility and as a fallback.
   * The actual routing is handled by js/minigames/index.js bridge which
   * overrides this function when it loads.
   * 
   * @deprecated Use MiniGamesRegistry.render() directly for new code
   * @param {string} type - Legacy game type key
   * @param {HTMLElement} host - Container element
   * @param {Function} onSubmit - Callback function(score)
   */
  function renderMinigame(type, host, onSubmit){
    // Fallback: try to use new system directly
    if(global.MiniGamesRegistry && typeof global.MiniGamesRegistry.render === 'function'){
      // Map legacy key to new key
      const legacyMap = {
        'clicker': 'quickTap',
        'memory': 'memoryMatch',
        'math': 'mathBlitz',
        'bar': 'timingBar',
        'typing': 'wordTyping',
        'reaction': 'reactionTimer',
        'numseq': 'sequenceMemory',
        'pattern': 'patternMatch',
        'slider': 'sliderPuzzle',
        'anagram': 'wordAnagram',
        'path': 'pathFinder',
        'target': 'targetPractice',
        'pairs': 'memoryPairs',
        'simon': 'simonSays',
        'estimate': 'estimationGame'
      };
      
      const newKey = legacyMap[type] || type;
      global.MiniGamesRegistry.render(newKey, host, onSubmit);
    } else {
      // Emergency fallback - new system not loaded yet
      console.error('[renderMinigame] New system not available! Showing error message.');
      host.innerHTML = '<div style="padding:20px;text-align:center;"><p style="color:#e3ecf5;">Minigame system not loaded. Please refresh the page.</p></div>';
    }
  }

  // Export to global scope (will be overridden by minigames/index.js bridge)
  global.renderMinigame = renderMinigame;

})(window);