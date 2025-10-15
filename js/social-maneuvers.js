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
  // OUTCOME PROCESSING
  // ============================================================================
  
  function processActionOutcome(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    
    if(!actor || !target){
      return { type: 'error', message: 'Player not found' };
    }

    // Base affinity changes based on action category
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

    // Apply trait-based modifiers
    const traitModifiers = calculateTraitModifiers(actorId, targetId, action);
    affinityChange += traitModifiers.affinityBonus;
    
    // Apply memory-based modifiers
    const memoryModifiers = calculateMemoryModifiers(actorId, targetId);
    affinityChange += memoryModifiers.affinityBonus;
    
    // Update outcome type based on final affinity change
    if(affinityChange > 0.05) outcomeType = 'positive';
    else if(affinityChange < -0.05) outcomeType = 'negative';
    else outcomeType = 'neutral';

    // Apply affinity change (integrate with existing system)
    if(actor.affinity && typeof actor.affinity === 'object'){
      const current = actor.affinity[targetId] ?? 0;
      actor.affinity[targetId] = current + affinityChange;
    }

    // Record action in memory system
    recordActionInMemory(actorId, targetId, action, outcomeType);

    // Update player stats based on outcome
    if(outcomeType === 'positive'){
      global.updateInfluence?.(actorId, 1);
    } else if(outcomeType === 'negative'){
      global.updateInfluence?.(actorId, -1);
    }

    return {
      type: outcomeType,
      message: message,
      affinityChange: affinityChange,
      traitModifiers: traitModifiers,
      memoryModifiers: memoryModifiers
    };
  }
  
  /**
   * Calculate trait-based modifiers for action outcomes
   */
  function calculateTraitModifiers(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    
    let affinityBonus = 0;
    let successBonus = 0;
    const appliedTraits = [];
    
    if(!actor || !target) return { affinityBonus, successBonus, appliedTraits };
    
    const hasTrait = global.hasTrait || (() => false);
    
    // Charismatic: +20% to friendly actions
    if(hasTrait(actorId, 'charismatic') && action.category === 'friendly'){
      affinityBonus += 0.02;
      successBonus += 0.2;
      appliedTraits.push('charismatic');
    }
    
    // Loyal: Bonus when interacting with allies (positive affinity)
    if(hasTrait(actorId, 'loyal')){
      const currentAffinity = actor.affinity?.[targetId] ?? 0;
      if(currentAffinity > 0.2){
        affinityBonus += 0.015;
        appliedTraits.push('loyal');
      }
    }
    
    // Deceptive: +15% to aggressive actions, -10% to friendly
    if(hasTrait(actorId, 'deceptive')){
      if(action.category === 'aggressive'){
        successBonus += 0.15;
        appliedTraits.push('deceptive');
      } else if(action.category === 'friendly'){
        successBonus -= 0.1;
      }
    }
    
    // Stubborn: -20% to strategic actions but +10% to aggressive
    if(hasTrait(actorId, 'stubborn')){
      if(action.category === 'strategic'){
        successBonus -= 0.2;
      } else if(action.category === 'aggressive'){
        successBonus += 0.1;
        appliedTraits.push('stubborn');
      }
    }
    
    // Gullible (target): Makes actor's strategic actions more effective
    if(hasTrait(targetId, 'gullible') && action.category === 'strategic'){
      affinityBonus += 0.02;
      successBonus += 0.15;
      appliedTraits.push('gullible-target');
    }
    
    // Paranoid (target): Reduces effectiveness of all actions
    if(hasTrait(targetId, 'paranoid')){
      affinityBonus -= 0.01;
      successBonus -= 0.1;
      appliedTraits.push('paranoid-target');
    }
    
    return { affinityBonus, successBonus, appliedTraits };
  }
  
  /**
   * Calculate memory-based modifiers from past interactions
   */
  function calculateMemoryModifiers(actorId, targetId){
    let affinityBonus = 0;
    const relevantMemories = [];
    
    const getMemoryLog = global.getMemoryLog || (() => []);
    const MEMORY_EVENTS = global.MEMORY_EVENTS || {};
    
    // Get memories between these two players
    const actorMemories = getMemoryLog(actorId, { targetId: targetId });
    const targetMemories = getMemoryLog(targetId, { targetId: actorId });
    
    // Count specific memory types and apply modifiers
    const countMemory = (memories, eventType) => 
      memories.filter(m => m.event === eventType).length;
    
    // Positive memories
    const promisesMade = countMemory(actorMemories, MEMORY_EVENTS.PROMISE_MADE);
    const alliancesFormed = countMemory(actorMemories, MEMORY_EVENTS.ALLIANCE_FORMED);
    const secretsShared = countMemory(actorMemories, MEMORY_EVENTS.SECRET_SHARED);
    const conflictsResolved = countMemory(actorMemories, MEMORY_EVENTS.CONFLICT_RESOLVED);
    const mediationSuccesses = countMemory(actorMemories, MEMORY_EVENTS.MEDIATION_SUCCESS);
    
    // Negative memories
    const promisesBroken = countMemory(actorMemories, MEMORY_EVENTS.PROMISE_BROKEN);
    const betrayals = countMemory(actorMemories, MEMORY_EVENTS.ALLIANCE_BETRAYED);
    const rumorsExposed = countMemory(actorMemories, MEMORY_EVENTS.RUMOR_EXPOSED);
    const confrontations = countMemory(actorMemories, MEMORY_EVENTS.PUBLIC_CONFRONTATION);
    
    // Calculate net positive history
    const positiveCount = promisesMade + alliancesFormed + secretsShared + conflictsResolved + mediationSuccesses;
    const negativeCount = promisesBroken + betrayals + rumorsExposed + confrontations;
    
    // Each positive memory adds +0.005 affinity, negative memories subtract -0.01
    affinityBonus += positiveCount * 0.005;
    affinityBonus -= negativeCount * 0.01;
    
    // Cap the memory bonus/penalty
    affinityBonus = Math.max(-0.05, Math.min(0.05, affinityBonus));
    
    if(positiveCount > 0) relevantMemories.push(`${positiveCount} positive`);
    if(negativeCount > 0) relevantMemories.push(`${negativeCount} negative`);
    
    return { 
      affinityBonus, 
      positiveCount, 
      negativeCount,
      relevantMemories 
    };
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

  function getPlayerMemory(actorId, targetId){
    const g = global.game;
    if(!g?.__socialManeuversMemory) return [];

    return g.__socialManeuversMemory.actions.filter(
      a => (a.actorId === actorId && a.targetId === targetId) ||
           (a.actorId === targetId && a.targetId === actorId)
    );
  }
  
  /**
   * Helper function to record canonical memory events
   */
  function recordMemoryEvent(playerId, targetId, eventType, details = {}){
    if(!global.recordEvent) return;
    
    global.recordEvent(playerId, eventType, targetId, {
      ...details,
      source: 'social-maneuvers'
    });
    
    console.info(`[social-maneuvers] Memory event: ${playerId} -> ${targetId}: ${eventType}`);
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
        updateHistorySection(); // Update history when player is selected
      });
      wrapper.appendChild(playerSection);
    }
    
    // History section (collapsible)
    const historySection = document.createElement('div');
    historySection.className = 'social-history-section';
    historySection.style.display = 'none'; // Hidden until player is selected
    wrapper.appendChild(historySection);
    
    // Function to update history section
    function updateHistorySection(){
      historySection.innerHTML = '';
      
      if(!selectedPlayer){
        historySection.style.display = 'none';
        return;
      }
      
      historySection.style.display = 'block';
      const historyContent = createHistoryUI(playerId, selectedPlayer.id);
      historySection.appendChild(historyContent);
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

  /**
   * Create a collapsible history UI showing past interactions with a player
   */
  function createHistoryUI(playerId, targetId){
    const container = document.createElement('div');
    container.className = 'social-history-container';
    
    // Header with collapse toggle
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
    
    // Content (initially collapsed)
    const content = document.createElement('div');
    content.className = 'social-history-content collapsed';
    content.setAttribute('aria-hidden', 'true');
    
    // Get memory log
    const getMemoryLog = global.getMemoryLog || (() => []);
    const MEMORY_EVENTS = global.MEMORY_EVENTS || {};
    
    const memories = getMemoryLog(playerId, { targetId: targetId });
    const recentActions = getPlayerMemory(playerId, targetId);
    
    // Summary section
    const summary = document.createElement('div');
    summary.className = 'social-history-summary';
    
    // Count memory events
    const eventCounts = {};
    const eventOrder = [
      'AllianceFormed', 'PromiseMade', 'SecretShared', 'ConflictResolved', 'MediationSuccess',
      'AllianceBetrayed', 'PromiseBroken', 'RumorExposed', 'PublicConfrontation', 'RumorBelieved'
    ];
    
    memories.forEach(m => {
      eventCounts[m.event] = (eventCounts[m.event] || 0) + 1;
    });
    
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
          
          // Determine if positive or negative event
          const isPositive = ['AllianceFormed', 'PromiseMade', 'SecretShared', 'ConflictResolved', 'MediationSuccess'].includes(eventType);
          item.classList.add(isPositive ? 'positive-event' : 'negative-event');
          
          const eventLabel = eventType.replace(/([A-Z])/g, ' $1').trim();
          item.textContent = `${eventLabel} (${count}x)`;
          eventList.appendChild(item);
        }
      });
      
      if(eventList.children.length > 0){
        summary.appendChild(eventList);
      }
    }
    
    content.appendChild(summary);
    
    // Recent actions section
    if(recentActions.length > 0){
      const actionsSection = document.createElement('div');
      actionsSection.className = 'social-history-actions';
      
      const actionsTitle = document.createElement('div');
      actionsTitle.className = 'social-history-section-title';
      actionsTitle.textContent = 'Recent Interactions';
      actionsSection.appendChild(actionsTitle);
      
      const actionsList = document.createElement('ul');
      actionsList.className = 'social-history-action-list';
      
      // Show last 5 actions
      const recent = recentActions.slice(-5).reverse();
      recent.forEach(action => {
        const item = document.createElement('li');
        item.className = 'social-history-action-item';
        
        const actionLabel = getActionById(action.action)?.label || action.action;
        const weekLabel = `Week ${action.week}`;
        const outcomeClass = action.outcome === 'positive' ? 'positive' : 
                            action.outcome === 'negative' ? 'negative' : 'neutral';
        
        item.innerHTML = `
          <span class="action-week">${weekLabel}:</span>
          <span class="action-name">${actionLabel}</span>
          <span class="action-outcome ${outcomeClass}">${action.outcome}</span>
        `;
        actionsList.appendChild(item);
      });
      
      actionsSection.appendChild(actionsList);
      content.appendChild(actionsSection);
    }
    
    // Player traits section (for reference)
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
    
    // Toggle functionality
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
    recordMemoryEvent,
    getPlayerMemory,
    
    // UI
    renderSocialManeuversUI,
    createHistoryUI,
    
    // Phase hooks
    onSocialPhaseStart,
    onSocialPhaseEnd,
    
    // Modifiers
    calculateTraitModifiers,
    calculateMemoryModifiers,
    
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
