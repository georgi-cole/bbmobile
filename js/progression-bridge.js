// MODULE: progression-bridge.js
// Bridge between the progression system (TypeScript modules) and the main game.
// Exposes a simple API on window.Progression for logging events and showing UI.

(function(global) {
  'use strict';

  // Initialize the bridge
  let progressionCore = null;
  let xpModal = null;
  let xpBadge = null;
  let isInitialized = false;

  /**
   * Initialize the progression system
   */
  async function initializeProgression() {
    if (isInitialized) return true;
    
    try {
      // Dynamically import the progression modules
      progressionCore = await import('../src/progression/dist/core.js');
      const badgeModule = await import('../src/progression/xp-badge.js');
      const modalModule = await import('../src/progression/xp-modal.js');
      
      xpBadge = badgeModule;
      xpModal = modalModule;
      
      // Initialize the progression database
      await progressionCore.initialize();
      
      isInitialized = true;
      return true;
    } catch (error) {
      console.warn('[Progression Bridge] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Log an XP event
   * @param {string} eventType - The event type (e.g., 'HOH_WIN')
   * @param {object} options - Event options
   * @param {number} options.seasonId - Season ID
   * @param {number} options.week - Week number
   * @param {string} options.playerId - Player ID
   * @param {object} options.payload - Additional event data
   */
  async function log(eventType, options = {}) {
    if (!isInitialized) {
      const success = await initializeProgression();
      if (!success) {
        console.warn('[Progression Bridge] Cannot log event - initialization failed');
        return null;
      }
    }

    const { seasonId, week, playerId, payload } = options;
    
    try {
      // Find the rule for this event type
      const ruleSet = await progressionCore.getCurrentRuleSet();
      const rule = ruleSet?.rules.find(r => r.id === eventType);
      
      if (!rule) {
        console.warn(`[Progression Bridge] Unknown event type: ${eventType}`);
        return null;
      }

      // Record the event
      const event = await progressionCore.recordEvent(
        eventType,
        rule.baseXP,
        { season: seasonId, week, playerId, ...payload }
      );

      return event;
    } catch (error) {
      console.error(`[Progression Bridge] Failed to log event:`, error);
      return null;
    }
  }

  /**
   * Recompute totals for a player
   * @param {number} seasonId - Season ID
   * @param {string} playerId - Player ID
   * @returns {Promise<object>} Player state
   */
  async function recompute(seasonId, playerId) {
    if (!isInitialized) {
      await initializeProgression();
    }

    try {
      const state = await progressionCore.getCurrentState();
      return state;
    } catch (error) {
      console.error('[Progression Bridge] Failed to recompute:', error);
      return null;
    }
  }

  /**
   * Show the XP modal
   * @param {number} seasonId - Season ID
   * @param {string} playerId - Player ID
   */
  async function showModal(seasonId, playerId) {
    if (!isInitialized) {
      const success = await initializeProgression();
      if (!success) return;
    }

    try {
      const state = await progressionCore.getCurrentState();
      const breakdown = await progressionCore.getBreakdown();
      
      // Create modal with current state
      const modal = xpModal.createModal({
        theme: 'dark',
        onClose: () => {
          modal.remove();
        }
      });

      // Update modal content
      if (modal && modal.update) {
        modal.update(state, breakdown);
      }
    } catch (error) {
      console.error('[Progression Bridge] Failed to show modal:', error);
    }
  }

  /**
   * Get leaderboard aggregated across all players
   * @param {number} seasonId - Season ID
   * @returns {Promise<Array>} Top players by XP
   */
  async function getLeaderboard(seasonId) {
    if (!isInitialized) {
      await initializeProgression();
    }

    try {
      // Aggregate per-player XP/level for leaderboard
      const game = global.game || {};
      const players = game.players || [];
      
      // Fetch each player's progression state
      const leaderboardStates = await Promise.all(
        players
          .filter(p => !p.evicted)
          .map(async p => {
            let playerState = { totalXP: 0, level: 1 };
            if (progressionCore.getPlayerState) {
              try {
                playerState = await progressionCore.getPlayerState(p.id);
              } catch (e) {
                // fallback to default
              }
            }
            return {
              playerId: p.id,
              playerName: p.name,
              totalXP: playerState.totalXP || 0,
              level: playerState.level || 1
            };
          })
      );

      // Sort and take top 5
      const leaderboard = leaderboardStates
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, 5);

      return leaderboard;
    } catch (error) {
      console.error('[Progression Bridge] Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Get current player state
   */
  async function getCurrentState() {
    if (!isInitialized) {
      await initializeProgression();
    }
    
    try {
      return await progressionCore.getCurrentState();
    } catch (error) {
      console.error('[Progression Bridge] Failed to get state:', error);
      return {
        totalXP: 0,
        level: 1,
        nextLevelXP: 100,
        currentLevelXP: 0,
        progressPercent: 0,
        eventsCount: 0
      };
    }
  }

  // Expose API on window.Progression
  global.Progression = {
    log,
    recompute,
    showModal,
    getLeaderboard,
    getCurrentState,
    initialize: initializeProgression
  };

})(window);
