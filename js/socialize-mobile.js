// MODULE: socialize-mobile.js
// Mobile-first Socialize modal and TV launcher with resource management (energy, influence, information)

(function(global){
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Resource state management - use SocialManeuvers store if available
  function getResourceState() {
    const g = global.game || {};
    const humanId = g.humanId;
    
    // Use SocialManeuvers resource system if available
    if (global.SocialManeuvers && typeof global.SocialManeuvers.getResources === 'function') {
      try {
        const resources = global.SocialManeuvers.getResources(humanId);
        return {
          energy: resources.energy || 0,
          influence: resources.influence || 0,
          information: resources.information || 0
        };
      } catch(e) {
        console.warn('[socialize-mobile] Failed to get SocialManeuvers resources:', e);
      }
    }
    
    // Fallback to local state
    if (!g.__socialResources) {
      g.__socialResources = {
        energy: 3,        // Used for all actions
        influence: 0,     // Gained from successful positive interactions
        information: 0    // Gained from successful negative interactions
      };
    }
    return g.__socialResources;
  }

  function updateResourceState(delta) {
    const g = global.game || {};
    const humanId = g.humanId;
    
    // Use SocialManeuvers resource system if available
    if (global.SocialManeuvers && typeof global.SocialManeuvers.updateResources === 'function') {
      try {
        global.SocialManeuvers.updateResources(humanId, delta);
        updateHUDDisplay();
        return;
      } catch(e) {
        console.warn('[socialize-mobile] Failed to update SocialManeuvers resources:', e);
      }
    }
    
    // Fallback to local state
    const res = getResourceState();
    res.energy = Math.max(0, res.energy + (delta.energy || 0));
    res.influence = Math.max(0, res.influence + (delta.influence || 0));
    res.information = Math.max(0, res.information + (delta.information || 0));
    updateHUDDisplay();
  }

  function resetWeeklyResources() {
    const g = global.game || {};
    g.__socialResources = {
      energy: 3,
      influence: 0,
      information: 0
    };
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
            <span class="resource-value" id="hudEnergy">3</span>
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
            <p>Used for all social actions. Start with 3 per week. Actions cost 1 energy each.</p>
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

    // Unified action catalog (deduped - merged Strategy Chat/Late Night Talk → Strategize)
    const actions = [
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
        id: 'strategize', 
        label: 'Strategize', 
        icon: '💡', 
        cost: { energy: 1 },
        require: {},
        category: 'strategic',
        description: 'Deep strategic conversation to align game plans.'
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
        label: 'Workout Together', 
        icon: '💪', 
        cost: { energy: 1 },
        require: {},
        category: 'friendly',
        description: 'Bond through physical activity and shared fitness.'
      },
      { 
        id: 'cook', 
        label: 'Cook Meal', 
        icon: '🍳', 
        cost: { energy: 1 },
        require: {},
        category: 'friendly',
        description: 'Prepare and share a meal together.'
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
        id: 'compliment', 
        label: 'Compliment', 
        icon: '✨', 
        cost: { energy: 1 },
        require: {},
        category: 'friendly',
        description: 'Give a genuine compliment. May refund energy!'
      },
      { 
        id: 'mediate', 
        label: 'Mediate', 
        icon: '⚖️', 
        cost: { energy: 1 },
        require: { influence: 10 },
        category: 'strategic',
        description: 'Mediate conflict between others. Requires influence.'
      },
      { 
        id: 'interrogate', 
        label: 'Interrogate', 
        icon: '🔍', 
        cost: { energy: 1 },
        require: { influence: 5 },
        category: 'strategic',
        description: 'Press for information. Requires influence.'
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
      },
      { 
        id: 'confront', 
        label: 'Confront', 
        icon: '⚔️', 
        cost: { energy: 1 },
        require: {},
        category: 'aggressive',
        description: 'Direct confrontation - air grievances.'
      }
    ];

    menu.innerHTML = '';

    actions.forEach(action => {
      const energyCost = action.cost.energy || 0;
      const influenceReq = action.require.influence || 0;
      const informationReq = action.require.information || 0;
      
      const canAfford = res.energy >= energyCost && 
                        res.influence >= influenceReq && 
                        res.information >= informationReq;
      
      const btn = document.createElement('button');
      btn.className = `action-btn action-${action.category}`;
      btn.dataset.actionId = action.id;
      
      if (!canAfford) {
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
        ${!canAfford ? `<div class="action-disabled-reason">${disabledReason}</div>` : ''}
      `;

      // Add tooltip
      btn.title = action.description + (disabledReason ? `\n\n${disabledReason}` : '');

      btn.addEventListener('click', () => {
        if (!canAfford) return;
        
        // Clear other selections
        $$('.action-btn.selected').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateExecuteButton();
      });

      menu.appendChild(btn);
    });
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

    let actionId = selectedAction.dataset.actionId;
    const g = global.game || {};
    const you = global.getP?.(g.humanId);

    if (!you) return;

    // Map unified actions to legacy social.js actions
    const actionMapping = {
      'strategize': 'strategychat',  // Strategize maps to Strategy Chat
    };
    const legacyActionId = actionMapping[actionId] || actionId;

    // Execute action for each selected player
    selectedPlayers.forEach(card => {
      const targetId = parseInt(card.dataset.playerId);
      if (global.socialApplyAction) {
        global.socialApplyAction(you.id, targetId, legacyActionId);
      }
    });

    // Deduct energy
    updateResourceState({ energy: -1 });

    // Add to feedback
    const feedback = $('#feedbackArea');
    if (feedback) {
      const placeholder = feedback.querySelector('.feedback-placeholder');
      if (placeholder) placeholder.remove();

      const entry = document.createElement('div');
      entry.className = 'feedback-entry';
      const targetNames = selectedPlayers.map(c => {
        const p = global.getP?.(parseInt(c.dataset.playerId));
        return p?.name || 'Unknown';
      }).join(', ');
      const actionLabel = selectedAction.querySelector('.action-label')?.textContent || actionId;
      entry.textContent = `${actionLabel} → ${targetNames}`;
      feedback.insertBefore(entry, feedback.firstChild);
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

  // Public API
  global.SocializeMobile = {
    ensureLauncher: ensureSocializeLauncher,
    openModal: openSocializeModal,
    closeModal: closeSocializeModal,
    updateHUD: updateHUDDisplay,
    resetWeeklyResources: resetWeeklyResources,
    getResources: getResourceState,
    updateResources: updateResourceState
  };

  // Auto-initialize on social phase
  const originalRenderSocialPhase = global.renderSocialPhase;
  global.renderSocialPhase = function(panel) {
    // Call original if exists
    if (typeof originalRenderSocialPhase === 'function') {
      originalRenderSocialPhase.call(this, panel);
    }
    
    // Ensure launcher is present
    ensureSocializeLauncher();
    updateHUDDisplay();
  };

  // Hook into weekly reset
  const originalSocialOnNewWeek = global.socialOnNewWeek;
  global.socialOnNewWeek = function() {
    if (typeof originalSocialOnNewWeek === 'function') {
      originalSocialOnNewWeek.call(this);
    }
    resetWeeklyResources();
  };

})(window);
