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
  const RESOURCE_CONFIG = {
    energy:      { default: 3, max: 5, weeklyReset: true,  carryover: false, description: 'Energy represents your social stamina.', examples: 'Used for conversations, strategizing.' },
    influence:   { default: 2, max: 10, weeklyReset: false, carryover: true, description: 'Influence is your social capital.', examples: 'Earned by success, powers maneuvers.' },
    information: { default: 1, max: 8, weeklyReset: false, carryover: true, description: 'Information is strategic knowledge.', examples: 'Earned through observation and interrogation.' }
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
      for(const [type, cost] of Object.entries(costs)) {
        if(cost > 0 && this.get(playerId, type) < cost) return { success: false, insufficient: type };
      }
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
  // ACTION DEFINITIONS & DYNAMIC MENU
  // ============================================================================
  const SOCIAL_ACTIONS = [
    { id: 'smalltalk', label: 'Small Talk', cost: 1, costs: { energy: 1, influence: 0, information: 0 }, rewards: { influence: 0.5 }, description: 'Light conversation to build rapport', category: 'friendly' },
    { id: 'strategize', label: 'Strategize', cost: 2, costs: { energy: 2, influence: 1, information: 0 }, rewards: { information: 1 }, description: 'Discuss game plans and alliances', category: 'strategic' },
    { id: 'confide', label: 'Confide', cost: 2, costs: { energy: 2, influence: 0, information: 0 }, rewards: { influence: 1 }, description: 'Share personal thoughts and build trust', category: 'friendly' },
    { id: 'interrogate', label: 'Interrogate', cost: 2, costs: { energy: 2, influence: 1, information: 0 }, rewards: { information: 2 }, description: 'Press for information about plans', category: 'aggressive' },
    { id: 'compliment', label: 'Compliment', cost: 1, costs: { energy: 1, influence: 0, information: 0 }, rewards: { influence: 0.5 }, description: 'Give genuine praise', category: 'friendly' },
    { id: 'confront', label: 'Confront', cost: 3, costs: { energy: 3, influence: 2, information: 0 }, rewards: { information: 1 }, description: 'Address conflicts directly', category: 'aggressive' },
    { id: 'mediate', label: 'Mediate', cost: 2, costs: { energy: 2, influence: 1, information: 1 }, rewards: { influence: 2 }, description: 'Help resolve tensions between others', category: 'strategic' },
    { id: 'observe', label: 'Observe', cost: 1, costs: { energy: 1, influence: 0, information: 0 }, rewards: { information: 1 }, description: 'Watch and listen quietly', category: 'strategic' }
  ];
  function getActionById(actionId){ return SOCIAL_ACTIONS.find(a => a.id === actionId); }

  function getAvailableActions(playerId, targetId){
    const energy = SocialResources.get(playerId, 'energy');
    const actor = global.getP?.(playerId);
    const target = targetId ? global.getP?.(targetId) : null;
    return SOCIAL_ACTIONS.map(action => {
      let canAfford = SocialResources.canAfford(playerId, action.costs);
      let evaluation = null;
      if (target && global.SocialActionConfig) {
        evaluation = global.SocialActionConfig.getActionEvaluation(action.id, actor, target, action);
      }
      return { ...action, canAfford, evaluation };
    });
  }

  // ============================================================================
  // ACTION EXECUTION & FEEDBACK
  // ============================================================================
  function executeAction(actorId, targetId, actionId){
    if(!isEnabled()){ console.warn('[social-maneuvers] System is disabled'); return { success: false, reason: 'disabled' }; }
    const action = getActionById(actionId);
    if(!action){ console.warn('[social-maneuvers] Unknown action:', actionId); return { success: false, reason: 'unknown_action' }; }
    const actor = global.getP?.(actorId); const target = global.getP?.(targetId);
    if(!actor || !target){ return { success: false, reason: 'player_not_found' }; }

    let evaluation = null, chanceRoll = Math.random(), succeeded = true;
    if(global.SocialActionConfig){
      evaluation = global.SocialActionConfig.getActionEvaluation(actionId, actor, target, action);
      if(!evaluation.available){
        return { success: false, reason: 'gated', message: evaluation.gateReasons.join('; '), gateReasons: evaluation.gateReasons };
      }
      succeeded = chanceRoll < evaluation.finalChance;
    }

    const spendResult = SocialResources.spend(actorId, action.costs);
    if(!spendResult.success){
      return { success: false, reason: 'insufficient_resources', insufficient: spendResult.insufficient, message: `Not enough ${spendResult.insufficient}` };
    }

    // Telemetry
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
      energyRemaining: SocialResources.get(actorId, 'energy')
    };
    if(!global.game.__socialManeuversTelemetry) global.game.__socialManeuversTelemetry = [];
    global.game.__socialManeuversTelemetry.push(telemetry);
    if(global.game.__socialManeuversTelemetry.length > 100) global.game.__socialManeuversTelemetry.shift();

    // Outcome
    const outcome = processActionOutcome(actorId, targetId, action, succeeded, evaluation);

    return { success: true, action, outcome, evaluation, succeeded, telemetry, resources: SocialResources.getAll(actorId) };
  }

  // ============================================================================
  // OUTCOME PROCESSING (with Traits & Memory Modifiers)
  // ============================================================================
  function processActionOutcome(actorId, targetId, action, succeeded, evaluation){
    const actor = global.getP?.(actorId); const target = global.getP?.(targetId);
    if(!actor || !target){ return { type: 'error', message: 'Player not found' }; }
    let affinityChange = 0, outcomeType = 'neutral', message = '';

    if(succeeded){
      switch(action.category){
        case 'friendly': affinityChange = 0.05 + Math.random() * 0.05; outcomeType = 'positive'; message = `${action.label} went well!`; break;
        case 'strategic': affinityChange = 0.03 + Math.random() * 0.07; outcomeType = 'positive'; message = `${action.label} was productive.`; break;
        case 'aggressive': affinityChange = -0.02 + Math.random() * 0.04; outcomeType = 'neutral'; message = `${action.label} got your point across.`; break;
        default: affinityChange = 0.02; message = `${action.label} completed.`;
      }
    } else {
      const states = evaluation?.states || {}; const backlashMultiplier = states.risky ? 1.5 : 1.0;
      switch(action.category){
        case 'friendly': affinityChange = -0.03 * backlashMultiplier; outcomeType = 'negative'; message = `${action.label} felt forced.`; break;
        case 'strategic': affinityChange = -0.05 * backlashMultiplier; outcomeType = 'negative'; message = `${action.label} backfired.`; break;
        case 'aggressive': affinityChange = -0.08 * backlashMultiplier; outcomeType = 'negative'; message = `${action.label} created serious tension!`; break;
        default: affinityChange = -0.04 * backlashMultiplier; message = `${action.label} didn't go as planned.`;
      }
    }
    // Trait-based modifiers
    const traitModifiers = calculateTraitModifiers(actorId, targetId, action);
    affinityChange += traitModifiers.affinityBonus;
    // Memory-based modifiers
    const memoryModifiers = calculateMemoryModifiers(actorId, targetId);
    affinityChange += memoryModifiers.affinityBonus;
    // Final outcome type
    if(affinityChange > 0.05) outcomeType = 'positive';
    else if(affinityChange < -0.05) outcomeType = 'negative';
    else outcomeType = 'neutral';
    if(actor.affinity && typeof actor.affinity === 'object'){ actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + affinityChange; }
    recordActionInMemory(actorId, targetId, action, outcomeType);
    applyTraitEffects(actorId, targetId, action);
    return { type: outcomeType, message, affinityChange, traitModifiers, memoryModifiers, succeeded };
  }

  // ============================================================================
  // TRAITS & MEMORY SYSTEM
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
      if(action.category === 'strategic'){ successBonus -= 0.2; appliedTraits.push('stubborn'); }
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
    const actorMemories = getMemoryLog(actorId, { targetId: targetId });
    const targetMemories = getMemoryLog(targetId, { targetId: actorId });
    const countMemory = (memories, eventType) => memories.filter(m => m.event === eventType).length;
    const promisesMade = countMemory(actorMemories, MEMORY_EVENTS.PROMISE_MADE);
    const alliancesFormed = countMemory(actorMemories, MEMORY_EVENTS.ALLIANCE_FORMED);
    const secretsShared = countMemory(actorMemories, MEMORY_EVENTS.SECRET_SHARED);
    const conflictsResolved = countMemory(actorMemories, MEMORY_EVENTS.CONFLICT_RESOLVED);
    const mediationSuccesses = countMemory(actorMemories, MEMORY_EVENTS.MEDIATION_SUCCESS);
    const promisesBroken = countMemory(actorMemories, MEMORY_EVENTS.PROMISE_BROKEN);
    const betrayals = countMemory(actorMemories, MEMORY_EVENTS.ALLIANCE_BETRAYED);
    const rumorsExposed = countMemory(actorMemories, MEMORY_EVENTS.RUMOR_EXPOSED);
    const confrontations = countMemory(actorMemories, MEMORY_EVENTS.PUBLIC_CONFRONTATION);

    const positiveCount = promisesMade + alliancesFormed + secretsShared + conflictsResolved + mediationSuccesses;
    const negativeCount = promisesBroken + betrayals + rumorsExposed + confrontations;
    affinityBonus += positiveCount * 0.005;
    affinityBonus -= negativeCount * 0.01;
    affinityBonus = Math.max(-0.05, Math.min(0.05, affinityBonus));
    if(positiveCount > 0) relevantMemories.push(`${positiveCount} positive`);
    if(negativeCount > 0) relevantMemories.push(`${negativeCount} negative`);
    return { affinityBonus, positiveCount, negativeCount, relevantMemories };
  }
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
  function applyTraitEffects(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    // Placeholder for trait logic
    console.info('[social-maneuvers] Trait effects would apply here');
  }

  // ============================================================================
  // UI RENDERING (HUD + Dynamic Menu + History + Feedback)
  // ============================================================================
  function renderSocialManeuversUI(container, playerId){
    if(!isEnabled()){ console.info('[social-maneuvers] UI render requested but feature is DISABLED'); return; }
    console.info('[social-maneuvers] ✓ Rendering Social Maneuvers UI for player', playerId);
    if(!container){ console.warn('[social-maneuvers] No container provided for UI'); return; }

    const resources = SocialResources.getAll(playerId);
    const alivePlayers = global.alivePlayers?.() || [];
    const otherPlayers = alivePlayers.filter(p => p.id !== playerId);

    let selectedPlayer = null, selectedAction = null;
    const wrapper = document.createElement('div');
    wrapper.className = 'social-maneuvers-panel';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Social Maneuvers Interface');
    const resourcesHUD = createResourcesHUD(resources);
    wrapper.appendChild(resourcesHUD);

    // Player selection
    if(otherPlayers.length > 0){
      const playerSection = createPlayerSelection(playerId, otherPlayers, (player) => {
        selectedPlayer = player;
        updateActionsList();
        updateHistorySection();
      });
      wrapper.appendChild(playerSection);
    }

    // History section (collapsible)
    const historySection = document.createElement('div');
    historySection.className = 'social-history-section';
    historySection.style.display = 'none';
    wrapper.appendChild(historySection);

    function updateHistorySection(){
      historySection.innerHTML = '';
      if(!selectedPlayer){ historySection.style.display = 'none'; return; }
      historySection.style.display = 'block';
      const historyContent = createHistoryUI(playerId, selectedPlayer.id);
      historySection.appendChild(historyContent);
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
      if(selectedPlayer && selectedAction){
        const result = executeAction(playerId, selectedPlayer.id, selectedAction.id);
        showFeedback(result, playerId);
        setTimeout(() => { container.innerHTML = ''; renderSocialManeuversUI(container, playerId); }, 2500);
      }
    };
    wrapper.appendChild(executeBtn);

    // Update actions list
    function updateActionsList(){
      actionsList.innerHTML = '';
      if(!selectedPlayer){
        const emptyState = document.createElement('div');
        emptyState.className = 'social-empty-state';
        emptyState.textContent = 'Select a player to see available actions';
        actionsList.appendChild(emptyState);
        executeBtn.disabled = true;
        return;
      }
      const availableActions = getAvailableActions(playerId, selectedPlayer.id);
      availableActions.forEach(action => {
        const actionItem = createActionItem(action, resources, selectedPlayer, (selected) => {
          selectedAction = selected;
          actionsList.querySelectorAll('.social-action-item').forEach(item => { item.classList.remove('selected'); });
          actionItem.classList.add('selected');
          const isLocked = action.evaluation?.states?.locked || false;
          executeBtn.disabled = isLocked || !action.canAfford;
        });
        actionsList.appendChild(actionItem);
      });
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
    progressFill.style.width = `${(current / max) * 100}%`;
    progressBar.appendChild(progressFill);
    container.appendChild(progressBar);
    return container;
  }
  function getResourceIcon(type){ return { energy: '⚡', influence: '🎭', information: '🔍' }[type] || type; }

  // Player selection
  function createPlayerSelection(playerId, players, onSelect){
    const container = document.createElement('div');
    container.className = 'social-player-select';
    container.innerHTML = `<div class="social-section-title">Select Target</div>`;
    const grid = document.createElement('div');
    grid.className = 'social-player-grid';
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Select target player');
    const actor = global.getP?.(playerId);
    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'social-player-card';
      card.innerHTML = `<div class="player-name">${player.name || `Player ${player.id}`}</div>`;
      if(actor){
        const affinity = actor.affinity?.[player.id] ?? 0;
        let affinityLabel = 'Neutral';
        if(affinity >= 0.28) affinityLabel = 'Allies';
        else if(affinity >= 0.12) affinityLabel = 'Friendly';
        else if(affinity <= -0.28) affinityLabel = 'Enemies';
        else if(affinity <= -0.12) affinityLabel = 'Strained';
        card.innerHTML += `<div class="player-affinity" style="font-size:0.75em;opacity:0.8;margin-top:4px;">${affinityLabel} (${(affinity * 100).toFixed(0)}%)</div>`;
      }
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', 'false');
      card.setAttribute('tabindex', '0');
      card.onclick = () => {
        grid.querySelectorAll('.social-player-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-checked', 'false'); });
        card.classList.add('selected'); card.setAttribute('aria-checked', 'true'); onSelect(player);
      };
      card.addEventListener('keypress', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); card.onclick(); } });
      grid.appendChild(card);
    });
    container.appendChild(grid);
    return container;
  }

  // Action item rendering (dynamic, context-aware)
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

    // Header
    item.innerHTML = `<div class="social-action-header">
      <div class="social-action-name">${action.label}</div>
      <div class="social-action-badges" style="display:flex;gap:4px;align-items:center;">
        ${isLocked ? '<span class="badge badge-locked" title="Locked">🔒</span>' : ''}
        ${isBoosted ? '<span class="badge badge-boosted" title="Boosted success chance">⬆️</span>' : ''}
        ${isDiscounted ? '<span class="badge badge-discounted" title="Reduced cost">💰</span>' : ''}
        ${isRisky ? '<span class="badge badge-risky" title="Higher backlash on failure">⚠️</span>' : ''}
      </div>
      <div class="social-action-cost ${canAfford ? 'affordable' : 'expensive'}">⚡ ${action.cost}</div>
     </div>`;

    item.innerHTML += `<div class="social-action-description">${action.description}</div>`;
    if(isLocked && evaluation){
      item.innerHTML += `<div class="social-action-lock-reason" style="font-size:0.75em;color:#ff6666;margin-top:4px;">${evaluation.gateReasons.join('; ') || 'Requirements not met'}</div>`;
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

  // Collapsible history UI
  function createHistoryUI(playerId, targetId){
    const container = document.createElement('div');
    container.className = 'social-history-container';
    const header = document.createElement('div');
    header.className = 'social-history-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');
    const title = document.createElement('div');
    title.className = 'social-history-title';
    const targetName = global.safeName?.(targetId) || `Player ${targetId}`;
    title.textContent = `History with ${targetName}`;
    header.appendChild(title);
    const toggle = document.createElement('div');
    toggle.className = 'social-history-toggle';
    toggle.textContent = '▼';
    header.appendChild(toggle);
    container.appendChild(header);
    const content = document.createElement('div');
    content.className = 'social-history-content collapsed';
    content.setAttribute('aria-hidden', 'true');
    // Get memory log, recent actions
    const getMemoryLog = global.getMemoryLog || (() => []);
    const MEMORY_EVENTS = global.MEMORY_EVENTS || {};
    const memories = getMemoryLog(playerId, { targetId: targetId });
    const recentActions = getPlayerMemory(playerId, targetId);
    const summary = document.createElement('div');
    summary.className = 'social-history-summary';
    const eventCounts = {};
    const eventOrder = [
      'AllianceFormed', 'PromiseMade', 'SecretShared', 'ConflictResolved', 'MediationSuccess',
      'AllianceBetrayed', 'PromiseBroken', 'RumorExposed', 'PublicConfrontation', 'RumorBelieved'
    ];
    memories.forEach(m => { eventCounts[m.event] = (eventCounts[m.event] || 0) + 1; });
    if(Object.keys(eventCounts).length === 0 && recentActions.length === 0){
      summary.innerHTML = '<p class="social-history-empty">No significant history yet.</p>';
    } else {
      const summaryTitle = document.createElement('div');
      summaryTitle.className = 'social-history-section-title';
      summaryTitle.textContent = 'Key Events';
      summary.appendChild(summaryTitle);
      const eventList = document.createElement('ul');
      eventList.className = 'social-history-event-list';
      eventOrder.forEach(eventType => {
        const count = eventCounts[eventType];
        if(count){
          const item = document.createElement('li');
          item.className = 'social-history-event-item';
          const isPositive = ['AllianceFormed', 'PromiseMade', 'SecretShared', 'ConflictResolved', 'MediationSuccess'].includes(eventType);
          item.classList.add(isPositive ? 'positive-event' : 'negative-event');
          const eventLabel = eventType.replace(/([A-Z])/g, ' $1').trim();
          item.textContent = `${eventLabel} (${count}x)`;
          eventList.appendChild(item);
        }
      });
      if(eventList.children.length > 0){ summary.appendChild(eventList); }
    }
    content.appendChild(summary);
    if(recentActions.length > 0){
      const actionsSection = document.createElement('div');
      actionsSection.className = 'social-history-actions';
      const actionsTitle = document.createElement('div');
      actionsTitle.className = 'social-history-section-title';
      actionsTitle.textContent = 'Recent Interactions';
      actionsSection.appendChild(actionsTitle);
      const actionsList = document.createElement('ul');
      actionsList.className = 'social-history-action-list';
      const recent = recentActions.slice(-5).reverse();
      recent.forEach(action => {
        const item = document.createElement('li');
        item.className = 'social-history-action-item';
        const actionLabel = getActionById(action.action)?.label || action.action;
        const weekLabel = `Week ${action.week}`;
        const outcomeClass = action.outcome === 'positive' ? 'positive' : 
                            action.outcome === 'negative' ? 'negative' : 'neutral';
        item.innerHTML = `<span class="action-week">${weekLabel}:</span>
          <span class="action-name">${actionLabel}</span>
          <span class="action-outcome ${outcomeClass}">${action.outcome}</span>`;
        actionsList.appendChild(item);
      });
      actionsSection.appendChild(actionsList);
      content.appendChild(actionsSection);
    }
    const targetPlayer = global.getP?.(targetId);
    if(targetPlayer && targetPlayer.socialTraits){
      const traitsSection = document.createElement('div');
      traitsSection.className = 'social-history-traits';
      const traitsTitle = document.createElement('div');
      traitsTitle.className = 'social-history-section-title';
      traitsTitle.textContent = 'Known Traits';
      traitsSection.appendChild(traitsTitle);
      const traitsList = document.createElement('div');
      traitsList.className = 'social-trait-tags';
      targetPlayer.socialTraits.forEach(trait => {
        const tag = document.createElement('span');
        tag.className = 'social-trait-tag';
        tag.textContent = trait;
        traitsList.appendChild(tag);
      });
      traitsSection.appendChild(traitsList);
      content.appendChild(traitsSection);
    }
    container.appendChild(content);
    let isExpanded = false;
    const toggleHistory = () => {
      isExpanded = !isExpanded;
      content.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      content.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
      toggle.textContent = isExpanded ? '▲' : '▼';
    };
    header.onclick = toggleHistory;
    header.addEventListener('keypress', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        toggleHistory();
      }
    });
    return container;
  }

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
    calculateTraitModifiers, calculateMemoryModifiers,
    createHistoryUI,
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