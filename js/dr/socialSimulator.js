// MODULE: socialSimulator.js
// Social Phase Simulator: generates NPC-to-NPC and NPC-to-player interactions during social phases
// Emits social.action:result and bond.shift events that DiaryRoomLogger captures

(function(global) {
  'use strict';

  const SocialSimulator = {};

  // State
  let initialized = false;
  let config = {
    enabled: true,
    defaultEnergy: 5,
    skipLocalPlayer: false,
    actionTypes: {
      compliment: { probability: 0.25, energyCost: 1, bondDelta: [0.02, 0.10] },
      flirt: { probability: 0.15, energyCost: 1, bondDelta: [0.03, 0.12] },
      gossip: { probability: 0.20, energyCost: 1, bondDelta: [-0.05, 0.08] },
      bribe: { probability: 0.10, energyCost: 2, bondDelta: [0.05, 0.15] },
      lie: { probability: 0.08, energyCost: 2, bondDelta: [-0.15, -0.05] },
      insult: { probability: 0.05, energyCost: 1, bondDelta: [-0.20, -0.08] },
      backstab: { probability: 0.05, energyCost: 2, bondDelta: [-0.25, -0.12] },
      strategize: { probability: 0.12, energyCost: 1, bondDelta: [0.05, 0.15] }
    },
    sociabilityWeight: 0.3,
    baseSuccessRate: 0.6,
    statInfluence: 0.05,
    maxActionsPerPhase: 50
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the Social Simulator
   * @param {Object} opts - Optional configuration
   * @param {Boolean} opts.enabled - Enable/disable simulator
   * @param {Number} opts.defaultEnergy - Default energy per NPC per phase
   * @param {Boolean} opts.skipLocalPlayer - Skip local/human player in simulations
   * @param {Object} opts.actionTypes - Override action type configurations
   * @param {Number} opts.maxActionsPerPhase - Max total actions per phase
   */
  function init(opts) {
    if (initialized) {
      console.warn('[SocialSimulator] Already initialized');
      return;
    }

    // Merge config
    if (opts) {
      config = { ...config, ...opts };
      if (opts.actionTypes) {
        config.actionTypes = { ...config.actionTypes, ...opts.actionTypes };
      }
    }

    // Get the event bus
    const bus = getBus();
    if (!bus) {
      console.error('[SocialSimulator] No event bus available');
      return;
    }

    // Register event listeners for social phase start
    bus.on('social.phase:start', handleSocialPhaseStart);
    bus.on('social.phase:run', handleSocialPhaseStart); // Alternate event name

    initialized = true;
    console.info('[SocialSimulator] Initialized with config:', config);
  }

  /**
   * Get the game event bus
   */
  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  // ============================================================================
  // SIMULATION LOGIC
  // ============================================================================

  /**
   * Handle social phase start event
   */
  function handleSocialPhaseStart(payload) {
    if (!config.enabled) {
      console.info('[SocialSimulator] Disabled, skipping simulation');
      return;
    }

    console.info('[SocialSimulator] Social phase started, running simulation...', payload);
    
    try {
      runSimulation(payload);
    } catch (err) {
      console.error('[SocialSimulator] Simulation error:', err);
    }
  }

  /**
   * Run the full social phase simulation
   */
  function runSimulation(phasePayload) {
    const game = global.game;
    if (!game) {
      console.warn('[SocialSimulator] No game object available');
      return;
    }

    // Get active players (alive and not evicted)
    const activePlayers = getActivePlayers();
    if (!activePlayers || activePlayers.length < 2) {
      console.info('[SocialSimulator] Not enough active players for simulation');
      return;
    }

    console.info(`[SocialSimulator] Simulating with ${activePlayers.length} active players`);

    // Initialize bond map from current game state
    const bondMap = initializeBondMap(activePlayers);

    // Initialize energy for each player
    const energyMap = new Map();
    activePlayers.forEach(player => {
      const energy = getPlayerEnergy(player.id);
      energyMap.set(player.id, energy);
    });

    // Track actions and bond shifts for phase summary
    const phaseActions = [];
    const phaseBondShifts = [];
    const energyUsage = new Map();

    // Simulation loop: run actions until energy is exhausted or max actions reached
    let actionCount = 0;
    let maxIterations = config.maxActionsPerPhase * 2; // Safety limit
    let iteration = 0;

    while (actionCount < config.maxActionsPerPhase && iteration < maxIterations) {
      iteration++;

      // Select random actor weighted by remaining energy and sociability
      const actor = selectActor(activePlayers, energyMap);
      if (!actor) {
        break; // No actors with energy left
      }

      // Select target (prefer high bonds, avoid low bonds)
      const target = selectTarget(actor, activePlayers, bondMap);
      if (!target) {
        // No valid target, reduce actor energy to prevent infinite loop
        energyMap.set(actor.id, 0);
        continue;
      }

      // Select action type based on probabilities
      const actionType = selectActionType();
      const actionConfig = config.actionTypes[actionType];

      // Check if actor has enough energy
      const currentEnergy = energyMap.get(actor.id) || 0;
      if (currentEnergy < actionConfig.energyCost) {
        // Not enough energy, mark as exhausted
        energyMap.set(actor.id, 0);
        continue;
      }

      // Consume energy
      const newEnergy = currentEnergy - actionConfig.energyCost;
      energyMap.set(actor.id, newEnergy);

      // Track energy usage
      const used = energyUsage.get(actor.id) || 0;
      energyUsage.set(actor.id, used + actionConfig.energyCost);

      // Calculate success and magnitude
      const bondBefore = getBond(bondMap, actor.id, target.id);
      const success = calculateSuccess(actor, target, bondBefore);
      const magnitude = calculateMagnitude(actionConfig, success);
      const bondAfter = bondBefore + magnitude;

      // Update bond map
      setBond(bondMap, actor.id, target.id, bondAfter);

      // Emit social.action:result event
      emitSocialAction(actor, target, actionType, success, magnitude, bondBefore, bondAfter);

      // Track action for phase summary
      phaseActions.push({
        actor: actor.id,
        target: target.id,
        action: actionType,
        success,
        magnitude,
        bondBefore,
        bondAfter
      });

      // If significant bond shift, emit bond.shift event and track
      if (Math.abs(magnitude) > 0.01) {
        emitBondShift(actor.id, target.id, magnitude, bondBefore, bondAfter);
        phaseBondShifts.push({
          player1: actor.id,
          player2: target.id,
          delta: magnitude,
          before: bondBefore,
          after: bondAfter
        });
      }

      actionCount++;
    }

    console.info(`[SocialSimulator] Simulation complete: ${actionCount} actions`);

    // Emit phase end summary
    emitPhaseEnd(phaseActions, phaseBondShifts, energyUsage);
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Get active players (alive, not evicted)
   */
  function getActivePlayers() {
    const game = global.game;
    if (!game) return [];

    // Try multiple sources for player list
    let players = [];
    
    if (typeof global.alivePlayers === 'function') {
      players = global.alivePlayers();
    } else if (game.players && Array.isArray(game.players)) {
      players = game.players.filter(p => !p.evicted);
    } else if (game.party && Array.isArray(game.party)) {
      players = game.party.filter(p => !p.evicted);
    }

    // Optionally skip local/human player
    if (config.skipLocalPlayer) {
      const localId = game.me || game.meId || game.humanId;
      if (localId) {
        players = players.filter(p => p.id !== localId);
      }
    }

    return players;
  }

  /**
   * Get player energy from SocialManeuvers bank or use default
   */
  function getPlayerEnergy(playerId) {
    const game = global.game;
    
    // Try to get from SocialManeuvers energy bank
    if (global.SocialManeuvers?.SocialEnergyBank?.get) {
      const bankEnergy = global.SocialManeuvers.SocialEnergyBank.get(playerId);
      if (bankEnergy > 0) {
        return bankEnergy;
      }
    }

    // Fallback to default
    return config.defaultEnergy;
  }

  /**
   * Initialize bond map from game relationships or affinities
   */
  function initializeBondMap(players) {
    const bondMap = new Map();
    const game = global.game;

    // Try to use existing relationships first
    if (game && game.relationships && typeof game.relationships === 'object') {
      // Copy existing relationships
      Object.keys(game.relationships).forEach(key => {
        bondMap.set(key, game.relationships[key] || 0);
      });
    } else {
      // Initialize from affinities or neutral values
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const p1 = players[i];
          const p2 = players[j];
          const key = bondKey(p1.id, p2.id);
          
          // Try to get from player affinity
          let initialBond = 0;
          if (p1.affinity && typeof p1.affinity[p2.id] === 'number') {
            initialBond = p1.affinity[p2.id] * 100; // Scale affinity to bond scale
          }
          
          bondMap.set(key, initialBond);
        }
      }
    }

    return bondMap;
  }

  /**
   * Create bond key for two players
   */
  function bondKey(id1, id2) {
    const [min, max] = [Math.min(id1, id2), Math.max(id1, id2)];
    return `${min}-${max}`;
  }

  /**
   * Get bond value between two players
   */
  function getBond(bondMap, id1, id2) {
    const key = bondKey(id1, id2);
    return bondMap.get(key) || 0;
  }

  /**
   * Set bond value between two players
   */
  function setBond(bondMap, id1, id2, value) {
    const key = bondKey(id1, id2);
    bondMap.set(key, value);
  }

  /**
   * Select actor weighted by energy and sociability
   */
  function selectActor(players, energyMap) {
    // Filter players with remaining energy
    const eligible = players.filter(p => (energyMap.get(p.id) || 0) > 0);
    
    if (eligible.length === 0) {
      return null;
    }

    // Weight by energy remaining and sociability (persona.aggr as proxy)
    const weights = eligible.map(p => {
      const energy = energyMap.get(p.id) || 0;
      const sociability = (p.persona?.aggr || 0.5) * config.sociabilityWeight + 0.7;
      return energy * sociability;
    });

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let rand = Math.random() * totalWeight;
    
    for (let i = 0; i < eligible.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        return eligible[i];
      }
    }

    return eligible[0];
  }

  /**
   * Select target weighted by bond strength (prefer higher bonds, avoid very low)
   */
  function selectTarget(actor, players, bondMap) {
    // Exclude self
    const eligible = players.filter(p => p.id !== actor.id);
    
    if (eligible.length === 0) {
      return null;
    }

    // Weight by bond strength (positive bonds preferred, very negative avoided)
    const weights = eligible.map(p => {
      const bond = getBond(bondMap, actor.id, p.id);
      
      // Convert bond to weight (higher bond = higher weight)
      // Very negative bonds get low weight but not zero
      let weight = Math.max(0.1, bond / 100 + 0.5);
      
      // Random factor to add unpredictability
      weight *= (0.7 + Math.random() * 0.6);
      
      return weight;
    });

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let rand = Math.random() * totalWeight;
    
    for (let i = 0; i < eligible.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        return eligible[i];
      }
    }

    return eligible[0];
  }

  /**
   * Select action type based on probabilities
   */
  function selectActionType() {
    const types = Object.keys(config.actionTypes);
    const probabilities = types.map(t => config.actionTypes[t].probability);
    
    // Normalize probabilities
    const total = probabilities.reduce((sum, p) => sum + p, 0);
    const normalized = probabilities.map(p => p / total);
    
    // Weighted random selection
    let rand = Math.random();
    for (let i = 0; i < types.length; i++) {
      rand -= normalized[i];
      if (rand <= 0) {
        return types[i];
      }
    }
    
    return types[0];
  }

  /**
   * Calculate success probability
   */
  function calculateSuccess(actor, target, currentBond) {
    // Base success rate
    let successRate = config.baseSuccessRate;
    
    // Adjust by actor sociability (persona.aggr or skill)
    const actorSocial = actor.persona?.aggr || actor.skill || 0.5;
    successRate += (actorSocial - 0.5) * config.statInfluence;
    
    // Adjust by target resistance (inverse of loyalty)
    const targetResistance = 1 - (target.persona?.loyalty || 0.5);
    successRate += (0.5 - targetResistance) * config.statInfluence;
    
    // Adjust by current bond (higher bond = higher success)
    const bondFactor = currentBond / 100; // Normalize to -1 to 1
    successRate += bondFactor * 0.1;
    
    // Random factor
    successRate += (Math.random() - 0.5) * 0.2;
    
    // Clamp to 0.1 - 0.9
    successRate = Math.max(0.1, Math.min(0.9, successRate));
    
    return Math.random() < successRate;
  }

  /**
   * Calculate magnitude of bond change
   */
  function calculateMagnitude(actionConfig, success) {
    const [min, max] = actionConfig.bondDelta;
    
    // Base magnitude from action config
    let magnitude = min + Math.random() * (max - min);
    
    // Reduce magnitude if action failed
    if (!success) {
      magnitude *= 0.5;
      
      // Failed actions might have negative effect even on positive actions
      if (magnitude > 0 && Math.random() < 0.3) {
        magnitude *= -1;
      }
    }
    
    return magnitude;
  }

  // ============================================================================
  // EVENT EMISSION
  // ============================================================================

  /**
   * Emit social action result event
   */
  function emitSocialAction(actor, target, actionType, success, magnitude, bondBefore, bondAfter) {
    const bus = getBus();
    if (!bus || typeof bus.emit !== 'function') {
      return;
    }

    const payload = {
      actor: actor.id,
      target: target.id,
      actionType: actionType,
      action: actionType,
      success: success,
      magnitude: magnitude,
      bondBefore: bondBefore,
      bondAfter: bondAfter,
      bondDelta: magnitude,
      delta: magnitude,
      outcome: success ? 'success' : 'failure',
      severity: determineSeverity(actionType, magnitude)
    };

    bus.emit('social.action:result', payload);
  }

  /**
   * Emit bond shift event
   */
  function emitBondShift(playerId1, playerId2, delta, bondBefore, bondAfter) {
    const bus = getBus();
    if (!bus || typeof bus.emit !== 'function') {
      return;
    }

    const payload = {
      player1: playerId1,
      player2: playerId2,
      actorId: playerId1,
      targetId: playerId2,
      delta: delta,
      before: bondBefore,
      after: bondAfter
    };

    bus.emit('bond.shift', payload);
  }

  /**
   * Emit phase end summary
   */
  function emitPhaseEnd(actions, bondShifts, energyUsage) {
    const bus = getBus();
    if (!bus || typeof bus.emit !== 'function') {
      return;
    }

    const payload = {
      actions: actions,
      bondShifts: bondShifts,
      energyUsage: Object.fromEntries(energyUsage),
      actionCount: actions.length,
      week: global.game?.week || 1
    };

    bus.emit('social.phase:end', payload);
    
    console.info(`[SocialSimulator] Phase end summary: ${actions.length} actions, ${bondShifts.length} bond shifts`);
  }

  /**
   * Determine severity for an action
   */
  function determineSeverity(actionType, magnitude) {
    // High severity for betrayals and large negative shifts
    const highSeverityActions = ['backstab', 'lie', 'insult'];
    if (highSeverityActions.includes(actionType)) {
      return 'high';
    }

    // Dramatic for very large bond shifts
    if (Math.abs(magnitude) > 0.15) {
      return 'dramatic';
    }

    return 'neutral';
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  SocialSimulator.init = init;
  SocialSimulator.runSimulation = runSimulation; // Exposed for testing
  SocialSimulator.config = config; // Exposed for runtime adjustment

  // Export to global
  global.SocialSimulator = SocialSimulator;

})(window);
