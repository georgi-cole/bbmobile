// MODULE: minigames/error-handler.js
// Error handling and fallback system for minigames
// Ensures graceful degradation when games fail to load or run

(function(g){
  'use strict';

  // Track failed games to avoid repeated failures
  const failedGames = new Set();
  const fallbackAttempts = new Map(); // gameKey -> attempt count

  /**
   * Handle minigame error with fallback
   * @param {string} gameKey - The game that failed
   * @param {Error|string} error - The error that occurred
   * @param {HTMLElement} container - Container element for rendering
   * @param {Function} onComplete - Completion callback
   * @param {Object} metadata - Additional metadata
   * @returns {boolean} True if fallback was successful
   */
  function handleError(gameKey, error, container, onComplete, metadata = {}){
    console.error(`[MinigameError] Game "${gameKey}" failed:`, error);

    // Log error to telemetry if available
    if(g.MinigameTelemetry){
      g.MinigameTelemetry.logError(gameKey, error, {
        phase: metadata.phase,
        playerId: metadata.playerId,
        fallbackAttempted: true
      });
    }

    // Mark game as failed
    failedGames.add(gameKey);

    // Track fallback attempts
    const attempts = (fallbackAttempts.get(gameKey) || 0) + 1;
    fallbackAttempts.set(gameKey, attempts);

    // If too many fallback attempts, show manual skip
    if(attempts >= 3){
      console.error(`[MinigameError] Too many fallback attempts for "${gameKey}"`);
      showManualSkip(container, onComplete, gameKey);
      return false;
    }

    // Attempt fallback
    const fallbackGame = selectFallbackGame(gameKey);
    
    if(!fallbackGame){
      console.error('[MinigameError] No fallback game available');
      showManualSkip(container, onComplete, gameKey);
      return false;
    }

    console.info(`[MinigameError] Attempting fallback to "${fallbackGame}"`);

    // Log fallback to telemetry
    if(g.MinigameTelemetry){
      g.MinigameTelemetry.logError(gameKey, error, {
        phase: metadata.phase,
        playerId: metadata.playerId,
        fallbackAttempted: true,
        fallbackGame: fallbackGame
      });
    }

    // Try to render fallback game
    try {
      renderWithErrorHandling(fallbackGame, container, onComplete, metadata);
      return true;
    } catch(fallbackError){
      console.error(`[MinigameError] Fallback game "${fallbackGame}" also failed:`, fallbackError);
      
      // Log fallback failure
      if(g.MinigameTelemetry){
        g.MinigameTelemetry.logError(fallbackGame, fallbackError, {
          phase: metadata.phase,
          playerId: metadata.playerId,
          fallbackAttempted: false
        });
      }

      failedGames.add(fallbackGame);
      showManualSkip(container, onComplete, gameKey);
      return false;
    }
  }

  /**
   * Select a fallback game (avoiding failed games)
   * @param {string} failedGameKey - The game that failed
   * @returns {string|null} Fallback game key or null
   */
  function selectFallbackGame(failedGameKey){
    if(!g.MinigameRegistry){
      console.error('[MinigameError] Registry not available for fallback');
      return null;
    }

    // Get all implemented, non-retired games
    let availableGames = g.MinigameRegistry.getImplementedGames(true);

    // Filter out failed games
    availableGames = availableGames.filter(key => !failedGames.has(key));

    // Filter out the failed game itself
    availableGames = availableGames.filter(key => key !== failedGameKey);

    if(availableGames.length === 0){
      console.error('[MinigameError] No available fallback games');
      return null;
    }

    // Prefer simple, reliable games as fallbacks
    const preferredFallbacks = ['quickTap', 'timingBar', 'reactionTimer'];
    for(const preferred of preferredFallbacks){
      if(availableGames.includes(preferred)){
        return preferred;
      }
    }

    // Return random available game
    return availableGames[Math.floor(Math.random() * availableGames.length)];
  }

  /**
   * Render a minigame with error handling
   * @param {string} gameKey - Game key to render
   * @param {HTMLElement} container - Container element
   * @param {Function} onComplete - Completion callback
   * @param {Object} metadata - Additional metadata
   */
  function renderWithErrorHandling(gameKey, container, onComplete, metadata = {}){
    if(!g.MiniGames || !g.MiniGames[gameKey]){
      throw new Error(`Game module "${gameKey}" not loaded`);
    }

    const gameModule = g.MiniGames[gameKey];
    
    if(typeof gameModule.render !== 'function'){
      throw new Error(`Game "${gameKey}" has no render function`);
    }

    // Wrap onComplete with error handling
    const safeOnComplete = (score) => {
      try {
        // Validate score
        if(typeof score !== 'number' || isNaN(score)){
          console.warn(`[MinigameError] Invalid score from "${gameKey}":`, score);
          score = 50; // Default to middle score
        }

        // Clamp score to valid range
        score = Math.max(0, Math.min(150, score));

        // Call original callback
        onComplete(score);
      } catch(error){
        console.error(`[MinigameError] Error in completion callback for "${gameKey}":`, error);
        
        // Log error
        if(g.MinigameTelemetry){
          g.MinigameTelemetry.logError(gameKey, error, {
            phase: metadata.phase,
            playerId: metadata.playerId,
            context: 'completion'
          });
        }

        // Still call callback with default score to prevent blocking
        onComplete(50);
      }
    };

    // Clear container
    container.innerHTML = '';

    // Try to render with timeout
    const renderTimeout = setTimeout(() => {
      console.error(`[MinigameError] Game "${gameKey}" render timeout`);
      throw new Error(`Render timeout for "${gameKey}"`);
    }, 10000); // 10 second timeout

    try {
      gameModule.render(container, safeOnComplete);
      clearTimeout(renderTimeout);
      
      // Log successful start
      if(g.MinigameTelemetry){
        g.MinigameTelemetry.logStart(gameKey, {
          playerId: metadata.playerId,
          phase: metadata.phase,
          week: metadata.week
        });
      }
    } catch(error){
      clearTimeout(renderTimeout);
      throw error;
    }
  }

  /**
   * Show manual skip option when fallback fails
   * @param {HTMLElement} container - Container element
   * @param {Function} onComplete - Completion callback
   * @param {string} failedGameKey - The game that failed
   */
  function showManualSkip(container, onComplete, failedGameKey){
    container.innerHTML = '';
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      padding: 24px;
      text-align: center;
      color: #e3ecf5;
      max-width: 400px;
      margin: 0 auto;
    `;

    errorDiv.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 12px; color: #ff6d6d;">
        Minigame Error
      </div>
      <div style="font-size: 14px; color: #95a9c0; margin-bottom: 20px; line-height: 1.6;">
        The minigame failed to load. This won't affect your progress.
        Click below to continue with a default score.
      </div>
      <button id="skip-minigame-btn" style="
        padding: 12px 32px;
        font-size: 16px;
        background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        transition: transform 0.2s;
      ">
        Continue (Default Score)
      </button>
      ${failedGameKey ? `<div style="font-size: 11px; color: #5a6e85; margin-top: 16px;">Game: ${failedGameKey}</div>` : ''}
    `;

    container.appendChild(errorDiv);

    const skipBtn = errorDiv.querySelector('#skip-minigame-btn');
    skipBtn.addEventListener('mouseenter', () => {
      skipBtn.style.transform = 'translateY(-2px)';
    });
    skipBtn.addEventListener('mouseleave', () => {
      skipBtn.style.transform = 'translateY(0)';
    });
    skipBtn.addEventListener('click', () => {
      console.info('[MinigameError] User manually skipped');
      onComplete(50); // Default score
    });
  }

  /**
   * Check if a game has failed previously
   * @param {string} gameKey - Game key to check
   * @returns {boolean} True if game has failed
   */
  function hasGameFailed(gameKey){
    return failedGames.has(gameKey);
  }

  /**
   * Clear failure record for a game (useful for retrying after fix)
   * @param {string} gameKey - Game key to clear
   */
  function clearFailure(gameKey){
    failedGames.delete(gameKey);
    fallbackAttempts.delete(gameKey);
    console.info(`[MinigameError] Cleared failure record for "${gameKey}"`);
  }

  /**
   * Clear all failure records
   */
  function clearAllFailures(){
    failedGames.clear();
    fallbackAttempts.clear();
    console.info('[MinigameError] Cleared all failure records');
  }

  /**
   * Get list of failed games
   * @returns {Array<string>} Array of failed game keys
   */
  function getFailedGames(){
    return Array.from(failedGames);
  }

  /**
   * Get fallback statistics
   * @returns {Object} Fallback statistics
   */
  function getStats(){
    return {
      failedGames: Array.from(failedGames),
      totalFailed: failedGames.size,
      fallbackAttempts: Object.fromEntries(fallbackAttempts)
    };
  }

  /**
   * Wrapper for safe minigame rendering
   * @param {string} gameKey - Game key
   * @param {HTMLElement} container - Container element
   * @param {Function} onComplete - Completion callback
   * @param {Object} metadata - Additional metadata
   */
  function safeRender(gameKey, container, onComplete, metadata = {}){
    try {
      // Check if game has failed before
      if(hasGameFailed(gameKey)){
        console.warn(`[MinigameError] Game "${gameKey}" failed previously, using fallback`);
        const fallback = selectFallbackGame(gameKey);
        if(fallback){
          gameKey = fallback;
        }
      }

      renderWithErrorHandling(gameKey, container, onComplete, metadata);
    } catch(error){
      handleError(gameKey, error, container, onComplete, metadata);
    }
  }

  // Export API
  g.MinigameErrorHandler = {
    handleError,
    selectFallbackGame,
    renderWithErrorHandling,
    safeRender,
    hasGameFailed,
    clearFailure,
    clearAllFailures,
    getFailedGames,
    getStats
  };

  console.info('[MinigameErrorHandler] Module loaded');

})(window);
