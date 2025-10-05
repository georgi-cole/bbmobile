// MODULE: minigames/selector.js
// Minigame selection system ensuring no repeats within a season
// Uses a shuffled pool approach - all games are played once before any repeat

(function(g){
  'use strict';

  /**
   * Selection system that ensures fair, non-repeating game selection
   * within a season. Uses a shuffled pool that resets only when exhausted.
   */
  
  /**
   * Initialize selection state for a new season
   * This should be called when starting a new game/season
   * @param {Array<string>} availableGames - Array of game keys to include in pool
   */
  function initializeSeasonPool(availableGames){
    if(!availableGames || availableGames.length === 0){
      console.warn('[MinigameSelector] No games available for pool initialization');
      return;
    }
    
    const game = g.game || {};
    
    // Create shuffled pool for the season
    const pool = shuffleArray(availableGames.slice());
    
    // Store pool and tracking state
    game.__minigamePool = pool;
    game.__minigameIndex = 0;
    game.__minigameHistory = game.__minigameHistory || [];
    
    console.info('[MinigameSelector] Initialized season pool with', pool.length, 'games:', pool);
  }

  /**
   * Get the next minigame from the pool
   * Automatically resets and reshuffles when pool is exhausted
   * @param {boolean} allowRepeatAfterExhaustion - If true, reshuffles pool when exhausted
   * @returns {string} The selected game key
   */
  function selectNext(allowRepeatAfterExhaustion = true){
    const game = g.game || {};
    
    // Initialize pool if not exists
    if(!game.__minigamePool || game.__minigamePool.length === 0){
      const registry = g.MinigameRegistry;
      if(!registry){
        console.error('[MinigameSelector] MinigameRegistry not available');
        return null;
      }
      
      // Get all implemented, non-retired games
      const availableGames = registry.getImplementedGames(true);
      if(availableGames.length === 0){
        console.error('[MinigameSelector] No games available');
        return null;
      }
      
      initializeSeasonPool(availableGames);
    }
    
    // Check if pool is exhausted
    if(game.__minigameIndex >= game.__minigamePool.length){
      if(allowRepeatAfterExhaustion){
        console.info('[MinigameSelector] Pool exhausted, reshuffling...');
        
        // Reshuffle pool, but try to avoid immediate repeat of last game
        const lastGame = game.__minigameHistory[game.__minigameHistory.length - 1];
        let newPool = shuffleArray(game.__minigamePool.slice());
        
        // If first game in new pool is same as last game, swap it
        if(newPool.length > 1 && newPool[0] === lastGame){
          // Swap with second game
          [newPool[0], newPool[1]] = [newPool[1], newPool[0]];
          console.info('[MinigameSelector] Avoided immediate repeat by swapping');
        }
        
        game.__minigamePool = newPool;
        game.__minigameIndex = 0;
      } else {
        console.warn('[MinigameSelector] Pool exhausted and repeat not allowed');
        return null;
      }
    }
    
    // Get next game from pool
    const selectedGame = game.__minigamePool[game.__minigameIndex];
    game.__minigameIndex++;
    
    // Track in history
    game.__minigameHistory = game.__minigameHistory || [];
    game.__minigameHistory.push(selectedGame);
    
    // Keep history limited to last 20 games
    if(game.__minigameHistory.length > 20){
      game.__minigameHistory = game.__minigameHistory.slice(-20);
    }
    
    console.info('[MinigameSelector] Selected:', selectedGame, 
                `(${game.__minigameIndex}/${game.__minigamePool.length} in pool)`);
    
    return selectedGame;
  }

  /**
   * Get a weighted random game (legacy compatibility mode)
   * Uses history to penalize recently played games
   * @param {Array<string>} history - Recent game history
   * @param {Array<string>} availableGames - Available games to choose from
   * @returns {string} Selected game key
   */
  function selectWeightedRandom(history, availableGames){
    if(!availableGames || availableGames.length === 0){
      console.error('[MinigameSelector] No games available for weighted selection');
      return null;
    }
    
    if(!history || history.length === 0){
      // No history, pick randomly
      return availableGames[Math.floor(Math.random() * availableGames.length)];
    }
    
    const recentGames = history.slice(-3);
    const lastGame = history[history.length - 1];
    
    // Build weighted pool (penalize recently used games)
    const weighted = [];
    for(const game of availableGames){
      const recentCount = recentGames.filter(g => g === game).length;
      // Weight: 5 (not recently used) to 1 (used 2+ times recently)
      const weight = Math.max(1, 5 - recentCount * 2);
      
      for(let i = 0; i < weight; i++){
        weighted.push(game);
      }
    }
    
    // Pick from weighted pool
    let chosen = weighted[Math.floor(Math.random() * weighted.length)];
    
    // Avoid immediate repeat if possible
    if(chosen === lastGame && availableGames.length > 1){
      const alternatives = availableGames.filter(g => g !== lastGame);
      if(alternatives.length > 0){
        // Build weighted alternatives
        const altWeighted = [];
        for(const game of alternatives){
          const recentCount = recentGames.filter(g => g === game).length;
          const weight = Math.max(1, 5 - recentCount * 2);
          for(let i = 0; i < weight; i++){
            altWeighted.push(game);
          }
        }
        chosen = altWeighted[Math.floor(Math.random() * altWeighted.length)];
        console.info('[MinigameSelector] Avoided immediate repeat:', lastGame, '→', chosen);
      }
    }
    
    return chosen;
  }

  /**
   * Get remaining games in current pool
   * @returns {number} Number of games left before pool exhaustion
   */
  function getRemainingInPool(){
    const game = g.game || {};
    if(!game.__minigamePool){
      return 0;
    }
    return game.__minigamePool.length - (game.__minigameIndex || 0);
  }

  /**
   * Get selection history
   * @param {number} count - Number of recent games to return
   * @returns {Array<string>} Recent game history
   */
  function getHistory(count = 10){
    const game = g.game || {};
    const history = game.__minigameHistory || [];
    return history.slice(-count);
  }

  /**
   * Reset selection state (useful for testing or manual reset)
   */
  function reset(){
    const game = g.game || {};
    delete game.__minigamePool;
    delete game.__minigameIndex;
    delete game.__minigameHistory;
    console.info('[MinigameSelector] State reset');
  }

  /**
   * Fisher-Yates shuffle algorithm
   * @param {Array} array - Array to shuffle (modifies in place)
   * @returns {Array} Shuffled array
   */
  function shuffleArray(array){
    // Use seeded RNG if available, otherwise Math.random
    const rng = g.rng || Math.random;
    
    for(let i = array.length - 1; i > 0; i--){
      const j = Math.floor(rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    
    return array;
  }

  // Export API
  g.MinigameSelector = {
    initializeSeasonPool,
    selectNext,
    selectWeightedRandom,
    getRemainingInPool,
    getHistory,
    reset
  };

})(window);
