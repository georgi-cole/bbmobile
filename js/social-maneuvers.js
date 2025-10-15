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

    // Track affinity before action
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    const affinityBefore = actor?.affinity?.[targetId] ?? 0;

    // Process outcome
    const outcome = processActionOutcome(actorId, targetId, action);

    // Track affinity after action
    const affinityAfter = actor?.affinity?.[targetId] ?? 0;
    const affinityDelta = affinityAfter - affinityBefore;

    // Record action in phase session
    const g = global.game;
    if(g?.__socialManeuversSession){
      g.__socialManeuversSession.actionsThisPhase.push({
        timestamp: Date.now(),
        actorId,
        actorName,
        targetId,
        targetName,
        actionId: action.id,
        actionLabel: action.label,
        actionCategory: action.category,
        energyCost: action.cost,
        outcome: outcome.type,
        affinityBefore,
        affinityAfter,
        affinityDelta
      });

      // Track energy spent
      const spent = g.__socialManeuversSession.energySpent.get(actorId) || 0;
      g.__socialManeuversSession.energySpent.set(actorId, spent + action.cost);

      // Track relationship delta
      const key = `${actorId}-${targetId}`;
      const currentDelta = g.__socialManeuversSession.relationshipDeltas.get(key) || 0;
      g.__socialManeuversSession.relationshipDeltas.set(key, currentDelta + affinityDelta);
    }

    return {
      success: true,
      action: action,
      outcome: outcome,
      energyRemaining: getEnergy(actorId),
      affinityDelta: affinityDelta
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
    if(!isEnabled()){
      console.info('[social-maneuvers] Phase start called but feature is DISABLED (USE_SOCIAL_MANEUVERS=false)');
      return;
    }
    
    console.info('[social-maneuvers] ✓ startPhase() triggered - Initializing social phase with energy system');
    initSocialEnergy();
    
    // Initialize phase session tracking
    const g = global.game;
    if(!g.__socialManeuversSession){
      g.__socialManeuversSession = {
        startTime: Date.now(),
        week: g.week || 1,
        actionsThisPhase: [],
        energySpent: new Map(),
        relationshipDeltas: new Map()
      };
    } else {
      // Reset for new phase
      g.__socialManeuversSession.startTime = Date.now();
      g.__socialManeuversSession.week = g.week || 1;
      g.__socialManeuversSession.actionsThisPhase = [];
      g.__socialManeuversSession.energySpent.clear();
      g.__socialManeuversSession.relationshipDeltas.clear();
    }
    
    // Reset energy for all players
    const alivePlayers = global.alivePlayers?.() || [];
    alivePlayers.forEach(p => {
      setEnergy(p.id, DEFAULT_ENERGY);
      g.__socialManeuversSession.energySpent.set(p.id, 0);
    });
    console.info(`[social-maneuvers] Energy initialized for ${alivePlayers.length} players (${DEFAULT_ENERGY} energy each)`);
  }

  function onSocialPhaseEnd(){
    if(!isEnabled()) {
      console.info('[social-maneuvers] Phase end called but feature is DISABLED');
      return;
    }
    
    console.info('[social-maneuvers] ✓ Social phase complete - generating summary');
    
    // Generate summary data
    const summary = generatePhaseSummary();
    
    // Export to session log
    exportSessionLog(summary);
    
    // Log to DevTools console
    logToConsole(summary);
    
    // Show UI summary panel
    showSummaryPanel(summary);
  }

  // ============================================================================
  // SUMMARY & TELEMETRY
  // ============================================================================

  function generatePhaseSummary(){
    const g = global.game;
    const session = g?.__socialManeuversSession;
    
    if(!session){
      console.warn('[social-maneuvers] No session data to summarize');
      return null;
    }

    const alivePlayers = global.alivePlayers?.() || [];
    const summary = {
      metadata: {
        week: session.week,
        startTime: session.startTime,
        endTime: Date.now(),
        duration: Date.now() - session.startTime,
        playersCount: alivePlayers.length
      },
      resources: {
        energySpent: {},
        energyRemaining: {}
      },
      actions: {
        total: session.actionsThisPhase.length,
        byPlayer: {},
        byCategory: {},
        list: session.actionsThisPhase
      },
      relationships: {
        changes: [],
        newAlliances: [],
        newRivalries: []
      },
      memories: {
        created: session.actionsThisPhase.length,
        total: g.__socialManeuversMemory?.actions?.length || 0
      }
    };

    // Aggregate energy data
    alivePlayers.forEach(p => {
      const spent = session.energySpent.get(p.id) || 0;
      const remaining = getEnergy(p.id);
      summary.resources.energySpent[p.name || p.id] = spent;
      summary.resources.energyRemaining[p.name || p.id] = remaining;
    });

    // Aggregate actions by player and category
    session.actionsThisPhase.forEach(action => {
      // By player
      if(!summary.actions.byPlayer[action.actorName]){
        summary.actions.byPlayer[action.actorName] = 0;
      }
      summary.actions.byPlayer[action.actorName]++;

      // By category
      if(!summary.actions.byCategory[action.actionCategory]){
        summary.actions.byCategory[action.actionCategory] = 0;
      }
      summary.actions.byCategory[action.actionCategory]++;
    });

    // Analyze relationship changes
    session.relationshipDeltas.forEach((delta, key) => {
      const [actorId, targetId] = key.split('-').map(Number);
      const actor = global.getP?.(actorId);
      const target = global.getP?.(targetId);
      
      if(actor && target){
        const change = {
          actor: actor.name || actorId,
          target: target.name || targetId,
          delta: delta,
          newAffinity: actor.affinity?.[targetId] ?? 0,
          state: getRelationshipState(actor.affinity?.[targetId] ?? 0)
        };
        
        summary.relationships.changes.push(change);

        // Check for new alliances (crossed threshold)
        const newAffinity = actor.affinity?.[targetId] ?? 0;
        if(newAffinity >= 0.28 && (newAffinity - delta) < 0.28){
          summary.relationships.newAlliances.push({
            player1: actor.name || actorId,
            player2: target.name || targetId,
            affinity: newAffinity
          });
        }

        // Check for new rivalries
        if(newAffinity <= -0.28 && (newAffinity - delta) > -0.28){
          summary.relationships.newRivalries.push({
            player1: actor.name || actorId,
            player2: target.name || targetId,
            affinity: newAffinity
          });
        }
      }
    });

    return summary;
  }

  function getRelationshipState(affinity){
    const a = affinity ?? 0;
    if(a >= 0.65) return 'Romance/Bromance';
    if(a >= 0.48) return 'Ride or Die';
    if(a >= 0.28) return 'Allies';
    if(a >= 0.12) return 'Friendly';
    if(a >= -0.12) return 'Neutral';
    if(a >= -0.28) return 'Strained';
    if(a >= -0.48) return 'Enemies';
    return 'Arch Enemies';
  }

  function exportSessionLog(summary){
    if(!summary) return;

    const g = global.game;
    if(!g.__socialManeuversSessionLogs){
      g.__socialManeuversSessionLogs = [];
    }

    // Add to session logs
    g.__socialManeuversSessionLogs.push(summary);

    // Keep only last 20 sessions to prevent memory bloat
    if(g.__socialManeuversSessionLogs.length > 20){
      g.__socialManeuversSessionLogs.shift();
    }

    // Export to JSON for download (optional)
    try {
      const jsonStr = JSON.stringify(summary, null, 2);
      console.info('[social-maneuvers] Session log exported (available in game.__socialManeuversSessionLogs)');
      
      // Store latest summary for easy access
      g.__latestSocialSummary = summary;
      g.__latestSocialSummaryJSON = jsonStr;
    } catch(e) {
      console.error('[social-maneuvers] Failed to serialize summary:', e);
    }
  }

  function logToConsole(summary){
    if(!summary) return;

    console.group('🎭 Social Maneuvers Phase Summary');
    
    // Metadata
    console.log('%c📊 Phase Overview', 'font-weight: bold; color: #3498db');
    console.table({
      Week: summary.metadata.week,
      Duration: `${(summary.metadata.duration / 1000).toFixed(1)}s`,
      Players: summary.metadata.playersCount,
      'Total Actions': summary.actions.total,
      'Memories Created': summary.memories.created
    });

    // Resources
    if(Object.keys(summary.resources.energySpent).length > 0){
      console.log('%c⚡ Energy Report', 'font-weight: bold; color: #f39c12');
      console.table(summary.resources.energySpent);
    }

    // Actions by category
    if(Object.keys(summary.actions.byCategory).length > 0){
      console.log('%c🎯 Actions by Category', 'font-weight: bold; color: #9b59b6');
      console.table(summary.actions.byCategory);
    }

    // Actions by player
    if(Object.keys(summary.actions.byPlayer).length > 0){
      console.log('%c👥 Actions by Player', 'font-weight: bold; color: #2ecc71');
      console.table(summary.actions.byPlayer);
    }

    // Relationship changes
    if(summary.relationships.changes.length > 0){
      console.log('%c💕 Relationship Changes', 'font-weight: bold; color: #e74c3c');
      console.table(summary.relationships.changes.map(c => ({
        'From': c.actor,
        'To': c.target,
        'Delta': c.delta.toFixed(3),
        'New Affinity': c.newAffinity.toFixed(3),
        'Status': c.state
      })));
    }

    // New alliances
    if(summary.relationships.newAlliances.length > 0){
      console.log('%c🤝 New Alliances Formed', 'font-weight: bold; color: #27ae60');
      console.table(summary.relationships.newAlliances);
    }

    // New rivalries
    if(summary.relationships.newRivalries.length > 0){
      console.log('%c⚔️ New Rivalries Formed', 'font-weight: bold; color: #c0392b');
      console.table(summary.relationships.newRivalries);
    }

    // Action details
    if(summary.actions.list.length > 0){
      console.log('%c📝 Action Details', 'font-weight: bold; color: #16a085');
      console.table(summary.actions.list.map(a => ({
        Time: new Date(a.timestamp).toLocaleTimeString(),
        Actor: a.actorName,
        Action: a.actionLabel,
        Target: a.targetName,
        Category: a.actionCategory,
        Cost: a.energyCost,
        Outcome: a.outcome,
        'Affinity Δ': a.affinityDelta.toFixed(3)
      })));
    }

    console.log('%c💾 Access full data:', 'font-weight: bold; color: #95a5a6');
    console.log('  game.__latestSocialSummary (object)');
    console.log('  game.__latestSocialSummaryJSON (JSON string)');
    console.log('  game.__socialManeuversSessionLogs (all sessions)');
    
    console.groupEnd();
  }

  function showSummaryPanel(summary){
    if(!summary) return;

    // Create summary card UI
    const deck = document.getElementById('decisionDeck') || createSummaryDeck();
    
    const card = document.createElement('div');
    card.className = 'revealCard social-summary-card';
    card.style.cssText = 'max-width: 680px; pointer-events: auto;';

    const header = document.createElement('h3');
    header.textContent = '🎭 Social Phase Complete';
    header.style.cssText = 'margin: 0 0 1em; text-align: center;';
    card.appendChild(header);

    // Summary content
    const content = document.createElement('div');
    content.className = 'social-summary-content';
    content.style.cssText = 'font-size: 0.9rem; line-height: 1.6;';

    // Energy spent
    const totalEnergySpent = Object.values(summary.resources.energySpent).reduce((a,b) => a+b, 0);
    if(totalEnergySpent > 0){
      const energyLine = document.createElement('div');
      energyLine.innerHTML = `<strong>⚡ Energy:</strong> ${totalEnergySpent} spent across ${summary.actions.total} action${summary.actions.total !== 1 ? 's' : ''}`;
      content.appendChild(energyLine);
    }

    // Actions summary
    if(summary.actions.total > 0){
      const actionsLine = document.createElement('div');
      actionsLine.style.marginTop = '0.5em';
      const categories = Object.entries(summary.actions.byCategory)
        .map(([cat, count]) => `${count} ${cat}`)
        .join(', ');
      actionsLine.innerHTML = `<strong>🎯 Actions:</strong> ${categories}`;
      content.appendChild(actionsLine);
    }

    // Relationship changes
    if(summary.relationships.changes.length > 0){
      const relLine = document.createElement('div');
      relLine.style.marginTop = '0.5em';
      const significantChanges = summary.relationships.changes.filter(c => Math.abs(c.delta) > 0.1);
      relLine.innerHTML = `<strong>💕 Relationships:</strong> ${significantChanges.length} significant change${significantChanges.length !== 1 ? 's' : ''}`;
      content.appendChild(relLine);
    }

    // New alliances
    if(summary.relationships.newAlliances.length > 0){
      const allianceLine = document.createElement('div');
      allianceLine.style.cssText = 'margin-top: 0.5em; color: #27ae60; font-weight: 600;';
      const allianceNames = summary.relationships.newAlliances.map(a => 
        `${a.player1} & ${a.player2}`
      ).join(', ');
      allianceLine.innerHTML = `<strong>🤝 New Alliance${summary.relationships.newAlliances.length !== 1 ? 's' : ''}:</strong> ${allianceNames}`;
      content.appendChild(allianceLine);
    }

    // New rivalries
    if(summary.relationships.newRivalries.length > 0){
      const rivalryLine = document.createElement('div');
      rivalryLine.style.cssText = 'margin-top: 0.5em; color: #e74c3c; font-weight: 600;';
      const rivalryNames = summary.relationships.newRivalries.map(r => 
        `${r.player1} vs ${r.player2}`
      ).join(', ');
      rivalryLine.innerHTML = `<strong>⚔️ New Rivalry${summary.relationships.newRivalries.length !== 1 ? 's' : ''}:</strong> ${rivalryNames}`;
      content.appendChild(rivalryLine);
    }

    // Memories
    const memoryLine = document.createElement('div');
    memoryLine.style.marginTop = '0.5em';
    memoryLine.innerHTML = `<strong>💭 Memories:</strong> ${summary.memories.created} new, ${summary.memories.total} total`;
    content.appendChild(memoryLine);

    card.appendChild(content);

    // Buttons
    const buttonBar = document.createElement('div');
    buttonBar.style.cssText = 'display: flex; gap: 8px; margin-top: 1.5em; justify-content: center; flex-wrap: wrap;';

    // Details button
    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn small';
    detailsBtn.textContent = 'View Details';
    detailsBtn.onclick = () => showDetailedSummary(summary);
    buttonBar.appendChild(detailsBtn);

    // Copy JSON button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn small';
    copyBtn.textContent = 'Copy JSON';
    copyBtn.onclick = () => {
      const jsonStr = global.game?.__latestSocialSummaryJSON;
      if(jsonStr){
        navigator.clipboard.writeText(jsonStr).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 2000);
        }).catch(err => {
          console.error('Failed to copy:', err);
          // Fallback: create textarea
          const textarea = document.createElement('textarea');
          textarea.value = jsonStr;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 2000);
        });
      }
    };
    buttonBar.appendChild(copyBtn);

    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn small';
    continueBtn.textContent = 'Continue';
    continueBtn.style.cssText = 'background: var(--accent, #3498db);';
    continueBtn.onclick = () => {
      card.style.animation = 'popOut 0.4s ease forwards';
      setTimeout(() => {
        card.remove();
        if(deck && deck.childElementCount === 0){
          deck.remove();
        }
      }, 400);
    };
    buttonBar.appendChild(continueBtn);

    card.appendChild(buttonBar);

    // Clear deck and add card
    deck.innerHTML = '';
    deck.appendChild(card);
    card.style.animation = 'popIn 0.45s ease forwards';
  }

  function createSummaryDeck(){
    let deck = document.getElementById('decisionDeck');
    if(deck) return deck;
    
    const tv = document.getElementById('tv') || document.querySelector('.tv') || document.body;
    deck = document.createElement('div');
    deck.id = 'decisionDeck';
    deck.style.cssText = 'position:absolute;inset:var(--tv-safe-top,10%) var(--tv-safe-x,5%) var(--tv-safe-bottom,10%) var(--tv-safe-x,5%);display:grid;place-items:center;gap:8px;z-index:12;pointer-events:none;';
    tv.appendChild(deck);
    return deck;
  }

  function showDetailedSummary(summary){
    // Create detailed modal
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';
    
    const panel = document.createElement('div');
    panel.className = 'revealCard';
    panel.style.cssText = 'max-width:800px;max-height:80vh;overflow-y:auto;width:100%;';

    const header = document.createElement('h3');
    header.textContent = '📊 Detailed Social Phase Report';
    header.style.textAlign = 'center';
    panel.appendChild(header);

    const detailContent = document.createElement('div');
    detailContent.style.cssText = 'font-size:0.85rem;line-height:1.5;';

    // Add all sections
    detailContent.innerHTML = `
      <div style="margin-bottom:1.5em;">
        <h4 style="color:#3498db;margin:0.5em 0;">Phase Overview</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;">
          <div><strong>Week:</strong> ${summary.metadata.week}</div>
          <div><strong>Duration:</strong> ${(summary.metadata.duration/1000).toFixed(1)}s</div>
          <div><strong>Players:</strong> ${summary.metadata.playersCount}</div>
          <div><strong>Total Actions:</strong> ${summary.actions.total}</div>
        </div>
      </div>

      ${Object.keys(summary.resources.energySpent).length > 0 ? `
      <div style="margin-bottom:1.5em;">
        <h4 style="color:#f39c12;margin:0.5em 0;">⚡ Energy Spent</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;">
          ${Object.entries(summary.resources.energySpent).map(([name, spent]) => 
            `<div><strong>${name}:</strong> ${spent} (${summary.resources.energyRemaining[name]} remaining)</div>`
          ).join('')}
        </div>
      </div>` : ''}

      ${summary.relationships.changes.length > 0 ? `
      <div style="margin-bottom:1.5em;">
        <h4 style="color:#e74c3c;margin:0.5em 0;">💕 Relationship Changes</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;">
          ${summary.relationships.changes.map(c => 
            `<div style="margin:4px 0;">
              <strong>${c.actor} → ${c.target}:</strong> 
              ${c.delta >= 0 ? '+' : ''}${c.delta.toFixed(3)} 
              (${c.state}, ${c.newAffinity.toFixed(3)})
            </div>`
          ).join('')}
        </div>
      </div>` : ''}

      ${summary.actions.list.length > 0 ? `
      <div style="margin-bottom:1.5em;">
        <h4 style="color:#16a085;margin:0.5em 0;">📝 Action Log</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;max-height:300px;overflow-y:auto;">
          ${summary.actions.list.map(a => 
            `<div style="margin:6px 0;padding:6px;background:rgba(0,0,0,0.2);border-radius:3px;font-size:0.8rem;">
              <div><strong>${new Date(a.timestamp).toLocaleTimeString()}</strong> - ${a.actorName} → ${a.targetName}</div>
              <div style="color:#95a5a6;margin-top:2px;">
                ${a.actionLabel} (${a.actionCategory}, cost ${a.energyCost}) 
                → ${a.outcome} 
                (Δ ${a.affinityDelta >= 0 ? '+' : ''}${a.affinityDelta.toFixed(3)})
              </div>
            </div>`
          ).join('')}
        </div>
      </div>` : ''}

      <div style="margin-top:1em;padding:10px;background:rgba(52,152,219,0.2);border-radius:4px;font-size:0.75rem;color:#95a5a6;">
        <strong>💾 Developer Access:</strong><br>
        • <code>game.__latestSocialSummary</code> (object)<br>
        • <code>game.__latestSocialSummaryJSON</code> (JSON string)<br>
        • <code>game.__socialManeuversSessionLogs</code> (history)
      </div>
    `;

    panel.appendChild(detailContent);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn small';
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'display:block;margin:1em auto 0;';
    closeBtn.onclick = () => modal.remove();
    panel.appendChild(closeBtn);

    modal.appendChild(panel);
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.onclick = (e) => {
      if(e.target === modal) modal.remove();
    };
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
