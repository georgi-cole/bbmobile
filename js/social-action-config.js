// MODULE: social-action-config.js
// Configuration for social action gating, modifiers, chance calculations, and visual states
// This defines the conditions, modifiers, and display logic for each social action

(function(global){
  'use strict';

  // ============================================================================
  // GATING CONDITIONS
  // ============================================================================
  
  // Condition checkers return { passed: boolean, reason?: string }
  const GATING_CONDITIONS = {
    // Relationship/Affinity thresholds
    minAffinity: (actor, target, threshold) => {
      const affinity = actor.affinity?.[target.id] ?? 0;
      if (affinity < threshold) {
        return { passed: false, reason: `Requires ${(threshold * 100).toFixed(0)}%+ affinity` };
      }
      return { passed: true };
    },
    
    maxAffinity: (actor, target, threshold) => {
      const affinity = actor.affinity?.[target.id] ?? 0;
      if (affinity > threshold) {
        return { passed: false, reason: `Requires less than ${(threshold * 100).toFixed(0)}% affinity` };
      }
      return { passed: true };
    },
    
    // Alliance status
    areAllies: (actor, target) => {
      const ALLY_T = global.ALLY_T ?? 0.28;
      const affinity = actor.affinity?.[target.id] ?? 0;
      if (affinity < ALLY_T) {
        return { passed: false, reason: 'Not allies yet' };
      }
      return { passed: true };
    },
    
    notAllies: (actor, target) => {
      const ALLY_T = global.ALLY_T ?? 0.28;
      const affinity = actor.affinity?.[target.id] ?? 0;
      if (affinity >= ALLY_T) {
        return { passed: false, reason: 'Already allies' };
      }
      return { passed: true };
    },
    
    // Memory-based conditions
    noRecentBetrayal: (actor, target) => {
      const memory = global.SocialManeuvers?.getPlayerMemory?.(actor.id, target.id) || [];
      const recentBetrayal = memory.slice(-5).some(m => m.outcome === 'betrayal');
      if (recentBetrayal) {
        return { passed: false, reason: 'Recent betrayal remembered' };
      }
      return { passed: true };
    },
    
    hasPromise: (actor, target) => {
      const memory = global.SocialManeuvers?.getPlayerMemory?.(actor.id, target.id) || [];
      const hasPromise = memory.some(m => m.action === 'promise' && !m.broken);
      if (!hasPromise) {
        return { passed: false, reason: 'No active promises' };
      }
      return { passed: true };
    }
  };

  // ============================================================================
  // MODIFIER CALCULATIONS
  // ============================================================================
  
  // Modifiers return { value: number, label: string, type: 'additive'|'multiplicative' }
  const MODIFIER_CALCULATORS = {
    // Affinity-based modifiers
    trustBonus: (actor, target) => {
      const affinity = actor.affinity?.[target.id] ?? 0;
      if (affinity >= 0.28) {
        const bonus = Math.min(0.20, affinity * 0.5);
        return { value: bonus, label: 'Trust', type: 'additive' };
      }
      return null;
    },
    
    hostilityPenalty: (actor, target) => {
      const affinity = actor.affinity?.[target.id] ?? 0;
      if (affinity <= -0.12) {
        const penalty = Math.max(-0.30, affinity * 0.8);
        return { value: penalty, label: 'Hostility', type: 'additive' };
      }
      return null;
    },
    
    // Memory-based modifiers
    betrayalMemory: (actor, target) => {
      const memory = global.SocialManeuvers?.getPlayerMemory?.(actor.id, target.id) || [];
      const betrayals = memory.filter(m => m.outcome === 'betrayal').length;
      if (betrayals > 0) {
        const penalty = -0.10 * Math.min(betrayals, 3);
        return { value: penalty, label: `Betrayal Memory (${betrayals}x)`, type: 'additive' };
      }
      return null;
    },
    
    promiseBonus: (actor, target) => {
      const memory = global.SocialManeuvers?.getPlayerMemory?.(actor.id, target.id) || [];
      const keptPromises = memory.filter(m => m.action === 'promise' && m.kept).length;
      if (keptPromises > 0) {
        const bonus = 0.05 * Math.min(keptPromises, 3);
        return { value: bonus, label: `Kept Promises (${keptPromises}x)`, type: 'additive' };
      }
      return null;
    },
    
    // Trait-based modifiers
    charismaticBonus: (actor, target, actionCategory) => {
      if (actionCategory === 'friendly' && hasTrait(actor, 'charismatic')) {
        return { value: 0.15, label: 'Trait: Charismatic', type: 'additive' };
      }
      return null;
    },
    
    gullibleBonus: (actor, target, actionCategory) => {
      if (hasTrait(target, 'gullible')) {
        return { value: 0.10, label: 'Target: Gullible', type: 'additive' };
      }
      return null;
    },
    
    persuasiveBonus: (actor, target, actionCategory) => {
      if ((actionCategory === 'strategic' || actionCategory === 'aggressive') && hasTrait(actor, 'persuasive')) {
        return { value: 0.12, label: 'Trait: Persuasive', type: 'additive' };
      }
      return null;
    },
    
    skepticalPenalty: (actor, target, actionCategory) => {
      if (hasTrait(target, 'skeptical')) {
        return { value: -0.08, label: 'Target: Skeptical', type: 'additive' };
      }
      return null;
    },
    
    // Alliance synergy
    allianceSynergy: (actor, target) => {
      const ALLY_T = global.ALLY_T ?? 0.28;
      const affinity = actor.affinity?.[target.id] ?? 0;
      if (affinity >= ALLY_T) {
        return { value: 0.10, label: 'Alliance Synergy', type: 'additive' };
      }
      return null;
    }
  };

  // Helper to check if player has a trait
  function hasTrait(player, trait) {
    if (!player || !player.socialTraits) return false;
    return player.socialTraits.some(t => t.toLowerCase() === trait.toLowerCase());
  }

  // ============================================================================
  // ACTION CONFIGURATIONS
  // ============================================================================
  
  const ACTION_CONFIGS = {
    smalltalk: {
      baseChance: 0.70,
      gates: [],
      modifiers: ['trustBonus', 'hostilityPenalty', 'charismaticBonus'],
      states: {
        boosted: (actor, target) => {
          const affinity = actor.affinity?.[target.id] ?? 0;
          return affinity >= 0.20 && affinity < 0.28;
        }
      }
    },
    
    strategize: {
      baseChance: 0.60,
      gates: [
        { type: 'minAffinity', value: 0.12, soft: false }
      ],
      modifiers: ['trustBonus', 'betrayalMemory', 'persuasiveBonus', 'skepticalPenalty'],
      states: {
        locked: (actor, target) => {
          const affinity = actor.affinity?.[target.id] ?? 0;
          return affinity < 0.12;
        },
        boosted: (actor, target) => hasTrait(actor, 'persuasive')
      }
    },
    
    confide: {
      baseChance: 0.55,
      gates: [
        { type: 'minAffinity', value: 0.20, soft: false },
        { type: 'noRecentBetrayal', soft: false }
      ],
      modifiers: ['trustBonus', 'betrayalMemory', 'charismaticBonus', 'gullibleBonus'],
      states: {
        locked: (actor, target) => {
          const affinity = actor.affinity?.[target.id] ?? 0;
          const memory = global.SocialManeuvers?.getPlayerMemory?.(actor.id, target.id) || [];
          const recentBetrayal = memory.slice(-5).some(m => m.outcome === 'betrayal');
          return affinity < 0.20 || recentBetrayal;
        },
        boosted: (actor, target) => hasTrait(actor, 'charismatic') || hasTrait(target, 'gullible')
      }
    },
    
    interrogate: {
      baseChance: 0.45,
      gates: [],
      modifiers: ['hostilityPenalty', 'persuasiveBonus', 'skepticalPenalty'],
      states: {
        risky: (actor, target) => {
          const affinity = actor.affinity?.[target.id] ?? 0;
          return affinity >= 0.12;
        },
        boosted: (actor, target) => hasTrait(actor, 'persuasive')
      }
    },
    
    compliment: {
      baseChance: 0.75,
      gates: [],
      modifiers: ['hostilityPenalty', 'charismaticBonus', 'gullibleBonus'],
      states: {
        boosted: (actor, target) => hasTrait(actor, 'charismatic'),
        discounted: (actor, target) => {
          const affinity = actor.affinity?.[target.id] ?? 0;
          return affinity < -0.20;
        }
      }
    },
    
    confront: {
      baseChance: 0.35,
      gates: [
        { type: 'maxAffinity', value: 0.28, soft: false }
      ],
      modifiers: ['hostilityPenalty', 'betrayalMemory', 'persuasiveBonus'],
      states: {
        locked: (actor, target) => {
          const affinity = actor.affinity?.[target.id] ?? 0;
          return affinity >= 0.28;
        },
        risky: () => true,
        boosted: (actor, target) => {
          const memory = global.SocialManeuvers?.getPlayerMemory?.(actor.id, target.id) || [];
          return memory.some(m => m.outcome === 'betrayal');
        }
      }
    },
    
    mediate: {
      baseChance: 0.50,
      gates: [
        { type: 'notAllies', value: null, soft: true }
      ],
      modifiers: ['charismaticBonus', 'persuasiveBonus', 'allianceSynergy'],
      states: {
        boosted: (actor, target) => hasTrait(actor, 'empathetic') || hasTrait(actor, 'charismatic'),
        discounted: (actor, target) => {
          const ALLY_T = global.ALLY_T ?? 0.28;
          const affinity = actor.affinity?.[target.id] ?? 0;
          return affinity >= ALLY_T;
        }
      }
    },
    
    observe: {
      baseChance: 0.80,
      gates: [],
      modifiers: ['skepticalPenalty'],
      states: {
        boosted: (actor, target) => hasTrait(actor, 'observant')
      }
    }
  };

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  function getActionConfig(actionId) {
    return ACTION_CONFIGS[actionId] || null;
  }
  
  function evaluateGates(actor, target, gates) {
    if (!gates || gates.length === 0) {
      return { passed: true, reasons: [] };
    }
    
    const results = gates.map(gate => {
      const checker = GATING_CONDITIONS[gate.type];
      if (!checker) {
        console.warn('[social-action-config] Unknown gate type:', gate.type);
        return { passed: true };
      }
      return checker(actor, target, gate.value);
    });
    
    const failed = results.filter(r => !r.passed);
    return {
      passed: failed.length === 0,
      reasons: failed.map(r => r.reason).filter(Boolean)
    };
  }
  
  function calculateModifiers(actor, target, modifierIds, actionCategory) {
    if (!modifierIds || modifierIds.length === 0) {
      return [];
    }
    
    const modifiers = [];
    for (const modId of modifierIds) {
      const calculator = MODIFIER_CALCULATORS[modId];
      if (!calculator) {
        console.warn('[social-action-config] Unknown modifier:', modId);
        continue;
      }
      
      const result = calculator(actor, target, actionCategory);
      if (result) {
        modifiers.push(result);
      }
    }
    
    return modifiers;
  }
  
  /**
   * Unified success calculation function
   * Combines: BaseChance + Affinity adjustment (±15%) + Influence uplift + Info boost - Risk penalties
   * Clamped to [5%, 95%]
   */
  function calculateChance(baseChance, modifiers, actor, target, infoBoost = 0) {
    let chance = baseChance;
    
    // Apply additive modifiers (existing)
    const additiveTotal = modifiers
      .filter(m => m.type === 'additive')
      .reduce((sum, m) => sum + m.value, 0);
    chance += additiveTotal;
    
    // Apply multiplicative modifiers (existing)
    const multiplicativeTotal = modifiers
      .filter(m => m.type === 'multiplicative')
      .reduce((product, m) => product * (1 + m.value), 1);
    chance *= multiplicativeTotal;
    
    // Apply Influence uplift (+0.25% per 1 point of I[A→B])
    if(actor && target && global.SocialManeuvers?.SocialResources) {
      const influence = global.SocialManeuvers.SocialResources.getInfluence(actor.id, target.id);
      if(influence > 0) {
        const influenceBonus = influence * 0.0025; // 0.25% per point
        chance += influenceBonus;
        console.info(`[unified-success] Influence bonus: ${influence.toFixed(1)} pts → +${(influenceBonus * 100).toFixed(1)}%`);
      }
    }
    
    // Apply Information boost
    if(infoBoost > 0) {
      chance += infoBoost;
      console.info(`[unified-success] Information boost: +${(infoBoost * 100).toFixed(1)}%`);
    }
    
    // Clamp to [5%, 95%] per spec
    const clamped = Math.max(0.05, Math.min(0.95, chance));
    
    // Telemetry
    if(global.game && !global.game.__successCalcTelemetry) {
      global.game.__successCalcTelemetry = [];
    }
    if(global.game?.__successCalcTelemetry) {
      const entry = {
        timestamp: Date.now(),
        baseChance,
        additiveTotal,
        multiplicativeTotal,
        influenceBonus: actor && target ? global.SocialManeuvers?.SocialResources?.getInfluence(actor.id, target.id) || 0 : 0,
        infoBoost,
        finalChance: clamped
      };
      global.game.__successCalcTelemetry.push(entry);
      if(global.game.__successCalcTelemetry.length > 100) {
        global.game.__successCalcTelemetry.shift();
      }
    }
    
    return clamped;
  }
  
  function evaluateStates(actor, target, stateCheckers) {
    const states = {};
    if (!stateCheckers) return states;
    
    for (const [stateName, checker] of Object.entries(stateCheckers)) {
      states[stateName] = checker(actor, target);
    }
    
    return states;
  }
  
  function getActionEvaluation(actionId, actor, target, action, infoBoost = 0) {
    const config = getActionConfig(actionId);
    if (!config) {
      return {
        available: true,
        baseChance: 0.5,
        modifiers: [],
        finalChance: 0.5,
        states: {},
        gateReasons: []
      };
    }
    
    // Check gates
    const gateResult = evaluateGates(actor, target, config.gates);
    
    // Calculate modifiers
    const modifiers = calculateModifiers(actor, target, config.modifiers, action.category);
    
    // Calculate final chance using unified success function
    const finalChance = calculateChance(config.baseChance, modifiers, actor, target, infoBoost);
    
    // Evaluate states
    const states = evaluateStates(actor, target, config.states);
    
    return {
      available: gateResult.passed,
      baseChance: config.baseChance,
      modifiers: modifiers,
      finalChance: finalChance,
      states: states,
      gateReasons: gateResult.reasons
    };
  }
  
  // ============================================================================
  // EXPORTS
  // ============================================================================
  
  global.SocialActionConfig = {
    getActionConfig,
    evaluateGates,
    calculateModifiers,
    calculateChance,
    evaluateStates,
    getActionEvaluation,
    
    // For testing/debugging
    GATING_CONDITIONS,
    MODIFIER_CALCULATORS,
    ACTION_CONFIGS
  };
  
  console.info('[social-action-config] ✓ Module loaded successfully');

})(window);
