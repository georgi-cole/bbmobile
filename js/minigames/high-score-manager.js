// MODULE: minigames/high-score-manager.js
// Central high score tracking and management system for skill-based minigames
// Tracks personal bests per game with localStorage persistence

(function(g){
  'use strict';

  const STORAGE_KEY = 'bb_highscores_v1';

  /**
   * HighScoreManager - Manages personal best scores for minigames
   * 
   * Stores high scores in localStorage with the following structure:
   * {
   *   gameKey: {
   *     score: number,        // The raw score (e.g., food eaten, lines cleared)
   *     timestamp: number,    // When this high score was achieved
   *     displayValue: string  // Human-readable display (e.g., "23 food", "45 lines")
   *   }
   * }
   */
  const HighScoreManager = {
    /**
     * Check if a game supports high scores
     * @param {string} gameKey - The game identifier
     * @returns {boolean} True if game supports high scores
     */
    supportsHighScores(gameKey){
      const registry = g.MinigameRegistry;
      if(!registry){
        console.warn('[HighScoreManager] MinigameRegistry not available');
        return false;
      }
      
      const game = registry.getGame(gameKey);
      if(!game){
        console.warn('[HighScoreManager] Game not found:', gameKey);
        return false;
      }
      
      // Games explicitly marked as not supporting high scores
      if(game.supportsHighScores === false){
        return false;
      }
      
      // Pure luck games don't support high scores
      if(game.type === 'luck' || game.type === 'random'){
        return false;
      }
      
      // Default: skill-based games support high scores
      return true;
    },

    /**
     * Get high score for a game
     * @param {string} gameKey - The game identifier
     * @returns {Object|null} High score object or null if none exists
     */
    getHighScore(gameKey){
      if(!this.supportsHighScores(gameKey)){
        return null;
      }
      
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return data[gameKey] || null;
      } catch(e){
        console.warn('[HighScoreManager] Error loading high score:', e);
        return null;
      }
    },

    /**
     * Set high score for a game (only if better than existing)
     * @param {string} gameKey - The game identifier
     * @param {number} score - The raw score value
     * @param {string} displayValue - Human-readable display (e.g., "23 food")
     * @returns {boolean} True if this is a new high score
     */
    setHighScore(gameKey, score, displayValue){
      if(!this.supportsHighScores(gameKey)){
        return false;
      }
      
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const existing = data[gameKey];
        
        // Check if this is a new high score
        if(!existing || score > existing.score){
          data[gameKey] = {
            score: score,
            timestamp: Date.now(),
            displayValue: displayValue || String(score)
          };
          
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          console.info(`[HighScoreManager] New high score for ${gameKey}: ${score} (${displayValue})`);
          return true;
        }
        
        return false;
      } catch(e){
        console.warn('[HighScoreManager] Error saving high score:', e);
        return false;
      }
    },

    /**
     * Check if a score is a new personal best
     * @param {string} gameKey - The game identifier
     * @param {number} score - The score to check
     * @returns {boolean} True if this would be a new high score
     */
    isNewBest(gameKey, score){
      if(!this.supportsHighScores(gameKey)){
        return false;
      }
      
      const existing = this.getHighScore(gameKey);
      return !existing || score > existing.score;
    },

    /**
     * Get all high scores
     * @returns {Object} All high scores keyed by game
     */
    getAllHighScores(){
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      } catch(e){
        console.warn('[HighScoreManager] Error loading all high scores:', e);
        return {};
      }
    },

    /**
     * Clear high score for a game
     * @param {string} gameKey - The game identifier
     * @returns {boolean} True if cleared successfully
     */
    clearHighScore(gameKey){
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if(data[gameKey]){
          delete data[gameKey];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          console.info(`[HighScoreManager] Cleared high score for ${gameKey}`);
          return true;
        }
        return false;
      } catch(e){
        console.warn('[HighScoreManager] Error clearing high score:', e);
        return false;
      }
    },

    /**
     * Clear all high scores (for reset/testing)
     * @returns {boolean} True if cleared successfully
     */
    clearAllHighScores(){
      try {
        localStorage.removeItem(STORAGE_KEY);
        console.info('[HighScoreManager] Cleared all high scores');
        return true;
      } catch(e){
        console.warn('[HighScoreManager] Error clearing all high scores:', e);
        return false;
      }
    },

    /**
     * Format high score for display before game starts
     * @param {string} gameKey - The game identifier
     * @returns {string|null} Formatted display string or null
     */
    getHighScoreDisplay(gameKey){
      const highScore = this.getHighScore(gameKey);
      if(!highScore){
        return null;
      }
      
      return `Your Best: ${highScore.displayValue}`;
    }
  };

  // Export to global
  g.HighScoreManager = HighScoreManager;

  console.info('[HighScoreManager] Module loaded');

})(window);
