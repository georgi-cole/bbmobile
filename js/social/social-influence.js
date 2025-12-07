// MODULE: social-influence.js
// Downstream influence system for nomination/veto decisions
// Emits bounded bias signals based on relationships without directly modifying game logic

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  let CONFIG = null;

  async function loadConfig() {
    if (CONFIG) return CONFIG;
    
    try {
      const response = await fetch('/js/social/config/social-sim.cfg.json');
      const cfg = await response.json();
      CONFIG = cfg.influenceBounds || getDefaultInfluenceBounds();
      return CONFIG;
    } catch (err) {
      console.warn('[social-influence] Failed to load config, using defaults:', err);
      CONFIG = getDefaultInfluenceBounds();
      return CONFIG;
    }
  }

  function getDefaultInfluenceBounds() {
    return {
      nominationBias: {
        min: -0.15,
        max: 0.15,
        perAllyLevel: 0.05,
        perEnemyLevel: -0.05
      },
      vetoSaveBias: {
        min: -0.1,
        max: 0.2,
        perAllyLevel: 0.07
      }
    };
  }

  // ============================================================================
  // INFLUENCE COMPUTATION
  // ============================================================================
  
  /**
   * Compute nomination bias for a player considering a target
   * Positive bias = less likely to nominate
   * Negative bias = more likely to nominate
   * @param {number} actorId - Player doing the nominating
   * @param {number} targetId - Potential nominee
   * @returns {number} Bias value (bounded)
   */
  function computeNominationBias(actorId, targetId) {
    if (!CONFIG) {
      console.warn('[social-influence] Config not loaded');
      return 0;
    }

    let bias = 0;
    const Relations = global.Relations || global.SocialRelations;
    if (!Relations) return 0;

    // Check alliance levels
    for (let level = 1; level <= 3; level++) {
      if (Relations.hasRelation(actorId, targetId, `ally_level${level}`)) {
        bias += CONFIG.nominationBias.perAllyLevel * level;
      }
    }

    // Check enemy levels
    for (let level = 1; level <= 3; level++) {
      if (Relations.hasRelation(actorId, targetId, `enemy_level${level}`)) {
        bias += CONFIG.nominationBias.perEnemyLevel * level;
      }
    }

    // Check for special events (betrayal makes enemies more likely targets)
    if (Relations.hasEventTag && Relations.hasEventTag(actorId, targetId, 'betrayal')) {
      bias -= 0.08; // Stronger negative bias for betrayers
    }

    // Clamp to bounds
    bias = Math.max(CONFIG.nominationBias.min, Math.min(CONFIG.nominationBias.max, bias));

    return bias;
  }

  /**
   * Compute veto save bias for a player considering saving a nominee
   * Positive bias = more likely to save
   * Negative bias = less likely to save
   * @param {number} actorId - Veto holder
   * @param {number} targetId - Nominee to potentially save
   * @returns {number} Bias value (bounded)
   */
  function computeVetoSaveBias(actorId, targetId) {
    if (!CONFIG) {
      console.warn('[social-influence] Config not loaded');
      return 0;
    }

    let bias = 0;
    const Relations = global.Relations || global.SocialRelations;
    if (!Relations) return 0;

    // Check alliance levels (strong positive bias for allies)
    for (let level = 1; level <= 3; level++) {
      if (Relations.hasRelation(actorId, targetId, `ally_level${level}`)) {
        bias += CONFIG.vetoSaveBias.perAllyLevel * level;
      }
    }

    // Check for romance/bromance tags (extra incentive to save)
    if (Relations.hasEventTag) {
      if (Relations.hasEventTag(actorId, targetId, 'romance')) {
        bias += 0.1;
      } else if (Relations.hasEventTag(actorId, targetId, 'bromance')) {
        bias += 0.07;
      }
    }

    // Check enemy status (enemies less likely to be saved)
    if (Relations.hasRelation(actorId, targetId, 'enemy_level1')) {
      bias -= 0.05;
    }

    // Clamp to bounds
    bias = Math.max(CONFIG.vetoSaveBias.min, Math.min(CONFIG.vetoSaveBias.max, bias));

    return bias;
  }

  /**
   * Compute influence weights for all eligible targets
   * @param {number} actorId - Actor player ID
   * @param {string} decisionType - 'nomination' or 'veto_save'
   * @param {Array<number>} eligibleTargets - Array of target player IDs
   * @returns {Map<number, number>} Map of targetId -> bias
   */
  function computeInfluenceWeights(actorId, decisionType, eligibleTargets) {
    const weights = new Map();

    for (const targetId of eligibleTargets) {
      let bias = 0;
      
      if (decisionType === 'nomination') {
        bias = computeNominationBias(actorId, targetId);
      } else if (decisionType === 'veto_save') {
        bias = computeVetoSaveBias(actorId, targetId);
      }

      weights.set(targetId, bias);
    }

    return weights;
  }

  // ============================================================================
  // INFLUENCE UPDATE EMISSION
  // ============================================================================
  
  /**
   * Emit influence update event
   * @param {number} actorId - Actor player ID
   * @param {string} decisionType - Decision type
   * @param {Map<number, number>} weights - Target weights
   */
  function emitInfluenceUpdate(actorId, decisionType, weights) {
    const bus = getBus();
    if (!bus) {
      console.warn('[social-influence] No event bus available');
      return;
    }

    const weightsObj = {};
    for (const [targetId, bias] of weights.entries()) {
      weightsObj[targetId] = bias;
    }

    const payload = {
      actorId,
      actorName: getPlayerName(actorId),
      decisionType,
      weights: weightsObj,
      timestamp: Date.now()
    };

    bus.emit('social.influence:update', payload);
    
    const g = global.game;
    if (g?.cfg?.debug?.logInfluence) {
      console.info(`[social-influence] 📊 Influence update: ${decisionType} for ${payload.actorName}`);
      console.table(weightsObj);
    }
  }

  /**
   * Compute and emit influence for a decision
   * @param {number} actorId - Actor player ID
   * @param {string} decisionType - 'nomination' or 'veto_save'
   * @param {Array<number>} eligibleTargets - Array of target player IDs
   */
  async function updateInfluence(actorId, decisionType, eligibleTargets) {
    await loadConfig();
    
    const weights = computeInfluenceWeights(actorId, decisionType, eligibleTargets);
    emitInfluenceUpdate(actorId, decisionType, weights);
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  function getPlayerName(playerId) {
    if (typeof global.safeName === 'function') {
      return global.safeName(playerId);
    }
    
    const g = global.game;
    if (g && g.players) {
      const player = g.players.find(p => p.id === playerId);
      return player?.name || `Player ${playerId}`;
    }
    
    return `Player ${playerId}`;
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================
  
  function init() {
    const bus = getBus();
    if (!bus) {
      console.info('[social-influence] Event bus not ready - deferring initialization');
      setTimeout(init, 100);
      return;
    }

    // Listen for nomination phase start
    bus.on('nomination.phase:start', async (data) => {
      const hohId = data?.hohId || global.game?.currentHOH;
      if (!hohId) return;

      const eligible = getEligibleNominationTargets(hohId);
      await updateInfluence(hohId, 'nomination', eligible);
    });

    // Listen for veto decision phase
    bus.on('veto.decision:start', async (data) => {
      const vetoHolderId = data?.vetoHolderId || global.game?.vetoHolder;
      if (!vetoHolderId) return;

      const nominees = global.game?.nominees || [];
      if (nominees.length > 0) {
        await updateInfluence(vetoHolderId, 'veto_save', nominees);
      }
    });

    console.info('[social-influence] ✓ Initialized and listening for decision events');
  }

  function getEligibleNominationTargets(hohId) {
    const g = global.game;
    if (!g || !g.players) return [];

    return g.players
      .filter(p => !p.evicted && p.id !== hohId && p.id !== g.humanId)
      .map(p => p.id);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  const SocialInfluence = {
    loadConfig,
    computeNominationBias,
    computeVetoSaveBias,
    computeInfluenceWeights,
    updateInfluence,
    
    // For testing
    _getConfig: () => CONFIG
  };

  // Export
  /* global module */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialInfluence;
  }
  global.SocialInfluence = SocialInfluence;

  // Debug API
  if (!global.__socialInfluence) {
    global.__socialInfluence = {
      computeNomBias: computeNominationBias,
      computeVetoBias: computeVetoSaveBias,
      update: updateInfluence
    };
    console.info('[social-influence] ✓ Debug API: window.__socialInfluence');
  }

  // Auto-initialize
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      setTimeout(init, 50);
    }
  } else {
    init();
  }

  console.info('[social-influence] ✓ Module loaded');

})(typeof window !== 'undefined' ? window : global);
