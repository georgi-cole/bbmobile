// MODULE: game-lifecycle.js
// Robust game lifecycle management using run token system
// Prevents background ticks from continuing after game over and ensures clean restarts

(function(global) {
  'use strict';

  /**
   * GameLifecycle - Manages game run sessions using token-based validation
   * 
   * Problem: Using a single boolean termination flag (game.__terminated) can leak
   * state across game restarts because window.game is merged rather than replaced.
   * 
   * Solution: Use a run token that increments on each new season/restart. All
   * background loops (phase timers, social AI, etc.) capture the token at start
   * and validate it before doing work. When a run ends, the token is incremented,
   * automatically invalidating all previous loops.
   */
  const GameLifecycle = {
    // Current run token - increments on each new game/season
    currentRunToken: 0,
    
    // Flag to track if current run has ended (for backward compatibility)
    currentRunEnded: false,

    /**
     * Start a new game run
     * Increments the run token and clears termination state
     * Call this when starting a new season or restarting the game
     */
    startNewRun() {
      this.currentRunToken++;
      this.currentRunEnded = false;
      
      // Update game state
      if (global.game) {
        global.game.__runToken = this.currentRunToken;
        global.game.__terminated = false; // Clear legacy flag for compatibility
      }
      
      console.info(`[GameLifecycle] Started new run with token ${this.currentRunToken}`);
      
      // Emit event for other systems to listen
      if (global.game?.bus) {
        try {
          global.game.bus.emit('lifecycle:run-started', { runToken: this.currentRunToken });
        } catch (e) {
          console.warn('[GameLifecycle] Failed to emit run-started event:', e);
        }
      }
      
      return this.currentRunToken;
    },

    /**
     * End the current game run
     * Marks the current run as ended without incrementing the token
     * Call this when game over is detected (human evicted pre-jury)
     * Background loops will stop on their next token check
     */
    endCurrentRun() {
      if (this.currentRunEnded) {
        console.warn('[GameLifecycle] Current run already ended');
        return;
      }
      
      this.currentRunEnded = true;
      
      // Set legacy termination flag for backward compatibility
      if (global.game) {
        global.game.__terminated = true;
      }
      
      console.info(`[GameLifecycle] Ended run ${this.currentRunToken} (will stop on next tick check)`);
      
      // Emit event for other systems to listen
      if (global.game?.bus) {
        try {
          global.game.bus.emit('lifecycle:run-ended', { runToken: this.currentRunToken });
        } catch (e) {
          console.warn('[GameLifecycle] Failed to emit run-ended event:', e);
        }
      }
    },

    /**
     * Check if a given token represents the current active run
     * Background loops should call this before doing any work
     * 
     * @param {number} token - The run token captured when the loop started
     * @returns {boolean} - True if the token matches the current run and run hasn't ended
     */
    isCurrentRun(token) {
      if (typeof token !== 'number') {
        console.warn('[GameLifecycle] Invalid token type:', typeof token);
        return false;
      }
      
      // Token must match current token and run must not be ended
      return token === this.currentRunToken && !this.currentRunEnded;
    },

    /**
     * Get the current run token
     * Background loops should capture this token when they start
     * 
     * @returns {number} - The current run token
     */
    getCurrentToken() {
      return this.currentRunToken;
    },

    /**
     * Check if the current run has been ended
     * 
     * @returns {boolean} - True if current run has ended
     */
    hasCurrentRunEnded() {
      return this.currentRunEnded;
    },

    /**
     * Get run status information for debugging
     * 
     * @returns {Object} - Status object with token, ended state, and game state
     */
    getStatus() {
      return {
        currentRunToken: this.currentRunToken,
        currentRunEnded: this.currentRunEnded,
        gameRunToken: global.game?.__runToken,
        gameTerminated: global.game?.__terminated,
        isValid: this.isCurrentRun(this.currentRunToken)
      };
    }
  };

  // Initialize on first load
  if (!global.game) {
    global.game = {};
  }
  
  // Start with token 1 (0 is reserved for uninitialized)
  if (GameLifecycle.currentRunToken === 0) {
    GameLifecycle.startNewRun();
  }

  // Export to global scope
  global.GameLifecycle = GameLifecycle;
  
  console.info('[GameLifecycle] Module loaded and initialized');

})(window);
