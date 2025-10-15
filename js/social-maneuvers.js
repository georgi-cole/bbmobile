// MODULE: social-maneuvers.js
// Social Maneuvers system: manages interactive social phase with player social energy,
// action menu, outcomes, and long-term memory integration.
// Feature-flagged for gradual rollout and expansion.

(function(global){
  'use strict';

  // ============================================================================
  // CONFIGURATION & FEATURE FLAG
  // ============================================================================
  
  // Initialize default enablement
  function initDefaultFlag(){
    if(!global.game) {
      global.game = { cfg: {} };
    }
    if(!global.game.cfg) {
      global.game.cfg = {};
    }
    // Default to true if undefined
    if(global.game.cfg.enableSocialManeuvers === undefined){
      global.game.cfg.enableSocialManeuvers = true;
      console.info('[social-maneuvers] ✓ Defaulted enableSocialManeuvers to TRUE (preloaded and enabled by default)');
    }
  }
  
  function isEnabled(){
    initDefaultFlag(); // Ensure flag is initialized
    const enabled = global.game?.cfg?.enableSocialManeuvers === true;
    return enabled;
  }

  // ============================================================================
  // SOCIAL ENERGY SYSTEM
  // ============================================================================
  
  const DEFAULT_ENERGY = 3; // Default energy points per social phase
  const MAX_ENERGY = 5;
  
  // ============================================================================
  // INFORMATION RESOURCE SYSTEM
  // ============================================================================
  
  function getInformation(playerId){
    return global.getInformation?.(playerId) ?? 50;
  }
  
  function spendInformation(playerId, cost){
    const current = getInformation(playerId);
    if(current < cost){
      return false; // Not enough information
    }
    global.updateInformation?.(playerId, -cost);
    return true;
  }

  function initSocialEnergy(){
    const g = global.game;
    if(!g) return;
    
    if(!g.__socialEnergy){
      g.__socialEnergy = new Map();
    }
    
    // Initialize energy for all alive players at start of social phase
    const alivePlayers = global.alivePlayers?.() || [];
    alivePlayers.forEach(p => {
      if(!g.__socialEnergy.has(p.id)){
        g.__socialEnergy.set(p.id, DEFAULT_ENERGY);
      }
    });
  }

  function getEnergy(playerId){
    const g = global.game;
    if(!g?.__socialEnergy) return DEFAULT_ENERGY;
    return g.__socialEnergy.get(playerId) ?? DEFAULT_ENERGY;
  }

  function setEnergy(playerId, amount){
    const g = global.game;
    if(!g) return;
    initSocialEnergy();
    g.__socialEnergy.set(playerId, Math.max(0, Math.min(MAX_ENERGY, amount)));
  }

  function spendEnergy(playerId, cost){
    const current = getEnergy(playerId);
    if(current < cost){
      return false; // Not enough energy
    }
    setEnergy(playerId, current - cost);
    return true;
  }

  function restoreEnergy(playerId, amount){
    const current = getEnergy(playerId);
    setEnergy(playerId, current + amount);
  }

  // ============================================================================
  // ACTION DEFINITIONS
  // ============================================================================
  
  const SOCIAL_ACTIONS = [
    {
      id: 'smalltalk',
      label: 'Small Talk',
      cost: 1,
      infoCost: 0,
      description: 'Light conversation to build rapport',
      category: 'friendly',
      tag: 'FRIENDLY'
    },
    {
      id: 'strategize',
      label: 'Strategize',
      cost: 2,
      infoCost: 0,
      description: 'Discuss game plans and alliances',
      category: 'strategic',
      tag: 'STRATEGIC'
    },
    {
      id: 'confide',
      label: 'Confide',
      cost: 2,
      infoCost: 0,
      description: 'Share personal thoughts and build trust',
      category: 'friendly',
      tag: 'FRIENDLY'
    },
    {
      id: 'interrogate',
      label: 'Interrogate',
      cost: 2,
      infoCost: 0,
      description: 'Press for information about plans',
      category: 'aggressive',
      tag: 'AGGRESSIVE'
    },
    {
      id: 'compliment',
      label: 'Compliment',
      cost: 1,
      infoCost: 0,
      description: 'Give genuine praise',
      category: 'friendly',
      tag: 'FRIENDLY'
    },
    {
      id: 'confront',
      label: 'Confront',
      cost: 3,
      infoCost: 0,
      description: 'Address conflicts directly',
      category: 'aggressive',
      tag: 'AGGRESSIVE'
    },
    {
      id: 'mediate',
      label: 'Mediate',
      cost: 2,
      infoCost: 0,
      description: 'Help resolve tensions between others',
      category: 'strategic',
      tag: 'STRATEGIC'
    },
    {
      id: 'observe',
      label: 'Observe',
      cost: 1,
      infoCost: 0,
      description: 'Watch and listen quietly',
      category: 'strategic',
      tag: 'STRATEGIC'
    },
    // NEW: High-impact actions
    {
      id: 'spread_rumor',
      label: 'Spread Rumor',
      cost: 1,
      infoCost: 15,
      description: 'Spread damaging information about a player. Risk of being caught!',
      category: 'aggressive',
      tag: 'AGGRESSIVE',
      backlashRisk: 0.3
    },
    {
      id: 'expose_secret',
      label: 'Expose Secret',
      cost: 2,
      infoCost: 25,
      description: 'Reveal damaging information publicly. High impact, high risk!',
      category: 'aggressive',
      tag: 'AGGRESSIVE',
      backlashRisk: 0.5
    },
    {
      id: 'group_hangout',
      label: 'Group Hangout',
      cost: 2,
      infoCost: 0,
      description: 'Organize a casual hangout. Select multiple players to bond.',
      category: 'friendly',
      tag: 'STRATEGIC',
      multiTarget: true,
      minTargets: 2,
      maxTargets: 4
    },
    {
      id: 'form_alliance',
      label: 'Form Alliance',
      cost: 3,
      infoCost: 10,
      description: 'Propose a formal alliance with another player. Success creates lasting bond.',
      category: 'strategic',
      tag: 'STRATEGIC',
      allianceProposal: true
    }
  ];

  function getActionById(actionId){
    return SOCIAL_ACTIONS.find(a => a.id === actionId);
  }

  function getAvailableActions(playerId){
    const energy = getEnergy(playerId);
    const info = getInformation(playerId);
    return SOCIAL_ACTIONS.filter(action => 
      action.cost <= energy && (action.infoCost || 0) <= info
    );
  }

  // ============================================================================
  // ACTION EXECUTION
  // ============================================================================
  
  function executeAction(actorId, targetId, actionId, extraTargets){
    if(!isEnabled()){
      console.warn('[social-maneuvers] System is disabled');
      return { success: false, reason: 'disabled' };
    }

    const action = getActionById(actionId);
    if(!action){
      console.warn('[social-maneuvers] Unknown action:', actionId);
      return { success: false, reason: 'unknown_action' };
    }

    // Check energy
    const hasEnergy = spendEnergy(actorId, action.cost);
    if(!hasEnergy){
      return { 
        success: false, 
        reason: 'insufficient_energy',
        message: `Not enough energy (need ${action.cost})` 
      };
    }

    // Check information cost
    if(action.infoCost && action.infoCost > 0){
      const hasInfo = spendInformation(actorId, action.infoCost);
      if(!hasInfo){
        // Refund energy since we failed
        restoreEnergy(actorId, action.cost);
        return {
          success: false,
          reason: 'insufficient_information',
          message: `Not enough information (need ${action.infoCost})`
        };
      }
    }

    // Handle multi-target actions
    let allTargets = [targetId];
    if(action.multiTarget && extraTargets && extraTargets.length > 0){
      allTargets = [targetId, ...extraTargets];
      
      // Validate target count
      if(action.minTargets && allTargets.length < action.minTargets){
        // Refund costs
        restoreEnergy(actorId, action.cost);
        if(action.infoCost) global.updateInformation?.(actorId, action.infoCost);
        return {
          success: false,
          reason: 'insufficient_targets',
          message: `Need at least ${action.minTargets} targets`
        };
      }
      if(action.maxTargets && allTargets.length > action.maxTargets){
        allTargets = allTargets.slice(0, action.maxTargets);
      }
    }

    // Log the action
    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    const targetNames = allTargets.map(id => global.safeName?.(id) || `Player ${id}`).join(', ');
    console.info(`[social-maneuvers] ${actorName} -> ${targetNames}: ${action.label} (cost: ${action.cost}E, ${action.infoCost || 0}I)`);

    // Process outcome
    const outcome = processActionOutcome(actorId, allTargets, action);

    // Record telemetry
    recordTelemetry(actorId, allTargets, action, outcome);

    return {
      success: true,
      action: action,
      outcome: outcome,
      energyRemaining: getEnergy(actorId),
      informationRemaining: getInformation(actorId)
    };
  }

  // ============================================================================
  // OUTCOME PROCESSING
  // ============================================================================
  
  function processActionOutcome(actorId, targetIds, action){
    // targetIds is now an array (even for single target)
    const targets = Array.isArray(targetIds) ? targetIds : [targetIds];
    
    const actor = global.getP?.(actorId);
    if(!actor){
      return { type: 'error', message: 'Actor not found' };
    }

    // Handle special actions
    switch(action.id){
      case 'spread_rumor':
        return processSpreadRumor(actor, targets[0], action);
      case 'expose_secret':
        return processExposeSecret(actor, targets[0], action);
      case 'group_hangout':
        return processGroupHangout(actor, targets, action);
      case 'form_alliance':
        return processFormAlliance(actor, targets[0], action);
    }

    // Default action processing for basic actions
    const target = global.getP?.(targets[0]);
    if(!target){
      return { type: 'error', message: 'Player not found' };
    }

    // Basic affinity changes based on action category
    let affinityChange = 0;
    let outcomeType = 'neutral';
    let message = '';

    switch(action.category){
      case 'friendly':
        affinityChange = 0.05 + Math.random() * 0.05;
        outcomeType = 'positive';
        message = `${action.label} went well!`;
        break;
      case 'strategic':
        affinityChange = (Math.random() - 0.3) * 0.1;
        outcomeType = affinityChange > 0 ? 'positive' : 'neutral';
        message = `${action.label} was informative.`;
        break;
      case 'aggressive':
        affinityChange = -0.03 + Math.random() * -0.05;
        outcomeType = 'negative';
        message = `${action.label} created tension.`;
        break;
      default:
        affinityChange = 0;
        message = `${action.label} completed.`;
    }

    // Apply affinity change (integrate with existing system)
    if(actor.affinity && typeof actor.affinity === 'object'){
      const current = actor.affinity[target.id] ?? 0;
      actor.affinity[target.id] = current + affinityChange;
    }

    // Record action in memory
    recordActionInMemory(actorId, targets[0], action, outcomeType);

    // Apply trait effects
    applyTraitEffects(actorId, targets[0], action);

    return {
      type: outcomeType,
      message: message,
      affinityChange: affinityChange,
      participants: [actorId, ...targets]
    };
  }

  // ============================================================================
  // SPECIAL ACTION HANDLERS
  // ============================================================================

  function processSpreadRumor(actor, targetId, action){
    const target = global.getP?.(targetId);
    if(!target){
      return { type: 'error', message: 'Target not found' };
    }

    const actorName = actor.name || `Player ${actor.id}`;
    const targetName = target.name || `Player ${targetId}`;

    // Calculate if caught (based on backlash risk)
    const caught = Math.random() < (action.backlashRisk || 0.3);

    if(caught){
      // Backlash: Actor's reputation damaged with target and others
      const backlashDelta = -0.15 - Math.random() * 0.10;
      
      // Apply backlash to actor-target relationship
      if(actor.affinity && typeof actor.affinity === 'object'){
        const current = actor.affinity[targetId] ?? 0;
        actor.affinity[targetId] = current + backlashDelta;
      }
      
      // Apply smaller backlash to other players who heard about it
      const alivePlayers = global.alivePlayers?.() || [];
      const witnesses = alivePlayers.filter(p => p.id !== actor.id && p.id !== targetId);
      witnesses.forEach(witness => {
        if(Math.random() < 0.4 && actor.affinity){ // 40% chance each witness finds out
          const current = actor.affinity[witness.id] ?? 0;
          actor.affinity[witness.id] = current + (backlashDelta * 0.5);
        }
      });

      // Create backlash memory
      recordBacklashMemory(actor.id, targetId, 'rumor_caught', {
        action: 'spread_rumor',
        severity: 'medium',
        description: `${actorName} was caught spreading rumors about ${targetName}`
      });

      // Record in action memory
      recordActionInMemory(actor.id, targetId, action, 'backlash');

      global.addLog?.(`${actorName} was caught spreading rumors about ${targetName}!`, 'danger');

      return {
        type: 'backlash',
        message: `You were caught! Your reputation took a hit.`,
        affinityChange: backlashDelta,
        caught: true,
        participants: [actor.id, targetId, ...witnesses.filter((_, i) => Math.random() < 0.4).map(p => p.id)]
      };
    } else {
      // Success: Target's reputation damaged with others
      const delta = -0.10 - Math.random() * 0.08;
      
      // Affect target's relationships with random other players
      const alivePlayers = global.alivePlayers?.() || [];
      const affected = alivePlayers.filter(p => p.id !== actor.id && p.id !== targetId);
      const affectedIds = [];
      
      affected.forEach(other => {
        if(Math.random() < 0.5 && target.affinity){ // 50% chance to affect each relationship
          const current = target.affinity[other.id] ?? 0;
          target.affinity[other.id] = current + delta;
          affectedIds.push(other.id);
        }
      });

      // Record in action memory
      recordActionInMemory(actor.id, targetId, action, 'success');

      global.addLog?.(`${actorName} spread rumors about ${targetName}.`, 'muted');

      return {
        type: 'success',
        message: `Rumor spread successfully. ${targetName}'s reputation damaged.`,
        affinityChange: delta,
        caught: false,
        participants: [actor.id, targetId, ...affectedIds]
      };
    }
  }

  function processExposeSecret(actor, targetId, action){
    const target = global.getP?.(targetId);
    if(!target){
      return { type: 'error', message: 'Target not found' };
    }

    const actorName = actor.name || `Player ${actor.id}`;
    const targetName = target.name || `Player ${targetId}`;

    // Calculate if caught/backlash (higher risk than rumor)
    const backlash = Math.random() < (action.backlashRisk || 0.5);

    // Large impact regardless
    const impactDelta = -0.20 - Math.random() * 0.15;
    
    // Affect target's relationships with ALL other players
    const alivePlayers = global.alivePlayers?.() || [];
    const affected = alivePlayers.filter(p => p.id !== actor.id && p.id !== targetId);
    
    affected.forEach(other => {
      if(target.affinity){
        const current = target.affinity[other.id] ?? 0;
        target.affinity[other.id] = current + impactDelta;
      }
    });

    if(backlash){
      // Actor also suffers reputation damage (seen as untrustworthy)
      const backlashDelta = -0.12 - Math.random() * 0.08;
      
      affected.forEach(other => {
        if(Math.random() < 0.6 && actor.affinity){ // 60% chance each player sees actor as untrustworthy
          const current = actor.affinity[other.id] ?? 0;
          actor.affinity[other.id] = current + backlashDelta;
        }
      });

      // Target relationship severely damaged
      if(actor.affinity){
        const current = actor.affinity[targetId] ?? 0;
        actor.affinity[targetId] = current + (-0.25 - Math.random() * 0.10);
      }

      recordBacklashMemory(actor.id, targetId, 'secret_exposed', {
        action: 'expose_secret',
        severity: 'high',
        description: `${actorName} exposed secrets about ${targetName}, but faced backlash`
      });

      // Record in action memory
      recordActionInMemory(actor.id, targetId, action, 'backlash');

      global.addLog?.(`${actorName} exposed ${targetName}'s secrets! Both reputations damaged.`, 'danger');

      return {
        type: 'backlash',
        message: `Secret exposed but you're seen as untrustworthy. High cost!`,
        affinityChange: impactDelta,
        backlash: true,
        backlashDelta: backlashDelta,
        participants: [actor.id, targetId, ...affected.map(p => p.id)]
      };
    } else {
      // Record in action memory
      recordActionInMemory(actor.id, targetId, action, 'success');

      global.addLog?.(`${actorName} exposed damaging information about ${targetName}!`, 'warning');

      return {
        type: 'success',
        message: `Secret exposed successfully! ${targetName}'s reputation destroyed.`,
        affinityChange: impactDelta,
        backlash: false,
        participants: [actor.id, targetId, ...affected.map(p => p.id)]
      };
    }
  }

  function processGroupHangout(actor, targetIds, action){
    const actorName = actor.name || `Player ${actor.id}`;
    const participants = [actor.id, ...targetIds];
    const participantNames = participants.map(id => global.safeName?.(id) || `Player ${id}`).join(', ');

    // Small affinity boost between all participants
    const boostDelta = 0.04 + Math.random() * 0.03;

    // Apply boost between all pairs of participants
    for(let i = 0; i < participants.length; i++){
      for(let j = i + 1; j < participants.length; j++){
        const p1 = global.getP?.(participants[i]);
        const p2 = global.getP?.(participants[j]);
        
        if(p1 && p2){
          // Mutual boost
          if(p1.affinity){
            const current1 = p1.affinity[p2.id] ?? 0;
            p1.affinity[p2.id] = current1 + boostDelta;
          }
          if(p2.affinity){
            const current2 = p2.affinity[p1.id] ?? 0;
            p2.affinity[p1.id] = current2 + boostDelta;
          }
        }
      }
    }

    // Record in action memory (use first target as representative)
    recordActionInMemory(actor.id, targetIds[0], action, 'positive');

    global.addLog?.(`${actorName} organized a group hangout with ${targetIds.length} others.`, 'ok');

    return {
      type: 'positive',
      message: `Group hangout was fun! Everyone bonded a little.`,
      affinityChange: boostDelta,
      participants: participants,
      multiTarget: true
    };
  }

  function processFormAlliance(actor, targetId, action){
    const target = global.getP?.(targetId);
    if(!target){
      return { type: 'error', message: 'Target not found' };
    }

    const actorName = actor.name || `Player ${actor.id}`;
    const targetName = target.name || `Player ${targetId}`;

    // Check current affinity/relationship
    const currentAffinity = actor.affinity?.[targetId] ?? 0;
    
    // Success threshold: need reasonable affinity
    const successThreshold = 0.15;
    const success = currentAffinity >= successThreshold;

    if(success){
      // Create formal alliance using existing alliance system
      const allianceCreated = tryCreateAlliance(actor.id, targetId);
      
      if(allianceCreated){
        // Boost relationship
        const boostDelta = 0.10 + Math.random() * 0.05;
        if(actor.affinity){
          actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + boostDelta;
        }
        if(target.affinity){
          target.affinity[actor.id] = (target.affinity[actor.id] ?? 0) + boostDelta;
        }

        // Record in action memory
        recordActionInMemory(actor.id, targetId, action, 'success');

        global.addLog?.(`${actorName} and ${targetName} formed an alliance!`, 'success');

        return {
          type: 'success',
          message: `Alliance formed with ${targetName}! Stronger together.`,
          affinityChange: boostDelta,
          allianceFormed: true,
          participants: [actor.id, targetId]
        };
      } else {
        // Alliance system rejected (maybe already in alliance)
        recordActionInMemory(actor.id, targetId, action, 'neutral');

        return {
          type: 'neutral',
          message: `Proposal accepted but alliance couldn't be formalized.`,
          participants: [actor.id, targetId]
        };
      }
    } else {
      // Failure: create BetrayalRisk memory
      const delta = -0.08 - Math.random() * 0.05;
      if(actor.affinity){
        actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + delta;
      }
      if(target.affinity){
        target.affinity[actor.id] = (target.affinity[actor.id] ?? 0) + delta;
      }

      recordBetrayalRiskMemory(actor.id, targetId, {
        action: 'form_alliance',
        reason: 'proposal_rejected',
        description: `${targetName} rejected ${actorName}'s alliance proposal`
      });

      // Record in action memory
      recordActionInMemory(actor.id, targetId, action, 'failure');

      global.addLog?.(`${targetName} rejected ${actorName}'s alliance proposal.`, 'warning');

      return {
        type: 'failure',
        message: `${targetName} rejected your proposal. Relationship strained.`,
        affinityChange: delta,
        allianceFormed: false,
        betrayalRisk: true,
        participants: [actor.id, targetId]
      };
    }
  }

  function tryCreateAlliance(id1, id2){
    // Use existing alliance system from state.js
    if(typeof global.formAlliance === 'function'){
      try {
        // Check if they're already in an alliance together
        if(global.inSameAlliance?.(id1, id2)){
          return false; // Already allied
        }
        
        // Try to form alliance (requires minimum bond strength)
        global.formAlliance([id1, id2]);
        return true;
      } catch(e){
        console.warn('[social-maneuvers] Alliance creation failed:', e);
        return false;
      }
    }
    return false;
  }

  // ============================================================================
  // MEMORY SYSTEM INTEGRATION
  // ============================================================================
  
  function recordActionInMemory(actorId, targetId, action, outcome){
    const g = global.game;
    if(!g) return;

    if(!g.__socialManeuversMemory){
      g.__socialManeuversMemory = {
        actions: [], // Array of {week, actorId, targetId, action, outcome}
        relationships: new Map() // Track relationship evolution
      };
    }

    g.__socialManeuversMemory.actions.push({
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetId,
      action: action.id,
      outcome
    });

    // Keep only last 50 actions to prevent memory bloat
    if(g.__socialManeuversMemory.actions.length > 50){
      g.__socialManeuversMemory.actions.shift();
    }

    console.info('[social-maneuvers] Action recorded in memory');
  }

  function recordBacklashMemory(actorId, targetId, eventType, details){
    const g = global.game;
    if(!g) return;

    if(!g.__backlashMemories){
      g.__backlashMemories = [];
    }

    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);

    g.__backlashMemories.push({
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetId,
      eventType,
      ...details
    });

    // Add to player's memory log if available
    if(actor && actor.memoryLog){
      actor.memoryLog.push({
        week: g.week || 1,
        timestamp: Date.now(),
        event: eventType,
        targetId,
        details
      });
      
      // Keep memory log size in check
      if(actor.memoryLog.length > 100){
        actor.memoryLog.shift();
      }
    }

    console.info(`[social-maneuvers] Backlash memory recorded: ${eventType}`);
  }

  function recordBetrayalRiskMemory(actorId, targetId, details){
    const g = global.game;
    if(!g) return;

    if(!g.__betrayalRisks){
      g.__betrayalRisks = [];
    }

    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);

    g.__betrayalRisks.push({
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetId,
      ...details
    });

    // Add to both players' memory logs
    [actor, target].forEach(player => {
      if(player && player.memoryLog){
        player.memoryLog.push({
          week: g.week || 1,
          timestamp: Date.now(),
          event: 'betrayal_risk',
          targetId: player.id === actorId ? targetId : actorId,
          details
        });
        
        if(player.memoryLog.length > 100){
          player.memoryLog.shift();
        }
      }
    });

    console.info('[social-maneuvers] BetrayalRisk memory recorded');
  }

  function getPlayerMemory(actorId, targetId){
    const g = global.game;
    if(!g?.__socialManeuversMemory) return [];

    return g.__socialManeuversMemory.actions.filter(
      a => (a.actorId === actorId && a.targetId === targetId) ||
           (a.actorId === targetId && a.targetId === actorId)
    );
  }

  // ============================================================================
  // TRAIT EFFECTS
  // ============================================================================
  
  function applyTraitEffects(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    if(!actor) return;

    // Check for traits using global helper if available
    const hasTrait = global.hasTrait || function(id, trait){
      const p = global.getP?.(id);
      return p?.socialTraits?.some(t => t.toLowerCase() === trait.toLowerCase()) || false;
    };

    // Apply trait bonuses/penalties
    if(hasTrait(actorId, 'charismatic') && action.category === 'friendly'){
      // Charismatic players get bonus to friendly actions
      const target = global.getP?.(targetId);
      if(target && actor.affinity){
        const bonus = 0.02 + Math.random() * 0.02;
        actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + bonus;
      }
    }

    if(hasTrait(actorId, 'manipulative') && action.category === 'aggressive'){
      // Manipulative players have reduced backlash risk
      // (This would be applied in the action handlers)
    }

    if(hasTrait(actorId, 'observant') && action.category === 'strategic'){
      // Observant players gain more information from strategic actions
      if(global.updateInformation){
        global.updateInformation(actorId, 2 + Math.floor(Math.random() * 3));
      }
    }

    console.info('[social-maneuvers] Trait effects applied for', action.id);
  }

  // ============================================================================
  // TELEMETRY
  // ============================================================================
  
  function recordTelemetry(actorId, targetIds, action, outcome){
    const g = global.game;
    if(!g) return;

    if(!g.__socialTelemetry){
      g.__socialTelemetry = [];
    }

    const telemetryEntry = {
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetIds: Array.isArray(targetIds) ? targetIds : [targetIds],
      actionId: action.id,
      actionLabel: action.label,
      energyCost: action.cost,
      infoCost: action.infoCost || 0,
      outcomeType: outcome.type,
      participants: outcome.participants || [actorId, ...targetIds],
      deltas: {}
    };

    // Record relationship deltas
    if(outcome.affinityChange !== undefined){
      telemetryEntry.deltas.affinity = outcome.affinityChange;
    }
    if(outcome.backlashDelta !== undefined){
      telemetryEntry.deltas.backlash = outcome.backlashDelta;
    }
    if(outcome.allianceFormed !== undefined){
      telemetryEntry.allianceFormed = outcome.allianceFormed;
    }
    if(outcome.betrayalRisk !== undefined){
      telemetryEntry.betrayalRisk = outcome.betrayalRisk;
    }
    if(outcome.caught !== undefined){
      telemetryEntry.caught = outcome.caught;
    }

    g.__socialTelemetry.push(telemetryEntry);

    // Keep last 200 entries
    if(g.__socialTelemetry.length > 200){
      g.__socialTelemetry.shift();
    }

    console.info('[social-maneuvers] Telemetry recorded:', telemetryEntry);
  }

  // ============================================================================
  // UI RENDERING
  // ============================================================================
  
  function renderSocialManeuversUI(container, playerId){
    if(!isEnabled()){
      console.info('[social-maneuvers] UI render requested but feature is DISABLED');
      return;
    }

    console.info('[social-maneuvers] ✓ Rendering Social Maneuvers UI for player', playerId);

    if(!container){
      console.warn('[social-maneuvers] No container provided for UI');
      return;
    }

    const energy = getEnergy(playerId);
    const information = getInformation(playerId);
    const alivePlayers = global.alivePlayers?.() || [];
    const otherPlayers = alivePlayers.filter(p => p.id !== playerId);

    // State for UI interactions
    let selectedPlayers = []; // Support multi-select for group actions
    let selectedAction = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'social-maneuvers-panel';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Social Maneuvers Interface');

    // Energy and Information display
    const resourcesBar = createResourcesDisplay(energy, information);
    wrapper.appendChild(resourcesBar);

    // Player selection
    if(otherPlayers.length > 0){
      const playerSection = createPlayerSelection(otherPlayers, (players, multiSelect) => {
        selectedPlayers = players;
        updateActionsList();
      });
      wrapper.appendChild(playerSection);
    }

    // Action menu
    const actionsSection = document.createElement('div');
    actionsSection.className = 'social-action-select';
    const actionsTitle = document.createElement('div');
    actionsTitle.className = 'social-section-title';
    actionsTitle.textContent = 'Select Action';
    actionsSection.appendChild(actionsTitle);

    const actionsList = document.createElement('div');
    actionsList.className = 'social-actions-list';
    actionsSection.appendChild(actionsList);

    wrapper.appendChild(actionsSection);

    // Execute button
    const executeBtn = document.createElement('button');
    executeBtn.className = 'social-action-button';
    executeBtn.textContent = 'Execute Action';
    executeBtn.disabled = true;
    executeBtn.setAttribute('aria-label', 'Execute selected social action');
    executeBtn.onclick = () => {
      if(selectedPlayers.length > 0 && selectedAction){
        const primaryTarget = selectedPlayers[0];
        const extraTargets = selectedPlayers.slice(1);
        const result = executeAction(playerId, primaryTarget, selectedAction.id, extraTargets);
        showFeedback(result);
        
        // Refresh UI after action
        setTimeout(() => {
          container.innerHTML = '';
          renderSocialManeuversUI(container, playerId);
        }, 2500);
      }
    };
    wrapper.appendChild(executeBtn);

    // Update actions list based on selection
    function updateActionsList(){
      actionsList.innerHTML = '';
      
      if(selectedPlayers.length === 0){
        const emptyState = document.createElement('div');
        emptyState.className = 'social-empty-state';
        emptyState.textContent = 'Select a player to see available actions';
        actionsList.appendChild(emptyState);
        executeBtn.disabled = true;
        return;
      }

      const availableActions = getAvailableActions(playerId);
      
      if(availableActions.length === 0){
        const emptyState = document.createElement('div');
        emptyState.className = 'social-empty-state';
        emptyState.textContent = 'No energy or information remaining for actions';
        actionsList.appendChild(emptyState);
        executeBtn.disabled = true;
        return;
      }

      availableActions.forEach(action => {
        const actionItem = createActionItem(action, energy, information, (selected) => {
          selectedAction = selected;
          
          // Update visual selection
          actionsList.querySelectorAll('.social-action-item').forEach(item => {
            item.classList.remove('selected');
          });
          actionItem.classList.add('selected');
          
          // Enable/disable multi-select based on action
          updatePlayerSelectionMode(selected.multiTarget, selected.minTargets, selected.maxTargets);
          
          executeBtn.disabled = false;
        });
        actionsList.appendChild(actionItem);
      });
    }

    function updatePlayerSelectionMode(multiTarget, minTargets, maxTargets){
      const playerSection = wrapper.querySelector('.social-player-select');
      if(!playerSection) return;
      
      if(multiTarget){
        playerSection.classList.add('multi-select-mode');
        playerSection.setAttribute('data-min-targets', minTargets || 1);
        playerSection.setAttribute('data-max-targets', maxTargets || 10);
        
        // Update instruction text
        let instruction = playerSection.querySelector('.selection-instruction');
        if(!instruction){
          instruction = document.createElement('div');
          instruction.className = 'selection-instruction';
          playerSection.insertBefore(instruction, playerSection.firstChild.nextSibling);
        }
        instruction.textContent = `Select ${minTargets || 2}-${maxTargets || 4} players for group action`;
      } else {
        playerSection.classList.remove('multi-select-mode');
        const instruction = playerSection.querySelector('.selection-instruction');
        if(instruction) instruction.remove();
      }
    }

    container.appendChild(wrapper);
    updateActionsList();
  }

  function createResourcesDisplay(energy, information){
    const container = document.createElement('div');
    container.className = 'social-resources-bar';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');

    // Energy section
    const energySection = document.createElement('div');
    energySection.className = 'social-resource-section';
    
    const energyLabel = document.createElement('div');
    energyLabel.className = 'social-resource-label';
    energyLabel.innerHTML = `
      <strong>⚡ Energy</strong>
      <span class="social-resource-value">${energy}/${MAX_ENERGY}</span>
    `;
    energySection.appendChild(energyLabel);

    // Energy dots visualization
    const energyDots = document.createElement('div');
    energyDots.className = 'social-energy-dots';
    energyDots.setAttribute('aria-hidden', 'true');
    
    for(let i = 0; i < MAX_ENERGY; i++){
      const dot = document.createElement('div');
      dot.className = 'social-energy-dot';
      if(i < energy){
        dot.classList.add('filled');
      }
      energyDots.appendChild(dot);
    }
    energySection.appendChild(energyDots);
    container.appendChild(energySection);

    // Information section
    const infoSection = document.createElement('div');
    infoSection.className = 'social-resource-section';
    
    const infoLabel = document.createElement('div');
    infoLabel.className = 'social-resource-label';
    infoLabel.innerHTML = `
      <strong>🔍 Information</strong>
      <span class="social-resource-value">${Math.round(information)}/100</span>
    `;
    infoSection.appendChild(infoLabel);

    // Information bar visualization
    const infoBar = document.createElement('div');
    infoBar.className = 'social-info-bar';
    infoBar.setAttribute('aria-hidden', 'true');
    
    const infoFill = document.createElement('div');
    infoFill.className = 'social-info-fill';
    infoFill.style.width = `${Math.max(0, Math.min(100, information))}%`;
    infoBar.appendChild(infoFill);
    
    infoSection.appendChild(infoBar);
    container.appendChild(infoSection);

    return container;
  }

  function createPlayerSelection(players, onSelect){
    const container = document.createElement('div');
    container.className = 'social-player-select';
    
    let selectedPlayers = [];
    let multiSelectMode = false;

    const title = document.createElement('div');
    title.className = 'social-section-title';
    title.textContent = 'Select Target';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'social-player-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Select target player(s)');

    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'social-player-card';
      card.textContent = player.name || `Player ${player.id}`;
      card.setAttribute('data-player-id', player.id);
      card.setAttribute('tabindex', '0');
      
      card.onclick = () => {
        const isMultiSelect = container.classList.contains('multi-select-mode');
        
        if(isMultiSelect){
          // Multi-select mode (for group actions)
          const maxTargets = parseInt(container.getAttribute('data-max-targets') || '10');
          const isSelected = card.classList.contains('selected');
          
          if(isSelected){
            // Deselect
            card.classList.remove('selected');
            selectedPlayers = selectedPlayers.filter(p => p.id !== player.id);
          } else {
            // Select if under max
            if(selectedPlayers.length < maxTargets){
              card.classList.add('selected');
              selectedPlayers.push(player);
            }
          }
        } else {
          // Single-select mode
          grid.querySelectorAll('.social-player-card').forEach(c => {
            c.classList.remove('selected');
          });
          card.classList.add('selected');
          selectedPlayers = [player];
        }
        
        onSelect(selectedPlayers, isMultiSelect);
      };
      
      // Keyboard accessibility
      card.addEventListener('keypress', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          card.onclick();
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
    return container;
  }

  function createActionItem(action, currentEnergy, currentInfo, onSelect){
    const item = document.createElement('div');
    item.className = 'social-action-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    
    const canAffordEnergy = currentEnergy >= action.cost;
    const canAffordInfo = !action.infoCost || currentInfo >= action.infoCost;
    const canAfford = canAffordEnergy && canAffordInfo;
    
    if(!canAfford){
      item.classList.add('disabled');
      item.setAttribute('aria-disabled', 'true');
    }

    const header = document.createElement('div');
    header.className = 'social-action-header';
    
    const name = document.createElement('div');
    name.className = 'social-action-name';
    name.textContent = action.label;
    header.appendChild(name);

    const costs = document.createElement('div');
    costs.className = 'social-action-costs';
    
    // Energy cost
    const energyCost = document.createElement('span');
    energyCost.className = 'social-action-cost energy-cost';
    energyCost.classList.add(canAffordEnergy ? 'affordable' : 'expensive');
    energyCost.textContent = `⚡${action.cost}`;
    costs.appendChild(energyCost);
    
    // Information cost (if any)
    if(action.infoCost && action.infoCost > 0){
      const infoCost = document.createElement('span');
      infoCost.className = 'social-action-cost info-cost';
      infoCost.classList.add(canAffordInfo ? 'affordable' : 'expensive');
      infoCost.textContent = `🔍${action.infoCost}`;
      costs.appendChild(infoCost);
    }
    
    header.appendChild(costs);
    item.appendChild(header);

    const desc = document.createElement('div');
    desc.className = 'social-action-description';
    desc.textContent = action.description;
    item.appendChild(desc);

    // Action tag (STRATEGIC/AGGRESSIVE/FRIENDLY)
    const tag = document.createElement('span');
    tag.className = `social-action-tag ${action.category}`;
    tag.textContent = action.tag || action.category.toUpperCase();
    item.appendChild(tag);

    if(canAfford){
      item.onclick = () => onSelect(action);
      
      // Keyboard accessibility
      item.addEventListener('keypress', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          onSelect(action);
        }
      });
    }

    return item;
  }

  function showFeedback(result){
    // Remove any existing feedback
    const existing = document.querySelector('.social-feedback-panel');
    if(existing){
      existing.remove();
    }

    if(!result.success){
      const panel = createFeedbackPanel('negative', 'Action Failed', result.message || result.reason);
      document.body.appendChild(panel);
      setTimeout(() => panel.remove(), 3000);
      return;
    }

    const outcome = result.outcome;
    const panel = createFeedbackPanel(
      outcome.type, 
      result.action.label,
      outcome.message
    );
    document.body.appendChild(panel);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      panel.style.animation = 'slideOutRight 0.4s ease';
      setTimeout(() => panel.remove(), 400);
    }, 3000);
  }

  function createFeedbackPanel(type, title, message){
    const panel = document.createElement('div');
    panel.className = `social-feedback-panel ${type}`;
    panel.setAttribute('role', 'alert');
    panel.setAttribute('aria-live', 'assertive');

    const titleEl = document.createElement('div');
    titleEl.className = 'social-feedback-title';
    titleEl.textContent = title;
    panel.appendChild(titleEl);

    const messageEl = document.createElement('div');
    messageEl.className = 'social-feedback-message';
    messageEl.textContent = message;
    panel.appendChild(messageEl);

    return panel;
  }

  // ============================================================================
  // PHASE INTEGRATION
  // ============================================================================
  
  function onSocialPhaseStart(){
    if(!isEnabled()){
      console.info('[social-maneuvers] Phase start called but feature is DISABLED (USE_SOCIAL_MANEUVERS=false)');
      return;
    }
    
    console.info('[social-maneuvers] ✓ startPhase() triggered - Initializing social phase with energy system');
    initSocialEnergy();
    
    // Reset energy for all players
    const alivePlayers = global.alivePlayers?.() || [];
    alivePlayers.forEach(p => {
      setEnergy(p.id, DEFAULT_ENERGY);
    });
    console.info(`[social-maneuvers] Energy initialized for ${alivePlayers.length} players (${DEFAULT_ENERGY} energy each)`);
  }

  function onSocialPhaseEnd(){
    if(!isEnabled()) {
      console.info('[social-maneuvers] Phase end called but feature is DISABLED');
      return;
    }
    
    console.info('[social-maneuvers] ✓ Social phase complete - cleaning up');
    // PLACEHOLDER: Generate summary of actions taken
    // PLACEHOLDER: Update long-term memory structures
  }

  // ============================================================================
  // GLOBAL EXPORTS
  // ============================================================================
  
  global.SocialManeuvers = {
    // Feature flag
    isEnabled,
    
    // Energy management
    initSocialEnergy,
    getEnergy,
    setEnergy,
    spendEnergy,
    restoreEnergy,
    
    // Actions
    getActionById,
    getAvailableActions,
    executeAction,
    
    // Memory
    recordActionInMemory,
    getPlayerMemory,
    
    // UI
    renderSocialManeuversUI,
    
    // Phase hooks
    onSocialPhaseStart,
    onSocialPhaseEnd,
    
    // Backward-compatible aliases (for problem statement requirements)
    startPhase: onSocialPhaseStart,
    endPhase: onSocialPhaseEnd,
    
    // Constants (for external reference)
    DEFAULT_ENERGY,
    MAX_ENERGY,
    SOCIAL_ACTIONS
  };
  
  // Backward-compatible alias: SocialManager -> SocialManeuvers
  global.SocialManager = global.SocialManeuvers;
  
  // Backward-compatible flag getter/setter: USE_SOCIAL_MANEUVERS
  Object.defineProperty(global, 'USE_SOCIAL_MANEUVERS', {
    get: function() { 
      return isEnabled(); 
    },
    set: function(value) {
      initDefaultFlag();
      const oldValue = global.game.cfg.enableSocialManeuvers;
      global.game.cfg.enableSocialManeuvers = !!value;
      const newValue = global.game.cfg.enableSocialManeuvers;
      console.info(`[social-maneuvers] Flag changed: ${oldValue} → ${newValue} (USE_SOCIAL_MANEUVERS=${newValue})`);
    },
    enumerable: true,
    configurable: true
  });

  // Initialize on load
  initDefaultFlag();
  
  console.info('[social-maneuvers] ✓ Module loaded successfully');
  console.info('[social-maneuvers] ✓ Enabled by default (enableSocialManeuvers=true)');
  console.info('[social-maneuvers] Runtime control: window.USE_SOCIAL_MANEUVERS = true/false');
  console.info('[social-maneuvers] Current state: USE_SOCIAL_MANEUVERS =', isEnabled());

})(window);
