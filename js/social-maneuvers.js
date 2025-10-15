// Social Maneuvers system: manages interactive social phase with player social energy,
// action menu, outcomes, and long-term memory integration.
// Feature-flagged for gradual rollout and expansion.

(function(global){
  'use strict';

  // ============================================================================
  // CONFIGURATION & FEATURE FLAG
  // ============================================================================
  function initDefaultFlag(){
    if(!global.game) global.game = { cfg: {} };
    if(!global.game.cfg) global.game.cfg = {};
    if(global.game.cfg.enableSocialManeuvers === undefined){
      global.game.cfg.enableSocialManeuvers = true;
      console.info('[social-maneuvers] ✓ Defaulted enableSocialManeuvers to TRUE');
    }
  }
  function isEnabled(){
    initDefaultFlag();
    return global.game?.cfg?.enableSocialManeuvers === true;
  }

  // ============================================================================
  // SOCIAL RESOURCES SYSTEM (Energy, Influence, Information)
  // ============================================================================
  // Note: Information is scaled to 0..100 to support high-impact action costs.
  const RESOURCE_CONFIG = {
    energy:      { default: 3,  max: 5,   weeklyReset: true,  carryover: false, description: 'Energy represents your social stamina.', examples: 'Used for conversations, strategizing.' },
    influence:   { default: 2,  max: 10,  weeklyReset: false, carryover: true,  description: 'Influence is your social capital.', examples: 'Earned by success, powers maneuvers.' },
    information: { default: 25, max: 100, weeklyReset: false, carryover: true,  description: 'Information is strategic knowledge.', examples: 'Earned through observation and interrogation.' }
  };

  const DEFAULT_ENERGY = RESOURCE_CONFIG.energy.default;
  const MAX_ENERGY = RESOURCE_CONFIG.energy.max;

  const SocialResources = {
    init(playerId) {
      const g = global.game;
      if(!g) return;
      if(!g.__socialResources){ g.__socialResources = new Map(); }
      if(!g.__socialResources.has(playerId)){
        g.__socialResources.set(playerId, {
          energy: RESOURCE_CONFIG.energy.default,
          influence: RESOURCE_CONFIG.influence.default,
          information: RESOURCE_CONFIG.information.default,
          lastWeekReset: g.week || 1
        });
      }
    },
    get(playerId, resourceType) {
      const g = global.game;
      if(!g?.__socialResources) this.init(playerId);
      const resources = g.__socialResources.get(playerId);
      if(!resources) { this.init(playerId); return RESOURCE_CONFIG[resourceType]?.default || 0; }
      return resources[resourceType] ?? RESOURCE_CONFIG[resourceType]?.default ?? 0;
    },
    getAll(playerId) {
      return {
        energy: this.get(playerId, 'energy'),
        influence: this.get(playerId, 'influence'),
        information: this.get(playerId, 'information')
      };
    },
    set(playerId, resourceType, amount) {
      const g = global.game; if(!g) return false;
      this.init(playerId);
      const config = RESOURCE_CONFIG[resourceType];
      if(!config) return false;
      const resources = g.__socialResources.get(playerId);
      const capped = Math.max(0, Math.min(config.max, amount));
      resources[resourceType] = capped;
      this._logTelemetry(playerId, resourceType, 'set', capped);
      return true;
    },
    spend(playerId, costs) {
      // pre-check affordability
      for(const [type, cost] of Object.entries(costs)) {
        if(cost > 0 && this.get(playerId, type) < cost) return { success: false, insufficient: type };
      }
      // deduct
      for(const [type, cost] of Object.entries(costs)) {
        if(cost > 0) {
          const current = this.get(playerId, type);
          this.set(playerId, type, current - cost);
        }
      }
      this._logTelemetry(playerId, 'multiple', 'spend', costs);
      return { success: true };
    },
    earn(playerId, gains) {
      for(const [type, amount] of Object.entries(gains)) {
        if(amount > 0) {
          const current = this.get(playerId, type);
          this.set(playerId, type, current + amount);
        }
      }
      this._logTelemetry(playerId, 'multiple', 'earn', gains);
      return { success: true };
    },
    resetWeekly(playerId) {
      const g = global.game; if(!g) return;
      this.init(playerId);
      const resources = g.__socialResources.get(playerId);
      const currentWeek = g.week || 1;
      if(resources.lastWeekReset >= currentWeek) return;
      for(const [type, config] of Object.entries(RESOURCE_CONFIG)) {
        if(config.weeklyReset) resources[type] = config.default;
        else if(config.carryover) resources[type] = Math.min(resources[type], config.max);
      }
      resources.lastWeekReset = currentWeek;
      console.info(`[social-resources] Weekly reset for player ${playerId} at week ${currentWeek}`);
      this._logTelemetry(playerId, 'all', 'reset', resources);
    },
    canAfford(playerId, costs) {
      for(const [type, cost] of Object.entries(costs)) {
        if(cost > 0 && this.get(playerId, type) < cost) return false;
      }
      return true;
    },
    _logTelemetry(playerId, resourceType, operation, value) {
      const g = global.game; if(!g) return;
      if(!g.__socialResourcesTelemetry) g.__socialResourcesTelemetry = [];
      const entry = {
        timestamp: Date.now(),
        week: g.week || 1,
        phase: g.phase || 'unknown',
        playerId,
        resourceType,
        operation,
        value,
        balance: this.getAll(playerId)
      };
      g.__socialResourcesTelemetry.push(entry);
      if(g.__socialResourcesTelemetry.length > 100) g.__socialResourcesTelemetry.shift();
      console.info('[social-resources] Telemetry:', operation, resourceType, value, 'Balance:', entry.balance);
    }
  };

  // ============================================================================
  // ACTION DEFINITIONS & DYNAMIC MENU (includes high-impact actions)
  // ============================================================================
  const SOCIAL_ACTIONS = [
    { id: 'smalltalk',    label: 'Small Talk',    cost: 1, costs: { energy: 1, influence: 0, information: 0 }, rewards: { influence: 0.5 }, description: 'Light conversation to build rapport', category: 'friendly' },
    { id: 'strategize',   label: 'Strategize',    cost: 2, costs: { energy: 2, influence: 1, information: 0 }, rewards: { information: 1 }, description: 'Discuss game plans and alliances', category: 'strategic' },
    { id: 'confide',      label: 'Confide',       cost: 2, costs: { energy: 2, influence: 0, information: 0 }, rewards: { influence: 1 }, description: 'Share personal thoughts and build trust', category: 'friendly' },
    { id: 'interrogate',  label: 'Interrogate',   cost: 2, costs: { energy: 2, influence: 1, information: 0 }, rewards: { information: 2 }, description: 'Press for information about plans', category: 'aggressive' },
    { id: 'compliment',   label: 'Compliment',    cost: 1, costs: { energy: 1, influence: 0, information: 0 }, rewards: { influence: 0.5 }, description: 'Give genuine praise', category: 'friendly' },
    { id: 'confront',     label: 'Confront',      cost: 3, costs: { energy: 3, influence: 2, information: 0 }, rewards: { information: 1 }, description: 'Address conflicts directly', category: 'aggressive' },
    { id: 'mediate',      label: 'Mediate',       cost: 2, costs: { energy: 2, influence: 1, information: 1 }, rewards: { influence: 2 }, description: 'Help resolve tensions between others', category: 'strategic' },
    { id: 'observe',      label: 'Observe',       cost: 1, costs: { energy: 1, influence: 0, information: 0 }, rewards: { information: 1 }, description: 'Watch and listen quietly', category: 'strategic' },

    // High-impact maneuvers
    { id: 'spread_rumor',   label: 'Spread Rumor',   cost: 1, costs: { energy: 1, influence: 0, information: 15 }, description: 'Spread damaging information about a player. Risk of being caught!', category: 'aggressive', backlashRisk: 0.30 },
    { id: 'expose_secret',  label: 'Expose Secret',  cost: 2, costs: { energy: 2, influence: 0, information: 25 }, description: 'Reveal damaging information publicly. High impact, high risk!', category: 'aggressive', backlashRisk: 0.50 },
    { id: 'group_hangout',  label: 'Group Hangout',  cost: 2, costs: { energy: 2, influence: 0, information: 0  }, description: 'Organize a casual hangout. Select multiple players to bond.', category: 'friendly',  multiTarget: true, minTargets: 2, maxTargets: 4 },
    { id: 'form_alliance',  label: 'Form Alliance',  cost: 3, costs: { energy: 3, influence: 0, information: 10 }, description: 'Propose a formal alliance with another player. Success creates lasting bond.', category: 'strategic', allianceProposal: true }
  ];
  function getActionById(actionId){ return SOCIAL_ACTIONS.find(a => a.id === actionId); }

  function getAvailableActions(playerId, targetId){
    const actor = global.getP?.(playerId);
    const target = targetId ? global.getP?.(targetId) : null;
    return SOCIAL_ACTIONS.map(action => {
      const canAfford = SocialResources.canAfford(playerId, action.costs);
      let evaluation = null;
      if (target && global.SocialActionConfig) {
        evaluation = global.SocialActionConfig.getActionEvaluation(action.id, actor, target, action);
      }
      return { ...action, canAfford, evaluation };
    });
  }

  // ============================================================================
  // ACTION EXECUTION & FEEDBACK (supports multi-target + info costs)
  // ============================================================================
  function executeAction(actorId, targetId, actionId, extraTargetIds = []){
    if(!isEnabled()){ console.warn('[social-maneuvers] System is disabled'); return { success: false, reason: 'disabled' }; }
    const action = getActionById(actionId);
    if(!action){ console.warn('[social-maneuvers] Unknown action:', actionId); return { success: false, reason: 'unknown_action' }; }

    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    if(!actor || !target){ return { success: false, reason: 'player_not_found' }; }

    // Validate multi-target counts before spending resources
    let allTargets = [targetId, ...((Array.isArray(extraTargetIds) ? extraTargetIds : []).filter(Boolean))];
    if(action.multiTarget){
      const minT = action.minTargets ?? 2;
      const maxT = action.maxTargets ?? 10;
      if(allTargets.length < minT){
        return { success: false, reason: 'insufficient_targets', message: `Need at least ${minT} targets` };
      }
      if(allTargets.length > maxT){
        allTargets = allTargets.slice(0, maxT);
      }
    } else {
      allTargets = [targetId];
    }

    // Evaluation/gating
    let evaluation = null, chanceRoll = Math.random(), succeeded = true;
    if(global.SocialActionConfig){
      evaluation = global.SocialActionConfig.getActionEvaluation(actionId, actor, target, action);
      if(!evaluation.available){
        return { success: false, reason: 'gated', message: evaluation.gateReasons.join('; '), gateReasons: evaluation.gateReasons };
      }
      succeeded = chanceRoll < (evaluation.finalChance ?? 0.5);
    }

    // Spend resources (energy, influence, information via unified API)
    const spendResult = SocialResources.spend(actorId, action.costs);
    if(!spendResult.success){
      return { success: false, reason: 'insufficient_resources', insufficient: spendResult.insufficient, message: `Not enough ${spendResult.insufficient}` };
    }

    // Telemetry (generic)
    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    const targetName = global.safeName?.(targetId) || `Player ${targetId}`;
    const telemetry = {
      timestamp: Date.now(),
      week: global.game?.week || 1,
      actorId, actorName, targetId, targetName, actionId,
      actionLabel: action.label, actionCost: action.cost,
      baseChance: evaluation?.baseChance ?? 0.5,
      modifiers: evaluation?.modifiers || [],
      finalChance: evaluation?.finalChance ?? 0.5,
      chanceRoll, succeeded,
      energyRemaining: SocialResources.get(actorId, 'energy'),
      infoRemaining: SocialResources.get(actorId, 'information')
    };
    if(!global.game.__socialManeuversTelemetry) global.game.__socialManeuversTelemetry = [];
    global.game.__socialManeuversTelemetry.push(telemetry);
    if(global.game.__socialManeuversTelemetry.length > 100) global.game.__socialManeuversTelemetry.shift();

    // Outcome: dispatch to special handlers for high-impact actions
    let outcome;
    if(action.id === 'spread_rumor'){
      outcome = processSpreadRumor(actorId, allTargets[0], action);
      recordSpecialTelemetry(actorId, allTargets, action, outcome);
    } else if(action.id === 'expose_secret'){
      outcome = processExposeSecret(actorId, allTargets[0], action);
      recordSpecialTelemetry(actorId, allTargets, action, outcome);
    } else if(action.id === 'group_hangout'){
      outcome = processGroupHangout(actorId, allTargets, action);
      recordSpecialTelemetry(actorId, allTargets, action, outcome);
    } else if(action.id === 'form_alliance'){
      outcome = processFormAlliance(actorId, allTargets[0], action);
      recordSpecialTelemetry(actorId, allTargets, action, outcome);
    } else {
      outcome = processActionOutcome(actorId, targetId, action, succeeded, evaluation);
    }

    // Harmonize succeeded flag for feedback when using special handlers
    if(outcome && (action.id === 'spread_rumor' || action.id === 'expose_secret' || action.id === 'group_hangout' || action.id === 'form_alliance')){
      const t = outcome.type;
      succeeded = (t === 'success' || t === 'positive');
    }

    return { success: true, action, outcome, evaluation, succeeded, telemetry, resources: SocialResources.getAll(actorId) };
  }

  // ============================================================================
  // OUTCOME PROCESSING (base + high-impact handlers)
  // ============================================================================
  function processActionOutcome(actorId, targetId, action, succeeded, evaluation){
    const actor = global.getP?.(actorId); const target = global.getP?.(targetId);
    if(!actor || !target){ return { type: 'error', message: 'Player not found' }; }

    // Base outcome
    let affinityChange = 0, outcomeType = 'neutral', message = '';
    if(succeeded){
      switch(action.category){
        case 'friendly':  affinityChange = 0.05 + Math.random() * 0.05; outcomeType = 'positive'; message = `${action.label} went well!`; break;
        case 'strategic': affinityChange = 0.03 + Math.random() * 0.07; outcomeType = 'positive'; message = `${action.label} was productive.`; break;
        case 'aggressive': affinityChange = -0.02 + Math.random() * 0.04; outcomeType = 'neutral'; message = `${action.label} got your point across.`; break;
        default:          affinityChange = 0.02; message = `${action.label} completed.`;
      }
    } else {
      const states = evaluation?.states || {}; const backlashMultiplier = states.risky ? 1.5 : 1.0;
      switch(action.category){
        case 'friendly':  affinityChange = -0.03 * backlashMultiplier; outcomeType = 'negative'; message = `${action.label} felt forced.`; break;
        case 'strategic': affinityChange = -0.05 * backlashMultiplier; outcomeType = 'negative'; message = `${action.label} backfired.`; break;
        case 'aggressive': affinityChange = -0.08 * backlashMultiplier; outcomeType = 'negative'; message = `${action.label} created serious tension!`; break;
        default:          affinityChange = -0.04 * backlashMultiplier; message = `${action.label} didn't go as planned.`;
      }
    }

    // Trait & Memory modifiers (from PR #2 integration)
    const traitModifiers = calculateTraitModifiers ? calculateTraitModifiers(actorId, targetId, action) : { affinityBonus: 0 };
    affinityChange += (traitModifiers?.affinityBonus || 0);
    const memoryModifiers = calculateMemoryModifiers ? calculateMemoryModifiers(actorId, targetId) : { affinityBonus: 0 };
    affinityChange += (memoryModifiers?.affinityBonus || 0);
    if(affinityChange > 0.05) outcomeType = 'positive';
    else if(affinityChange < -0.05) outcomeType = 'negative';
    else outcomeType = 'neutral';

    if(actor.affinity && typeof actor.affinity === 'object'){ actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + affinityChange; }
    recordActionInMemory(actorId, targetId, action, outcomeType);
    applyTraitEffects(actorId, targetId, action);
    return { type: outcomeType, message, affinityChange, traitModifiers, memoryModifiers, succeeded };
  }

  // High-impact: Spread Rumor
  function processSpreadRumor(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    if(!actor || !target){ return { type: 'error', message: 'Target not found' }; }

    const actorName = actor.name || `Player ${actor.id}`;
    const targetName = target.name || `Player ${targetId}`;
    const caught = Math.random() < (action.backlashRisk ?? 0.3);

    if(caught){
      const backlashDelta = -0.15 - Math.random() * 0.10;
      // Actor-target relationship hit
      if(actor.affinity){ actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + backlashDelta; }
      // Some witnesses sour on the actor
      const alive = (global.alivePlayers?.() || []).filter(p => p.id !== actor.id && p.id !== targetId);
      const participants = [actor.id, targetId];
      alive.forEach(w => {
        if(Math.random() < 0.4 && actor.affinity){
          actor.affinity[w.id] = (actor.affinity[w.id] ?? 0) + (backlashDelta * 0.5);
          participants.push(w.id);
        }
      });

      recordBacklashMemory(actor.id, targetId, 'rumor_caught', {
        action: 'spread_rumor',
        severity: 'medium',
        description: `${actorName} was caught spreading rumors about ${targetName}`
      });
      recordActionInMemory(actor.id, targetId, action, 'backlash');
      global.addLog?.(`${actorName} was caught spreading rumors about ${targetName}!`, 'danger');

      return { type: 'backlash', message: `You were caught! Your reputation took a hit.`, affinityChange: backlashDelta, caught: true, participants };
    } else {
      // Success: damage target reputation with random others
      const delta = -0.10 - Math.random() * 0.08;
      const alive = (global.alivePlayers?.() || []).filter(p => p.id !== actor.id && p.id !== targetId);
      const affectedIds = [];
      alive.forEach(other => {
        if(Math.random() < 0.5 && target.affinity){
          target.affinity[other.id] = (target.affinity[other.id] ?? 0) + delta;
          affectedIds.push(other.id);
        }
      });
      recordActionInMemory(actor.id, targetId, action, 'success');
      global.addLog?.(`${actorName} spread rumors about ${targetName}.`, 'muted');

      return { type: 'success', message: `Rumor spread successfully. ${targetName}'s reputation damaged.`, affinityChange: delta, caught: false, participants: [actor.id, targetId, ...affectedIds] };
    }
  }

  // High-impact: Expose Secret
  function processExposeSecret(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    if(!actor || !target){ return { type: 'error', message: 'Target not found' }; }

    const actorName = actor.name || `Player ${actor.id}`;
    const targetName = target.name || `Player ${targetId}`;
    const backlash = Math.random() < (action.backlashRisk ?? 0.5);
    const impactDelta = -0.20 - Math.random() * 0.15;

    const alive = (global.alivePlayers?.() || []).filter(p => p.id !== actor.id && p.id !== targetId);
    alive.forEach(other => { if(target.affinity){ target.affinity[other.id] = (target.affinity[other.id] ?? 0) + impactDelta; } });

    if(backlash){
      const backlashDelta = -0.12 - Math.random() * 0.08;
      alive.forEach(other => {
        if(Math.random() < 0.6 && actor.affinity){
          actor.affinity[other.id] = (actor.affinity[other.id] ?? 0) + backlashDelta;
        }
      });
      if(actor.affinity){
        actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + (-0.25 - Math.random() * 0.10);
      }
      recordBacklashMemory(actor.id, targetId, 'secret_exposed', {
        action: 'expose_secret',
        severity: 'high',
        description: `${actorName} exposed secrets about ${targetName}, but faced backlash`
      });
      recordActionInMemory(actor.id, targetId, action, 'backlash');
      global.addLog?.(`${actorName} exposed ${targetName}'s secrets! Both reputations damaged.`, 'danger');

      return { type: 'backlash', message: `Secret exposed but you're seen as untrustworthy. High cost!`, affinityChange: impactDelta, backlash: true, backlashDelta, participants: [actor.id, targetId, ...alive.map(p => p.id)] };
    } else {
      recordActionInMemory(actor.id, targetId, action, 'success');
      global.addLog?.(`${actorName} exposed damaging information about ${targetName}!`, 'warning');
      return { type: 'success', message: `Secret exposed successfully! ${targetName}'s reputation destroyed.`, affinityChange: impactDelta, backlash: false, participants: [actor.id, targetId, ...alive.map(p => p.id)] };
    }
  }

  // High-impact: Group Hangout (multi-target)
  function processGroupHangout(actorId, targetIds, action){
    const actor = global.getP?.(actorId);
    if(!actor){ return { type: 'error', message: 'Actor not found' }; }
    const participants = [actorId, ...targetIds];
    const boostDelta = 0.04 + Math.random() * 0.03;

    // Mutual small boost among all participants
    for(let i = 0; i < participants.length; i++){
      for(let j = i + 1; j < participants.length; j++){
        const p1 = global.getP?.(participants[i]);
        const p2 = global.getP?.(participants[j]);
        if(p1 && p2){
          if(p1.affinity){ p1.affinity[p2.id] = (p1.affinity[p2.id] ?? 0) + boostDelta; }
          if(p2.affinity){ p2.affinity[p1.id] = (p2.affinity[p1.id] ?? 0) + boostDelta; }
        }
      }
    }

    // Memory: use first target as representative
    if(targetIds[0] !== undefined){
      recordActionInMemory(actorId, targetIds[0], action, 'positive');
    }
    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    global.addLog?.(`${actorName} organized a group hangout with ${targetIds.length} others.`, 'ok');

    return { type: 'positive', message: `Group hangout was fun! Everyone bonded a little.`, affinityChange: boostDelta, participants, multiTarget: true };
  }

  // High-impact: Form Alliance
  function processFormAlliance(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    if(!actor || !target){ return { type: 'error', message: 'Target not found' }; }

    const actorName = actor.name || `Player ${actor.id}`;
    const targetName = target.name || `Player ${targetId}`;
    const currentAffinity = actor.affinity?.[targetId] ?? 0;
    const successThreshold = 0.15;
    const success = currentAffinity >= successThreshold;

    if(success){
      const allianceCreated = tryCreateAlliance(actorId, targetId);
      if(allianceCreated){
        const boostDelta = 0.10 + Math.random() * 0.05;
        if(actor.affinity){ actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + boostDelta; }
        if(target.affinity){ target.affinity[actorId] = (target.affinity[actorId] ?? 0) + boostDelta; }
        recordActionInMemory(actorId, targetId, action, 'success');
        global.addLog?.(`${actorName} and ${targetName} formed an alliance!`, 'success');
        return { type: 'success', message: `Alliance formed with ${targetName}! Stronger together.`, affinityChange: boostDelta, allianceFormed: true, participants: [actorId, targetId] };
      } else {
        recordActionInMemory(actorId, targetId, action, 'neutral');
        return { type: 'neutral', message: `Proposal accepted but alliance couldn't be formalized.`, participants: [actorId, targetId] };
      }
    } else {
      const delta = -0.08 - Math.random() * 0.05;
      if(actor.affinity){ actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + delta; }
      if(target.affinity){ target.affinity[actorId] = (target.affinity[actorId] ?? 0) + delta; }

      recordBetrayalRiskMemory(actorId, targetId, {
        action: 'form_alliance',
        reason: 'proposal_rejected',
        description: `${targetName} rejected ${actorName}'s alliance proposal`
      });
      recordActionInMemory(actorId, targetId, action, 'failure');
      global.addLog?.(`${targetName} rejected ${actorName}'s alliance proposal.`, 'warning');

      return { type: 'failure', message: `${targetName} rejected your proposal. Relationship strained.`, affinityChange: delta, allianceFormed: false, betrayalRisk: true, participants: [actorId, targetId] };
    }
  }

  function tryCreateAlliance(id1, id2){
    if(typeof global.formAlliance === 'function'){
      try {
        if(global.inSameAlliance?.(id1, id2)){ return false; }
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
  // MEMORY SYSTEM
  // ============================================================================
  function recordActionInMemory(actorId, targetId, action, outcome){
    const g = global.game; if(!g) return;
    if(!g.__socialManeuversMemory){ g.__socialManeuversMemory = { actions: [], relationships: new Map() }; }
    g.__socialManeuversMemory.actions.push({ week: g.week || 1, timestamp: Date.now(), actorId, targetId, action: action.id, outcome });
    if(g.__socialManeuversMemory.actions.length > 50){ g.__socialManeuversMemory.actions.shift(); }
    console.info('[social-maneuvers] Action recorded in memory');
  }
  function getPlayerMemory(actorId, targetId){
    const g = global.game;
    if(!g?.__socialManeuversMemory) return [];
    return g.__socialManeuversMemory.actions.filter(
      a => (a.actorId === actorId && a.targetId === targetId) ||
           (a.actorId === targetId && a.targetId === actorId)
    );
  }
  function recordBacklashMemory(actorId, targetId, eventType, details){
    const g = global.game; if(!g) return;
    if(!g.__backlashMemories){ g.__backlashMemories = []; }
    const actor = global.getP?.(actorId);
    g.__backlashMemories.push({
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetId,
      eventType,
      ...details
    });
    // Optional per-player memory log
    if(actor && actor.memoryLog){
      actor.memoryLog.push({
        week: g.week || 1,
        timestamp: Date.now(),
        event: eventType,
        targetId,
        details
      });
      if(actor.memoryLog.length > 100){ actor.memoryLog.shift(); }
    }
    console.info('[social-maneuvers] Backlash memory recorded:', eventType);
  }
  function recordBetrayalRiskMemory(actorId, targetId, details){
    const g = global.game; if(!g) return;
    if(!g.__betrayalRisks){ g.__betrayalRisks = []; }
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    g.__betrayalRisks.push({
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetId,
      ...details
    });
    [actor, target].forEach(player => {
      if(player && player.memoryLog){
        player.memoryLog.push({
          week: g.week || 1,
          timestamp: Date.now(),
          event: 'betrayal_risk',
          targetId: player.id === actorId ? targetId : actorId,
          details
        });
        if(player.memoryLog.length > 100){ player.memoryLog.shift(); }
      }
    });
    console.info('[social-maneuvers] BetrayalRisk memory recorded');
  }

  // ============================================================================
  // TRAITS & MODIFIERS (from PR #2 integration; safe no-ops if missing)
  // ============================================================================
  function calculateTraitModifiers(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    let affinityBonus = 0, successBonus = 0, appliedTraits = [];
    if(!actor || !target) return { affinityBonus, successBonus, appliedTraits };
    const hasTrait = global.hasTrait || (() => false);

    if(hasTrait(actorId, 'charismatic') && action.category === 'friendly'){
      affinityBonus += 0.02; successBonus += 0.2; appliedTraits.push('charismatic');
    }
    if(hasTrait(actorId, 'loyal')){
      const currentAffinity = actor.affinity?.[targetId] ?? 0;
      if(currentAffinity > 0.2){ affinityBonus += 0.015; appliedTraits.push('loyal'); }
    }
    if(hasTrait(actorId, 'deceptive')){
      if(action.category === 'aggressive'){ successBonus += 0.15; appliedTraits.push('deceptive'); }
      else if(action.category === 'friendly'){ successBonus -= 0.1; }
    }
    if(hasTrait(actorId, 'stubborn')){
      if(action.category === 'strategic'){ successBonus -= 0.2; }
      else if(action.category === 'aggressive'){ successBonus += 0.1; appliedTraits.push('stubborn'); }
    }
    if(hasTrait(targetId, 'gullible') && action.category === 'strategic'){
      affinityBonus += 0.02; successBonus += 0.15; appliedTraits.push('gullible-target');
    }
    if(hasTrait(targetId, 'paranoid')){
      affinityBonus -= 0.01; successBonus -= 0.1; appliedTraits.push('paranoid-target');
    }
    return { affinityBonus, successBonus, appliedTraits };
  }
  function calculateMemoryModifiers(actorId, targetId){
    let affinityBonus = 0, relevantMemories = [];
    const getMemoryLog = global.getMemoryLog || (() => []);
    const MEMORY_EVENTS = global.MEMORY_EVENTS || {};
    const actorMemories = getMemoryLog(actorId, { targetId });
    const countMemory = (mems, evt) => mems.filter(m => m.event === evt).length;

    const promisesMade      = countMemory(actorMemories, MEMORY_EVENTS.PROMISE_MADE);
    const alliancesFormed   = countMemory(actorMemories, MEMORY_EVENTS.ALLIANCE_FORMED);
    const secretsShared     = countMemory(actorMemories, MEMORY_EVENTS.SECRET_SHARED);
    const conflictsResolved = countMemory(actorMemories, MEMORY_EVENTS.CONFLICT_RESOLVED);
    const mediationSuccess  = countMemory(actorMemories, MEMORY_EVENTS.MEDIATION_SUCCESS);
    const promisesBroken    = countMemory(actorMemories, MEMORY_EVENTS.PROMISE_BROKEN);
    const betrayals         = countMemory(actorMemories, MEMORY_EVENTS.ALLIANCE_BETRAYED);
    const rumorsExposed     = countMemory(actorMemories, MEMORY_EVENTS.RUMOR_EXPOSED);
    const confrontations    = countMemory(actorMemories, MEMORY_EVENTS.PUBLIC_CONFRONTATION);

    const positiveCount = promisesMade + alliancesFormed + secretsShared + conflictsResolved + mediationSuccess;
    const negativeCount = promisesBroken + betrayals + rumorsExposed + confrontations;

    affinityBonus += positiveCount * 0.005;
    affinityBonus -= negativeCount * 0.01;
    affinityBonus = Math.max(-0.05, Math.min(0.05, affinityBonus));

    if(positiveCount > 0) relevantMemories.push(`${positiveCount} positive`);
    if(negativeCount > 0) relevantMemories.push(`${negativeCount} negative`);
    return { affinityBonus, positiveCount, negativeCount, relevantMemories };
  }
  function applyTraitEffects(actorId, targetId, action){
    // Placeholder hook - complex effects should be handled in evaluation or handlers
    console.info('[social-maneuvers] Trait effects evaluated for', action.id);
  }

  // Extended Telemetry for special actions
  function recordSpecialTelemetry(actorId, targetIds, action, outcome){
    const g = global.game; if(!g) return;
    if(!g.__socialTelemetry){ g.__socialTelemetry = []; }
    const entry = {
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetIds: Array.isArray(targetIds) ? targetIds : [targetIds],
      actionId: action.id,
      actionLabel: action.label,
      energyCost: action.costs?.energy ?? action.cost ?? 0,
      infoCost: action.costs?.information ?? 0,
      outcomeType: outcome?.type,
      participants: outcome?.participants || [actorId, ...(Array.isArray(targetIds)?targetIds:[targetIds])],
      deltas: {}
    };
    if(outcome?.affinityChange !== undefined) entry.deltas.affinity = outcome.affinityChange;
    if(outcome?.backlashDelta !== undefined) entry.deltas.backlash = outcome.backlashDelta;
    if(outcome?.allianceFormed !== undefined) entry.allianceFormed = outcome.allianceFormed;
    if(outcome?.betrayalRisk !== undefined) entry.betrayalRisk = outcome.betrayalRisk;
    if(outcome?.caught !== undefined) entry.caught = outcome.caught;

    g.__socialTelemetry.push(entry);
    if(g.__socialTelemetry.length > 200) g.__socialTelemetry.shift();
    console.info('[social-maneuvers] Telemetry recorded (extended):', entry);
  }

  // ============================================================================
  // UI RENDERING (HUD + Dynamic Menu + History + Feedback + Multi-select)
  // ============================================================================
  function renderSocialManeuversUI(container, playerId){
    if(!isEnabled()){ console.info('[social-maneuvers] UI render requested but feature is DISABLED'); return; }
    console.info('[social-maneuvers] ✓ Rendering Social Maneuvers UI for player', playerId);
    if(!container){ console.warn('[social-maneuvers] No container provided for UI'); return; }

    const resources = SocialResources.getAll(playerId);
    const alivePlayers = global.alivePlayers?.() || [];
    const otherPlayers = alivePlayers.filter(p => p.id !== playerId);

    let selectedPlayers = []; // supports multi-target
    let selectedAction = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'social-maneuvers-panel';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Social Maneuvers Interface');

    const resourcesHUD = createResourcesHUD(resources);
    wrapper.appendChild(resourcesHUD);

    // Player selection
    if(otherPlayers.length > 0){
      const playerSection = createPlayerSelection(playerId, otherPlayers, (players) => {
        selectedPlayers = players;
        updateActionsList();
        updateHistorySection();
      });
      wrapper.appendChild(playerSection);
    }

    // History section (collapsible, updates on target change)
    const historySection = document.createElement('div');
    historySection.className = 'social-history-section';
    historySection.style.display = 'none';
    wrapper.appendChild(historySection);
    function updateHistorySection(){
      historySection.innerHTML = '';
      if(selectedPlayers.length === 0){ historySection.style.display = 'none'; return; }
      historySection.style.display = 'block';
      const historyContent = createHistoryUI ? createHistoryUI(playerId, selectedPlayers[0].id) : document.createElement('div');
      if(!historyContent || !historyContent.classList){ // fallback text
        const d = document.createElement('div'); d.textContent = 'History unavailable'; historySection.appendChild(d);
      } else {
        historySection.appendChild(historyContent);
      }
    }

    // Actions menu
    const actionsSection = document.createElement('div');
    actionsSection.className = 'social-action-select';
    actionsSection.innerHTML = `<div class="social-section-title">Select Action</div>`;
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
        const extraTargets = selectedPlayers.slice(1).map(p => p.id);
        const result = executeAction(playerId, primaryTarget.id, selectedAction.id, extraTargets);
        showFeedback(result, playerId);
        setTimeout(() => { container.innerHTML = ''; renderSocialManeuversUI(container, playerId); }, 2500);
      }
    };
    wrapper.appendChild(executeBtn);

    function updateActionsList(){
      actionsList.innerHTML = '';
      if(selectedPlayers.length === 0){
        const emptyState = document.createElement('div');
        emptyState.className = 'social-empty-state';
        emptyState.textContent = 'Select player(s) to see available actions';
        actionsList.appendChild(emptyState);
        executeBtn.disabled = true;
        return;
      }
      const availableActions = getAvailableActions(playerId, selectedPlayers[0].id);
      availableActions.forEach(action => {
        const actionItem = createActionItem(action, resources, selectedPlayers[0], (selected) => {
          selectedAction = selected;
          actionsList.querySelectorAll('.social-action-item').forEach(item => { item.classList.remove('selected'); });
          actionItem.classList.add('selected');

          // Toggle multi-select mode on the player picker
          updatePlayerSelectionMode(selected.multiTarget, selected.minTargets, selected.maxTargets);

          const isLocked = action.evaluation?.states?.locked || false;
          executeBtn.disabled = isLocked || !action.canAfford;
        });
        actionsList.appendChild(actionItem);
      });
    }

    function updatePlayerSelectionMode(multiTarget, minTargets, maxTargets){
      const playerSection = wrapper.querySelector('.social-player-select');
      if(!playerSection) return;
      if(multiTarget){
        playerSection.classList.add('multi-select-mode');
        playerSection.setAttribute('data-min-targets', String(minTargets || 2));
        playerSection.setAttribute('data-max-targets', String(maxTargets || 4));

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
        // If multi selected earlier, reduce to one (keep first)
        if(selectedPlayers.length > 1) selectedPlayers = [selectedPlayers[0]];
      }
    }

    container.appendChild(wrapper);
    updateActionsList();
  }

  // HUD rendering
  function createResourcesHUD(resources){
    const hud = document.createElement('div');
    hud.className = 'social-resources-hud';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');
    for(const [type, config] of Object.entries(RESOURCE_CONFIG)){
      const display = createResourceDisplay(type, resources[type], config.max, config.description, config.examples, getResourceIcon(type));
      hud.appendChild(display);
    }
    return hud;
  }
  function createResourceDisplay(type, current, max, description, examples, icon){
    const container = document.createElement('div');
    container.className = `social-resource-display social-resource-${type}`;
    container.setAttribute('data-tooltip', `${description}\n\nExamples: ${examples}`);
    const header = document.createElement('div');
    header.className = 'social-resource-header';
    header.innerHTML = `<span class="social-resource-icon">${icon}</span> <span class="social-resource-label">${type.charAt(0).toUpperCase() + type.slice(1)}</span>`;
    container.appendChild(header);
    container.innerHTML += `<div class="social-resource-value"><span class="current">${current}</span>/<span class="max">${max}</span></div>`;
    const progressBar = document.createElement('div');
    progressBar.className = 'social-resource-progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'social-resource-progress-fill';
    progressFill.style.width = `${max > 0 ? (current / max) * 100 : 0}%`;
    progressBar.appendChild(progressFill);
    container.appendChild(progressBar);
    return container;
  }
  function getResourceIcon(type){ return { energy: '⚡', influence: '🎭', information: '🔍' }[type] || type; }

  // Player selection (supports single and multi-select modes)
  function createPlayerSelection(playerId, players, onSelect){
    const container = document.createElement('div');
    container.className = 'social-player-select';

    const title = document.createElement('div');
    title.className = 'social-section-title';
    title.textContent = 'Select Target';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'social-player-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Select target player(s)');

    const actor = global.getP?.(playerId);
    let selectedPlayers = [];

    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'social-player-card';
      card.setAttribute('data-player-id', player.id);
      card.setAttribute('tabindex', '0');

      // Name
      const nameDiv = document.createElement('div');
      nameDiv.className = 'player-name';
      nameDiv.textContent = player.name || `Player ${player.id}`;
      card.appendChild(nameDiv);

      // Affinity
      if(actor){
        const affinity = actor.affinity?.[player.id] ?? 0;
        const affinityDiv = document.createElement('div');
        affinityDiv.className = 'player-affinity';
        affinityDiv.style.cssText = 'font-size:0.75em;opacity:0.8;margin-top:4px;';
        let affinityLabel = 'Neutral';
        if(affinity >= 0.28) affinityLabel = 'Allies';
        else if(affinity >= 0.12) affinityLabel = 'Friendly';
        else if(affinity <= -0.28) affinityLabel = 'Enemies';
        else if(affinity <= -0.12) affinityLabel = 'Strained';
        affinityDiv.textContent = `${affinityLabel} (${(affinity * 100).toFixed(0)}%)`;
        card.appendChild(affinityDiv);
      }

      // Click behavior
      card.onclick = () => {
        const multi = container.classList.contains('multi-select-mode');
        if(multi){
          const maxTargets = parseInt(container.getAttribute('data-max-targets') || '10', 10);
          const isSelected = card.classList.contains('selected');
          if(isSelected){
            card.classList.remove('selected');
            selectedPlayers = selectedPlayers.filter(p => p.id !== player.id);
          } else {
            if(selectedPlayers.length < maxTargets){
              card.classList.add('selected');
              selectedPlayers.push(player);
            }
          }
        } else {
          grid.querySelectorAll('.social-player-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedPlayers = [player];
        }
        onSelect(selectedPlayers);
      };

      card.addEventListener('keypress', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); card.onclick(); } });

      grid.appendChild(card);
    });

    container.appendChild(grid);
    return container;
  }

  // Action item rendering (dynamic, context-aware, shows resource costs)
  function createActionItem(action, resources, targetPlayer, onSelect){
    const item = document.createElement('div');
    item.className = 'social-action-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const canAfford = action.canAfford;
    const evaluation = action.evaluation;
    const states = evaluation?.states || {};
    const isLocked = states.locked || !evaluation?.available;
    const isRisky = states.risky;
    const isBoosted = states.boosted;
    const isDiscounted = states.discounted;

    if(isLocked){
      item.classList.add('locked');
      item.setAttribute('aria-disabled', 'true');
    } else if(!canAfford){
      item.classList.add('disabled');
      item.setAttribute('aria-disabled', 'true');
    }
    if(isRisky) item.classList.add('risky');
    if(isBoosted) item.classList.add('boosted');
    if(isDiscounted) item.classList.add('discounted');

    // Header + Badges + Resource Costs
    const costsBadges = [];
    if((action.costs?.energy ?? 0) > 0){
      const affordable = resources.energy >= action.costs.energy;
      costsBadges.push(`<span class="social-cost-badge energy ${affordable ? 'affordable' : 'expensive'}">⚡${action.costs.energy}</span>`);
    }
    if((action.costs?.information ?? 0) > 0){
      const affordable = resources.information >= action.costs.information;
      costsBadges.push(`<span class="social-cost-badge information ${affordable ? 'affordable' : 'expensive'}">🔍${action.costs.information}</span>`);
    }
    if((action.costs?.influence ?? 0) > 0){
      const affordable = resources.influence >= action.costs.influence;
      costsBadges.push(`<span class="social-cost-badge influence ${affordable ? 'affordable' : 'expensive'}">🎭${action.costs.influence}</span>`);
    }

    item.innerHTML = `<div class="social-action-header">
      <div class="social-action-name">${action.label}</div>
      <div class="social-action-badges" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        ${isLocked ? '<span class="badge badge-locked" title="Locked">🔒</span>' : ''}
        ${isBoosted ? '<span class="badge badge-boosted" title="Boosted success chance">⬆️</span>' : ''}
        ${isDiscounted ? '<span class="badge badge-discounted" title="Reduced cost">💰</span>' : ''}
        ${isRisky ? '<span class="badge badge-risky" title="Higher backlash on failure">⚠️</span>' : ''}
        ${costsBadges.join('')}
      </div>
     </div>`;

    item.innerHTML += `<div class="social-action-description">${action.description}</div>`;

    if(isLocked && evaluation){
      item.innerHTML += `<div class="social-action-lock-reason" style="font-size:0.75em;color:#ff6666;margin-top:4px;">${evaluation.gateReasons?.join('; ') || 'Requirements not met'}</div>`;
    }
    if(evaluation && !isLocked){
      const tooltip = createChanceTooltip(evaluation);
      item.appendChild(tooltip);
      item.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
      item.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    }

    item.innerHTML += `<span class="social-action-category ${action.category}">${action.category}</span>`;

    if(!isLocked && canAfford){
      item.onclick = () => onSelect(action);
      item.addEventListener('keypress', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); onSelect(action); } });
    }
    return item;
  }

  function createChanceTooltip(evaluation){
    const tooltip = document.createElement('div');
    tooltip.className = 'social-action-tooltip';
    tooltip.style.cssText = 'display:none;position:absolute;background:#1a1a2e;border:1px solid #444;border-radius:6px;padding:8px;z-index:1000;min-width:200px;box-shadow:0 4px 8px rgba(0,0,0,0.3);';
    tooltip.innerHTML = `<div style="font-weight:bold;margin-bottom:6px;color:#f7b955;">Success Chance Breakdown</div>
      <div style="font-size:0.85em;margin:2px 0;">Base: <strong>${(evaluation.baseChance * 100).toFixed(0)}%</strong></div>
      ${evaluation.modifiers?.length ? '<div style="border-top:1px solid #333;margin:6px 0 4px 0;"></div>' : ''}
      ${evaluation.modifiers?.map(mod => `<div style="font-size:0.85em;margin:2px 0;">${mod.label}: <span style="color:${mod.value >= 0 ? '#66ff66' : '#ff6666'}">${mod.value >= 0 ? '+' : ''}${(mod.value * 100).toFixed(0)}%</span></div>`).join('') || ''}
      <div style="border-top:1px solid #333;margin:6px 0 4px 0;"></div>
      <div style="font-size:0.9em;margin:4px 0;font-weight:bold;">Final Chance: <span style="color:#66ff66">${(evaluation.finalChance * 100).toFixed(0)}%</span></div>`;
    return tooltip;
  }

  // Feedback
  function showFeedback(result, playerId){
    const existing = document.querySelector('.social-feedback-panel'); if(existing){ existing.remove(); }
    if(!result.success){
      let message = result.message || result.reason;
      if(result.gateReasons?.length) message = result.gateReasons.join('; ');
      const panel = createFeedbackPanel('negative', 'Action Failed', message);
      document.body.appendChild(panel); setTimeout(() => panel.remove(), 3000);
      return;
    }
    const outcome = result.outcome;
    const succeeded = result.succeeded;
    const telemetry = result.telemetry;
    let feedbackType = outcome.type;
    if(!succeeded) feedbackType = 'negative';
    let message = outcome.message;
    if(telemetry) message += `\n${succeeded ? '✓' : '✗'} ${(telemetry.finalChance * 100).toFixed(0)}% chance (rolled ${(telemetry.chanceRoll * 100).toFixed(0)}%)`;
    const panel = createFeedbackPanel(feedbackType, result.action.label, message);
    if(result.resources){
      const resourcesDiv = document.createElement('div');
      resourcesDiv.className = 'feedback-resources';
      resourcesDiv.innerHTML = `<small>⚡${result.resources.energy} 🎭${result.resources.influence} 🔍${result.resources.information}</small>`;
      panel.appendChild(resourcesDiv);
    }
    document.body.appendChild(panel);
    panel.style.animation = 'slideInRight 0.4s ease';
    setTimeout(() => { panel.style.animation = 'slideOutRight 0.4s ease'; setTimeout(() => panel.remove(), 400); }, 3000);
  }
  function createFeedbackPanel(type, title, message){
    const panel = document.createElement('div');
    panel.className = `social-feedback-panel ${type}`;
    panel.setAttribute('role', 'alert');
    panel.setAttribute('aria-live', 'assertive');
    panel.innerHTML = `<div class="social-feedback-title">${title}</div><div class="social-feedback-message">${message}</div>`;
    return panel;
  }

  // ============================================================================
  // HISTORY UI (collapsible) - available when createHistoryUI is defined elsewhere
  // (Kept hook only; actual implementation provided in previous PR integration)
  // ============================================================================

  // ============================================================================
  // PHASE INTEGRATION
  // ============================================================================
  function onSocialPhaseStart(){
    if(!isEnabled()){ console.info('[social-maneuvers] Phase start called but feature is DISABLED'); return; }
    console.info('[social-maneuvers] ✓ startPhase() triggered');
    const alivePlayers = global.alivePlayers?.() || [];
    alivePlayers.forEach(p => { SocialResources.init(p.id); SocialResources.resetWeekly(p.id); });
    console.info(`[social-maneuvers] Resources initialized for ${alivePlayers.length} players`);
  }
  function onSocialPhaseEnd(){
    if(!isEnabled()) { console.info('[social-maneuvers] Phase end called but feature is DISABLED'); return; }
    console.info('[social-maneuvers] ✓ Social phase complete');
  }

  // ============================================================================
  // GLOBAL EXPORTS
  // ============================================================================
  global.SocialManeuvers = {
    isEnabled, SocialResources,
    getActionById, getAvailableActions, executeAction,
    recordActionInMemory, getPlayerMemory,
    renderSocialManeuversUI, onSocialPhaseStart, onSocialPhaseEnd,
    // Modifiers/hooks
    calculateTraitModifiers, calculateMemoryModifiers,
    // Constants
    DEFAULT_ENERGY, MAX_ENERGY, SOCIAL_ACTIONS, RESOURCE_CONFIG
  };
  global.SocialManager = global.SocialManeuvers;
  Object.defineProperty(global, 'USE_SOCIAL_MANEUVERS', {
    get: function() { return isEnabled(); },
    set: function(value) {
      initDefaultFlag();
      const oldValue = global.game.cfg.enableSocialManeuvers;
      global.game.cfg.enableSocialManeuvers = !!value;
      const newValue = global.game.cfg.enableSocialManeuvers;
      console.info(`[social-maneuvers] Flag changed: ${oldValue} → ${newValue} (USE_SOCIAL_MANEUVERS=${newValue})`);
    },
    enumerable: true, configurable: true
  });

  initDefaultFlag();
  console.info('[social-maneuvers] ✓ Module loaded successfully');
  console.info('[social-maneuvers] ✓ Enabled by default (enableSocialManeuvers=true)');
  console.info('[social-maneuvers] Runtime control: window.USE_SOCIAL_MANEUVERS = true/false');
  console.info('[social-maneuvers] Current state: USE_SOCIAL_MANEUVERS =', isEnabled());
})(window);