// MODULE: progression/engine.js
// Core XP/Level progression engine
// Manages player progression state and XP transactions

(function(g){
  'use strict';

  // Player progression state
  const playerProgressionState = new Map();

  /**
   * Initialize progression for a player
   * @param {string} playerId - Player ID
   * @param {Object} initialState - Initial progression state
   */
  function initializePlayer(playerId, initialState = {}) {
    const state = {
      playerId,
      totalXP: initialState.totalXP || 0,
      level: 1,
      badges: initialState.badges || [],
      achievements: initialState.achievements || [],
      history: initialState.history || [],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    // Calculate initial level
    if (g.ProgressionRules) {
      state.level = g.ProgressionRules.getLevelForXP(state.totalXP);
    }

    playerProgressionState.set(playerId, state);
    console.info(`[Progression Engine] Initialized player ${playerId} at level ${state.level}`);
    
    return state;
  }

  /**
   * Award XP to a player
   * @param {string} playerId - Player ID
   * @param {number} xpAmount - XP to award
   * @param {string} reason - Reason for XP award
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Result with level changes
   */
  function awardXP(playerId, xpAmount, reason = 'unknown', metadata = {}) {
    if (xpAmount <= 0) return null;

    // Ensure player is initialized
    if (!playerProgressionState.has(playerId)) {
      initializePlayer(playerId);
    }

    const state = playerProgressionState.get(playerId);
    const oldXP = state.totalXP;
    const oldLevel = state.level;

    // Award XP
    state.totalXP += xpAmount;
    state.lastUpdated = Date.now();

    // Calculate new level
    let newLevel = oldLevel;
    if (g.ProgressionRules) {
      newLevel = g.ProgressionRules.getLevelForXP(state.totalXP);
    }

    const leveledUp = newLevel > oldLevel;
    state.level = newLevel;

    // Add to history
    const historyEntry = {
      timestamp: Date.now(),
      action: 'xp_awarded',
      xpAmount,
      reason,
      oldXP,
      newXP: state.totalXP,
      oldLevel,
      newLevel,
      metadata
    };
    state.history.push(historyEntry);

    // Record event
    if (g.ProgressionEvents) {
      g.ProgressionEvents.recordEvent(g.ProgressionEvents.EventTypes.XP_GAINED, {
        playerId,
        xpAmount,
        reason,
        oldXP,
        newXP: state.totalXP,
        ...metadata
      });

      if (leveledUp) {
        g.ProgressionEvents.recordEvent(g.ProgressionEvents.EventTypes.LEVEL_UP, {
          playerId,
          oldLevel,
          newLevel,
          totalXP: state.totalXP
        });
      }
    }

    // Emit on GameBus
    if (g.bbGameBus) {
      g.bbGameBus.emit('progression:xp_awarded', {
        playerId,
        xpAmount,
        reason,
        oldXP,
        newXP: state.totalXP
      });

      if (leveledUp) {
        g.bbGameBus.emit('progression:level_up', {
          playerId,
          oldLevel,
          newLevel,
          totalXP: state.totalXP
        });
      }
    }

    const result = {
      success: true,
      playerId,
      xpAwarded: xpAmount,
      reason,
      oldXP,
      newXP: state.totalXP,
      oldLevel,
      newLevel,
      leveledUp,
      levelsGained: newLevel - oldLevel
    };

    console.info(`[Progression Engine] ${playerId} +${xpAmount}XP (${reason}) | Level ${oldLevel} → ${newLevel}`);

    return result;
  }

  /**
   * Award XP by action name (uses rules)
   * @param {string} playerId - Player ID
   * @param {string} action - Action name from rules
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Result
   */
  function awardXPForAction(playerId, action, metadata = {}) {
    if (!g.ProgressionRules) {
      console.warn('[Progression Engine] Rules not available');
      return null;
    }

    const xpAmount = g.ProgressionRules.getXPReward(action);
    if (xpAmount <= 0) {
      console.warn(`[Progression Engine] No XP reward for action: ${action}`);
      return null;
    }

    return awardXP(playerId, xpAmount, action, metadata);
  }

  /**
   * Award badge to player
   * @param {string} playerId - Player ID
   * @param {string} badgeId - Badge identifier
   * @param {string} badgeName - Badge display name
   * @param {Object} metadata - Additional metadata
   */
  function awardBadge(playerId, badgeId, badgeName, metadata = {}) {
    if (!playerProgressionState.has(playerId)) {
      initializePlayer(playerId);
    }

    const state = playerProgressionState.get(playerId);
    
    // Check if already has badge
    if (state.badges.some(b => b.id === badgeId)) {
      return false;
    }

    const badge = {
      id: badgeId,
      name: badgeName,
      earnedAt: Date.now(),
      metadata
    };

    state.badges.push(badge);
    state.lastUpdated = Date.now();

    // Record event
    if (g.ProgressionEvents) {
      g.ProgressionEvents.recordEvent(g.ProgressionEvents.EventTypes.BADGE_EARNED, {
        playerId,
        badgeId,
        badgeName,
        ...metadata
      });
    }

    // Emit on GameBus
    if (g.bbGameBus) {
      g.bbGameBus.emit('progression:badge_earned', {
        playerId,
        badgeId,
        badgeName
      });
    }

    console.info(`[Progression Engine] ${playerId} earned badge: ${badgeName}`);
    return true;
  }

  /**
   * Get player progression state
   * @param {string} playerId - Player ID
   * @returns {Object} Player state or null
   */
  function getPlayerState(playerId) {
    if (!playerProgressionState.has(playerId)) {
      return null;
    }
    
    const state = playerProgressionState.get(playerId);
    
    // Enrich with calculated fields
    let levelInfo = {};
    if (g.ProgressionRules) {
      levelInfo = g.ProgressionRules.getLevelInfo(state.totalXP);
    }

    return {
      ...state,
      ...levelInfo,
      badgeCount: state.badges.length,
      achievementCount: state.achievements.length
    };
  }

  /**
   * Get all player states
   * @returns {Array} All player states
   */
  function getAllPlayerStates() {
    const states = [];
    for (const [playerId, state] of playerProgressionState) {
      states.push(getPlayerState(playerId));
    }
    return states;
  }

  /**
   * Reset player progression
   * @param {string} playerId - Player ID
   */
  function resetPlayer(playerId) {
    if (playerProgressionState.has(playerId)) {
      playerProgressionState.delete(playerId);
      console.info(`[Progression Engine] Reset player ${playerId}`);
    }
  }

  /**
   * Reset all progression data
   */
  function resetAll() {
    playerProgressionState.clear();
    if (g.ProgressionEvents) {
      g.ProgressionEvents.clearEvents();
    }
    console.info('[Progression Engine] Reset all progression data');
  }

  /**
   * Export progression data
   * @returns {Object} All progression data
   */
  function exportData() {
    const data = {
      players: {},
      events: g.ProgressionEvents ? g.ProgressionEvents.getAllEvents() : [],
      exportedAt: Date.now()
    };

    for (const [playerId, state] of playerProgressionState) {
      data.players[playerId] = { ...state };
    }

    return data;
  }

  /**
   * Import progression data
   * @param {Object} data - Data to import
   */
  function importData(data) {
    if (!data || typeof data !== 'object') return;

    // Import players
    if (data.players) {
      for (const [playerId, state] of Object.entries(data.players)) {
        playerProgressionState.set(playerId, state);
      }
    }

    // Import events
    if (data.events && g.ProgressionEvents) {
      g.ProgressionEvents.importEvents(JSON.stringify(data.events));
    }

    console.info('[Progression Engine] Imported progression data');
  }

  // Export API
  const ProgressionEngine = {
    initializePlayer,
    awardXP,
    awardXPForAction,
    awardBadge,
    getPlayerState,
    getAllPlayerStates,
    resetPlayer,
    resetAll,
    exportData,
    importData
  };

  g.ProgressionEngine = ProgressionEngine;

  console.info('[progression/engine] Progression engine initialized');

})(window);
