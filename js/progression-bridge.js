// MODULE: progression-bridge.js
// Bridge between the progression system (TypeScript modules) and the main game.
// Exposes a simple API on window.Progression for logging events and showing UI.
// Feature-flagged: all operations are safe no-ops when disabled.

(function(global) {
  'use strict';

  // Initialize the bridge
  let progressionCore = null;
  let xpModal = null;
  let xpBadge = null;
  let isInitialized = false;

  /**
   * Check if progression is enabled via feature flag
   * Priority: window.progression.enabled > localStorage > g.cfg.progressionEnabled > true (default)
   */
  function isEnabled() {
    // Check window.progression first (allows runtime override)
    if (global.progression && typeof global.progression.enabled === 'boolean') {
      return global.progression.enabled;
    }
    
    // Check localStorage - explicit false disables it
    try {
      const stored = localStorage.getItem('progression.enabled');
      if (stored !== null) {
        return stored !== 'false'; // Enabled unless explicitly set to 'false'
      }
    } catch (e) {
      // localStorage not available
    }
    
    // Check game config - explicit false disables it
    if (global.g && global.g.cfg && typeof global.g.cfg.progressionEnabled === 'boolean') {
      return global.g.cfg.progressionEnabled;
    }
    
    // Default: enabled
    return true;
  }

  /**
   * Initialize the progression system
   */
  async function initializeProgression() {
    // Check feature flag first
    if (!isEnabled()) {
      return false;
    }
    
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
      console.log('[Progression Bridge] Initialized successfully');
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
    // Safe no-op when disabled
    if (!isEnabled()) {
      return null;
    }
    
    if (!isInitialized) {
      const success = await initializeProgression();
      if (!success) {
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
    // Safe no-op when disabled
    if (!isEnabled()) {
      return { totalXP: 0, level: 1, nextLevelXP: 100, currentLevelXP: 0, progressPercent: 0, eventsCount: 0 };
    }
    
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
   * @param {Array} leaderboard - Optional leaderboard data
   */
  async function showModal(seasonId, playerId, leaderboard = null) {
    // Safe no-op when disabled
    if (!isEnabled()) {
      console.log('[Progression Bridge] Modal disabled (feature flag off)');
      return;
    }
    
    if (!isInitialized) {
      const success = await initializeProgression();
      if (!success) return;
    }

    try {
      // Get player-specific state with seasonal XP
      const state = await getPlayerState(playerId, seasonId);
      const breakdown = await progressionCore.getBreakdown();
      
      // Get leaderboard if not provided
      if (!leaderboard) {
        leaderboard = await getLeaderboard(seasonId);
      }
      
      // Debug: Log state for verification
      console.log('[Progression Bridge] Overview state:', {
        totalXP: state.totalXP,
        level: state.level,
        progressPercent: state.progressPercent,
        isMax: state.isMax,
        seasonXP: state.seasonXP
      });
      if (leaderboard.length > 0) {
        const currentPlayer = leaderboard.find(p => p.playerId === playerId);
        if (currentPlayer) {
          console.log('[Progression Bridge] Leaderboard player:', {
            playerId: currentPlayer.playerId,
            aggregateXP: currentPlayer.aggregateXP,
            seasonXP: currentPlayer.seasonXP,
            level: currentPlayer.level
          });
        }
      }
      
      // Create modal with current state
      const modal = xpModal.createModal({
        onClose: () => {
          modal.remove();
        }
      });

      // Update modal content with all tabs
      if (modal.updateLeaderboard) {
        modal.updateLeaderboard(leaderboard, playerId);
      }
      if (modal.updateOverview) {
        modal.updateOverview(state, progressionCore.DEFAULT_LEVEL_THRESHOLDS || [], progressionCore.MAX_LEVEL || 20);
      }
      if (modal.updateBreakdown) {
        modal.updateBreakdown(breakdown);
      }
      if (modal.updateUnlocks) {
        modal.updateUnlocks(state, progressionCore.DEFAULT_LEVEL_THRESHOLDS || []);
      }
    } catch (error) {
      console.error('[Progression Bridge] Failed to show modal:', error);
    }
  }

  /**
   * Get leaderboard aggregated across all players
   * @param {number} seasonId - Season ID
   * @returns {Promise<Array>} Top players by seasonal XP (ranked) with aggregate XP and level
   */
  async function getLeaderboard(seasonId) {
    // Safe no-op when disabled
    if (!isEnabled()) {
      return [];
    }
    
    if (!isInitialized) {
      await initializeProgression();
    }

    try {
      // Aggregate per-player XP/level for leaderboard
      const game = global.game || {};
      const players = game.players || [];
      
      // Fetch each player's progression state using getPlayerState (with fallbacks)
      const leaderboardStates = await Promise.all(
        players
          .filter(p => !p.evicted)
          .map(async p => {
            let playerState = { totalXP: 0, level: 1, seasonXP: 0 };
            try {
              // Pass seasonId to get seasonal XP calculation
              playerState = await getPlayerState(p.id, seasonId);
            } catch (e) {
              console.warn('[Progression Bridge] Failed to get player state for playerId:', p.id, e);
              // playerState remains at default
            }
            return {
              playerId: p.id,
              playerName: p.name,
              aggregateXP: playerState.totalXP || 0,  // Total XP across all seasons
              seasonXP: playerState.seasonXP || 0,     // XP for current season only
              level: playerState.level || 1            // Level from aggregate XP
            };
          })
      );

      // Sort by seasonal XP (for ranking) but display level from aggregate XP
      const leaderboard = leaderboardStates
        .sort((a, b) => b.seasonXP - a.seasonXP)
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
    // Safe no-op when disabled
    if (!isEnabled()) {
      return {
        totalXP: 0,
        level: 1,
        nextLevelXP: 100,
        currentLevelXP: 0,
        progressPercent: 0,
        eventsCount: 0
      };
    }
    
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

  /**
   * Get individual player state
   * @param {string} playerId - Player ID
   * @param {number} seasonId - Optional season ID for seasonal XP calculation
   * @returns {Promise<object>} Player progression state
   */
  async function getPlayerState(playerId, seasonId) {
    // Safe no-op when disabled
    if (!isEnabled()) {
      return {
        totalXP: 0,
        level: 1,
        nextLevelXP: 100,
        currentLevelXP: 0,
        progressPercent: 0,
        eventsCount: 0,
        isMax: false,
        seasonXP: 0
      };
    }
    
    if (!isInitialized) {
      await initializeProgression();
    }
    
    try {
      // Preferred: use core's getPlayerState if available
      if (progressionCore.getPlayerState) {
        return await progressionCore.getPlayerState(playerId, seasonId);
      }
      
      // Fallback: derive player state from events filtered by playerId
      if (progressionCore.getEvents && progressionCore.computeLevel) {
        const allEvents = await progressionCore.getEvents();
        const playerEvents = allEvents.filter(e => e.meta?.playerId === playerId);
        
        // Calculate aggregate XP from all player's events
        const totalXP = playerEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
        const eventsCount = playerEvents.length;
        
        // Calculate seasonal XP if seasonId provided
        let seasonXP = 0;
        if (seasonId !== undefined) {
          const seasonEvents = playerEvents.filter(e => e.season === seasonId);
          seasonXP = seasonEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
        }
        
        // Use proper level calculation with thresholds (same as reducer)
        const levelThresholds = progressionCore.DEFAULT_LEVEL_THRESHOLDS || [];
        const { level, nextLevelXP, currentLevelXP, isMax } = progressionCore.computeLevel(totalXP, levelThresholds);
        
        // Calculate progress percent with max level clamping
        let progressPercent = 0;
        if (isMax) {
          progressPercent = 100;
        } else if (currentLevelXP > 0 && nextLevelXP > currentLevelXP) {
          progressPercent = Math.round(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);
          progressPercent = Math.min(100, progressPercent);
        }
        
        return {
          totalXP,
          level,
          nextLevelXP,
          currentLevelXP,
          progressPercent,
          eventsCount,
          isMax,
          seasonXP
        };
      }
      
      // Last resort: return aggregate state for all players
      return await getCurrentState();
    } catch (error) {
      console.error('[Progression Bridge] Failed to get player state:', error);
      return {
        totalXP: 0,
        level: 1,
        nextLevelXP: 100,
        currentLevelXP: 0,
        progressPercent: 0,
        eventsCount: 0,
        isMax: false,
        seasonXP: 0
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
    getPlayerState,
    initialize: initializeProgression,
    isEnabled
  };

})(window);
