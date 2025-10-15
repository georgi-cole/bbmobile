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

  function getAvailableActions(playerId, targetId){
    const energy = getEnergy(playerId);
    const actor = global.getP?.(playerId);
    const target = targetId ? global.getP?.(targetId) : null;
    
    return SOCIAL_ACTIONS.map(action => {
      const canAfford = action.cost <= energy;
      
      // Get evaluation from config system if available and target is specified
      let evaluation = null;
      if (target && global.SocialActionConfig) {
        evaluation = global.SocialActionConfig.getActionEvaluation(action.id, actor, target, action);
      }
      
      return {
        ...action,
        canAfford,
        evaluation
      };
    }).filter(action => {
      // Always show all actions, but mark them appropriately
      return true;
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

    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    
    if(!actor || !target){
      return { success: false, reason: 'player_not_found' };
    }

    // Get action evaluation
    let evaluation = null;
    let chanceRoll = Math.random();
    let succeeded = true;
    
    if(global.SocialActionConfig){
      evaluation = global.SocialActionConfig.getActionEvaluation(actionId, actor, target, action);
      
      // Check if action is gated
      if(!evaluation.available){
        return {
          success: false,
          reason: 'gated',
          message: evaluation.gateReasons.join('; '),
          gateReasons: evaluation.gateReasons
        };
      }
      
      // Roll for success based on calculated chance
      succeeded = chanceRoll < evaluation.finalChance;
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

    // Log telemetry
    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    const targetName = global.safeName?.(targetId) || `Player ${targetId}`;
    
    const telemetry = {
      timestamp: Date.now(),
      week: global.game?.week || 1,
      actorId,
      actorName,
      targetId,
      targetName,
      actionId,
      actionLabel: action.label,
      actionCost: action.cost,
      baseChance: evaluation?.baseChance ?? 0.5,
      modifiers: evaluation?.modifiers || [],
      finalChance: evaluation?.finalChance ?? 0.5,
      chanceRoll,
      succeeded,
      energyRemaining: getEnergy(actorId)
    };
    
    console.info(`[social-maneuvers] ${actorName} -> ${targetName}: ${action.label} (${(telemetry.finalChance * 100).toFixed(0)}% chance, rolled ${(chanceRoll * 100).toFixed(0)}%, ${succeeded ? 'SUCCESS' : 'FAILED'})`);
    console.info('[social-maneuvers] Telemetry:', telemetry);
    
    // Store telemetry
    if(!global.game.__socialManeuversTelemetry){
      global.game.__socialManeuversTelemetry = [];
    }
    global.game.__socialManeuversTelemetry.push(telemetry);
    
    // Keep only last 100 telemetry entries
    if(global.game.__socialManeuversTelemetry.length > 100){
      global.game.__socialManeuversTelemetry.shift();
    }

    // Process outcome
    const outcome = processActionOutcome(actorId, targetId, action, succeeded, evaluation);

    return {
      success: true,
      action: action,
      outcome: outcome,
      evaluation: evaluation,
      succeeded: succeeded,
      telemetry: telemetry,
      energyRemaining: getEnergy(actorId)
    };
  }

  // ============================================================================
  // OUTCOME PROCESSING (PLACEHOLDER)
  // ============================================================================
  
  function processActionOutcome(actorId, targetId, action, succeeded, evaluation){
    // PLACEHOLDER: This will integrate with existing social systems
    // For now, basic affinity adjustments
    
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    
    if(!actor || !target){
      return { type: 'error', message: 'Player not found' };
    }

    // Determine outcome based on success/failure and action category
    let affinityChange = 0;
    let outcomeType = 'neutral';
    let message = '';

    if(succeeded){
      // Success outcomes
      switch(action.category){
        case 'friendly':
          affinityChange = 0.05 + Math.random() * 0.05;
          outcomeType = 'positive';
          message = `${action.label} went well!`;
          break;
        case 'strategic':
          affinityChange = 0.03 + Math.random() * 0.07;
          outcomeType = 'positive';
          message = `${action.label} was productive.`;
          break;
        case 'aggressive':
          affinityChange = -0.02 + Math.random() * 0.04;
          outcomeType = 'neutral';
          message = `${action.label} got your point across.`;
          break;
        default:
          affinityChange = 0.02;
          message = `${action.label} completed.`;
      }
    } else {
      // Failure outcomes - apply backlash
      const states = evaluation?.states || {};
      const backlashMultiplier = states.risky ? 1.5 : 1.0;
      
      switch(action.category){
        case 'friendly':
          affinityChange = -0.03 * backlashMultiplier;
          outcomeType = 'negative';
          message = `${action.label} felt forced.`;
          break;
        case 'strategic':
          affinityChange = -0.05 * backlashMultiplier;
          outcomeType = 'negative';
          message = `${action.label} backfired.`;
          break;
        case 'aggressive':
          affinityChange = -0.08 * backlashMultiplier;
          outcomeType = 'negative';
          message = `${action.label} created serious tension!`;
          break;
        default:
          affinityChange = -0.04 * backlashMultiplier;
          message = `${action.label} didn't go as planned.`;
      }
    }

    // Apply affinity change (integrate with existing system)
    if(actor.affinity && typeof actor.affinity === 'object'){
      const current = actor.affinity[targetId] ?? 0;
      actor.affinity[targetId] = current + affinityChange;
    }

    // Record in memory system
    recordActionInMemory(actorId, targetId, action, succeeded ? 'success' : 'failure');

    // Apply trait effects
    applyTraitEffects(actorId, targetId, action);

    return {
      type: outcomeType,
      message: message,
      affinityChange: affinityChange,
      succeeded: succeeded
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
      const playerSection = createPlayerSelection(playerId, otherPlayers, (player) => {
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

      const availableActions = getAvailableActions(playerId, selectedPlayer.id);
      
      if(availableActions.length === 0){
        const emptyState = document.createElement('div');
        emptyState.className = 'social-empty-state';
        emptyState.textContent = 'No actions available';
        actionsList.appendChild(emptyState);
        executeBtn.disabled = true;
        return;
      }

      availableActions.forEach(action => {
        const actionItem = createActionItem(action, energy, selectedPlayer, (selected) => {
          selectedAction = selected;
          
          // Update visual selection
          actionsList.querySelectorAll('.social-action-item').forEach(item => {
            item.classList.remove('selected');
          });
          actionItem.classList.add('selected');
          
          // Disable execute button if action is locked
          const isLocked = action.evaluation?.states?.locked || false;
          const canAfford = action.canAfford;
          executeBtn.disabled = isLocked || !canAfford;
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

  function createPlayerSelection(playerId, players, onSelect){
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

    const actor = global.getP?.(playerId);

    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'social-player-card';
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'player-name';
      nameDiv.textContent = player.name || `Player ${player.id}`;
      card.appendChild(nameDiv);
      
      // Show relationship info
      if(actor){
        const affinity = actor.affinity?.[player.id] ?? 0;
        const affinityDiv = document.createElement('div');
        affinityDiv.className = 'player-affinity';
        affinityDiv.style.fontSize = '0.75em';
        affinityDiv.style.opacity = '0.8';
        affinityDiv.style.marginTop = '4px';
        
        let affinityLabel = 'Neutral';
        if(affinity >= 0.28) affinityLabel = 'Allies';
        else if(affinity >= 0.12) affinityLabel = 'Friendly';
        else if(affinity <= -0.28) affinityLabel = 'Enemies';
        else if(affinity <= -0.12) affinityLabel = 'Strained';
        
        affinityDiv.textContent = `${affinityLabel} (${(affinity * 100).toFixed(0)}%)`;
        card.appendChild(affinityDiv);
      }
      
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

  function createActionItem(action, currentEnergy, targetPlayer, onSelect){
    const item = document.createElement('div');
    item.className = 'social-action-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    
    const canAfford = currentEnergy >= action.cost;
    const evaluation = action.evaluation;
    const states = evaluation?.states || {};
    
    // Determine if action is locked
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

    const header = document.createElement('div');
    header.className = 'social-action-header';
    
    const name = document.createElement('div');
    name.className = 'social-action-name';
    name.textContent = action.label;
    header.appendChild(name);

    // Badges container
    const badges = document.createElement('div');
    badges.className = 'social-action-badges';
    badges.style.display = 'flex';
    badges.style.gap = '4px';
    badges.style.alignItems = 'center';
    
    // Add state badges
    if(isLocked){
      const lockBadge = document.createElement('span');
      lockBadge.className = 'badge badge-locked';
      lockBadge.textContent = '🔒';
      lockBadge.title = 'Locked';
      badges.appendChild(lockBadge);
    }
    if(isBoosted){
      const boostBadge = document.createElement('span');
      boostBadge.className = 'badge badge-boosted';
      boostBadge.textContent = '⬆️';
      boostBadge.title = 'Boosted success chance';
      badges.appendChild(boostBadge);
    }
    if(isDiscounted){
      const discountBadge = document.createElement('span');
      discountBadge.className = 'badge badge-discounted';
      discountBadge.textContent = '💰';
      discountBadge.title = 'Reduced cost';
      badges.appendChild(discountBadge);
    }
    if(isRisky){
      const riskyBadge = document.createElement('span');
      riskyBadge.className = 'badge badge-risky';
      riskyBadge.textContent = '⚠️';
      riskyBadge.title = 'Higher backlash on failure';
      badges.appendChild(riskyBadge);
    }
    
    header.appendChild(badges);

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

    // Show locked reason
    if(isLocked && evaluation){
      const lockReason = document.createElement('div');
      lockReason.className = 'social-action-lock-reason';
      lockReason.style.cssText = 'font-size:0.75em;color:#ff6666;margin-top:4px;';
      lockReason.textContent = evaluation.gateReasons.join('; ') || 'Requirements not met';
      item.appendChild(lockReason);
    }

    // Add tooltip with chance breakdown
    if(evaluation && !isLocked){
      const tooltip = createChanceTooltip(evaluation);
      item.appendChild(tooltip);
      
      // Show tooltip on hover
      item.addEventListener('mouseenter', () => {
        tooltip.style.display = 'block';
      });
      item.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    }

    const category = document.createElement('span');
    category.className = `social-action-category ${action.category}`;
    category.textContent = action.category;
    item.appendChild(category);

    if(!isLocked && canAfford){
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
  
  function createChanceTooltip(evaluation){
    const tooltip = document.createElement('div');
    tooltip.className = 'social-action-tooltip';
    tooltip.style.cssText = 'display:none;position:absolute;background:#1a1a2e;border:1px solid #444;border-radius:6px;padding:8px;z-index:1000;min-width:200px;box-shadow:0 4px 8px rgba(0,0,0,0.3);';
    
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:bold;margin-bottom:6px;color:#f7b955;';
    title.textContent = 'Success Chance Breakdown';
    tooltip.appendChild(title);
    
    // Base chance
    const baseLine = document.createElement('div');
    baseLine.style.cssText = 'font-size:0.85em;margin:2px 0;';
    baseLine.innerHTML = `Base: <strong>${(evaluation.baseChance * 100).toFixed(0)}%</strong>`;
    tooltip.appendChild(baseLine);
    
    // Modifiers
    if(evaluation.modifiers && evaluation.modifiers.length > 0){
      const modSep = document.createElement('div');
      modSep.style.cssText = 'border-top:1px solid #333;margin:6px 0 4px 0;';
      tooltip.appendChild(modSep);
      
      evaluation.modifiers.forEach(mod => {
        const modLine = document.createElement('div');
        modLine.style.cssText = 'font-size:0.85em;margin:2px 0;';
        const sign = mod.value >= 0 ? '+' : '';
        const color = mod.value >= 0 ? '#66ff66' : '#ff6666';
        modLine.innerHTML = `${mod.label}: <span style="color:${color}">${sign}${(mod.value * 100).toFixed(0)}%</span>`;
        tooltip.appendChild(modLine);
      });
    }
    
    // Final chance
    const finalSep = document.createElement('div');
    finalSep.style.cssText = 'border-top:1px solid #333;margin:6px 0 4px 0;';
    tooltip.appendChild(finalSep);
    
    const finalLine = document.createElement('div');
    finalLine.style.cssText = 'font-size:0.9em;margin:4px 0;font-weight:bold;';
    finalLine.innerHTML = `Final Chance: <span style="color:#66ff66">${(evaluation.finalChance * 100).toFixed(0)}%</span>`;
    tooltip.appendChild(finalLine);
    
    return tooltip;
  }

  function showFeedback(result){
    // Remove any existing feedback
    const existing = document.querySelector('.social-feedback-panel');
    if(existing){
      existing.remove();
    }

    if(!result.success){
      let message = result.message || result.reason;
      if(result.gateReasons && result.gateReasons.length > 0){
        message = result.gateReasons.join('; ');
      }
      const panel = createFeedbackPanel('negative', 'Action Failed', message);
      document.body.appendChild(panel);
      setTimeout(() => panel.remove(), 3000);
      return;
    }

    const outcome = result.outcome;
    const succeeded = result.succeeded;
    const telemetry = result.telemetry;
    
    // Determine feedback type based on outcome
    let feedbackType = outcome.type;
    if(!succeeded){
      feedbackType = 'negative';
    }
    
    // Create detailed message
    let message = outcome.message;
    if(telemetry){
      message += `\n${succeeded ? '✓' : '✗'} ${(telemetry.finalChance * 100).toFixed(0)}% chance (rolled ${(telemetry.chanceRoll * 100).toFixed(0)}%)`;
    }
    
    const panel = createFeedbackPanel(
      feedbackType, 
      result.action.label,
      message
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
