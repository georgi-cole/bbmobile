// MODULE: comp-locks.js
// Weekly submission locks for minigames in competitions
// Ensures one-and-done gameplay per week/phase, persists across reloads
// Backwards compatible with legacy games

(function(global){
  'use strict';

  /**
   * CompLocks - Manages weekly submission locks for competition minigames
   * Stores locks in localStorage keyed by week, phase, gameKey, and playerId
   */
  const CompLocks = {
    /**
     * Generate a unique lock key for localStorage
     * @param {number} week - Current game week
     * @param {string} phase - Current game phase (e.g., 'hoh', 'final3_comp1')
     * @param {string} gameKey - Minigame identifier
     * @param {number} playerId - Player ID
     * @returns {string} Lock key for localStorage
     */
    _getLockKey(week, phase, gameKey, playerId){
      return `bb_comp_lock_w${week}_${phase}_${gameKey}_p${playerId}`;
    },

    /**
     * Check if a player has already submitted for this week/phase/game
     * @param {number} week - Current game week
     * @param {string} phase - Current game phase
     * @param {string} gameKey - Minigame identifier
     * @param {number} playerId - Player ID
     * @returns {boolean} True if player has already submitted
     */
    hasSubmittedThisWeek(week, phase, gameKey, playerId){
      try {
        const key = this._getLockKey(week, phase, gameKey, playerId);
        const value = localStorage.getItem(key);
        return value === '1';
      } catch(e) {
        console.warn('[CompLocks] Error checking submission lock:', e);
        return false; // Fail open - allow play if storage unavailable
      }
    },

    /**
     * Lock submission for a player for this week/phase/game
     * @param {number} week - Current game week
     * @param {string} phase - Current game phase
     * @param {string} gameKey - Minigame identifier
     * @param {number} playerId - Player ID
     */
    lockSubmission(week, phase, gameKey, playerId){
      try {
        const key = this._getLockKey(week, phase, gameKey, playerId);
        localStorage.setItem(key, '1');
        console.info(`[CompLocks] Locked: Week ${week}, Phase ${phase}, Game ${gameKey}, Player ${playerId}`);
      } catch(e) {
        console.warn('[CompLocks] Error setting submission lock:', e);
        // Fail silently - game continues even if lock can't be set
      }
    },

    /**
     * Clear all locks for a specific week (useful for testing/debugging)
     * @param {number} week - Week to clear locks for
     */
    clearWeekLocks(week){
      try {
        const prefix = `bb_comp_lock_w${week}_`;
        const keysToRemove = [];
        
        // Find all keys for this week
        for(let i = 0; i < localStorage.length; i++){
          const key = localStorage.key(i);
          if(key && key.startsWith(prefix)){
            keysToRemove.push(key);
          }
        }
        
        // Remove them
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.info(`[CompLocks] Cleared ${keysToRemove.length} locks for week ${week}`);
      } catch(e) {
        console.warn('[CompLocks] Error clearing week locks:', e);
      }
    },

    /**
     * Clear all competition locks (useful for testing/debugging)
     */
    clearAllLocks(){
      try {
        const prefix = 'bb_comp_lock_';
        const keysToRemove = [];
        
        // Find all lock keys
        for(let i = 0; i < localStorage.length; i++){
          const key = localStorage.key(i);
          if(key && key.startsWith(prefix)){
            keysToRemove.push(key);
          }
        }
        
        // Remove them
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.info(`[CompLocks] Cleared all ${keysToRemove.length} competition locks`);
      } catch(e) {
        console.warn('[CompLocks] Error clearing all locks:', e);
      }
    }
  };

  // Export to global scope
  global.CompLocks = CompLocks;

  console.info('[CompLocks] Module loaded');

})(window);
