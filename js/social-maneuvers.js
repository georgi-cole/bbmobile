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
  // SOCIAL RESOURCES SYSTEM (Energy, Influence, Information)
  // ============================================================================
  
  // Resource configuration with defaults
  const RESOURCE_CONFIG = {
    energy: {
      default: 3,
      max: 5,
      weeklyReset: true,      // Resets to default at week start
      carryover: false,       // Does not carry over between weeks
      description: 'Energy represents your social stamina and ability to take actions during the social phase.',
      examples: 'Used for conversations, strategizing, and building relationships.'
    },
    influence: {
      default: 2,
      max: 10,
      weeklyReset: false,     // Persists between weeks
      carryover: true,        // Carries over with cap
      description: 'Influence represents your social capital and ability to sway others.',
      examples: 'Earned through successful actions, used for high-impact maneuvers.'
    },
    information: {
      default: 1,
      max: 8,
      weeklyReset: false,     // Persists between weeks
      carryover: true,        // Carries over with cap
      description: 'Information represents intelligence gathered about other players.',
      examples: 'Earned through observation and interrogation, used for strategic planning.'
    }
  };

  // Legacy constants for backward compatibility
  const DEFAULT_ENERGY = RESOURCE_CONFIG.energy.default;
  const MAX_ENERGY = RESOURCE_CONFIG.energy.max;

  // ============================================================================
  // SOCIAL RESOURCES SERVICE
  // ============================================================================
  
  const SocialResources = {
    // Initialize resources for a player
    init(playerId) {
      const g = global.game;
      if(!g) return;
      
      if(!g.__socialResources){
        g.__socialResources = new Map();
      }
      
      if(!g.__socialResources.has(playerId)){
        g.__socialResources.set(playerId, {
          energy: RESOURCE_CONFIG.energy.default,
          influence: RESOURCE_CONFIG.influence.default,
          information: RESOURCE_CONFIG.information.default,
          lastWeekReset: g.week || 1
        });
      }
    },
    
    // Get a specific resource value
    get(playerId, resourceType) {
      const g = global.game;
      if(!g?.__socialResources) {
        this.init(playerId);
      }
      
      const resources = g.__socialResources.get(playerId);
      if(!resources) {
        this.init(playerId);
        return RESOURCE_CONFIG[resourceType]?.default || 0;
      }
      
      return resources[resourceType] ?? RESOURCE_CONFIG[resourceType]?.default ?? 0;
    },
    
    // Get all resources for a player
    getAll(playerId) {
      return {
        energy: this.get(playerId, 'energy'),
        influence: this.get(playerId, 'influence'),
        information: this.get(playerId, 'information')
      };
    },
    
    // Set a specific resource value (with capping)
    set(playerId, resourceType, amount) {
      const g = global.game;
      if(!g) return false;
      
      this.init(playerId);
      const config = RESOURCE_CONFIG[resourceType];
      if(!config) return false;
      
      const resources = g.__socialResources.get(playerId);
      const capped = Math.max(0, Math.min(config.max, amount));
      resources[resourceType] = capped;
      
      // Log telemetry
      this._logTelemetry(playerId, resourceType, 'set', capped);
      
      return true;
    },
    
    // Spend resources (returns true if successful)
    spend(playerId, costs) {
      // Check if player has sufficient resources
      for(const [resourceType, cost] of Object.entries(costs)) {
        if(cost > 0 && this.get(playerId, resourceType) < cost) {
          return { success: false, insufficient: resourceType };
        }
      }
      
      // Deduct resources
      for(const [resourceType, cost] of Object.entries(costs)) {
        if(cost > 0) {
          const current = this.get(playerId, resourceType);
          this.set(playerId, resourceType, current - cost);
        }
      }
      
      // Log telemetry
      this._logTelemetry(playerId, 'multiple', 'spend', costs);
      
      return { success: true };
    },
    
    // Earn resources
    earn(playerId, gains) {
      for(const [resourceType, amount] of Object.entries(gains)) {
        if(amount > 0) {
          const current = this.get(playerId, resourceType);
          this.set(playerId, resourceType, current + amount);
        }
      }
      
      // Log telemetry
      this._logTelemetry(playerId, 'multiple', 'earn', gains);
      
      return { success: true };
    },
    
    // Reset resources at week start (respects carryover rules)
    resetWeekly(playerId) {
      const g = global.game;
      if(!g) return;
      
      this.init(playerId);
      const resources = g.__socialResources.get(playerId);
      const currentWeek = g.week || 1;
      
      // Only reset if we're in a new week
      if(resources.lastWeekReset >= currentWeek) {
        return;
      }
      
      for(const [resourceType, config] of Object.entries(RESOURCE_CONFIG)) {
        if(config.weeklyReset) {
          // Reset to default
          resources[resourceType] = config.default;
        } else if(config.carryover) {
          // Cap at max (carryover with ceiling)
          resources[resourceType] = Math.min(resources[resourceType], config.max);
        }
      }
      
      resources.lastWeekReset = currentWeek;
      
      console.info(`[social-resources] Weekly reset for player ${playerId} at week ${currentWeek}`);
      this._logTelemetry(playerId, 'all', 'reset', resources);
    },
    
    // Check if player can afford an action
    canAfford(playerId, costs) {
      for(const [resourceType, cost] of Object.entries(costs)) {
        if(cost > 0 && this.get(playerId, resourceType) < cost) {
          return false;
        }
      }
      return true;
    },
    
    // Telemetry logging
    _logTelemetry(playerId, resourceType, operation, value) {
      const g = global.game;
      if(!g) return;
      
      if(!g.__socialResourcesTelemetry) {
        g.__socialResourcesTelemetry = [];
      }
      
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
      
      // Keep only last 100 entries
      if(g.__socialResourcesTelemetry.length > 100) {
        g.__socialResourcesTelemetry.shift();
      }
      
      console.info('[social-resources] Telemetry:', operation, resourceType, value, 'Balance:', entry.balance);
    }
  };

  // Legacy functions for backward compatibility
  function initSocialEnergy(){
    const alivePlayers = global.alivePlayers?.() || [];
    alivePlayers.forEach(p => SocialResources.init(p.id));
  }

  function getEnergy(playerId){
    return SocialResources.get(playerId, 'energy');
  }

  function setEnergy(playerId, amount){
    SocialResources.set(playerId, 'energy', amount);
  }

  function spendEnergy(playerId, cost){
    const result = SocialResources.spend(playerId, { energy: cost });
    return result.success;
  }

  function restoreEnergy(playerId, amount){
    SocialResources.earn(playerId, { energy: amount });
  }

  // ============================================================================
  // ACTION DEFINITIONS
  // ============================================================================
  
  const SOCIAL_ACTIONS = [
    {
      id: 'smalltalk',
      label: 'Small Talk',
      cost: 1, // Legacy field for backward compatibility
      costs: { energy: 1, influence: 0, information: 0 },
      rewards: { influence: 0.5 }, // Small influence gain on success
      description: 'Light conversation to build rapport',
      category: 'friendly'
    },
    {
      id: 'strategize',
      label: 'Strategize',
      cost: 2,
      costs: { energy: 2, influence: 1, information: 0 },
      rewards: { information: 1 }, // Gain information
      description: 'Discuss game plans and alliances',
      category: 'strategic'
    },
    {
      id: 'confide',
      label: 'Confide',
      cost: 2,
      costs: { energy: 2, influence: 0, information: 0 },
      rewards: { influence: 1 }, // Build influence through trust
      description: 'Share personal thoughts and build trust',
      category: 'friendly'
    },
    {
      id: 'interrogate',
      label: 'Interrogate',
      cost: 2,
      costs: { energy: 2, influence: 1, information: 0 },
      rewards: { information: 2 }, // High information gain
      description: 'Press for information about plans',
      category: 'aggressive'
    },
    {
      id: 'compliment',
      label: 'Compliment',
      cost: 1,
      costs: { energy: 1, influence: 0, information: 0 },
      rewards: { influence: 0.5 }, // Small influence gain
      description: 'Give genuine praise',
      category: 'friendly'
    },
    {
      id: 'confront',
      label: 'Confront',
      cost: 3,
      costs: { energy: 3, influence: 2, information: 0 },
      rewards: { information: 1 }, // May reveal information
      description: 'Address conflicts directly',
      category: 'aggressive'
    },
    {
      id: 'mediate',
      label: 'Mediate',
      cost: 2,
      costs: { energy: 2, influence: 1, information: 1 },
      rewards: { influence: 2 }, // High influence gain
      description: 'Help resolve tensions between others',
      category: 'strategic'
    },
    {
      id: 'observe',
      label: 'Observe',
      cost: 1,
      costs: { energy: 1, influence: 0, information: 0 },
      rewards: { information: 1 }, // Gather information passively
      description: 'Watch and listen quietly',
      category: 'strategic'
    }
  ];

  function getActionById(actionId){
    return SOCIAL_ACTIONS.find(a => a.id === actionId);
  }

  function getAvailableActions(playerId){
    return SOCIAL_ACTIONS.filter(action => {
      return SocialResources.canAfford(playerId, action.costs);
    });
  }

  // Get actions that are disabled (insufficient resources) with reason
  function getDisabledActions(playerId){
    return SOCIAL_ACTIONS.filter(action => {
      return !SocialResources.canAfford(playerId, action.costs);
    }).map(action => {
      const resources = SocialResources.getAll(playerId);
      const missing = [];
      for(const [type, cost] of Object.entries(action.costs)){
        if(cost > 0 && resources[type] < cost){
          missing.push(`${type}: ${resources[type]}/${cost}`);
        }
      }
      return {
        ...action,
        missingResources: missing
      };
    });
  }

  // ============================================================================
  // ACTION EXECUTION
  // ============================================================================
  
  function executeAction(actorId, targetId, actionId){
    if(!isEnabled()){
      console.warn('[social-maneuvers] System is disabled');
      return { success: false, reason: 'disabled' };
    }

    const action = getActionById(actionId);
    if(!action){
      console.warn('[social-maneuvers] Unknown action:', actionId);
      return { success: false, reason: 'unknown_action' };
    }

    // Check and spend resources
    const spendResult = SocialResources.spend(actorId, action.costs);
    if(!spendResult.success){
      return { 
        success: false, 
        reason: 'insufficient_resources',
        insufficient: spendResult.insufficient,
        message: `Not enough ${spendResult.insufficient}` 
      };
    }

    // Log the action
    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    const targetName = global.safeName?.(targetId) || `Player ${targetId}`;
    console.info(`[social-maneuvers] ${actorName} -> ${targetName}: ${action.label}`, action.costs);

    // Process outcome
    const outcome = processActionOutcome(actorId, targetId, action);
    
    // Award resources on success
    if(outcome.type !== 'negative' && action.rewards){
      SocialResources.earn(actorId, action.rewards);
    }

    return {
      success: true,
      action: action,
      outcome: outcome,
      resources: SocialResources.getAll(actorId)
    };
  }

  // ============================================================================
  // OUTCOME PROCESSING (PLACEHOLDER)
  // ============================================================================
  
  function processActionOutcome(actorId, targetId, action){
    // PLACEHOLDER: This will integrate with existing social systems
    // For now, basic affinity adjustments
    
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    
    if(!actor || !target){
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
      const current = actor.affinity[targetId] ?? 0;
      actor.affinity[targetId] = current + affinityChange;
    }

    // PLACEHOLDER: Hook for memory system
    recordActionInMemory(actorId, targetId, action, outcomeType);

    // PLACEHOLDER: Hook for trait effects
    applyTraitEffects(actorId, targetId, action);

    return {
      type: outcomeType,
      message: message,
      affinityChange: affinityChange
    };
  }

  // ============================================================================
  // MEMORY SYSTEM INTEGRATION (PLACEHOLDER)
  // ============================================================================
  
  function recordActionInMemory(actorId, targetId, action, outcome){
    // PLACEHOLDER: Integrate with social-narrative.js or create new memory structure
    // This will track player actions across phases for deeper narrative
    
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

  function getPlayerMemory(actorId, targetId){
    // PLACEHOLDER: Retrieve action history between two players
    const g = global.game;
    if(!g?.__socialManeuversMemory) return [];

    return g.__socialManeuversMemory.actions.filter(
      a => (a.actorId === actorId && a.targetId === targetId) ||
           (a.actorId === targetId && a.targetId === actorId)
    );
  }

  // ============================================================================
  // TRAIT EFFECTS (PLACEHOLDER)
  // ============================================================================
  
  function applyTraitEffects(actorId, targetId, action){
    // PLACEHOLDER: Apply player personality traits to modify action outcomes
    // Examples:
    // - Charismatic players get bonus to friendly actions
    // - Strategic players get bonus to strategize actions
    // - Hot-headed players have penalties to confide actions
    
    const actor = global.getP?.(actorId);
    if(!actor) return;

    // PLACEHOLDER: Check for traits when trait system is implemented
    // if(actor.traits?.includes('charismatic') && action.category === 'friendly'){
    //   // Apply bonus
    // }

    console.info('[social-maneuvers] Trait effects would apply here');
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

    const resources = SocialResources.getAll(playerId);
    const alivePlayers = global.alivePlayers?.() || [];
    const otherPlayers = alivePlayers.filter(p => p.id !== playerId);

    // State for UI interactions
    let selectedPlayer = null;
    let selectedAction = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'social-maneuvers-panel';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Social Maneuvers Interface');

    // Resources HUD (Energy, Influence, Information)
    const resourcesHUD = createResourcesHUD(resources);
    wrapper.appendChild(resourcesHUD);

    // Player selection
    if(otherPlayers.length > 0){
      const playerSection = createPlayerSelection(otherPlayers, (player) => {
        selectedPlayer = player;
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
      if(selectedPlayer && selectedAction){
        const result = executeAction(playerId, selectedPlayer.id, selectedAction.id);
        showFeedback(result, playerId);
        
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
      
      if(!selectedPlayer){
        const emptyState = document.createElement('div');
        emptyState.className = 'social-empty-state';
        emptyState.textContent = 'Select a player to see available actions';
        actionsList.appendChild(emptyState);
        executeBtn.disabled = true;
        return;
      }

      const availableActions = getAvailableActions(playerId);
      const disabledActions = getDisabledActions(playerId);
      
      if(availableActions.length === 0 && disabledActions.length === 0){
        const emptyState = document.createElement('div');
        emptyState.className = 'social-empty-state';
        emptyState.textContent = 'No actions available';
        actionsList.appendChild(emptyState);
        executeBtn.disabled = true;
        return;
      }

      // Show available actions
      availableActions.forEach(action => {
        const actionItem = createActionItem(action, resources, (selected) => {
          selectedAction = selected;
          
          // Update visual selection
          actionsList.querySelectorAll('.social-action-item').forEach(item => {
            item.classList.remove('selected');
          });
          actionItem.classList.add('selected');
          
          executeBtn.disabled = false;
        });
        actionsList.appendChild(actionItem);
      });
      
      // Show disabled actions with tooltips
      disabledActions.forEach(action => {
        const actionItem = createActionItem(action, resources, null, true);
        actionsList.appendChild(actionItem);
      });
    }

    container.appendChild(wrapper);
    updateActionsList();
  }

  // Create the Resources HUD (Energy, Influence, Information)
  function createResourcesHUD(resources){
    const hud = document.createElement('div');
    hud.className = 'social-resources-hud';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');

    // Energy resource
    const energyDisplay = createResourceDisplay(
      'energy',
      resources.energy,
      RESOURCE_CONFIG.energy.max,
      RESOURCE_CONFIG.energy.description,
      RESOURCE_CONFIG.energy.examples,
      '⚡'
    );
    hud.appendChild(energyDisplay);

    // Influence resource
    const influenceDisplay = createResourceDisplay(
      'influence',
      resources.influence,
      RESOURCE_CONFIG.influence.max,
      RESOURCE_CONFIG.influence.description,
      RESOURCE_CONFIG.influence.examples,
      '🎭'
    );
    hud.appendChild(influenceDisplay);

    // Information resource
    const infoDisplay = createResourceDisplay(
      'information',
      resources.information,
      RESOURCE_CONFIG.information.max,
      RESOURCE_CONFIG.information.description,
      RESOURCE_CONFIG.information.examples,
      '🔍'
    );
    hud.appendChild(infoDisplay);

    return hud;
  }

  // Create individual resource display with tooltip
  function createResourceDisplay(type, current, max, description, examples, icon){
    const container = document.createElement('div');
    container.className = `social-resource-display social-resource-${type}`;
    container.setAttribute('data-tooltip', `${description}\n\nExamples: ${examples}`);

    const header = document.createElement('div');
    header.className = 'social-resource-header';
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'social-resource-icon';
    iconSpan.textContent = icon;
    header.appendChild(iconSpan);

    const label = document.createElement('span');
    label.className = 'social-resource-label';
    label.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    header.appendChild(label);

    container.appendChild(header);

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'social-resource-value';
    valueDisplay.innerHTML = `<span class="current">${current}</span>/<span class="max">${max}</span>`;
    container.appendChild(valueDisplay);

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'social-resource-progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'social-resource-progress-fill';
    progressFill.style.width = `${(current / max) * 100}%`;
    progressBar.appendChild(progressFill);
    container.appendChild(progressBar);

    return container;
  }

  // Legacy energy display for backward compatibility
  function createEnergyDisplay(energy){
    const container = document.createElement('div');
    container.className = 'social-energy-bar';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');

    const label = document.createElement('div');
    label.className = 'social-energy-label';
    label.innerHTML = `
      <strong>Social Energy</strong>
      <span class="social-energy-value">${energy}/${MAX_ENERGY}</span>
    `;
    container.appendChild(label);

    // Energy dots visualization
    const dots = document.createElement('div');
    dots.className = 'social-energy-dots';
    dots.setAttribute('aria-hidden', 'true');
    
    for(let i = 0; i < MAX_ENERGY; i++){
      const dot = document.createElement('div');
      dot.className = 'social-energy-dot';
      if(i < energy){
        dot.classList.add('filled');
      }
      dots.appendChild(dot);
    }
    container.appendChild(dots);

    return container;
  }

  function createPlayerSelection(players, onSelect){
    const container = document.createElement('div');
    container.className = 'social-player-select';

    const title = document.createElement('div');
    title.className = 'social-section-title';
    title.textContent = 'Select Target';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'social-player-grid';
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Select target player');

    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'social-player-card';
      card.textContent = player.name || `Player ${player.id}`;
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', 'false');
      card.setAttribute('tabindex', '0');
      
      card.onclick = () => {
        // Clear other selections
        grid.querySelectorAll('.social-player-card').forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        
        // Select this card
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
        onSelect(player);
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

  function createActionItem(action, currentResources, onSelect, isDisabled = false){
    const item = document.createElement('div');
    item.className = 'social-action-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    
    const canAfford = !isDisabled && SocialResources.canAfford(0, action.costs); // Note: playerId not needed for check
    if(!canAfford || isDisabled){
      item.classList.add('disabled');
      item.setAttribute('aria-disabled', 'true');
    }

    const header = document.createElement('div');
    header.className = 'social-action-header';
    
    const name = document.createElement('div');
    name.className = 'social-action-name';
    name.textContent = action.label;
    header.appendChild(name);

    // Display all resource costs
    const costsContainer = document.createElement('div');
    costsContainer.className = 'social-action-costs';
    
    if(action.costs.energy > 0){
      const energyCost = document.createElement('span');
      energyCost.className = 'social-cost-badge energy';
      energyCost.classList.add(currentResources.energy >= action.costs.energy ? 'affordable' : 'expensive');
      energyCost.textContent = `⚡${action.costs.energy}`;
      costsContainer.appendChild(energyCost);
    }
    
    if(action.costs.influence > 0){
      const influenceCost = document.createElement('span');
      influenceCost.className = 'social-cost-badge influence';
      influenceCost.classList.add(currentResources.influence >= action.costs.influence ? 'affordable' : 'expensive');
      influenceCost.textContent = `🎭${action.costs.influence}`;
      costsContainer.appendChild(influenceCost);
    }
    
    if(action.costs.information > 0){
      const infoCost = document.createElement('span');
      infoCost.className = 'social-cost-badge information';
      infoCost.classList.add(currentResources.information >= action.costs.information ? 'affordable' : 'expensive');
      infoCost.textContent = `🔍${action.costs.information}`;
      costsContainer.appendChild(infoCost);
    }
    
    header.appendChild(costsContainer);
    item.appendChild(header);

    const desc = document.createElement('div');
    desc.className = 'social-action-description';
    desc.textContent = action.description;
    item.appendChild(desc);

    // Show rewards if any
    if(action.rewards && Object.values(action.rewards).some(v => v > 0)){
      const rewardsContainer = document.createElement('div');
      rewardsContainer.className = 'social-action-rewards';
      rewardsContainer.innerHTML = '<span class="rewards-label">Rewards:</span> ';
      
      const rewardBadges = [];
      if(action.rewards.energy) rewardBadges.push(`⚡+${action.rewards.energy}`);
      if(action.rewards.influence) rewardBadges.push(`🎭+${action.rewards.influence}`);
      if(action.rewards.information) rewardBadges.push(`🔍+${action.rewards.information}`);
      
      rewardsContainer.innerHTML += rewardBadges.join(' ');
      item.appendChild(rewardsContainer);
    }

    const category = document.createElement('span');
    category.className = `social-action-category ${action.category}`;
    category.textContent = action.category;
    item.appendChild(category);

    // Add tooltip for disabled actions
    if(isDisabled && action.missingResources){
      item.setAttribute('data-tooltip', `Insufficient resources: ${action.missingResources.join(', ')}`);
    }

    if(canAfford && !isDisabled && onSelect){
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

  function showFeedback(result, playerId){
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
    const action = result.action;
    
    // Build resource change message
    let resourceChanges = [];
    
    // Show costs
    for(const [type, cost] of Object.entries(action.costs)){
      if(cost > 0){
        resourceChanges.push(`-${cost} ${getResourceIcon(type)}`);
      }
    }
    
    // Show rewards
    if(action.rewards && outcome.type !== 'negative'){
      for(const [type, reward] of Object.entries(action.rewards)){
        if(reward > 0){
          resourceChanges.push(`+${reward} ${getResourceIcon(type)}`);
        }
      }
    }
    
    const message = outcome.message + (resourceChanges.length > 0 ? `\n${resourceChanges.join(' ')}` : '');
    
    const panel = createFeedbackPanel(
      outcome.type, 
      action.label,
      message
    );
    
    // Add resource display to panel
    if(result.resources){
      const resourcesDiv = document.createElement('div');
      resourcesDiv.className = 'feedback-resources';
      resourcesDiv.innerHTML = `
        <small>
          ⚡${result.resources.energy} 
          🎭${result.resources.influence} 
          🔍${result.resources.information}
        </small>
      `;
      panel.appendChild(resourcesDiv);
    }
    
    document.body.appendChild(panel);
    
    // Animate in
    panel.style.animation = 'slideInRight 0.4s ease';
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      panel.style.animation = 'slideOutRight 0.4s ease';
      setTimeout(() => panel.remove(), 400);
    }, 3000);
  }
  
  function getResourceIcon(type){
    const icons = {
      energy: '⚡',
      influence: '🎭',
      information: '🔍'
    };
    return icons[type] || type;
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
    
    console.info('[social-maneuvers] ✓ startPhase() triggered - Initializing social phase with resource system');
    
    const alivePlayers = global.alivePlayers?.() || [];
    alivePlayers.forEach(p => {
      // Initialize resources if not already initialized
      SocialResources.init(p.id);
      
      // Apply weekly reset logic
      SocialResources.resetWeekly(p.id);
    });
    
    console.info(`[social-maneuvers] Resources initialized for ${alivePlayers.length} players`);
  }

  function onSocialPhaseEnd(){
    if(!isEnabled()) {
      console.info('[social-maneuvers] Phase end called but feature is DISABLED');
      return;
    }
    
    console.info('[social-maneuvers] ✓ Social phase complete');
    // Resources persist across phases and weeks (handled by resetWeekly)
  }

  // ============================================================================
  // GLOBAL EXPORTS
  // ============================================================================
  
  global.SocialManeuvers = {
    // Feature flag
    isEnabled,
    
    // Resource management (new comprehensive API)
    SocialResources,
    
    // Legacy energy management (backward compatibility)
    initSocialEnergy,
    getEnergy,
    setEnergy,
    spendEnergy,
    restoreEnergy,
    
    // Actions
    getActionById,
    getAvailableActions,
    getDisabledActions,
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
    SOCIAL_ACTIONS,
    RESOURCE_CONFIG
  };
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
