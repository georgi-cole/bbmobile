// MODULE: comp-locks.js
// Weekly submission locks for minigames in competitions
// Ensures one-and-done gameplay per week/phase, persists across reloads
// Backwards compatible with legacy games

(function(global){
  'use strict';

  // Safe localStorage access
  const storage = global.localStorage || {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    get length() { return 0; },
    key: () => null
  };

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
        const value = storage.getItem(key);
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
        storage.setItem(key, '1');
        console.info(`[CompLocks] Locked: Week ${week}, Phase ${phase}, Game ${gameKey}, Player ${playerId}`);
      } catch(e) {
        console.warn('[CompLocks] Error setting submission lock:', e);
        // Fail silently - game continues even if lock can't be set
      }
    },

    /**
     * Clear all locks for a specific week (useful for testing/debugging)
     * @param {number} week - Week to clear locks for
     * @returns {number} Number of locks cleared
     */
    clearWeekLocks(week){
      try {
        const prefix = `bb_comp_lock_w${week}_`;
        
        // Get stable snapshot of all localStorage keys to avoid issues with modification during iteration
        const allKeys = [];
        for(let i = 0; i < storage.length; i++){
          const key = storage.key(i);
          if(key) allKeys.push(key);
        }
        
        // Filter and remove matching keys
        const keysToRemove = allKeys.filter(key => key.startsWith(prefix));
        keysToRemove.forEach(key => storage.removeItem(key));
        
        console.info(`[CompLocks] Cleared ${keysToRemove.length} locks for week ${week}`);
        return keysToRemove.length;
      } catch(e) {
        console.warn('[CompLocks] Error clearing week locks:', e);
        return 0;
      }
    },

    /**
     * Alias for clearWeekLocks for consistency with problem statement
     * @param {number} week - Week to clear locks for
     * @returns {number} Number of locks cleared
     */
    clearWeek(week){
      return this.clearWeekLocks(week);
    },

    /**
     * Peek at lock status without triggering side effects (for diagnostics)
     * @param {number} week - Current game week
     * @param {string} phase - Current game phase
     * @param {string} gameKey - Minigame identifier
     * @param {number} playerId - Player ID
     * @returns {object} Lock info: {exists: boolean, key: string}
     */
    peek(week, phase, gameKey, playerId){
      try {
        const key = this._getLockKey(week, phase, gameKey, playerId);
        const value = storage.getItem(key);
        return {
          exists: value === '1',
          key: key,
          week: week,
          phase: phase,
          gameKey: gameKey,
          playerId: playerId
        };
      } catch(e) {
        console.warn('[CompLocks] Error peeking lock:', e);
        return { exists: false, key: null, error: e.message };
      }
    },

    /**
     * Clear all competition locks (useful for testing/debugging)
     */
    clearAllLocks(){
      try {
        const prefix = 'bb_comp_lock_';
        
        // Get stable snapshot of all localStorage keys
        const allKeys = [];
        for(let i = 0; i < storage.length; i++){
          const key = storage.key(i);
          if(key) allKeys.push(key);
        }
        
        // Filter and remove matching keys
        const keysToRemove = allKeys.filter(key => key.startsWith(prefix));
        keysToRemove.forEach(key => storage.removeItem(key));
        
        console.info(`[CompLocks] Cleared all ${keysToRemove.length} competition locks`);
      } catch(e) {
        console.warn('[CompLocks] Error clearing all locks:', e);
      }
    },

    /**
     * Clear stale week 1 locks (called automatically on all devices at startup)
     * Prevents users from being blocked on first launch due to leftover locks
     */
    clearStaleWeek1Locks(){
      try {
        const prefix = 'bb_comp_lock_w1_';
        
        // Get stable snapshot of all localStorage keys
        const allKeys = [];
        for(let i = 0; i < storage.length; i++){
          const key = storage.key(i);
          if(key) allKeys.push(key);
        }
        
        // Filter and remove matching keys
        const keysToRemove = allKeys.filter(key => key.startsWith(prefix));
        
        if(keysToRemove.length > 0){
          keysToRemove.forEach(key => storage.removeItem(key));
          console.info(`[CompLocks] Auto-cleared ${keysToRemove.length} stale week 1 locks`);
        }
      } catch(e) {
        console.warn('[CompLocks] Error clearing stale week 1 locks:', e);
      }
    }
  };

  // Export to global scope
  global.CompLocks = CompLocks;

  // Auto-clear stale week 1 locks on all devices at startup
  // This prevents users from being blocked on first launch or refresh
  try {
    CompLocks.clearStaleWeek1Locks();
  } catch(e) {
    console.warn('[CompLocks] Failed to auto-clear stale locks:', e);
  }

  console.info('[CompLocks] Module loaded');

})(window);
