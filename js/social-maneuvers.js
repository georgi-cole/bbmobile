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
    const availableActions = getAvailableActions(playerId);

    const wrapper = document.createElement('div');
    wrapper.className = 'social-maneuvers-panel';
    wrapper.style.cssText = 'margin-top:12px;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;';

    // Energy display
    const energyBar = document.createElement('div');
    energyBar.className = 'energy-display';
    energyBar.style.cssText = 'margin-bottom:8px;font-size:0.9rem;color:#95a9c0;';
    energyBar.innerHTML = `<strong>Social Energy:</strong> ${energy}/${MAX_ENERGY}`;
    wrapper.appendChild(energyBar);

    // Action menu
    const actionsTitle = document.createElement('div');
    actionsTitle.textContent = 'Available Actions:';
    actionsTitle.style.cssText = 'margin-bottom:6px;font-size:0.85rem;color:#e3ecf5;font-weight:bold;';
    wrapper.appendChild(actionsTitle);

    if(availableActions.length === 0){
      const noActions = document.createElement('div');
      noActions.textContent = 'No energy remaining for actions';
      noActions.style.cssText = 'font-size:0.8rem;color:#f7b955;font-style:italic;';
      wrapper.appendChild(noActions);
    } else {
      const actionsList = document.createElement('div');
      actionsList.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

      availableActions.forEach(action => {
        const actionItem = document.createElement('div');
        actionItem.style.cssText = 'padding:6px 8px;background:rgba(255,255,255,0.05);border-radius:4px;cursor:pointer;transition:background 0.2s;';
        actionItem.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.85rem;color:#e3ecf5;">${action.label}</span>
            <span style="font-size:0.75rem;color:#95a9c0;">Cost: ${action.cost}</span>
          </div>
          <div style="font-size:0.75rem;color:#95a9c0;margin-top:2px;">${action.description}</div>
        `;
        
        actionItem.addEventListener('mouseenter', () => {
          actionItem.style.background = 'rgba(255,255,255,0.1)';
        });
        actionItem.addEventListener('mouseleave', () => {
          actionItem.style.background = 'rgba(255,255,255,0.05)';
        });

        actionsList.appendChild(actionItem);
      });

      wrapper.appendChild(actionsList);
    }

    container.appendChild(wrapper);
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
    
    // Constants (for external reference)
    DEFAULT_ENERGY,
    MAX_ENERGY,
    SOCIAL_ACTIONS
  };

  console.info('[social-maneuvers] Module loaded (disabled by default, enable via settings)');

})(window);
