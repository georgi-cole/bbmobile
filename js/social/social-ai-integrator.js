// MODULE: social-ai-integrator.js
// Adapter between scheduler and weights/registry
// Builds candidates, computes weights, respects budgets and cooldowns

(function(global) {
  'use strict';

  // ============================================================================
  // STATE TRACKING
  // ============================================================================
  
  // Track cooldowns per actor
  const cooldownStore = new Map(); // key: `${actorId}-${actionId}` -> lastUsedTimestamp
  
  // Track recent action history for decay
  const recentHistory = new Map(); // actorId -> [{ actionId, timestamp }]
  const HISTORY_MAX_LENGTH = 20;

  // ============================================================================
  // MAIN INTEGRATION FUNCTION
  // ============================================================================

  /**
   * Select an action for an AI actor
   * @param {number} actorId - Actor player ID
   * @param {Object} phaseContext - { phase, currentHOH, nominees, vetoHolder, week }
   * @param {Object} options - { budget, relationGraph, persona }
   * @returns {Object|null} { action, targetId, context } or null if no valid action
   */
  function selectActionForActor(actorId, phaseContext, options = {}) {
    try {
      const { budget = null, relationGraph = null, persona = {} } = options;
      
      // Get registry
      const registry = global.SocialActionsRegistry;
      if (!registry) {
        console.warn('[social-ai-integrator] SocialActionsRegistry not available');
        return null;
      }
      
      // Step 1: Build candidate actions
      const candidateActions = buildCandidateActions(actorId, phaseContext, budget);
      
      if (!candidateActions || candidateActions.length === 0) {
        return null;
      }
      
      // Step 2: Compute weights
      const weights = global.SocialAIWeights ? 
        global.SocialAIWeights.computeActionWeights(actorId, candidateActions, phaseContext, relationGraph, persona) :
        new Map(candidateActions.map(a => [a.id, 1.0])); // Fallback to uniform weights
      
      // Step 3: Apply cooldowns and decay
      const actorCooldowns = getActorCooldownStore(actorId);
      const actorHistory = recentHistory.get(actorId) || [];
      
      const adjustedWeights = global.SocialAIWeights ?
        global.SocialAIWeights.applyCooldownsAndDecay(weights, actorCooldowns, actorHistory) :
        weights;
      
      // Step 4: Pick action by weight
      const selectedActionId = global.SocialAIWeights ?
        global.SocialAIWeights.pickActionByWeight(adjustedWeights) :
        pickUniformRandom(candidateActions);
      
      if (!selectedActionId) {
        return null;
      }
      
      // Step 5: Get full action object
      const action = registry.get(selectedActionId);
      if (!action) {
        return null;
      }
      
      // Step 6: Select target(s)
      const targetId = selectTargetForAction(actorId, action, phaseContext, relationGraph);
      
      if (!targetId) {
        return null;
      }
      
      // Step 7: Build execution context
      const context = buildExecutionContext(actorId, targetId, action, phaseContext);
      
      // Record action usage
      recordActionUsage(actorId, selectedActionId);
      
      return {
        action,
        targetId,
        context
      };
      
    } catch (err) {
      console.error('[social-ai-integrator] Error selecting action:', err);
      return null;
    }
  }

  // ============================================================================
  // CANDIDATE BUILDING
  // ============================================================================

  /**
   * Build list of candidate actions for actor
   */
  function buildCandidateActions(actorId, phaseContext, budget) {
    const registry = global.SocialActionsRegistry;
    if (!registry) return [];
    
    // Get all actions
    let candidates = registry.list();
    
    // Filter by phase tags
    const phaseTag = determinePhaseTag(phaseContext);
    candidates = candidates.filter(action => 
      action.phaseTags && action.phaseTags.includes(phaseTag)
    );
    
    // Filter by budget (if provided)
    if (budget !== null && budget !== undefined) {
      candidates = candidates.filter(action => action.cost <= budget);
    }
    
    return candidates;
  }

  /**
   * Determine current phase tag
   */
  function determinePhaseTag(phaseContext) {
    if (!phaseContext) return 'general';
    
    // Use SocialAIWeights helper if available
    if (global.SocialAIWeights && global.SocialAIWeights.determinePhaseTag) {
      return global.SocialAIWeights.determinePhaseTag(phaseContext);
    }
    
    // Fallback logic
    const phase = phaseContext.phase || phaseContext.currentPhase || 'general';
    if (phase.includes('pre-noms') || phase.includes('prenoms')) return 'pre-noms';
    if (phase.includes('pre-pov') || phase.includes('prepov')) return 'pre-pov';
    if (phase.includes('post-noms') || phase.includes('postnoms')) return 'post-noms';
    return 'general';
  }

  // ============================================================================
  // TARGET SELECTION
  // ============================================================================

  /**
   * Select target for an action
   */
  function selectTargetForAction(actorId, action, phaseContext, relationGraph) {
    const eligibleTargets = getEligibleTargets(actorId, action, phaseContext);
    
    if (!eligibleTargets || eligibleTargets.length === 0) {
      return null;
    }
    
    // For actions with specific role targets
    if (action.id === 'probe_hoh') {
      return phaseContext.currentHOH || null;
    }
    
    if (action.id === 'probe_pov' || action.id === 'bargain_pov') {
      return phaseContext.vetoHolder || phaseContext.povHolder || null;
    }
    
    // For relationship-weighted actions, use relation graph
    if (relationGraph && action.aiBias) {
      return selectWeightedTarget(actorId, eligibleTargets, action, relationGraph);
    }
    
    // Default: random selection
    return eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
  }

  /**
   * Get eligible targets for action
   */
  function getEligibleTargets(actorId, action, phaseContext) {
    const g = global.game;
    if (!g) return [];
    
    // Get all alive players except actor
    const alivePlayers = (g.players || []).filter(p => 
      !p.evicted && p.id !== actorId && p.id !== g.humanId
    );
    
    return alivePlayers.map(p => p.id);
  }

  /**
   * Select target weighted by relationship
   */
  function selectWeightedTarget(actorId, eligibleTargets, action, relationGraph) {
    if (!relationGraph || !relationGraph.getRelation) {
      // Fallback to random
      return eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
    }
    
    const weights = [];
    
    for (const targetId of eligibleTargets) {
      const relation = relationGraph.getRelation(actorId, targetId) || 'neutral';
      
      let weight = 1.0;
      
      // Apply relationship bias from action
      if (action.aiBias) {
        if (relation === 'ally' && action.aiBias.ally) {
          weight = action.aiBias.ally;
        } else if (relation === 'rival' && action.aiBias.rival) {
          weight = action.aiBias.rival;
        } else if (action.aiBias.general) {
          weight = action.aiBias.general;
        }
      }
      
      weights.push({ targetId, weight });
    }
    
    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    if (totalWeight <= 0) {
      return eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
    }
    
    let rand = Math.random() * totalWeight;
    for (const { targetId, weight } of weights) {
      rand -= weight;
      if (rand <= 0) {
        return targetId;
      }
    }
    
    return weights[weights.length - 1].targetId;
  }

  // ============================================================================
  // CONTEXT BUILDING
  // ============================================================================

  /**
   * Build execution context for action
   */
  function buildExecutionContext(actorId, targetId, action, phaseContext) {
    const ctx = {
      actorId,
      targetId,
      actionId: action.id,
      actorName: getPlayerName(actorId),
      targetName: getPlayerName(targetId)
    };
    
    // Add phase-specific context
    if (action.id === 'probe_hoh') {
      ctx.hohName = getPlayerName(phaseContext.currentHOH);
      ctx.hohTarget = getSuggestedHOHTarget(phaseContext);
    }
    
    if (action.id === 'probe_pov' || action.id === 'bargain_pov') {
      const povHolder = phaseContext.vetoHolder || phaseContext.povHolder;
      ctx.povHolderName = getPlayerName(povHolder);
      ctx.povIntention = getSuggestedPOVIntention(phaseContext);
    }
    
    if (action.id === 'vote_rally') {
      ctx.voteTarget = getSuggestedVoteTarget(phaseContext);
    }
    
    return ctx;
  }

  /**
   * Get suggested HOH target (for probe_hoh)
   */
  function getSuggestedHOHTarget(phaseContext) {
    // In a real implementation, this would query game state for HOH's likely target
    // For now, return a nominee or null
    const nominees = phaseContext.nominees || [];
    if (nominees.length > 0) {
      return getPlayerName(nominees[Math.floor(Math.random() * nominees.length)]);
    }
    return null;
  }

  /**
   * Get suggested POV intention (for probe_pov)
   */
  function getSuggestedPOVIntention(phaseContext) {
    // Return 'use' or 'not use' or nominee name
    const intentions = ['use', 'not use'];
    return intentions[Math.floor(Math.random() * intentions.length)];
  }

  /**
   * Get suggested vote target (for vote_rally)
   */
  function getSuggestedVoteTarget(phaseContext) {
    const nominees = phaseContext.nominees || [];
    if (nominees.length > 0) {
      return getPlayerName(nominees[Math.floor(Math.random() * nominees.length)]);
    }
    return null;
  }

  // ============================================================================
  // COOLDOWN & HISTORY MANAGEMENT
  // ============================================================================

  /**
   * Get cooldown store for actor
   */
  function getActorCooldownStore(actorId) {
    // Filter cooldownStore for this actor's actions
    const actorStore = new Map();
    const prefix = `${actorId}-`;
    
    for (const [key, value] of cooldownStore) {
      if (key.startsWith(prefix)) {
        const actionId = key.substring(prefix.length);
        actorStore.set(actionId, value);
      }
    }
    
    return actorStore;
  }

  /**
   * Record action usage
   */
  function recordActionUsage(actorId, actionId) {
    const now = Date.now();
    
    // Update cooldown
    const key = `${actorId}-${actionId}`;
    cooldownStore.set(key, now);
    
    // Update history
    let history = recentHistory.get(actorId);
    if (!history) {
      history = [];
      recentHistory.set(actorId, history);
    }
    
    history.push({ actionId, timestamp: now });
    
    // Trim history
    if (history.length > HISTORY_MAX_LENGTH) {
      history.shift();
    }
  }

  /**
   * Clear cooldowns and history (phase reset)
   */
  function clearState() {
    cooldownStore.clear();
    recentHistory.clear();
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function getPlayerName(playerId) {
    if (typeof global.safeName === 'function') {
      return global.safeName(playerId);
    }
    
    const g = global.game;
    if (!g || !g.players) return `Player ${playerId}`;
    
    const player = g.players.find(p => p.id === playerId);
    return player?.name || `Player ${playerId}`;
  }

  function pickUniformRandom(actions) {
    if (!actions || actions.length === 0) return null;
    const action = actions[Math.floor(Math.random() * actions.length)];
    return action.id;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const SocialAIIntegrator = {
    selectActionForActor,
    clearState,
    
    // For testing
    _cooldownStore: cooldownStore,
    _recentHistory: recentHistory,
    _buildCandidateActions: buildCandidateActions,
    _selectTargetForAction: selectTargetForAction
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialAIIntegrator;
  }
  global.SocialAIIntegrator = SocialAIIntegrator;

  console.info('[social-ai-integrator] ✓ Module loaded');

})(typeof window !== 'undefined' ? window : global);
