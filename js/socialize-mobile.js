// MODULE: socialize-mobile.js
// Mobile-first Socialize modal and TV launcher with resource management (energy, influence, information)

(function(global){
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Resource state management - thin view over canonical SocialManeuvers store
  function getResourceState() {
    const g = global.game || {};
    const humanId = g.humanId;
    
    // Always use canonical SocialManeuvers resource system
    if (global.SocialManeuvers?.SocialResources) {
      try {
        const resources = global.SocialManeuvers.SocialResources.getAll(humanId);
        return {
          energy: resources.energy || 0,
          influence: resources.influence || 0,
          information: resources.information || 0
        };
      } catch(e) {
        console.error('[socialize-mobile] Failed to get SocialManeuvers resources:', e);
        // Initialize if not yet seeded
        if (global.SocialManeuvers?.SocialResources?.init) {
          global.SocialManeuvers.SocialResources.init(humanId);
          const resources = global.SocialManeuvers.SocialResources.getAll(humanId);
          return {
            energy: resources.energy || 0,
            influence: resources.influence || 0,
            information: resources.information || 0
          };
        }
      }
    }
    
    // No fallback - always require canonical store
    console.warn('[socialize-mobile] SocialManeuvers not available - returning zeros');
    return { energy: 0, influence: 0, information: 0 };
  }

  function updateResourceState(delta) {
    const g = global.game || {};
    const humanId = g.humanId;
    
    // Always use canonical SocialManeuvers resource system
    if (global.SocialManeuvers?.SocialResources) {
      try {
        // Use earn/spend methods from canonical store
        if (delta.energy < 0 || delta.influence < 0 || delta.information < 0) {
          // Spending resources
          const costs = {};
          if (delta.energy < 0) costs.energy = -delta.energy;
          if (delta.influence < 0) costs.influence = -delta.influence;
          if (delta.information < 0) costs.information = -delta.information;
          global.SocialManeuvers.SocialResources.spend(humanId, costs);
        } else {
          // Earning resources
          const gains = {};
          if (delta.energy > 0) gains.energy = delta.energy;
          if (delta.influence > 0) gains.influence = delta.influence;
          if (delta.information > 0) gains.information = delta.information;
          global.SocialManeuvers.SocialResources.earn(humanId, gains);
        }
        updateHUDDisplay();
        
        // Trigger resources-changed event for live updates
        if (typeof global.dispatchEvent === 'function') {
          const event = new CustomEvent('social-resources-changed', {
            detail: { playerId: humanId, delta, resources: getResourceState() }
          });
          global.dispatchEvent(event);
        }
        return;
      } catch(e) {
        console.error('[socialize-mobile] Failed to update SocialManeuvers resources:', e);
      }
    }
    
    console.error('[socialize-mobile] Cannot update resources - SocialManeuvers not available');
  }

  function resetWeeklyResources() {
    // No-op: weekly reset is handled by SocialManeuvers.SocialResources.resetWeekly
    // This is called from onSocialPhaseStart with proper weekly bonuses/penalties
    console.info('[socialize-mobile] Weekly reset handled by canonical SocialManeuvers store');
    updateHUDDisplay();
  }

  // Ensure launcher exists in TV overlay
  function ensureSocializeLauncher() {
    let launcher = $('#socializeLauncher');
    if (launcher) return launcher;

    const tvOverlay = $('#tvOverlay');
    if (!tvOverlay) {
      console.warn('[Socialize] tvOverlay not found');
      return null;
    }

    launcher = document.createElement('div');
    launcher.id = 'socializeLauncher';
    launcher.className = 'socialize-launcher';
    launcher.innerHTML = `
      <div class="socialize-hud">
        <div class="socialize-hud-title">Social Phase</div>
        <div class="socialize-hud-resources">
          <div class="resource-badge" data-tip="Energy: Used for all social actions">
            <span class="resource-icon">⚡</span>
            <span class="resource-value" id="hudEnergy">5</span>
          </div>
          <div class="resource-badge" data-tip="Influence: Gained from positive interactions">
            <span class="resource-icon">🤝</span>
            <span class="resource-value" id="hudInfluence">0</span>
          </div>
          <div class="resource-badge" data-tip="Information: Gained from strategic talks">
            <span class="resource-icon">💡</span>
            <span class="resource-value" id="hudInformation">0</span>
          </div>
          <button class="resource-help-btn" id="resourceHelpBtn" aria-label="Help">?</button>
        </div>
      </div>
      <button class="socialize-open-btn" id="socializeOpenBtn">Socialize</button>
    `;

    tvOverlay.appendChild(launcher);

    // Attach event listeners
    $('#socializeOpenBtn')?.addEventListener('click', openSocializeModal);
    $('#resourceHelpBtn')?.addEventListener('click', showResourceHelp);
    
    // Subscribe to resource-changed events for live updates
    global.addEventListener('social-resources-changed', (event) => {
      updateHUDDisplay();
    });

    return launcher;
  }

  function updateHUDDisplay() {
    const res = getResourceState();
    const hudEnergy = $('#hudEnergy');
    const hudInfluence = $('#hudInfluence');
    const hudInformation = $('#hudInformation');

    if (hudEnergy) hudEnergy.textContent = res.energy;
    if (hudInfluence) hudInfluence.textContent = res.influence;
    if (hudInformation) hudInformation.textContent = res.information;

    // Also update modal HUD if open
    const modalEnergy = $('#modalHudEnergy');
    const modalInfluence = $('#modalHudInfluence');
    const modalInformation = $('#modalHudInformation');

    if (modalEnergy) modalEnergy.textContent = res.energy;
    if (modalInfluence) modalInfluence.textContent = res.influence;
    if (modalInformation) modalInformation.textContent = res.information;

    // Update button state
    const openBtn = $('#socializeOpenBtn');
    if (openBtn) {
      openBtn.disabled = res.energy <= 0;
      openBtn.textContent = res.energy > 0 ? 'Socialize' : 'No Energy';
    }
  }

  function showResourceHelp() {
    const popover = document.createElement('div');
    popover.className = 'resource-help-popover';
    popover.innerHTML = `
      <div class="help-popover-content">
        <button class="help-close-btn" aria-label="Close">×</button>
        <h4>Social Resources</h4>
        <div class="help-item">
          <span class="help-icon">⚡</span>
          <div>
            <strong>Energy</strong>
            <p>Used for all social actions. Start with 5 per week (+ weekly bonuses). Actions cost 1-3 energy each.</p>
          </div>
        </div>
        <div class="help-item">
          <span class="help-icon">🤝</span>
          <div>
            <strong>Influence</strong>
            <p>Gained from successful positive interactions like alliances and gifts.</p>
          </div>
        </div>
        <div class="help-item">
          <span class="help-icon">💡</span>
          <div>
            <strong>Information</strong>
            <p>Gained from strategic conversations and intelligence gathering.</p>
          </div>
        </div>
      </div>
    `;

    // Position near help button
    const helpBtn = $('#resourceHelpBtn');
    if (helpBtn) {
      const rect = helpBtn.getBoundingClientRect();
      popover.style.position = 'fixed';
      popover.style.top = `${rect.bottom + 8}px`;
      popover.style.left = `${Math.max(16, rect.left - 120)}px`;
    }

    document.body.appendChild(popover);

    // Close handlers
    const closePopover = () => popover.remove();
    popover.querySelector('.help-close-btn')?.addEventListener('click', closePopover);
    
    // Close on outside click
    setTimeout(() => {
      const handleOutsideClick = (e) => {
        if (!popover.contains(e.target) && e.target !== helpBtn) {
          closePopover();
          document.removeEventListener('click', handleOutsideClick);
        }
      };
      document.addEventListener('click', handleOutsideClick);
    }, 100);
  }

  // Create full-screen Socialize modal
  function openSocializeModal() {
    const res = getResourceState();
    if (res.energy <= 0) {
      global.addLog?.('No energy remaining for social actions.', 'warn');
      return;
    }

    // Disable background scrolling
    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'socializeModal';
    modal.className = 'socialize-modal';
    modal.innerHTML = `
      <div class="socialize-modal-backdrop"></div>
      <div class="socialize-modal-content">
        <button class="modal-close-btn" aria-label="Close">×</button>
        
        <div class="modal-header-hud">
          <div class="modal-hud-item">
            <span class="resource-icon">⚡</span>
            <span id="modalHudEnergy">${res.energy}</span>
          </div>
          <div class="modal-hud-item">
            <span class="resource-icon">🤝</span>
            <span id="modalHudInfluence">${res.influence}</span>
          </div>
          <div class="modal-hud-item">
            <span class="resource-icon">💡</span>
            <span id="modalHudInformation">${res.information}</span>
          </div>
        </div>

        <div class="modal-body">
          <section class="modal-section player-picker-section">
            <h3>Select Players</h3>
            <div class="player-picker-instructions">
              Tap to select. Hold Ctrl/Cmd for multi-select group actions.
            </div>
            <div class="player-picker" id="playerPicker"></div>
          </section>

          <section class="modal-section action-menu-section">
            <h3>Choose Action</h3>
            <div class="action-menu" id="actionMenu"></div>
          </section>

          <section class="modal-section feedback-section">
            <h3>Recent Activity</h3>
            <div class="feedback-area" id="feedbackArea">
              <div class="feedback-placeholder">Your actions will appear here.</div>
            </div>
          </section>

          <section class="modal-section history-section">
            <h3>History</h3>
            <div class="history-area" id="historyArea">
              <div class="history-placeholder">Social history will appear here.</div>
            </div>
          </section>
        </div>

        <div class="modal-footer">
          <button class="execute-btn" id="executeActionBtn" disabled>Execute Action (Cost: 1⚡)</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Populate player picker
    populatePlayerPicker();

    // Populate action menu
    populateActionMenu();

    // Attach event listeners
    $('.modal-close-btn')?.addEventListener('click', closeSocializeModal);
    $('.socialize-modal-backdrop')?.addEventListener('click', closeSocializeModal);
    $('#executeActionBtn')?.addEventListener('click', executeAction);

    // Animation
    requestAnimationFrame(() => {
      modal.classList.add('open');
    });
  }

  function closeSocializeModal(showToast = false) {
    const modal = $('#socializeModal');
    if (!modal) return;

    // Re-enable scrolling
    document.body.style.overflow = '';

    // Animate out
    modal.classList.remove('open');
    setTimeout(() => {
      modal.remove();
      
      if (showToast) {
        showSocialUpdateToast();
      }
    }, 300);
  }

  function populatePlayerPicker() {
    const picker = $('#playerPicker');
    if (!picker) return;

    const g = global.game || {};
    const you = global.getP?.(g.humanId);
    const alive = global.alivePlayers?.() || [];
    const others = alive.filter(p => p.id !== you?.id && !p.evicted);

    picker.innerHTML = '';

    others.forEach(player => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.dataset.playerId = player.id;
      
      const avatar = document.createElement('img');
      avatar.className = 'player-avatar';
      avatar.alt = player.name;
      const resolveAvatar = (global.Game || global).resolveAvatar;
      avatar.src = resolveAvatar?.(player) || player.avatar || player.img || player.photo ||
        global.getDicebearUrl?.(player.name) || `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(player.name)}`;
      
      const name = document.createElement('div');
      name.className = 'player-name';
      name.textContent = player.name;

      // Add relationship label + affinity percentage
      const you = global.getP(global.game.humanId);
      const affinity = you?.affinity?.[player.id] ?? 0;
      const affinityPercent = Math.round(affinity * 100);
      const relationshipLabel = getRelationshipLabel(affinity);
      
      const relationshipInfo = document.createElement('div');
      relationshipInfo.className = 'player-relationship';
      relationshipInfo.innerHTML = `
        <span class="relationship-label ${getRelationshipClass(affinity)}">${relationshipLabel}</span>
        <span class="relationship-percent">${affinityPercent > 0 ? '+' : ''}${affinityPercent}%</span>
      `;

      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(relationshipInfo);

      card.addEventListener('click', (e) => {
        // Multi-select support
        if (!e.ctrlKey && !e.metaKey) {
          // Clear other selections
          $$('.player-card.selected').forEach(c => c.classList.remove('selected'));
        }
        card.classList.toggle('selected');
        updateExecuteButton();
        
        // Refresh action menu to show evaluations for selected target
        populateActionMenu();
      });

      picker.appendChild(card);
    });
  }

  // Get relationship label from affinity (matching social.js)
  function getRelationshipLabel(affinity) {
    const a = affinity ?? 0;
    if (a >= 0.65) return 'Romance/Bromance';
    if (a >= 0.48) return 'Ride or Die';
    if (a >= 0.28) return 'Allies';
    if (a >= 0.12) return 'Friendly';
    if (a >= -0.12) return 'Neutral';
    if (a >= -0.28) return 'Strained';
    if (a >= -0.48) return 'Enemies';
    return 'Arch Enemies';
  }

  // Get CSS class for relationship
  function getRelationshipClass(affinity) {
    const a = affinity ?? 0;
    if (a >= 0.28) return 'relationship-positive';
    if (a >= -0.12) return 'relationship-neutral';
    return 'relationship-negative';
  }

  function populateActionMenu() {
    const menu = $('#actionMenu');
    if (!menu) return;

    const res = getResourceState();
    const g = global.game || {};
    const humanId = g.humanId;
    const you = global.getP?.(humanId);
    
    // Get selected target for evaluation
    const selectedCard = $('.player-card.selected');
    const targetId = selectedCard ? parseInt(selectedCard.dataset.playerId) : null;
    const target = targetId ? global.getP?.(targetId) : null;

    // Use canonical action catalog from SocialManeuvers, or fallback to unified catalog
    let actions = [];
    if (global.SocialManeuvers?.SOCIAL_ACTIONS) {
      // Use canonical catalog from social-maneuvers.js
      actions = global.SocialManeuvers.SOCIAL_ACTIONS.map(action => ({
        id: action.id,
        label: action.label,
        icon: getActionIcon(action.id),
        cost: action.costs || { energy: action.cost || 1 },
        require: {},
        category: action.category,
        description: action.description
      }));
    } else {
      // Fallback unified catalog (merged + deduped)
      actions = [
        { 
          id: 'smalltalk', 
          label: 'Small Talk', 
          icon: '💬', 
          cost: { energy: 1 },
          require: {},
          category: 'friendly',
          description: 'Light conversation to build rapport'
        },
        { 
          id: 'strategize', 
          label: 'Strategize', 
          icon: '💡', 
          cost: { energy: 2 },
          require: {},
          category: 'strategic',
          description: 'Deep strategic conversation to align game plans (includes Strategy Chat/Late Night Talk)'
        },
        { 
          id: 'confide', 
          label: 'Confide', 
          icon: '🤫', 
          cost: { energy: 2 },
          require: {},
          category: 'friendly',
          description: 'Share personal thoughts and build trust'
        },
        { 
          id: 'interrogate', 
          label: 'Interrogate', 
          icon: '🔍', 
          cost: { energy: 2 },
          require: {},
          category: 'strategic',
          description: 'Press for information about plans'
        },
        { 
          id: 'compliment', 
          label: 'Compliment', 
          icon: '✨', 
          cost: { energy: 1 },
          require: {},
          category: 'friendly',
          description: 'Give genuine praise. May refund energy!'
        },
        { 
          id: 'mediate', 
          label: 'Mediate', 
          icon: '⚖️', 
          cost: { energy: 2 },
          require: { influence: 1, information: 1 },
          category: 'strategic',
          description: 'Mediate conflict between others. Requires influence and information.'
        },
        { 
          id: 'observe', 
          label: 'Observe', 
          icon: '👁️', 
          cost: { energy: 1 },
          require: {},
          category: 'strategic',
          description: 'Watch and listen quietly'
        },
        { 
          id: 'confront', 
          label: 'Confront', 
          icon: '⚔️', 
          cost: { energy: 3 },
          require: {},
          category: 'aggressive',
          description: 'Direct confrontation - air grievances'
        },
        { 
          id: 'alliance', 
          label: 'Form Alliance', 
          icon: '🤝', 
          cost: { energy: 1 },
          require: {},
          category: 'friendly',
          description: 'Build a strong alliance with mutual trust and safety.'
        },
        { 
          id: 'gift', 
          label: 'Give Gift', 
          icon: '🎁', 
          cost: { energy: 1 },
          require: {},
          category: 'friendly',
          description: 'Give a thoughtful gift to improve relationship.'
        },
        { 
          id: 'flirt', 
          label: 'Flirt', 
          icon: '😊', 
          cost: { energy: 1 },
          require: {},
          category: 'friendly',
          description: 'Light romantic or friendly flirtation.'
        },
        { 
          id: 'workout', 
          label: 'Workout', 
          icon: '💪', 
          cost: { energy: 1 },
          require: {},
          category: 'friendly',
          description: 'Bond through physical activity and shared fitness (includes Workout Together)'
        },
        { 
          id: 'cook', 
          label: 'Cook', 
          icon: '🍳', 
          cost: { energy: 1 },
          require: {},
          category: 'friendly',
          description: 'Prepare and share a meal together (includes Cook Meal)'
        },
        { 
          id: 'apologize', 
          label: 'Apologize', 
          icon: '🙏', 
          cost: { energy: 1 },
          require: {},
          category: 'friendly',
          description: 'Mend fences with a sincere apology.'
        },
        { 
          id: 'prank', 
          label: 'Prank', 
          icon: '😜', 
          cost: { energy: 1 },
          require: {},
          category: 'risky',
          description: 'Pull a prank - might backfire or strengthen bonds.'
        },
        { 
          id: 'taunt', 
          label: 'Taunt', 
          icon: '😤', 
          cost: { energy: 1 },
          require: {},
          category: 'aggressive',
          description: 'Taunt and provoke - damages relationship.'
        }
      ];
    }

    menu.innerHTML = '';

    actions.forEach(action => {
      const energyCost = action.cost.energy || 0;
      const influenceReq = action.cost.influence || action.require.influence || 0;
      const informationReq = action.cost.information || action.require.information || 0;
      
      const canAfford = res.energy >= energyCost && 
                        res.influence >= influenceReq && 
                        res.information >= informationReq;
      
      // Get evaluation from SocialActionConfig if available and target selected
      let evaluation = null;
      if (target && global.SocialActionConfig?.getActionEvaluation) {
        evaluation = global.SocialActionConfig.getActionEvaluation(action.id, you, target, action);
      }
      
      const btn = document.createElement('button');
      btn.className = `action-btn action-${action.category}`;
      btn.dataset.actionId = action.id;
      
      if (!canAfford || (evaluation && !evaluation.available)) {
        btn.classList.add('disabled');
        btn.disabled = true;
      }

      // Build tooltip for disabled actions
      let disabledReason = '';
      if (!canAfford) {
        const missing = [];
        if (res.energy < energyCost) missing.push(`Need ${energyCost - res.energy} more ⚡`);
        if (res.influence < influenceReq) missing.push(`Need ${influenceReq - res.influence} more 🤝`);
        if (res.information < informationReq) missing.push(`Need ${informationReq - res.information} more 💡`);
        disabledReason = missing.join(', ');
      } else if (evaluation && !evaluation.available) {
        disabledReason = evaluation.gateReasons?.join('; ') || 'Requirements not met';
      }

      btn.innerHTML = `
        <div class="action-header">
          <span class="action-icon">${action.icon}</span>
          <span class="action-label">${action.label}</span>
        </div>
        <div class="action-costs">
          ${energyCost > 0 ? `<span class="cost-badge cost-energy" title="Energy cost">⚡${energyCost}</span>` : ''}
          ${influenceReq > 0 ? `<span class="cost-badge cost-influence ${res.influence < influenceReq ? 'insufficient' : ''}" title="Influence required">🤝${influenceReq}</span>` : ''}
          ${informationReq > 0 ? `<span class="cost-badge cost-information ${res.information < informationReq ? 'insufficient' : ''}" title="Information required">💡${informationReq}</span>` : ''}
        </div>
        <div class="action-description">${action.description}</div>
        ${!canAfford || disabledReason ? `<div class="action-disabled-reason">${disabledReason}</div>` : ''}
      `;

      // Add tooltip
      btn.title = action.description + (disabledReason ? `\n\n${disabledReason}` : '');

      btn.addEventListener('click', () => {
        if (!canAfford || (evaluation && !evaluation.available)) return;
        
        // Clear other selections
        $$('.action-btn.selected').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateExecuteButton();
      });

      menu.appendChild(btn);
    });
  }
  
  // Helper function to get action icons
  function getActionIcon(actionId) {
    const iconMap = {
      smalltalk: '💬',
      strategize: '💡',
      confide: '🤫',
      interrogate: '🔍',
      compliment: '✨',
      confront: '⚔️',
      mediate: '⚖️',
      observe: '👁️',
      alliance: '🤝',
      gift: '🎁',
      flirt: '😊',
      workout: '💪',
      cook: '🍳',
      apologize: '🙏',
      prank: '😜',
      taunt: '😤',
      // High-impact actions
      spread_rumor: '📢',
      expose_secret: '🎯',
      group_hangout: '👥',
      form_alliance: '🤝'
    };
    return iconMap[actionId] || '🎭';
  }

  function updateExecuteButton() {
    const btn = $('#executeActionBtn');
    if (!btn) return;

    const selectedPlayers = $$('.player-card.selected');
    const selectedAction = $('.action-btn.selected');
    const res = getResourceState();

    const canExecute = selectedPlayers.length > 0 && selectedAction && res.energy > 0;
    btn.disabled = !canExecute;
  }

  function executeAction() {
    const selectedPlayers = Array.from($$('.player-card.selected'));
    const selectedAction = $('.action-btn.selected');
    const res = getResourceState();

    if (!selectedPlayers.length || !selectedAction || res.energy <= 0) {
      return;
    }

    const actionId = selectedAction.dataset.actionId;
    const g = global.game || {};
    const you = global.getP?.(g.humanId);

    if (!you) return;

    // Execute via canonical SocialManeuvers.executeAction if available
    if (global.SocialManeuvers?.executeAction) {
      selectedPlayers.forEach(card => {
        const targetId = parseInt(card.dataset.playerId);
        
        try {
          // Use canonical mechanics engine for execution
          const result = global.SocialManeuvers.executeAction(you.id, targetId, actionId, []);
          
          // Dev telemetry (dev builds only)
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.group(`[socialize-mobile] Action executed: ${actionId}`);
            console.log('Actor:', you.name, '(ID:', you.id, ')');
            console.log('Target:', global.safeName?.(targetId) || targetId);
            console.log('Success:', result.success);
            if (result.outcome) {
              console.log('Outcome:', result.outcome.type, '-', result.outcome.message);
              console.log('Affinity change:', result.outcome.affinityChange);
            }
            if (result.resources) {
              console.log('Resources after:', result.resources);
            }
            if (result.telemetry) {
              console.log('Success chance:', `${(result.telemetry.finalChance * 100).toFixed(0)}%`);
              console.log('Roll:', `${(result.telemetry.chanceRoll * 100).toFixed(0)}%`);
            }
            console.groupEnd();
          }
          
          // Show feedback in UI
          if (result.success) {
            addFeedbackEntry(
              selectedAction.querySelector('.action-label')?.textContent || actionId,
              global.safeName?.(targetId) || 'Unknown',
              result.outcome?.type || 'neutral',
              result.outcome?.message || 'Action completed'
            );
          } else {
            addFeedbackEntry(
              selectedAction.querySelector('.action-label')?.textContent || actionId,
              global.safeName?.(targetId) || 'Unknown',
              'error',
              result.message || result.reason || 'Action failed'
            );
          }
        } catch (e) {
          console.error('[socialize-mobile] Failed to execute action via SocialManeuvers:', e);
          // Fallback to legacy system
          executeLegacyAction(you.id, targetId, actionId, selectedAction);
        }
      });
    } else {
      // Fallback to legacy system if SocialManeuvers not available
      selectedPlayers.forEach(card => {
        const targetId = parseInt(card.dataset.playerId);
        executeLegacyAction(you.id, targetId, actionId, selectedAction);
      });
    }

    // Clear selections
    selectedPlayers.forEach(c => c.classList.remove('selected'));
    selectedAction.classList.remove('selected');
    updateExecuteButton();

    // Refresh action menu to update costs/availability
    populateActionMenu();

    // Check if energy depleted
    const updatedRes = getResourceState();
    if (updatedRes.energy <= 0) {
      setTimeout(() => {
        closeSocializeModal(true);
      }, 800);
    }
  }
  
  // Fallback to legacy social.js action system
  function executeLegacyAction(actorId, targetId, actionId, actionBtn) {
    // Map unified actions to legacy social.js actions
    const actionMapping = {
      'strategize': 'strategychat',  // Strategize maps to Strategy Chat
      'smalltalk': 'gift',           // Small talk uses gift mechanic
      'observe': 'gift',             // Observe uses gift mechanic
    };
    const legacyActionId = actionMapping[actionId] || actionId;
    
    if (global.socialApplyAction) {
      global.socialApplyAction(actorId, targetId, legacyActionId);
    }
    
    // Deduct energy manually (legacy system doesn't use canonical store)
    updateResourceState({ energy: -1 });
    
    const actionLabel = actionBtn.querySelector('.action-label')?.textContent || legacyActionId;
    const targetName = global.safeName?.(targetId) || 'Unknown';
    addFeedbackEntry(actionLabel, targetName, 'neutral', 'Action completed (legacy)');
  }
  
  // Add feedback entry to the UI
  function addFeedbackEntry(actionLabel, targetName, outcomeType, message) {
    const feedback = $('#feedbackArea');
    if (!feedback) return;
    
    const placeholder = feedback.querySelector('.feedback-placeholder');
    if (placeholder) placeholder.remove();

    const entry = document.createElement('div');
    entry.className = `feedback-entry feedback-${outcomeType}`;
    
    const outcomeIcon = {
      'positive': '✓',
      'success': '✓',
      'neutral': '→',
      'negative': '✗',
      'error': '⚠',
      'backlash': '⚠'
    }[outcomeType] || '•';
    
    entry.innerHTML = `
      <span class="feedback-icon">${outcomeIcon}</span>
      <span class="feedback-text">${actionLabel} → ${targetName}</span>
      <span class="feedback-message">${message}</span>
    `;
    
    feedback.insertBefore(entry, feedback.firstChild);
    
    // Limit feedback entries to 10
    const entries = feedback.querySelectorAll('.feedback-entry');
    if (entries.length > 10) {
      entries[entries.length - 1].remove();
    }
  }

  function showSocialUpdateToast() {
    const toast = document.createElement('div');
    toast.className = 'social-update-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">Social Update</div>
        <div class="toast-message">Social phase complete. All energy spent.</div>
        <div class="toast-actions">
          <button class="toast-btn details-btn">Details</button>
          <button class="toast-btn ok-btn">OK</button>
        </div>
      </div>
    `;

    // Position in TV overlay safe area
    const tvOverlay = $('#tvOverlay');
    if (tvOverlay) {
      tvOverlay.appendChild(toast);
    } else {
      document.body.appendChild(toast);
    }

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Event listeners
    toast.querySelector('.details-btn')?.addEventListener('click', () => {
      showDetailsDialog();
      dismissToast(toast);
    });

    toast.querySelector('.ok-btn')?.addEventListener('click', () => {
      dismissToast(toast);
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        dismissToast(toast);
      }
    }, 10000);
  }

  function dismissToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  function showDetailsDialog() {
    const res = getResourceState();
    const g = global.game || {};
    
    const dialog = document.createElement('div');
    dialog.className = 'details-dialog';
    dialog.innerHTML = `
      <div class="dialog-backdrop"></div>
      <div class="dialog-content">
        <button class="dialog-close-btn" aria-label="Close">×</button>
        <h3>Social Phase Summary</h3>
        <div class="dialog-body">
          <p>You've completed your social interactions for this phase.</p>
          <div class="resource-summary">
            <div class="summary-item">
              <span class="summary-icon">⚡</span>
              <span class="summary-label">Energy Remaining:</span>
              <span class="summary-value">${res.energy}</span>
            </div>
            <div class="summary-item">
              <span class="summary-icon">🤝</span>
              <span class="summary-label">Influence Gained:</span>
              <span class="summary-value">${res.influence}</span>
            </div>
            <div class="summary-item">
              <span class="summary-icon">💡</span>
              <span class="summary-label">Information Gained:</span>
              <span class="summary-value">${res.information}</span>
            </div>
          </div>
          <p class="dialog-hint">Check the feed for detailed interaction results.</p>
        </div>
        <div class="dialog-footer">
          <button class="dialog-ok-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Animate in
    requestAnimationFrame(() => {
      dialog.classList.add('show');
    });

    const closeDialog = () => {
      dialog.classList.remove('show');
      setTimeout(() => {
        dialog.remove();
      }, 300);
    };

    dialog.querySelector('.dialog-close-btn')?.addEventListener('click', closeDialog);
    dialog.querySelector('.dialog-ok-btn')?.addEventListener('click', closeDialog);
    dialog.querySelector('.dialog-backdrop')?.addEventListener('click', closeDialog);
  }

  // Seed phase resources if engine is present
  function seedPhaseResources() {
    const g = global.game || {};
    const humanId = g.humanId;
    
    if (!humanId) {
      console.warn('[socialize-mobile] Cannot seed resources - no humanId');
      return;
    }
    
    // Defer to canonical SocialManeuvers engine if present
    if (global.SocialManeuvers?.SocialResources) {
      try {
        // Engine handles seeding automatically on phase start
        console.info('[socialize-mobile] Resources seeded via SocialManeuvers engine');
        return;
      } catch(e) {
        console.error('[socialize-mobile] Failed to seed resources:', e);
      }
    }
    
    console.warn('[socialize-mobile] SocialManeuvers not available - cannot seed resources');
  }

  // Resources changed event hook
  function onResourcesChanged(callback) {
    if (typeof callback !== 'function') return;
    
    global.addEventListener('social-resources-changed', (event) => {
      callback(event.detail);
    });
  }

  // Public API
  global.SocializeMobile = {
    ensureLauncher: ensureSocializeLauncher,
    ensureSocializeLauncher: ensureSocializeLauncher, // Alias for clarity
    mountTVLauncher: ensureSocializeLauncher, // Back-compat alias
    openModal: openSocializeModal,
    closeModal: closeSocializeModal,
    updateHUD: updateHUDDisplay,
    resetWeeklyResources: resetWeeklyResources,
    getResources: getResourceState,
    updateResources: updateResourceState,
    seedPhaseResources: seedPhaseResources,
    onResourcesChanged: onResourcesChanged
  };

  // Resilient auto-mount with MutationObserver
  let mountObserver = null;
  
  function startMountObserver() {
    if (mountObserver) {
      console.info('[socialize-mobile] Mount observer already active');
      return;
    }
    
    // Try initial mount
    try {
      ensureSocializeLauncher();
      updateHUDDisplay();
    } catch(e) {
      console.warn('[socialize-mobile] Initial mount failed:', e.message);
    }
    
    // Watch for #tvOverlay to appear or be re-created
    mountObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check if tvOverlay exists but launcher is missing
          const tvOverlay = document.querySelector('#tvOverlay');
          const launcher = document.querySelector('#socializeLauncher');
          
          if (tvOverlay && !launcher) {
            try {
              console.info('[socialize-mobile] Auto-mounting launcher after DOM change');
              ensureSocializeLauncher();
              updateHUDDisplay();
            } catch(e) {
              console.error('[socialize-mobile] Auto-mount failed:', e.message);
            }
          }
        }
      }
    });
    
    // Observe document.body for childList changes
    mountObserver.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    console.info('[socialize-mobile] Mount observer started');
  }

  // Bootstrap on DOMContentLoaded
  function bootstrap() {
    try {
      // Try to mount launcher if DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          try {
            startMountObserver();
          } catch(e) {
            console.error('[socialize-mobile] Bootstrap failed:', e.message);
          }
        });
      } else {
        // DOM already loaded
        startMountObserver();
      }
    } catch(e) {
      console.error('[socialize-mobile] Bootstrap initialization failed:', e.message);
    }
  }

  // Start bootstrap
  bootstrap();

  // Auto-initialize on social phase
  const originalRenderSocialPhase = global.renderSocialPhase;
  global.renderSocialPhase = function(panel) {
    try {
      // Call original if exists
      if (typeof originalRenderSocialPhase === 'function') {
        originalRenderSocialPhase.call(this, panel);
      }
      
      // Ensure launcher is present
      ensureSocializeLauncher();
      updateHUDDisplay();
    } catch(e) {
      console.error('[socialize-mobile] renderSocialPhase failed:', e.message);
    }
  };

  // Hook into weekly reset
  const originalSocialOnNewWeek = global.socialOnNewWeek;
  global.socialOnNewWeek = function() {
    try {
      if (typeof originalSocialOnNewWeek === 'function') {
        originalSocialOnNewWeek.call(this);
      }
      resetWeeklyResources();
    } catch(e) {
      console.error('[socialize-mobile] socialOnNewWeek failed:', e.message);
    }
  };

})(window);
