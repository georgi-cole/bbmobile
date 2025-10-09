// MODULE: progression/integration.js
// Integration layer between progression system and game
// Hooks into game events to award XP automatically

(function(g){
  'use strict';

  let isInitialized = false;

  /**
   * Initialize progression integration
   */
  function initialize() {
    if (isInitialized) {
      console.warn('[Progression Integration] Already initialized');
      return;
    }

    if (!g.bbGameBus) {
      console.warn('[Progression Integration] GameBus not available, skipping integration');
      return;
    }

    if (!g.ProgressionEngine) {
      console.warn('[Progression Integration] ProgressionEngine not available');
      return;
    }

    // Hook into minigame telemetry
    g.bbGameBus.on('minigame:telemetry', handleMinigameEvent);

    // Hook into game phase changes (if available)
    g.bbGameBus.on('phase:changed', handlePhaseChange);

    // Hook into competition events
    g.bbGameBus.on('competition:complete', handleCompetitionComplete);

    isInitialized = true;
    console.info('[Progression Integration] Initialized and listening for game events');
  }

  /**
   * Handle minigame telemetry events
   */
  function handleMinigameEvent(event) {
    if (!event || event.type !== 'complete') return;

    const { playerId, score, normalizedScore, success } = event.data;
    if (!playerId) return;

    // Award XP for participation
    g.ProgressionEngine.awardXPForAction(playerId, 'comp_participation', {
      gameKey: event.data.gameKey,
      score: score || 0
    });

    // Award bonus XP for good performance
    if (normalizedScore >= 90) {
      g.ProgressionEngine.awardXPForAction(playerId, 'comp_perfect_score', {
        gameKey: event.data.gameKey,
        score: normalizedScore
      });
    } else if (normalizedScore >= 75) {
      g.ProgressionEngine.awardXPForAction(playerId, 'comp_top3', {
        gameKey: event.data.gameKey,
        score: normalizedScore
      });
    }
  }

  /**
   * Handle phase changes
   */
  function handlePhaseChange(data) {
    if (!data || !data.newPhase) return;

    // Award XP based on phase
    const phase = data.newPhase;
    
    // Example: Award XP when reaching jury phase
    if (phase === 'jury' && data.playerId) {
      g.ProgressionEngine.awardXPForAction(data.playerId, 'reach_jury', {
        phase: phase
      });
    }
  }

  /**
   * Handle competition completion
   */
  function handleCompetitionComplete(data) {
    if (!data || !data.winnerId) return;

    const { winnerId, compType, week } = data;

    // Award XP based on competition type
    if (compType === 'hoh') {
      g.ProgressionEngine.awardXPForAction(winnerId, 'win_hoh', {
        week: week
      });
      
      // Show level-up modal if player leveled up
      showLevelUpModalIfNeeded(winnerId);
    } else if (compType === 'veto') {
      g.ProgressionEngine.awardXPForAction(winnerId, 'win_veto', {
        week: week
      });
      
      showLevelUpModalIfNeeded(winnerId);
    }
  }

  /**
   * Show level-up modal if player leveled up
   */
  function showLevelUpModalIfNeeded(playerId) {
    const state = g.ProgressionEngine.getPlayerState(playerId);
    if (!state) return;

    // Check if there was a recent level-up in history
    const recentHistory = state.history.slice(-5);
    const recentLevelUp = recentHistory.find(h => 
      h.newLevel > h.oldLevel && 
      Date.now() - h.timestamp < 5000
    );

    if (recentLevelUp) {
      showLevelUpModal(recentLevelUp.newLevel, recentLevelUp.oldLevel);
    }
  }

  /**
   * Show level-up modal
   */
  function showLevelUpModal(newLevel, oldLevel) {
    // Create modal element if it doesn't exist
    let modal = document.querySelector('level-up-modal');
    if (!modal) {
      modal = document.createElement('level-up-modal');
      document.body.appendChild(modal);
    }

    modal.setAttribute('level', newLevel);
    modal.setAttribute('old-level', oldLevel);
    modal.show();
  }

  /**
   * Manually award XP to human player
   * @param {string} action - Action name
   * @param {Object} metadata - Additional metadata
   */
  function awardXPToHuman(action, metadata = {}) {
    const game = g.game;
    if (!game || !game.humanId) {
      console.warn('[Progression Integration] No human player found');
      return null;
    }

    return g.ProgressionEngine.awardXPForAction(game.humanId, action, metadata);
  }

  /**
   * Initialize human player progression
   */
  function initializeHumanPlayer() {
    const game = g.game;
    if (!game || !game.humanId) {
      console.warn('[Progression Integration] No human player found');
      return;
    }

    // Initialize if not already done
    if (!g.ProgressionEngine.getPlayerState(game.humanId)) {
      g.ProgressionEngine.initializePlayer(game.humanId);
      console.info('[Progression Integration] Initialized human player:', game.humanId);
    }
  }

  /**
   * Get human player progression state
   */
  function getHumanPlayerState() {
    const game = g.game;
    if (!game || !game.humanId) {
      return null;
    }

    return g.ProgressionEngine.getPlayerState(game.humanId);
  }

  // Export API
  const ProgressionIntegration = {
    initialize,
    awardXPToHuman,
    initializeHumanPlayer,
    getHumanPlayerState,
    showLevelUpModal
  };

  g.ProgressionIntegration = ProgressionIntegration;

  // Auto-initialize when game is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initialize, 100);
    }, { once: true });
  } else {
    setTimeout(initialize, 100);
  }

  console.info('[progression/integration] Integration module loaded');

})(window);
