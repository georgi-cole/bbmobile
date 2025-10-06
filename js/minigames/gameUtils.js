// MODULE: minigames/gameUtils.js
// Unified game utilities for win probability, competition results, and anti-cheat measures

(function(g){
  'use strict';

  // Win probability constant - human players win ~25% of the time when they succeed
  const PLAYER_WIN_CHANCE = 0.25;

  /**
   * Determine game result with win probability bias
   * In competition mode, even if player succeeds, they only win ~25% of the time
   * In debug/test mode, actual success is shown without bias
   * 
   * @param {boolean} playerSucceeded - Whether the player completed the game successfully
   * @param {boolean} debugMode - If true, bypass win probability (show actual result)
   * @returns {boolean} Whether the player should be shown as winner
   */
  function determineGameResult(playerSucceeded, debugMode = false){
    // If player failed, they never win
    if(!playerSucceeded){
      return false;
    }
    
    // In debug mode, show actual result
    if(debugMode){
      return true;
    }
    
    // Apply 25% win probability
    const rng = g.rng || Math.random;
    return rng() < PLAYER_WIN_CHANCE;
  }

  /**
   * Generate competition results for AI competitors
   * Creates realistic score distribution with adjustable difficulty
   * 
   * @param {number} playerScore - The human player's score (0-100)
   * @param {number} numCompetitors - Number of AI competitors
   * @param {string} difficulty - Difficulty level ('easy', 'medium', 'hard')
   * @returns {Array<{id: string, score: number}>} Array of competitor results
   */
  function generateCompetitionResults(playerScore, numCompetitors = 5, difficulty = 'medium'){
    const results = [];
    const rng = g.rng || Math.random;
    
    // Difficulty multipliers affect AI score ranges
    const difficultySettings = {
      easy: { baseMin: 30, baseMax: 70, variance: 0.3 },
      medium: { baseMin: 40, baseMax: 85, variance: 0.25 },
      hard: { baseMin: 50, baseMax: 95, variance: 0.2 }
    };
    
    const settings = difficultySettings[difficulty] || difficultySettings.medium;
    
    for(let i = 0; i < numCompetitors; i++){
      const baseScore = settings.baseMin + rng() * (settings.baseMax - settings.baseMin);
      const variance = 1 - settings.variance + rng() * (settings.variance * 2);
      const finalScore = Math.max(0, Math.min(100, baseScore * variance));
      
      results.push({
        id: `ai_${i}`,
        score: Math.round(finalScore * 10) / 10 // Round to 1 decimal
      });
    }
    
    return results;
  }

  /**
   * Anti-copy style object to prevent text selection and copying
   * Apply this to elements containing game patterns, sequences, or answers
   * 
   * @returns {string} CSS style string for preventing selection/copying
   */
  function getAntiCopyStyles(){
    return 'user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;';
  }

  /**
   * Disable copy/paste events on an element
   * 
   * @param {HTMLElement} element - Element to protect
   */
  function disableCopyPaste(element){
    if(!element) return;
    
    const preventEvent = (e) => {
      e.preventDefault();
      return false;
    };
    
    element.addEventListener('copy', preventEvent);
    element.addEventListener('cut', preventEvent);
    element.addEventListener('paste', preventEvent);
    element.addEventListener('contextmenu', preventEvent); // Disable right-click
    
    // Return cleanup function
    return () => {
      element.removeEventListener('copy', preventEvent);
      element.removeEventListener('cut', preventEvent);
      element.removeEventListener('paste', preventEvent);
      element.removeEventListener('contextmenu', preventEvent);
    };
  }

  /**
   * Generate random sequence from array
   * Used for creating random patterns, colors, shapes, etc.
   * 
   * @param {Array} items - Array of items to choose from
   * @param {number} length - Length of sequence to generate
   * @returns {Array} Random sequence
   */
  function generateRandomSequence(items, length){
    const rng = g.rng || Math.random;
    const sequence = [];
    
    for(let i = 0; i < length; i++){
      const index = Math.floor(rng() * items.length);
      sequence.push(items[index]);
    }
    
    return sequence;
  }

  /**
   * Get difficulty settings for games
   * 
   * @param {string} difficulty - 'easy', 'medium', or 'hard'
   * @returns {Object} Difficulty configuration
   */
  function getDifficultySettings(difficulty = 'medium'){
    const settings = {
      easy: {
        patternLength: 4,
        revealDuration: 5000,
        allowedMistakes: 2,
        timeLimit: 60000
      },
      medium: {
        patternLength: 6,
        revealDuration: 3000,
        allowedMistakes: 1,
        timeLimit: 45000
      },
      hard: {
        patternLength: 8,
        revealDuration: 2000,
        allowedMistakes: 0,
        timeLimit: 30000
      }
    };
    
    return settings[difficulty] || settings.medium;
  }

  // Export API
  g.GameUtils = {
    PLAYER_WIN_CHANCE,
    determineGameResult,
    generateCompetitionResults,
    getAntiCopyStyles,
    disableCopyPaste,
    generateRandomSequence,
    getDifficultySettings
  };

  console.info('[GameUtils] Module loaded - Player win chance:', PLAYER_WIN_CHANCE);

})(window);
