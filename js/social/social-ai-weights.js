// MODULE: social-ai-weights.js
// AI action weighting engine with phase-aware behavior, relationship multipliers, and cooldown/decay
// Selects actions based on: phase context, player roles, relationship graph, persona biases, cooldowns

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION & CONSTANTS
  // ============================================================================
  
  const PHASE_MULTIPLIERS = {
    'pre-noms': {
      'probe_hoh': 3.0,
      'alliance_invite': 1.5,
      'favor_request': 1.3,
      'plant_rumor': 0.8
    },
    'pre-pov': {
      'probe_pov': 3.0,
      'bargain_pov': 2.5,
      'eavesdrop': 1.5,
      'sympathy_visit': 0.8
    },
    'post-noms': {
      'sympathy_visit': 2.5,
      'vote_rally': 2.0,
      'bargain_pov': 1.8,
      'alliance_renew': 1.3,
      'deescalate': 1.2
    },
    'general': {
      // Default multipliers for general phase (all actions available)
    }
  };

  const ROLE_MULTIPLIERS = {
    hoh: {
      'probe_hoh': 0.2,  // Don't probe yourself
      'favor_request': 1.5,
      'alliance_invite': 1.3
    },
    povHolder: {
      'probe_pov': 0.1,  // Don't probe yourself
      'bargain_pov': 0.1  // Don't bargain with yourself
    },
    nominee: {
      'bargain_pov': 2.5,
      'vote_rally': 2.8,
      'sympathy_visit': 0.5,  // Nominees don't visit others for sympathy
      'favor_request': 1.8
    },
    onBlock: {  // Synonym for nominee
      'bargain_pov': 2.5,
      'vote_rally': 2.8,
      'sympathy_visit': 0.5,
      'favor_request': 1.8
    }
  };

  const RELATIONSHIP_MULTIPLIERS = {
    ally: {
      'alliance_invite': 2.0,
      'alliance_renew': 2.5,
      'secret_chat': 1.8,
      'favor_grant': 1.6,
      'vote_rally': 1.5,
      'rivalry_poke': 0.2,
      'betrayal_tease': 0.1,
      'public_callout': 0.1
    },
    rival: {
      'rivalry_poke': 2.0,
      'plant_rumor': 1.8,
      'public_callout': 1.6,
      'eavesdrop': 1.4,
      'wedge_plant': 1.5,
      'alliance_invite': 0.2,
      'favor_grant': 0.3
    },
    neutral: {
      // Default 1.0 for all
    }
  };

  // Repetition decay: reduce weight for recently used actions
  const REPETITION_DECAY_FACTOR = 0.6;
  const DECAY_TIME_WINDOW = 60000; // 60 seconds

  // ============================================================================
  // WEIGHT COMPUTATION
  // ============================================================================

  /**
   * Compute action weights for an actor
   * @param {number} actorId - Actor player ID
   * @param {Array} candidateActions - Array of action objects from registry
   * @param {Object} phaseContext - { phase, currentHOH, nominees, vetoHolder, week }
   * @param {Object} relationGraph - { getRelation(actorId, targetId) => 'ally'|'rival'|'neutral', getTrust(a,t), getRivalry(a,t) }
   * @param {Object} persona - Actor's persona biases (optional)
   * @returns {Map} actionId -> weight
   */
  function computeActionWeights(actorId, candidateActions, phaseContext, relationGraph, persona = {}) {
    const weights = new Map();
    
    if (!candidateActions || candidateActions.length === 0) {
      return weights;
    }

    // Determine current phase tag
    const phaseTag = determinePhaseTag(phaseContext);
    
    // Determine actor's role
    const actorRoles = determineActorRoles(actorId, phaseContext);
    
    for (const action of candidateActions) {
      let weight = 1.0;
      
      // Base weight from action's aiBias
      if (action.aiBias) {
        weight = action.aiBias.general || weight;
      }
      
      // Phase multiplier
      const phaseMultipliers = PHASE_MULTIPLIERS[phaseTag] || {};
      if (phaseMultipliers[action.id]) {
        weight *= phaseMultipliers[action.id];
      }
      
      // Role multipliers
      for (const role of actorRoles) {
        const roleMultipliers = ROLE_MULTIPLIERS[role] || {};
        if (roleMultipliers[action.id]) {
          weight *= roleMultipliers[action.id];
        }
        
        // Also check action's aiBias for role-specific weights
        if (action.aiBias && action.aiBias[role]) {
          weight *= action.aiBias[role];
        }
      }
      
      // Relationship multipliers (averaged across typical targets)
      if (relationGraph && action.targetsRequired === 1) {
        // For single-target actions, consider relationship context
        const relationMultiplier = estimateRelationshipMultiplier(action, relationGraph, actorId);
        weight *= relationMultiplier;
      }
      
      // Persona biases (if provided)
      if (persona && persona[action.id]) {
        weight *= persona[action.id];
      }
      
      // Clamp weight to reasonable range
      weight = Math.max(0.01, Math.min(10.0, weight));
      
      weights.set(action.id, weight);
    }
    
    return weights;
  }

  /**
   * Apply cooldowns and repetition decay to weights
   * @param {Map} weights - actionId -> weight
   * @param {Map} cooldownStore - Map of actionId -> lastUsedTimestamp
   * @param {Array} recentHistory - Array of recent action executions [{ actionId, timestamp }]
   * @returns {Map} adjusted weights
   */
  function applyCooldownsAndDecay(weights, cooldownStore, recentHistory = []) {
    const adjustedWeights = new Map(weights);
    const now = Date.now();
    
    // Apply cooldowns (zero out weight if on cooldown)
    for (const [actionId, weight] of adjustedWeights) {
      const lastUsed = cooldownStore.get(actionId) || 0;
      const registry = global.SocialActionsRegistry;
      const action = registry ? registry.get(actionId) : null;
      
      if (action && action.cooldown) {
        const cooldownMs = action.cooldown * 1000;
        if ((now - lastUsed) < cooldownMs) {
          adjustedWeights.set(actionId, 0);
        }
      }
    }
    
    // Apply repetition decay
    if (recentHistory && recentHistory.length > 0) {
      const recentActions = recentHistory.filter(h => (now - h.timestamp) < DECAY_TIME_WINDOW);
      const actionCounts = new Map();
      
      for (const entry of recentActions) {
        actionCounts.set(entry.actionId, (actionCounts.get(entry.actionId) || 0) + 1);
      }
      
      for (const [actionId, count] of actionCounts) {
        if (adjustedWeights.has(actionId)) {
          const currentWeight = adjustedWeights.get(actionId);
          const decayedWeight = currentWeight * Math.pow(REPETITION_DECAY_FACTOR, count);
          adjustedWeights.set(actionId, decayedWeight);
        }
      }
    }
    
    return adjustedWeights;
  }

  /**
   * Pick an action by weight (weighted random selection)
   * @param {Map} weights - actionId -> weight
   * @returns {string|null} selected actionId
   */
  function pickActionByWeight(weights) {
    if (!weights || weights.size === 0) {
      return null;
    }
    
    // Filter out zero/negative weights
    const validEntries = Array.from(weights.entries()).filter(([_, w]) => w > 0);
    
    if (validEntries.length === 0) {
      return null;
    }
    
    // Calculate total weight
    const totalWeight = validEntries.reduce((sum, [_, w]) => sum + w, 0);
    
    if (totalWeight <= 0) {
      return null;
    }
    
    // Weighted random selection
    let rand = Math.random() * totalWeight;
    
    for (const [actionId, weight] of validEntries) {
      rand -= weight;
      if (rand <= 0) {
        return actionId;
      }
    }
    
    // Fallback to last entry (shouldn't happen, but defensive)
    return validEntries[validEntries.length - 1][0];
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Determine phase tag from phase context
   */
  function determinePhaseTag(phaseContext) {
    if (!phaseContext) return 'general';
    
    const phase = phaseContext.phase || phaseContext.currentPhase || 'general';
    
    // Map phase names to tags
    if (phase.includes('pre-noms') || phase.includes('prenoms')) return 'pre-noms';
    if (phase.includes('pre-pov') || phase.includes('prepov')) return 'pre-pov';
    if (phase.includes('post-noms') || phase.includes('postnoms')) return 'post-noms';
    
    return 'general';
  }

  /**
   * Determine actor's roles
   */
  function determineActorRoles(actorId, phaseContext) {
    const roles = [];
    
    if (!phaseContext) return roles;
    
    // Check if HOH
    if (phaseContext.currentHOH === actorId) {
      roles.push('hoh');
    }
    
    // Check if POV holder
    if (phaseContext.vetoHolder === actorId || phaseContext.povHolder === actorId) {
      roles.push('povHolder');
    }
    
    // Check if nominee
    const nominees = phaseContext.nominees || [];
    if (nominees.includes(actorId)) {
      roles.push('nominee');
      roles.push('onBlock');
    }
    
    return roles;
  }

  /**
   * Estimate relationship multiplier for action
   */
  function estimateRelationshipMultiplier(action, relationGraph, actorId) {
    // Get typical relationship types for this action
    const actionId = action.id;
    
    // Average multipliers across relationship types
    const allyMult = RELATIONSHIP_MULTIPLIERS.ally[actionId] || 1.0;
    const rivalMult = RELATIONSHIP_MULTIPLIERS.rival[actionId] || 1.0;
    const neutralMult = 1.0;
    
    // Weighted average based on likely target selection
    // For now, assume equal distribution (can be refined with actual target selection logic)
    return (allyMult + rivalMult + neutralMult) / 3;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const SocialAIWeights = {
    computeActionWeights,
    applyCooldownsAndDecay,
    pickActionByWeight,
    
    // Expose for testing/tuning
    PHASE_MULTIPLIERS,
    ROLE_MULTIPLIERS,
    RELATIONSHIP_MULTIPLIERS,
    REPETITION_DECAY_FACTOR,
    
    // Helpers
    determinePhaseTag,
    determineActorRoles
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialAIWeights;
  }
  global.SocialAIWeights = SocialAIWeights;

  console.info('[social-ai-weights] ✓ Module loaded');

})(typeof window !== 'undefined' ? window : global);
