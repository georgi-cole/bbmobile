// MODULE: social-maneuvers.js
// Social Maneuvers system: manages interactive social phase with player social energy,
// action menu, outcomes, and long-term memory integration.
// Feature-flagged for gradual rollout and expansion.

(function(global){
  'use strict';

  // ============================================================================
  // CONFIGURATION & FEATURE FLAG
  // ============================================================================
  
  function isEnabled(){
    return global.game?.cfg?.enableSocialManeuvers === true;
  }

  // ============================================================================
  // SOCIAL ENERGY SYSTEM
  // ============================================================================
  
  const DEFAULT_ENERGY = 3; // Default energy points per social phase
  const MAX_ENERGY = 5;

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
      description: 'Light conversation to build rapport',
      category: 'friendly'
    },
    {
      id: 'strategize',
      label: 'Strategize',
      cost: 2,
      description: 'Discuss game plans and alliances',
      category: 'strategic'
    },
    {
      id: 'confide',
      label: 'Confide',
      cost: 2,
      description: 'Share personal thoughts and build trust',
      category: 'friendly'
    },
    {
      id: 'interrogate',
      label: 'Interrogate',
      cost: 2,
      description: 'Press for information about plans',
      category: 'aggressive'
    },
    {
      id: 'compliment',
      label: 'Compliment',
      cost: 1,
      description: 'Give genuine praise',
      category: 'friendly'
    },
    {
      id: 'confront',
      label: 'Confront',
      cost: 3,
      description: 'Address conflicts directly',
      category: 'aggressive'
    },
    {
      id: 'mediate',
      label: 'Mediate',
      cost: 2,
      description: 'Help resolve tensions between others',
      category: 'strategic'
    },
    {
      id: 'observe',
      label: 'Observe',
      cost: 1,
      description: 'Watch and listen quietly',
      category: 'strategic'
    }
  ];

  function getActionById(actionId){
    return SOCIAL_ACTIONS.find(a => a.id === actionId);
  }

  function getAvailableActions(playerId){
    const energy = getEnergy(playerId);
    return SOCIAL_ACTIONS.filter(action => action.cost <= energy);
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

    // Check energy
    const hasEnergy = spendEnergy(actorId, action.cost);
    if(!hasEnergy){
      return { 
        success: false, 
        reason: 'insufficient_energy',
        message: `Not enough energy (need ${action.cost})` 
      };
    }

    // Log the action
    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    const targetName = global.safeName?.(targetId) || `Player ${targetId}`;
    console.info(`[social-maneuvers] ${actorName} -> ${targetName}: ${action.label} (cost: ${action.cost})`);

    // Process outcome
    const outcome = processActionOutcome(actorId, targetId, action);

    return {
      success: true,
      action: action,
      outcome: outcome,
      energyRemaining: getEnergy(actorId)
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
      return;
    }

    if(!container){
      console.warn('[social-maneuvers] No container provided for UI');
      return;
    }

    const energy = getEnergy(playerId);
    const alivePlayers = global.alivePlayers?.() || [];
    const otherPlayers = alivePlayers.filter(p => p.id !== playerId);

    // State for UI interactions
    let selectedPlayer = null;
    let selectedAction = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'social-maneuvers-panel';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Social Maneuvers Interface');

    // Energy display
    const energyBar = createEnergyDisplay(energy);
    wrapper.appendChild(energyBar);

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
      
      if(!selectedPlayer){
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
        emptyState.textContent = 'No energy remaining for actions';
        actionsList.appendChild(emptyState);
        executeBtn.disabled = true;
        return;
      }

      availableActions.forEach(action => {
        const actionItem = createActionItem(action, energy, (selected) => {
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
    }

    container.appendChild(wrapper);
    updateActionsList();
  }

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

  function createActionItem(action, currentEnergy, onSelect){
    const item = document.createElement('div');
    item.className = 'social-action-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    
    const canAfford = currentEnergy >= action.cost;
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

    const cost = document.createElement('div');
    cost.className = 'social-action-cost';
    cost.classList.add(canAfford ? 'affordable' : 'expensive');
    cost.textContent = `⚡ ${action.cost}`;
    header.appendChild(cost);

    item.appendChild(header);

    const desc = document.createElement('div');
    desc.className = 'social-action-description';
    desc.textContent = action.description;
    item.appendChild(desc);

    const category = document.createElement('span');
    category.className = `social-action-category ${action.category}`;
    category.textContent = action.category;
    item.appendChild(category);

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
    if(!isEnabled()) return;
    
    console.info('[social-maneuvers] Initializing social phase');
    initSocialEnergy();
    
    // Reset energy for all players
    const alivePlayers = global.alivePlayers?.() || [];
    alivePlayers.forEach(p => {
      setEnergy(p.id, DEFAULT_ENERGY);
    });
  }

  function onSocialPhaseEnd(){
    if(!isEnabled()) return;
    
    console.info('[social-maneuvers] Social phase complete');
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
  
  // Backward-compatible flag getter: USE_SOCIAL_MANEUVERS
  Object.defineProperty(global, 'USE_SOCIAL_MANEUVERS', {
    get: function() { return isEnabled(); },
    enumerable: true,
    configurable: true
  });

  console.info('[social-maneuvers] Module loaded (disabled by default, enable via settings)');

})(window);
