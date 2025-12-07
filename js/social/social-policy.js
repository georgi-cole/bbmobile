// MODULE: social-policy.js
// Decision policy for social action and target selection
// Provides weighted action selection, target scoring, and weekly biases

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION LOADING
  // ============================================================================
  let CONFIG = null;

  async function loadConfig() {
    if (CONFIG) return CONFIG;
    
    try {
      const response = await fetch('/js/social/config/social-sim.cfg.json');
      CONFIG = await response.json();
      console.info('[social-policy] ✓ Configuration loaded');
      return CONFIG;
    } catch (err) {
      console.warn('[social-policy] Failed to load config, using defaults:', err);
      CONFIG = getDefaultConfig();
      return CONFIG;
    }
  }

  function getDefaultConfig() {
    return {
      actionWeights: {
        friendly: { smalltalk: 30, compliment: 25, group_hangout: 15 },
        strategic: { observe: 20, strategize: 18, confide: 12 },
        aggressive: { spread_rumor: 8, expose_secret: 5, confront: 7, interrogate: 10 },
        alliance: { form_alliance: 10, mediate: 8 }
      },
      targetSelection: {
        affinityBias: {
          friendly: { preferNeutral: true, neutralRange: [-0.15, 0.15] },
          aggressive: { preferEnemies: true, enemyThreshold: -0.2 },
          alliance: { preferPositive: true, positiveThreshold: 0.1 }
        },
        roleContextWeights: { currentHOH: 1.3, nominees: 1.5, vetoHolder: 1.2 },
        traitEffects: { strategic: 1.2, social: 1.3, competitive: 0.9 }
      },
      weeklyBiases: {
        aggressionByWeek: { '1-3': 0.3, '4-6': 0.5, '7-9': 0.7, '10+': 0.8 },
        allianceFormationRate: { '1-3': 0.8, '4-6': 0.5, '7-9': 0.3, '10+': 0.2 },
        betrayalRiskRate: { '1-3': 0.1, '4-6': 0.2, '7-9': 0.4, '10+': 0.5 }
      },
      relationshipThresholds: {
        alliance: { level1: 0.2, level2: 0.4, level3: 0.6 },
        enemy: { level1: -0.2, level2: -0.4, level3: -0.6 },
        betrayal: -0.06,
        fight: -0.08,
        romance: 0.5,
        bromance: 0.4
      }
    };
  }

  // ============================================================================
  // WEEK-BASED BIAS RETRIEVAL
  // ============================================================================
  function getWeeklyBias(biasType, week) {
    if (!CONFIG) return 0.5;
    
    const biases = CONFIG.weeklyBiases[biasType];
    if (!biases) return 0.5;

    if (week <= 3) return biases['1-3'] ?? 0.5;
    if (week <= 6) return biases['4-6'] ?? 0.5;
    if (week <= 9) return biases['7-9'] ?? 0.5;
    return biases['10+'] ?? 0.5;
  }

  // ============================================================================
  // ACTION SELECTION
  // ============================================================================
  
  /**
   * Choose an action for a player based on context and weights
   * @param {Object} player - Player object
   * @param {Object} context - Game context (week, nominees, HOH, etc.)
   * @returns {string|null} Action type
   */
  function chooseActionFor(player, context = {}) {
    if (!CONFIG) {
      console.warn('[social-policy] Config not loaded, cannot choose action');
      return null;
    }

    const week = context.week || global.game?.week || 1;
    const aggressionBias = getWeeklyBias('aggressionByWeek', week);
    const allianceBias = getWeeklyBias('allianceFormationRate', week);

    // Build weighted action pool
    const actionPool = [];
    
    // Friendly actions (always available, inverse aggression weight)
    const friendlyWeight = (1 - aggressionBias) * 1.5;
    Object.entries(CONFIG.actionWeights.friendly).forEach(([action, baseWeight]) => {
      actionPool.push({ action, weight: baseWeight * friendlyWeight, category: 'friendly' });
    });

    // Strategic actions (moderate weight)
    Object.entries(CONFIG.actionWeights.strategic).forEach(([action, baseWeight]) => {
      actionPool.push({ action, weight: baseWeight, category: 'strategic' });
    });

    // Aggressive actions (scaled by week)
    Object.entries(CONFIG.actionWeights.aggressive).forEach(([action, baseWeight]) => {
      actionPool.push({ action, weight: baseWeight * aggressionBias, category: 'aggressive' });
    });

    // Alliance actions (scaled by week)
    Object.entries(CONFIG.actionWeights.alliance).forEach(([action, baseWeight]) => {
      actionPool.push({ action, weight: baseWeight * allianceBias, category: 'alliance' });
    });

    // Weight total
    const totalWeight = actionPool.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) return null;

    // Weighted random selection
    let rand = Math.random() * totalWeight;
    for (const item of actionPool) {
      rand -= item.weight;
      if (rand <= 0) {
        return item.action;
      }
    }

    // Fallback: return first action
    return actionPool[0]?.action || null;
  }

  // ============================================================================
  // TARGET SELECTION
  // ============================================================================
  
  /**
   * Choose targets for a player's action
   * @param {Object} player - Actor player
   * @param {string} actionType - Action type
   * @param {Object} context - Game context
   * @returns {Array<number>} Array of target player IDs
   */
  function chooseTargetsFor(player, actionType, context = {}) {
    if (!CONFIG) {
      console.warn('[social-policy] Config not loaded, cannot choose targets');
      return [];
    }

    const eligiblePlayers = getEligibleTargets(player.id, context);
    if (eligiblePlayers.length === 0) return [];

    // Determine action category
    const category = getActionCategory(actionType);
    
    // Multi-target actions
    if (actionType === 'group_hangout' || actionType === 'mediate') {
      return selectMultipleTargets(player, eligiblePlayers, 2, 4, category, context);
    }

    // Single target actions
    return [selectSingleTarget(player, eligiblePlayers, category, context)];
  }

  function getActionCategory(actionType) {
    if (!CONFIG) return 'friendly';
    
    for (const [category, actions] of Object.entries(CONFIG.actionWeights)) {
      if (actions[actionType] !== undefined) {
        return category;
      }
    }
    return 'friendly';
  }

  function getEligibleTargets(actorId, context) {
    const g = global.game;
    if (!g || !g.players) return [];

    // Get alive players excluding actor
    const eligible = g.players.filter(p => {
      if (p.id === actorId) return false;
      if (p.evicted) return false;
      return true;
    });

    return eligible;
  }

  function selectSingleTarget(player, eligiblePlayers, category, context) {
    const scores = eligiblePlayers.map(target => ({
      player: target,
      score: scoreTarget(player, target, category, context)
    }));

    // Sort by score (descending)
    scores.sort((a, b) => b.score - a.score);

    // Weighted random from top 3
    const topCandidates = scores.slice(0, Math.min(3, scores.length));
    const totalScore = topCandidates.reduce((sum, item) => sum + Math.max(item.score, 0.1), 0);
    
    let rand = Math.random() * totalScore;
    for (const item of topCandidates) {
      rand -= Math.max(item.score, 0.1);
      if (rand <= 0) {
        return item.player.id;
      }
    }

    return topCandidates[0]?.player.id || eligiblePlayers[0].id;
  }

  function selectMultipleTargets(player, eligiblePlayers, minCount, maxCount, category, context) {
    const count = Math.min(
      minCount + Math.floor(Math.random() * (maxCount - minCount + 1)),
      eligiblePlayers.length
    );

    // Score all targets
    const scores = eligiblePlayers.map(target => ({
      player: target,
      score: scoreTarget(player, target, category, context)
    }));

    // Sort and take top candidates
    scores.sort((a, b) => b.score - a.score);
    const selected = scores.slice(0, count);

    return selected.map(item => item.player.id);
  }

  /**
   * Score a target for selection (higher = more likely)
   * @param {Object} actor - Actor player
   * @param {Object} target - Target player
   * @param {string} category - Action category
   * @param {Object} context - Game context
   * @returns {number} Score
   */
  function scoreTarget(actor, target, category, context) {
    let score = 1.0;

    // Get affinity between actor and target
    const affinity = getAffinity(actor.id, target.id);
    
    // Apply affinity bias based on category
    const affinityBias = CONFIG.targetSelection.affinityBias[category];
    if (affinityBias) {
      if (category === 'friendly' && affinityBias.preferNeutral) {
        // Prefer neutral relationships for friendly actions
        const [min, max] = affinityBias.neutralRange;
        if (affinity >= min && affinity <= max) {
          score *= 1.5;
        }
      } else if (category === 'aggressive' && affinityBias.preferEnemies) {
        // Prefer enemies for aggressive actions
        if (affinity < affinityBias.enemyThreshold) {
          score *= 2.0;
        }
      } else if (category === 'alliance' && affinityBias.preferPositive) {
        // Prefer positive relationships for alliances
        if (affinity > affinityBias.positiveThreshold) {
          score *= 1.8;
        }
      }
    }

    // Apply role context weights
    const roleWeights = CONFIG.targetSelection.roleContextWeights;
    if (roleWeights) {
      if (context.currentHOH === target.id) {
        score *= roleWeights.currentHOH;
      }
      if (context.nominees && context.nominees.includes(target.id)) {
        score *= roleWeights.nominees;
      }
      if (context.vetoHolder === target.id) {
        score *= roleWeights.vetoHolder;
      }
    }

    // Apply trait effects (if available)
    const traitEffects = CONFIG.targetSelection.traitEffects;
    if (traitEffects && target.traits) {
      for (const trait of target.traits) {
        if (traitEffects[trait]) {
          score *= traitEffects[trait];
        }
      }
    }

    return Math.max(score, 0.1); // Ensure positive score
  }

  // ============================================================================
  // OUTCOME COMPUTATION
  // ============================================================================
  
  /**
   * Compute affinity delta for an action outcome
   * @param {string} actionType - Action type
   * @param {Object} actor - Actor player
   * @param {Object} target - Target player
   * @param {string} outcome - 'success' or 'failure'
   * @returns {number} Affinity delta
   */
  function computeOutcomeDelta(actionType, actor, target, outcome) {
    // Base deltas by action category
    const category = getActionCategory(actionType);
    
    let baseDelta = 0;
    if (category === 'friendly') {
      baseDelta = outcome === 'success' ? 0.03 : -0.01;
    } else if (category === 'strategic') {
      baseDelta = outcome === 'success' ? 0.02 : 0;
    } else if (category === 'aggressive') {
      baseDelta = outcome === 'success' ? -0.04 : -0.02;
    } else if (category === 'alliance') {
      baseDelta = outcome === 'success' ? 0.08 : -0.03;
    }

    // Apply trait modifiers
    let multiplier = 1.0;
    if (actor.traits) {
      if (actor.traits.includes('social')) multiplier *= 1.2;
      if (actor.traits.includes('strategic')) multiplier *= 1.1;
    }

    return baseDelta * multiplier;
  }

  // ============================================================================
  // AFFINITY HELPERS
  // ============================================================================
  
  function getAffinity(playerId1, playerId2) {
    // Try to get affinity from existing system
    if (global.getAffinity) {
      return global.getAffinity(playerId1, playerId2) || 0;
    }
    
    // Fallback: check game state
    const g = global.game;
    if (g && g.__affinities) {
      const key = [playerId1, playerId2].sort((a, b) => a - b).join('-');
      return g.__affinities.get(key) || 0;
    }
    
    return 0;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  const SocialPolicy = {
    loadConfig,
    chooseActionFor,
    chooseTargetsFor,
    computeOutcomeDelta,
    getWeeklyBias,
    
    // For testing
    _getConfig: () => CONFIG,
    _setConfig: (cfg) => { CONFIG = cfg; },
    _scoreTarget: scoreTarget
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialPolicy;
  }
  global.SocialPolicy = SocialPolicy;

  console.info('[social-policy] ✓ Module loaded');

})(typeof window !== 'undefined' ? window : global);
