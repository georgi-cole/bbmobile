// MODULE: socialize-mobile.js
// Mobile-first Socialize modal and TV launcher with resource management (energy, influence, information)

(function(global){
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Resource state management
  function getResourceState() {
    const g = global.game || {};
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

      card.appendChild(avatar);
      card.appendChild(name);

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

  function populateActionMenu() {
    const menu = $('#actionMenu');
    if (!menu) return;

    const actions = [
      { id: 'alliance', label: 'Form Alliance', icon: '🤝', cost: 1 },
      { id: 'strategychat', label: 'Strategy Chat', icon: '💡', cost: 1 },
      { id: 'gift', label: 'Give Gift', icon: '🎁', cost: 1 },
      { id: 'flirt', label: 'Flirt', icon: '😊', cost: 1 },
      { id: 'workout', label: 'Workout Together', icon: '💪', cost: 1 },
      { id: 'cook', label: 'Cook Meal', icon: '🍳', cost: 1 },
      { id: 'latenighttalk', label: 'Late Night Talk', icon: '🌙', cost: 1 },
      { id: 'apologize', label: 'Apologize', icon: '🙏', cost: 1 },
      { id: 'prank', label: 'Prank', icon: '😜', cost: 1 },
      { id: 'taunt', label: 'Taunt', icon: '😤', cost: 1 },
      { id: 'confront', label: 'Confront', icon: '⚔️', cost: 1 }
    ];

    menu.innerHTML = '';

    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.dataset.actionId = action.id;
      btn.innerHTML = `
        <span class="action-icon">${action.icon}</span>
        <span class="action-label">${action.label}</span>
        <span class="action-cost">${action.cost}⚡</span>
      `;

      btn.addEventListener('click', () => {
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

    const actionId = selectedAction.dataset.actionId;
    const g = global.game || {};
    const you = global.getP?.(g.humanId);

    if (!you) return;

    // Execute action for each selected player
    selectedPlayers.forEach(card => {
      const targetId = parseInt(card.dataset.playerId);
      if (global.socialApplyAction) {
        global.socialApplyAction(you.id, targetId, actionId);
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
      entry.textContent = `${selectedAction.textContent.trim()} → ${targetNames}`;
      feedback.insertBefore(entry, feedback.firstChild);
    }

    // Clear selections
    selectedPlayers.forEach(c => c.classList.remove('selected'));
    selectedAction.classList.remove('selected');
    updateExecuteButton();

    // Check if energy depleted
    if (res.energy <= 0) {
      console.info('[Socialize] Energy depleted, scheduling fast-advance in 3 seconds');
      
      // Schedule phase advance when energy reaches 0
      setTimeout(() => {
        const advanceDelay = 3000; // 3 seconds
        const g = global.game || {};
        
        if (typeof global.schedulePhaseAdvanceIn === 'function') {
          global.schedulePhaseAdvanceIn(advanceDelay);
        } else if (global.GameTimer && typeof global.GameTimer.setRemainingMs === 'function') {
          global.GameTimer.setRemainingMs(advanceDelay);
        } else if (typeof global.setPhaseDurationMs === 'function') {
          global.setPhaseDurationMs(advanceDelay);
        } else if (g.endAt) {
          // Fallback: adjust endAt deadline to trigger phase end soon
          g.endAt = Date.now() + advanceDelay;
          g.phaseEndsAt = g.endAt;
          console.info('[Socialize] Fast-advance scheduled via deadline adjustment');
        }
      }, 100);
      
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

  // ===== Auto-Mount Bootstrap =====
  // Robust bootstrap that mounts Socialize launcher when Social phase starts
  // Handles late #tvOverlay creation with MutationObserver + polling fallback
  
  let mountAttempted = false;
  let mutationObserver = null;
  let pollingInterval = null;
  
  function attemptLauncherMount() {
    if (mountAttempted) return;
    
    // Try to find overlay container with fallback selectors
    let container = $('#tvOverlay');
    if (!container) {
      container = $('.tvViewport') || $('.tv') || $('#tv');
      if (container) {
        console.info('[Socialize] Using fallback container:', container.className || container.id);
      }
    }
    
    if (!container) {
      console.warn('[Socialize] No suitable container found for launcher mount');
      return;
    }
    
    mountAttempted = true;
    const launcher = ensureSocializeLauncher();
    
    if (launcher) {
      console.info('[Socialize] Launcher mounted successfully');
      updateHUDDisplay();
      
      // Stop observation/polling once mounted
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    }
  }
  
  function bootstrapLauncherMount() {
    const g = global.game || {};
    
    // Only mount during social phase
    if (g.phase !== 'social_intermission' && !g.phase?.startsWith?.('social')) {
      return;
    }
    
    console.info('[Socialize] Bootstrap launcher auto-mount initiated');
    
    // Reset mount flag for new phase
    mountAttempted = false;
    
    // Attempt immediate mount
    attemptLauncherMount();
    
    // If mount failed, setup MutationObserver to watch for #tvOverlay creation
    if (!mountAttempted) {
      console.info('[Socialize] Setting up MutationObserver for deferred mount');
      
      mutationObserver = new MutationObserver(() => {
        if ($('#tvOverlay') || $('.tvViewport') || $('.tv') || $('#tv')) {
          attemptLauncherMount();
        }
      });
      
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Fallback polling in case MutationObserver doesn't trigger
      pollingInterval = setInterval(() => {
        attemptLauncherMount();
        if (mountAttempted) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      }, 500);
      
      // Stop polling after 10 seconds to prevent indefinite checks
      setTimeout(() => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
          console.warn('[Socialize] Polling timeout - mount may have failed');
        }
      }, 10000);
    }
  }
  
  // Hook into phase start
  function onSocialPhaseStart() {
    const g = global.game || {};
    
    console.info('[Socialize] Social phase started');
    
    // Set default 3-minute duration
    const defaultDurationSec = 180; // 3 minutes
    
    // Try various timer APIs in priority order
    if (typeof global.setPhaseDurationMs === 'function') {
      global.setPhaseDurationMs(defaultDurationSec * 1000);
      console.info('[Socialize] Timer set via setPhaseDurationMs:', defaultDurationSec, 'seconds');
    } else if (global.GameTimer && typeof global.GameTimer.setRemainingMs === 'function') {
      global.GameTimer.setRemainingMs(defaultDurationSec * 1000);
      console.info('[Socialize] Timer set via GameTimer.setRemainingMs:', defaultDurationSec, 'seconds');
    } else if (g.endAt) {
      // Fallback: adjust endAt deadline
      g.endAt = Date.now() + (defaultDurationSec * 1000);
      g.phaseEndsAt = g.endAt;
      console.info('[Socialize] Timer set via deadline fallback:', defaultDurationSec, 'seconds');
    } else {
      console.warn('[Socialize] No timer API available to set duration');
    }
    
    // Bootstrap launcher mount
    bootstrapLauncherMount();
  }
  
  // Auto-initialize on social phase
  const originalRenderSocialPhase = global.renderSocialPhase;
  global.renderSocialPhase = function(panel) {
    // Call original if exists
    if (typeof originalRenderSocialPhase === 'function') {
      originalRenderSocialPhase.call(this, panel);
    }
    
    // Trigger phase start hook
    onSocialPhaseStart();
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
