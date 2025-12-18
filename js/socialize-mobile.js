// MODULE: socialize-mobile.js
// Mobile-first Socialize modal and TV launcher with resource management (energy, influence, information)

(function(global){
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  
  // Flag to prevent re-entrant mounting during DOM mutations
  let _isCurrentlyMounting = false;

  // Touch detection
  const isTouchDevice = ('ontouchstart' in window) || 
                        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  // SocializeMobile state for multi-select
  const SocializeMobile = {
    state: {
      multiSelectMode: isTouchDevice, // Default ON for touch, OFF for desktop
      selectedIds: new Set() // Persist selection across re-renders
    }
  };

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
        
        // Trigger reordering when resources change (affects action availability)
        scheduleReorder();
        
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
    // Prevent re-entrant calls during mounting
    if (_isCurrentlyMounting) {
      return null;
    }
    
    // Check if human player is evicted - hide launcher if they are
    const g = global.game || {};
    const humanId = g.humanId;
    const humanPlayer = global.getP?.(humanId);
    if(humanPlayer && humanPlayer.evicted){
      console.info('[socialize-mobile] Human player is evicted - not mounting launcher');
      return null;
    }
    
    let launcher = $('#socializeLauncher');
    if (launcher) return launcher;
    
    _isCurrentlyMounting = true;

    // Use SocialLauncherBootstrap.resolveMountTarget() if available
    let mountTarget;
    if (global.SocialLauncherBootstrap?.resolveMountTarget) {
      mountTarget = global.SocialLauncherBootstrap.resolveMountTarget();
    } else {
      // Fallback if bootstrap not loaded
      mountTarget = $('#tvOverlay') || $('.tvViewport') || $('#tv') || $('.tv') || $('#panel');
    }
    
    if (!mountTarget) {
      console.info('[socialize-mobile] No mount target available - observer will retry');
      _isCurrentlyMounting = false;
      return null;
    }

    launcher = document.createElement('div');
    launcher.id = 'socializeLauncher';
    launcher.className = 'socialize-launcher';
    launcher.setAttribute('data-sm-social-card-wrap', ''); // Wrapper for safe-area padding
    // Mount with z-index 2147483000 to ensure visibility
    launcher.style.zIndex = '2147483000';
    launcher.innerHTML = `
      <div class="socialize-hud socialize-card social-live-card" data-sm-social-card>
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
      <button class="socialize-open-btn btn-socialize" id="socializeOpenBtn" data-sm-socialize-btn>Socialize</button>
    `;

    mountTarget.appendChild(launcher);

    // Attach event listeners
    $('#socializeOpenBtn')?.addEventListener('click', openSocializeModal);
    $('#resourceHelpBtn')?.addEventListener('click', showResourceHelp);
    
    // Subscribe to resource-changed events for live updates
    global.addEventListener('social-resources-changed', (event) => {
      updateHUDDisplay();
    });
    
    // Call updateHUDDisplay() after mounting
    updateHUDDisplay();
    
    _isCurrentlyMounting = false;
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
    
    // Check if player is evicted and disable card
    const g = global.game || {};
    const humanId = g.humanId;
    const human = global.getP?.(humanId);
    if (human?.evicted) {
      disableSocialCard();
    }
  }
  
  function disableSocialCard() {
    const launcher = $('#socializeLauncher');
    const card = $('[data-sm-social-card]');
    const openBtn = $('#socializeOpenBtn');
    
    if (card) {
      card.setAttribute('aria-disabled', 'true');
      card.style.opacity = '0.5';
      card.style.pointerEvents = 'none';
    }
    
    if (openBtn) {
      openBtn.disabled = true;
      openBtn.textContent = 'Evicted';
      openBtn.setAttribute('aria-disabled', 'true');
      openBtn.style.opacity = '0.5';
      openBtn.style.cursor = 'not-allowed';
    }
    
    if (launcher) {
      launcher.setAttribute('aria-disabled', 'true');
    }
    
    console.info('[socialize-mobile] Social card disabled for evicted player');
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
    const g = global.game || {};
    const humanId = g.humanId;
    const humanPlayer = global.getP?.(humanId);
    
    // Check if player is evicted
    if(humanPlayer && humanPlayer.evicted){
      console.info('[socialize-mobile] Human player is evicted - cannot open modal');
      global.addLog?.('You have been evicted and can no longer participate in social interactions.', 'danger');
      return;
    }
    
    const res = getResourceState();
    if (res.energy <= 0) {
      global.addLog?.('No energy remaining for social actions.', 'warn');
      return;
    }

    // Pause phase timer when modal opens
    if (global.SocialManeuvers?.pausePhaseTimer) {
      try{
        global.SocialManeuvers.pausePhaseTimer();
        console.info('[socialize-mobile] ⏸️ Phase timer paused (modal opened)');
      }catch(e){
        console.error('[socialize-mobile] Failed to pause timer:', e);
      }
    }
    
    // Pause AI scheduler and start background executor
    if (global.SocialAIScheduler?.pauseAiSocialPhase) {
      try {
        global.SocialAIScheduler.pauseAiSocialPhase('modal-opened');
        console.info('[socialize-mobile] ⏸️ AI scheduler paused (modal opened)');
      } catch(e) {
        console.error('[socialize-mobile] Failed to pause AI scheduler:', e);
      }
    }
    
    // Start background executor for lightweight NPC interactions
    if (global.SocialActionExecutor?.startBackgroundTicks) {
      try {
        global.SocialActionExecutor.startBackgroundTicks();
        console.info('[socialize-mobile] ▶️ Background executor started (modal opened)');
      } catch(e) {
        console.error('[socialize-mobile] Failed to start background executor:', e);
      }
    }

    // Disable background scrolling
    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'socializeModal';
    modal.className = 'socialize-modal';
    // High z-index to block click-through to background
    modal.style.zIndex = '2147483600';
    
    // Add high z-index backdrop to prevent click-through
    modal.innerHTML = `
      <div class="socialize-modal-backdrop socialize-modal-backdrop-high" style="z-index: 2147483599; position: fixed; inset: 0; background: rgba(0,0,0,0.7); pointer-events: auto;"></div>
      <div class="socialize-modal-content socialize-modal-content-high" style="z-index: 2147483600;">
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
            <h3 data-sm-select-header>Select Players</h3>
            <div class="player-picker-instructions" data-sm-hint>
              ${isTouchDevice ? 'Tap to add/remove. Long-press to toggle Group mode.' : 'Tap to select. Hold Ctrl/Cmd for multi-select group actions.'}
            </div>
            <div class="player-picker" id="playerPicker"></div>
          </section>

          <section class="modal-section action-menu-section">
            <h3>Choose Action</h3>
            <div class="action-menu" id="actionMenu" data-sm-actions-container></div>
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
    // X button should ALWAYS close immediately (bypass energy check)
    $('.modal-close-btn')?.addEventListener('click', () => {
      console.info('[socialize-mobile] ❌ X button clicked - forcing immediate close');
      closeSocializeModal(true); // Skip energy check - always close on X
      // Show summary after modal closes
      setTimeout(() => {
        showSocialSummary();
      }, 350);
    });
    // Backdrop click still shows the prompt (original behavior)
    $('.socialize-modal-backdrop')?.addEventListener('click', () => closeSocializeModal());
    $('#executeActionBtn')?.addEventListener('click', executeAction);

    // Animation
    requestAnimationFrame(() => {
      modal.classList.add('open');
    });
  }

  function closeSocializeModal(skipEnergyCheck = false) {
    const modal = $('#socializeModal');
    if (!modal) return;

    // Check if there's remaining energy and prompt user (unless explicitly skipped)
    if (!skipEnergyCheck) {
      const res = getResourceState();
      if (res.energy > 0) {
        console.info('[socialize-mobile] 🔋 Energy remaining, prompting user to continue or view summary');
        showContinueSocializingPrompt();
        return; // Don't close the modal yet - wait for user's decision
      }
    }

    // Flush queued heavy actions from background executor
    if (global.SocialActionExecutor?.flushQueue) {
      try {
        global.SocialActionExecutor.flushQueue();
        console.info('[socialize-mobile] 💨 Background executor queue flushed (modal closed)');
      } catch(e) {
        console.error('[socialize-mobile] Failed to flush executor queue:', e);
      }
    }
    
    // Stop background executor
    if (global.SocialActionExecutor?.stopBackgroundTicks) {
      try {
        global.SocialActionExecutor.stopBackgroundTicks();
        console.info('[socialize-mobile] ⏹️ Background executor stopped (modal closed)');
      } catch(e) {
        console.error('[socialize-mobile] Failed to stop background executor:', e);
      }
    }
    
    // Resume AI scheduler
    if (global.SocialAIScheduler?.resumeAiSocialPhase) {
      try {
        global.SocialAIScheduler.resumeAiSocialPhase('modal-closed');
        console.info('[socialize-mobile] ▶️ AI scheduler resumed (modal closed)');
      } catch(e) {
        console.error('[socialize-mobile] Failed to resume AI scheduler:', e);
      }
    }
    
    // Resume phase timer when modal closes
    if (global.SocialManeuvers?.resumePhaseTimer) {
      try{
        global.SocialManeuvers.resumePhaseTimer();
        console.info('[socialize-mobile] ▶️ Phase timer resumed (modal closed)');
      }catch(e){
        console.error('[socialize-mobile] Failed to resume timer:', e);
      }
    }

    // Re-enable scrolling
    document.body.style.overflow = '';

    // Remove backdrop
    const backdrop = document.querySelector('.socialize-modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }

    // Animate out
    modal.classList.remove('open');
    setTimeout(() => {
      modal.remove();
      // REMOVED: Legacy toast UI - engine summary is sole owner
    }, 300);
  }

  function showContinueSocializingPrompt() {
    // Temporarily pause timers/executors to show the prompt
    if (global.SocialActionExecutor?.flushQueue) {
      try {
        global.SocialActionExecutor.flushQueue();
      } catch(e) {
        console.error('[socialize-mobile] Failed to flush executor queue:', e);
      }
    }
    if (global.SocialActionExecutor?.stopBackgroundTicks) {
      try {
        global.SocialActionExecutor.stopBackgroundTicks();
      } catch(e) {
        console.error('[socialize-mobile] Failed to stop background executor:', e);
      }
    }

    // Get or create decision deck
    let deck = document.getElementById('decisionDeck');
    if (!deck) {
      deck = document.createElement('div');
      deck.id = 'decisionDeck';
      deck.style.position = 'fixed';
      deck.style.top = '50%';
      deck.style.left = '50%';
      deck.style.transform = 'translate(-50%, -50%)';
      deck.style.zIndex = '10001'; // Above the social modal
      deck.style.pointerEvents = 'auto';
      document.body.appendChild(deck);
    }

    // Create the prompt card
    const card = document.createElement('div');
    card.className = 'revealCard diaryRoomCard decisionCard social-continue-prompt';
    card.style.minWidth = '320px';
    card.style.maxWidth = '480px';
    
    // Card title
    const title = document.createElement('h3');
    title.textContent = 'Continue Socializing?';
    card.appendChild(title);
    
    // Card message
    const message = document.createElement('div');
    message.textContent = 'Do you want to socialize more?';
    message.style.marginBottom = '1rem';
    card.appendChild(message);
    
    // Energy info
    const res = getResourceState();
    const energyInfo = document.createElement('div');
    energyInfo.innerHTML = `<small>You have <strong>${res.energy} energy</strong> remaining.</small>`;
    energyInfo.style.marginBottom = '1rem';
    energyInfo.style.opacity = '0.9';
    card.appendChild(energyInfo);
    
    // Button container
    const buttonBar = document.createElement('div');
    buttonBar.className = 'decisionActions';
    buttonBar.style.display = 'flex';
    buttonBar.style.gap = '0.5rem';
    buttonBar.style.justifyContent = 'center';
    
    // "Yes" button - re-open the social module
    const yesBtn = document.createElement('button');
    yesBtn.className = 'btn small';
    yesBtn.textContent = 'Yes';
    yesBtn.setAttribute('aria-label', 'Continue socializing');
    yesBtn.onclick = () => {
      console.info('[socialize-mobile] User chose to continue socializing');
      card.remove();
      if (deck && !deck.hasChildNodes()) {
        deck.remove();
      }
      // Restart background executor since we're continuing
      if (global.SocialActionExecutor?.startBackgroundTicks) {
        try {
          global.SocialActionExecutor.startBackgroundTicks();
        } catch(e) {
          console.error('[socialize-mobile] Failed to restart background executor:', e);
        }
      }
      // Modal is still open, user can continue
    };
    
    // "No" button - show summary and close
    const noBtn = document.createElement('button');
    noBtn.className = 'btn small';
    noBtn.textContent = 'No';
    noBtn.setAttribute('aria-label', 'View summary and finish socializing');
    noBtn.onclick = () => {
      console.info('[socialize-mobile] User chose to view summary');
      card.remove();
      if (deck && !deck.hasChildNodes()) {
        deck.remove();
      }
      // Close the modal without checking energy again
      closeSocializeModal(true);
      // Show the summary directly
      setTimeout(() => {
        showSocialSummary();
      }, 350); // Small delay to let modal close animation finish
    };
    
    buttonBar.appendChild(yesBtn);
    buttonBar.appendChild(noBtn);
    card.appendChild(buttonBar);
    
    // Add card to deck with fade-in animation
    deck.appendChild(card);
    
    // Focus the first button for accessibility
    setTimeout(() => {
      yesBtn.focus();
    }, 100);
  }

  function showSocialSummary() {
    // Try to generate and show the summary using SocialManeuvers methods
    if (global.SocialManeuvers?.generatePhaseSummary && global.SocialManeuvers?.showSummaryPanel) {
      try {
        const summary = global.SocialManeuvers.generatePhaseSummary();
        global.SocialManeuvers.showSummaryPanel(summary);
        console.info('[socialize-mobile] ✓ Summary shown via SocialManeuvers.showSummaryPanel');
        return;
      } catch(e) {
        console.error('[socialize-mobile] Failed to show summary via SocialManeuvers:', e);
      }
    }

    // Fallback: try alternate methods
    if (global.SocialManeuvers?.showEndOfPhaseSummary) {
      try {
        global.SocialManeuvers.showEndOfPhaseSummary();
        console.info('[socialize-mobile] ✓ Summary shown via showEndOfPhaseSummary');
        return;
      } catch(e) {
        console.error('[socialize-mobile] Failed to show summary via showEndOfPhaseSummary:', e);
      }
    }

    if (global.SocialManeuvers?.presentPhaseSummary) {
      try {
        global.SocialManeuvers.presentPhaseSummary();
        console.info('[socialize-mobile] ✓ Summary shown via presentPhaseSummary');
        return;
      } catch(e) {
        console.error('[socialize-mobile] Failed to show summary via presentPhaseSummary:', e);
      }
    }

    // If all else fails, log a message
    console.warn('[socialize-mobile] Could not show social summary - no methods available');
    global.addLog?.('Social session ended. Summary not available.', 'info');
  }

  function populatePlayerPicker() {
    const picker = $('#playerPicker');
    if (!picker) return;

    const g = global.game || {};
    const you = global.getP?.(g.humanId);
    const alive = global.alivePlayers?.() || [];
    const others = alive.filter(p => p.id !== you?.id && !p.evicted);

    picker.innerHTML = '';

    // Add Group toggle pill for touch devices in the header
    if (isTouchDevice) {
      const header = $('[data-sm-select-header]');
      if (header) {
        // Check if pill already exists
        let pill = header.querySelector('.sm-pill.sm-group-toggle');
        if (!pill) {
          pill = document.createElement('button');
          pill.className = 'sm-pill sm-group-toggle';
          pill.setAttribute('aria-pressed', SocializeMobile.state.multiSelectMode ? 'true' : 'false');
          pill.textContent = 'Group';
          pill.addEventListener('click', toggleGroupMode);
          header.appendChild(pill);
        } else {
          // Update existing pill state
          pill.setAttribute('aria-pressed', SocializeMobile.state.multiSelectMode ? 'true' : 'false');
        }
      }
    }

    others.forEach(player => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.dataset.playerId = player.id;
      card.dataset.smPlayerCard = ''; // Add data attribute for initPlayerGrid
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      
      // Restore selection state if in selectedIds
      if (SocializeMobile.state.selectedIds.has(player.id)) {
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
      } else {
        card.setAttribute('aria-pressed', 'false');
      }
      
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

      picker.appendChild(card);
    });

    // Initialize player grid handlers (bind click/long-press)
    initPlayerGrid();
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

  // Toggle Group mode for touch devices
  function toggleGroupMode() {
    SocializeMobile.state.multiSelectMode = !SocializeMobile.state.multiSelectMode;
    
    // Update pill state
    const pill = $('.sm-pill.sm-group-toggle');
    if (pill) {
      pill.setAttribute('aria-pressed', SocializeMobile.state.multiSelectMode ? 'true' : 'false');
    }
    
    // Clear selections when toggling off
    if (!SocializeMobile.state.multiSelectMode) {
      SocializeMobile.state.selectedIds.clear();
      $$('.player-card.selected').forEach(card => {
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
      });
      updateExecuteButton();
      populateActionMenu();
    }
    
    console.log('[socialize-mobile] Group mode:', SocializeMobile.state.multiSelectMode ? 'ON' : 'OFF');
  }

  // Initialize player grid handlers (re-bind on grid re-render)
  function initPlayerGrid() {
    const cards = $$('[data-sm-player-card]');
    
    cards.forEach(card => {
      const playerId = parseInt(card.dataset.playerId);
      
      // Remove any existing listeners by cloning the node
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
      
      let longPressTimer = null;
      let longPressTriggered = false;
      let touchStartX = 0;
      let touchStartY = 0;
      let hasMoved = false;
      
      // Touch handlers for long-press
      if (isTouchDevice) {
        newCard.addEventListener('touchstart', (e) => {
          longPressTriggered = false;
          hasMoved = false;
          
          // Store initial touch position
          if (e.touches && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
          
          longPressTimer = setTimeout(() => {
            // Only trigger if finger hasn't moved (not scrolling)
            if (!hasMoved) {
              longPressTriggered = true;
              
              // Trigger vibrate if supported
              if (navigator.vibrate) {
                navigator.vibrate(50);
              }
              
              // Toggle Group mode
              toggleGroupMode();
            }
          }, 350);
        }, { passive: true });
        
        // Detect movement during touch (indicates scrolling)
        newCard.addEventListener('touchmove', (e) => {
          if (e.touches && e.touches.length > 0) {
            const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
            const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
            
            // If finger moved more than 10px in any direction, it's a scroll gesture
            if (deltaX > 10 || deltaY > 10) {
              hasMoved = true;
              clearTimeout(longPressTimer);
            }
          }
        }, { passive: true });
        
        newCard.addEventListener('touchend', (e) => {
          clearTimeout(longPressTimer);
          
          // Only handle selection if it was a tap (not scroll) and not long-press
          if (!longPressTriggered && !hasMoved) {
            // Normal tap - handle selection
            handleCardSelection(newCard, playerId, e);
          }
        }, { passive: true });
        
        newCard.addEventListener('touchcancel', () => {
          clearTimeout(longPressTimer);
          hasMoved = true;
        }, { passive: true });
      }
      
      // Click handler for desktop and tap fallback
      newCard.addEventListener('click', (e) => {
        if (!isTouchDevice) {
          handleCardSelection(newCard, playerId, e);
        }
      });
      
      // Keyboard support
      newCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardSelection(newCard, playerId, e);
        }
      });
    });
    
    // Install MutationObserver on action menu container for dynamic reordering
    installActionMenuObserver();
  }
  
  // MutationObserver for action menu - watches for changes to trigger reordering
  let actionMenuObserver = null;
  function installActionMenuObserver() {
    // Only install once
    if (actionMenuObserver) return;
    
    const container = $('[data-sm-actions-container]') || $('#actionMenu');
    if (!container) return;
    
    actionMenuObserver = new MutationObserver((mutations) => {
      let needsReorder = false;
      
      for (const mutation of mutations) {
        // Check if childList changed (cards added/removed)
        if (mutation.type === 'childList') {
          needsReorder = true;
          break;
        }
        
        // Check if attributes changed on action cards
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target.hasAttribute('data-sm-action-card')) {
            // Reorder if class, aria-disabled, disabled, or data-* changed
            const attrName = mutation.attributeName;
            if (attrName === 'class' || 
                attrName === 'aria-disabled' || 
                attrName === 'disabled' ||
                attrName === 'data-enabled' ||
                attrName === 'data-disabled' ||
                attrName === 'data-recommended') {
              needsReorder = true;
              break;
            }
          }
        }
      }
      
      if (needsReorder) {
        scheduleReorder();
      }
    });
    
    // Observe container for childList and attributes
    actionMenuObserver.observe(container, {
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'aria-disabled', 'disabled', 'data-enabled', 'data-disabled', 'data-recommended'],
      subtree: true
    });
    
    console.info('[socialize-mobile] Action menu observer installed for dynamic sorting');
  }

  // Handle card selection logic
  function handleCardSelection(card, playerId, event) {
    // Get selected action to check if it's group capable
    const selectedAction = $('.action-btn.selected');
    const actionId = selectedAction?.dataset.actionId;
    
    // Check if action is group capable
    let isGroupCapable = false;
    if (actionId && global.SocialManeuvers?.SOCIAL_ACTIONS) {
      const action = global.SocialManeuvers.SOCIAL_ACTIONS.find(a => a.id === actionId);
      isGroupCapable = action?.maxTargets > 1 || action?.groupAllowed === true;
    }
    
    // Determine if we should do additive selection
    let isAdditive = false;
    if (isTouchDevice) {
      // Touch: additive when multiSelectMode is ON or action is group capable
      isAdditive = SocializeMobile.state.multiSelectMode || isGroupCapable;
    } else {
      // Desktop: additive when Ctrl/Cmd pressed
      isAdditive = event.ctrlKey || event.metaKey;
    }
    
    // Single-target actions always single select
    if (selectedAction && actionId) {
      const minTargets = parseInt(selectedAction.dataset.minTargets) || 1;
      if (minTargets === 1 && !isGroupCapable) {
        isAdditive = false;
      }
    }
    
    if (!isAdditive) {
      // Clear other selections
      $$('.player-card.selected').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
        SocializeMobile.state.selectedIds.delete(parseInt(c.dataset.playerId));
      });
    }
    
    // Toggle this card
    const isSelected = card.classList.contains('selected');
    if (isSelected) {
      card.classList.remove('selected');
      card.setAttribute('aria-pressed', 'false');
      SocializeMobile.state.selectedIds.delete(playerId);
    } else {
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      SocializeMobile.state.selectedIds.add(playerId);
    }
    
    updateExecuteButton();
    populateActionMenu();
    
    // Trigger reordering when player selection changes (affects action availability)
    scheduleReorder();
  }

  // Reorder action cards: enabled first, then disabled; recommended first within each group
  function reorderActionCards() {
    // Container selector with fallback
    const container = $('[data-sm-actions-container]') || $('#actionMenu');
    if (!container) return;

    // Get all action cards
    const cards = Array.from(container.querySelectorAll('[data-sm-action-card]'));
    if (cards.length === 0) return;

    // Preserve focus element before reordering
    const focusedElement = document.activeElement;
    const focusedCard = focusedElement?.closest?.('[data-sm-action-card]') || null;
    const focusedActionId = focusedCard?.dataset?.actionId;

    // Sort cards by: 1) active/enabled, 2) recommended, 3) cost (optional), 4) original index
    const sortedCards = cards.map((card, originalIndex) => {
      // Detect if action is active/enabled
      const isDisabled = card.disabled || 
                        card.hasAttribute('disabled') ||
                        card.dataset.disabled === 'true' ||
                        card.getAttribute('aria-disabled') === 'true' ||
                        card.classList.contains('disabled');
      const isActive = !isDisabled;

      // Detect if action is recommended
      const isRecommended = card.dataset.recommended === 'true' ||
                           card.classList.contains('recommended') ||
                           (global.SocialManeuvers?.getRecommendedActionIds?.()?.includes(card.dataset.actionId));

      // Get cost for optional tertiary sorting
      let cost = Infinity;
      if (card.dataset.energy) {
        cost = parseInt(card.dataset.energy) || Infinity;
      } else if (card.dataset.cost) {
        cost = parseInt(card.dataset.cost) || Infinity;
      } else if (global.SocialManeuvers?.getActionCost && card.dataset.actionId) {
        const actionCost = global.SocialManeuvers.getActionCost(card.dataset.actionId);
        cost = (typeof actionCost === 'object' ? actionCost.energy : actionCost) || Infinity;
      }

      return {
        card,
        isActive,
        isRecommended,
        cost,
        originalIndex
      };
    });

    // Sort: active first, then recommended, then cost, then original index
    sortedCards.sort((a, b) => {
      // Primary: active first
      if (a.isActive !== b.isActive) return b.isActive - a.isActive;
      // Secondary: recommended first
      if (a.isRecommended !== b.isRecommended) return b.isRecommended - a.isRecommended;
      // Tertiary: lower cost first (if available)
      if (a.cost !== b.cost && a.cost !== Infinity && b.cost !== Infinity) {
        return a.cost - b.cost;
      }
      // Quaternary: original index (stable sort)
      return a.originalIndex - b.originalIndex;
    });

    // Check if order changed
    const orderChanged = sortedCards.some((item, idx) => item.originalIndex !== idx);
    if (!orderChanged) return; // Skip DOM manipulation if order is unchanged

    // Reorder DOM
    sortedCards.forEach(item => {
      container.appendChild(item.card);
    });

    // Restore focus to the same action card if it was focused
    if (focusedActionId) {
      const newFocusTarget = container.querySelector(`[data-sm-action-card][data-action-id="${focusedActionId}"]`);
      if (newFocusTarget && typeof newFocusTarget.focus === 'function') {
        newFocusTarget.focus();
      }
    }
  }

  // Debounced reorder using requestAnimationFrame
  let reorderPending = false;
  function scheduleReorder() {
    if (reorderPending) return;
    reorderPending = true;
    requestAnimationFrame(() => {
      reorderPending = false;
      reorderActionCards();
    });
  }

  function populateActionMenu() {
    const menu = $('#actionMenu');
    if (!menu) return;

    const res = getResourceState();
    const g = global.game || {};
    const humanId = g.humanId;
    const you = global.getP?.(humanId);
    
    // Get selected targets for evaluation (multi-select support)
    const selectedCards = Array.from($$('.player-card.selected'));
    const selectedPlayerIds = selectedCards.map(card => parseInt(card.dataset.playerId));
    const targetId = selectedPlayerIds[0] || null;
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
      const influenceReq = action.cost.influence || action.require?.influence || 0;
      const informationReq = action.cost.information || action.require?.information || 0;
      const minTargets = action.minTargets || 1;
      const affinityMin = action.affinityMin !== undefined ? action.affinityMin : null;
      
      // Evaluate each requirement independently
      const hasEnoughEnergy = res.energy >= energyCost;
      const hasEnoughInfluence = res.influence >= influenceReq;
      const hasEnoughInformation = res.information >= informationReq;
      const hasEnoughTargets = selectedPlayerIds.length >= minTargets;
      
      // Get evaluation from SocialActionConfig if available and target selected
      let evaluation = null;
      let hasAffinityReq = true;
      if (target && global.SocialActionConfig?.getActionEvaluation) {
        evaluation = global.SocialActionConfig.getActionEvaluation(action.id, you, target, action);
        hasAffinityReq = evaluation.available;
      }
      
      // Action is available if ALL requirements are met
      const allRequirementsMet = hasEnoughEnergy && hasEnoughInfluence && hasEnoughInformation && hasEnoughTargets && hasAffinityReq;
      
      const btn = document.createElement('button');
      btn.className = `action-btn action-${action.category}`;
      btn.dataset.actionId = action.id;
      btn.dataset.minTargets = minTargets;
      btn.dataset.smActionCard = ''; // Mark as action card for sorting
      btn.dataset.energy = energyCost; // Store energy cost for sorting
      
      if (!allRequirementsMet) {
        btn.classList.add('disabled');
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      } else {
        btn.setAttribute('aria-disabled', 'false');
      }

      // Build requirement chips for missing requirements
      const requirementChips = [];
      if (!hasEnoughEnergy) {
        requirementChips.push(`<span class="requirement-chip chip-energy">Needs: +${energyCost - res.energy} ⚡</span>`);
      }
      if (!hasEnoughInfluence) {
        requirementChips.push(`<span class="requirement-chip chip-influence">Needs: +${influenceReq - res.influence} 🤝 (Influence)</span>`);
      }
      if (!hasEnoughInformation) {
        requirementChips.push(`<span class="requirement-chip chip-information">Needs: +${informationReq - res.information} 💡 (Information)</span>`);
      }
      if (!hasEnoughTargets) {
        requirementChips.push(`<span class="requirement-chip chip-targets">Needs: Select ≥ ${minTargets} players</span>`);
      }
      if (evaluation && !evaluation.available && evaluation.gateReasons) {
        // Show affinity or other gate reasons
        evaluation.gateReasons.forEach(reason => {
          requirementChips.push(`<span class="requirement-chip chip-affinity">${reason}</span>`);
        });
      }

      btn.innerHTML = `
        <div class="action-header">
          <span class="action-icon">${action.icon}</span>
          <span class="action-label">${action.label}</span>
        </div>
        <div class="action-costs">
          ${energyCost > 0 ? `<span class="cost-badge cost-energy ${!hasEnoughEnergy ? 'insufficient' : ''}" title="Energy cost">⚡${energyCost}</span>` : ''}
          ${influenceReq > 0 ? `<span class="cost-badge cost-influence ${!hasEnoughInfluence ? 'insufficient' : ''}" title="Influence required">🤝${influenceReq}</span>` : ''}
          ${informationReq > 0 ? `<span class="cost-badge cost-information ${!hasEnoughInformation ? 'insufficient' : ''}" title="Information required">💡${informationReq}</span>` : ''}
        </div>
        <div class="action-description">${action.description}</div>
        ${requirementChips.length > 0 ? `<div class="action-requirements">${requirementChips.join('')}</div>` : ''}
      `;

      // Add tooltip with all requirements
      const tooltipParts = [action.description];
      if (requirementChips.length > 0) {
        tooltipParts.push('');
        tooltipParts.push('Missing requirements:');
        if (!hasEnoughEnergy) tooltipParts.push(`  - Need ${energyCost - res.energy} more Energy`);
        if (!hasEnoughInfluence) tooltipParts.push(`  - Need ${influenceReq - res.influence} more Influence`);
        if (!hasEnoughInformation) tooltipParts.push(`  - Need ${informationReq - res.information} more Information`);
        if (!hasEnoughTargets) tooltipParts.push(`  - Need to select ${minTargets} or more players`);
        if (evaluation && !evaluation.available) {
          evaluation.gateReasons?.forEach(r => tooltipParts.push(`  - ${r}`));
        }
      }
      btn.title = tooltipParts.join('\n');

      btn.addEventListener('click', () => {
        if (!allRequirementsMet) return;
        
        // Clear other selections
        $$('.action-btn.selected').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateExecuteButton();
      });

      menu.appendChild(btn);
    });
    
    // Trigger reordering after menu is populated
    scheduleReorder();
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

    const selectedPlayers = Array.from($$('.player-card.selected'));
    const selectedAction = $('.action-btn.selected');
    const res = getResourceState();

    if (!selectedAction || !selectedPlayers.length) {
      btn.disabled = true;
      btn.textContent = 'Select Action & Players';
      return;
    }

    // Get action details
    const actionId = selectedAction.dataset.actionId;
    const minTargets = parseInt(selectedAction.dataset.minTargets) || 1;
    
    // ==== USE UNIFIED COST CALCULATOR (Single Source of Truth) ====
    const selectedIds = selectedPlayers.map(card => parseInt(card.dataset.playerId));
    const costCalc = global.SocialManeuvers?.computeActionCost?.(actionId, selectedIds) || { total: 1, base: 1, group: 0 };
    const { total: effectiveCost, base: baseCost, group: groupCost } = costCalc;
    
    console.info(`[socialize-mobile] Preview cost: ${effectiveCost}⚡ (${costCalc.breakdown})`);
    
    // Check all requirements
    const hasEnoughPlayers = selectedPlayers.length >= minTargets;
    const hasEnoughEnergy = res.energy >= effectiveCost;
    
    const canExecute = hasEnoughPlayers && hasEnoughEnergy && selectedAction;
    btn.disabled = !canExecute;
    
    // Update button text with effective cost display
    if (!hasEnoughPlayers) {
      btn.textContent = `Select ${minTargets}+ Players (${selectedPlayers.length} selected)`;
    } else if (!hasEnoughEnergy) {
      if(groupCost > 0) {
        btn.textContent = `Need ${effectiveCost}⚡ (base ${baseCost} + group ${groupCost}), have ${res.energy}⚡`;
      } else {
        btn.textContent = `Need ${effectiveCost}⚡, have ${res.energy}⚡`;
      }
    } else {
      // Show effective cost with breakdown for group actions
      if(groupCost > 0) {
        btn.textContent = `Execute Action: ⚡${effectiveCost} (base ${baseCost} + group ${groupCost})`;
      } else {
        btn.textContent = `Execute Action: ⚡${effectiveCost}`;
      }
    }
    
    // Add tooltip with cost breakdown for transparency
    if(groupCost > 0) {
      btn.title = `Base cost: ${baseCost}⚡\n+${groupCost}⚡ for ${selectedIds.length - 1} extra target${(selectedIds.length - 1) !== 1 ? 's' : ''}\nTotal: ${effectiveCost}⚡`;
    } else {
      btn.title = `Energy cost: ${effectiveCost}⚡`;
    }
  }

  function executeAction() {
    const selectedPlayers = Array.from($$('.player-card.selected'));
    const selectedAction = $('.action-btn.selected');
    const res = getResourceState();
    
    const g = global.game || {};
    const humanId = g.humanId;
    const humanPlayer = global.getP?.(humanId);
    
    // Check if player is evicted
    if(humanPlayer && humanPlayer.evicted){
      console.info('[socialize-mobile] Human player is evicted - cannot execute action');
      global.addLog?.('You have been evicted and can no longer participate in social interactions.', 'danger');
      closeSocializeModal(true); // Skip energy check for evicted players
      return;
    }

    if (!selectedPlayers.length || !selectedAction || res.energy <= 0) {
      return;
    }

    const actionId = selectedAction.dataset.actionId;
    const minTargets = parseInt(selectedAction.dataset.minTargets) || 1;
    const you = global.getP?.(g.humanId);

    if (!you) return;

    // Get action definition to check if it's a group action
    const actions = global.SocialManeuvers?.SOCIAL_ACTIONS || [];
    const action = actions.find(a => a.id === actionId);
    const isGroupAction = action?.multiTarget === true || minTargets >= 2;
    
    // Validate target count for group actions
    if (isGroupAction && selectedPlayers.length < minTargets) {
      global.addLog?.(`Need at least ${minTargets} targets for this action.`, 'warn');
      return;
    }

    // Execute via canonical SocialManeuvers.executeAction when enabled
    // When Social Maneuvers is enabled, ALWAYS use the engine (no legacy fallbacks)
    const useSocialManeuvers = global.SocialManeuvers?.isEnabled?.() && global.SocialManeuvers?.executeAction;
    
    if (useSocialManeuvers) {
      if (isGroupAction) {
        // GROUP ACTION: Pass all targets as a single grouped call
        const targetIds = selectedPlayers.map(card => parseInt(card.dataset.playerId));
        const primaryTargetId = targetIds[0];
        const extraTargetIds = targetIds.slice(1);
        
        try {
          // Use canonical mechanics engine for execution with group mode
          const result = global.SocialManeuvers.executeAction(you.id, primaryTargetId, actionId, extraTargetIds);
          
          // Dev telemetry (dev builds only)
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.group(`[socialize-mobile] Group action executed: ${actionId}`);
            console.log('Actor:', you.name, '(ID:', you.id, ')');
            console.log('Targets:', targetIds.map(id => global.safeName?.(id) || id).join(', '));
            console.log('Target count:', targetIds.length);
            console.log('Success:', result.success);
            if (result.outcome) {
              console.log('Outcome:', result.outcome.type, '-', result.outcome.message);
              console.log('Participants:', result.outcome.participants);
            }
            if (result.resources) {
              console.log('Resources after:', result.resources);
            }
            console.groupEnd();
          }
          
          // Show feedback in UI
          if (result.success) {
            const targetNames = targetIds.map(id => global.safeName?.(id) || 'Unknown').join(', ');
            addFeedbackEntry(
              selectedAction.querySelector('.action-label')?.textContent || actionId,
              targetNames,
              result.outcome?.type || 'neutral',
              result.outcome?.message || 'Group action completed'
            );
          } else {
            addFeedbackEntry(
              selectedAction.querySelector('.action-label')?.textContent || actionId,
              `${targetIds.length} players`,
              'error',
              result.message || result.reason || 'Group action failed'
            );
          }
        } catch (e) {
          console.error('[socialize-mobile] Failed to execute group action via SocialManeuvers:', e);
          global.addLog?.(`Error executing group action: ${e.message}`, 'error');
        }
      } else {
        // SINGLE TARGET ACTION: Treat multi-target as a single grouped call when multiple selected
        const targetIds = selectedPlayers.map(card => parseInt(card.dataset.playerId));
        const primaryTargetId = targetIds[0];
        const extraTargetIds = targetIds.slice(1);
        
        try {
          // Always use single call with all targets (treat as grouped)
          const result = global.SocialManeuvers.executeAction(you.id, primaryTargetId, actionId, extraTargetIds);
          
          // Dev telemetry (dev builds only)
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.group(`[socialize-mobile] Action executed: ${actionId}`);
            console.log('Actor:', you.name, '(ID:', you.id, ')');
            console.log('Targets:', targetIds.map(id => global.safeName?.(id) || id).join(', '));
            console.log('Success:', result.success);
            if (result.outcome) {
              console.log('Outcome:', result.outcome.type, '-', result.outcome.message);
              if (result.outcome.affinityChange !== undefined) {
                console.log('Affinity change:', result.outcome.affinityChange);
              }
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
          const targetNames = targetIds.map(id => global.safeName?.(id) || 'Unknown').join(', ');
          if (result.success) {
            addFeedbackEntry(
              selectedAction.querySelector('.action-label')?.textContent || actionId,
              targetNames,
              result.outcome?.type || 'neutral',
              result.outcome?.message || 'Action completed'
            );
          } else {
            addFeedbackEntry(
              selectedAction.querySelector('.action-label')?.textContent || actionId,
              targetNames,
              'error',
              result.message || result.reason || 'Action failed'
            );
          }
        } catch (e) {
          console.error('[socialize-mobile] Failed to execute action via SocialManeuvers:', e);
          global.addLog?.(`Error executing action: ${e.message}`, 'error');
        }
      }
    } else {
      // DO NOT fallback to legacy when flag is ON
      const missingComponents = [];
      if (!global.SocialManeuvers?.isEnabled?.()) missingComponents.push('isEnabled');
      if (!global.SocialManeuvers?.executeAction) missingComponents.push('executeAction');
      const details = missingComponents.length ? `Missing: ${missingComponents.join(', ')}` : 'Unknown component missing';
      console.error(`[socialize-mobile] Social Maneuvers is enabled but engine not available. ${details}`);
      global.addLog?.(`Social Maneuvers engine unavailable. ${details}`, 'error');
      return;
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
        closeSocializeModal(true); // Skip energy check since we know it's depleted
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

  // REMOVED: showSocialUpdateToast(), dismissToast(), showDetailsDialog()
  // Legacy toast/mini-card UI completely removed - engine summary is sole owner

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

  // Phase visibility management
  function showLauncher() {
    const launcher = $('#socializeLauncher');
    if (launcher) {
      launcher.style.display = '';
      console.info('[socialize-mobile] Launcher shown');
    }
  }

  function hideLauncher() {
    const launcher = $('#socializeLauncher');
    if (launcher) {
      launcher.style.display = 'none';
      console.info('[socialize-mobile] Launcher hidden');
    }
  }

  // Check if current phase is social_intermission AND human player is not evicted
  function isInSocialPhase() {
    const g = global.game || {};
    const isPhaseCorrect = g.phase === 'social_intermission' || g.phase === 'social';
    
    // Also check if human player is evicted
    const humanId = g.humanId;
    const humanPlayer = global.getP?.(humanId);
    const isNotEvicted = !(humanPlayer && humanPlayer.evicted);
    
    return isPhaseCorrect && isNotEvicted;
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
    onResourcesChanged: onResourcesChanged,
    show: showLauncher,
    hide: hideLauncher,
    isInSocialPhase: isInSocialPhase,
    initPlayerGrid: initPlayerGrid, // New: re-bind handlers on grid re-render
    disableSocialCard: disableSocialCard, // New: disable card for evicted players
    state: SocializeMobile.state, // Expose state for testing/debugging
    isTouchDevice: isTouchDevice // Expose for testing
  };

  // Resilient auto-mount with MutationObserver
  // Only mount launcher when in social_intermission (phase-gated), but keep observer active
  let mountObserver = null;
  
  function startMountObserver() {
    if (mountObserver) {
      console.info('[socialize-mobile] Mount observer already active');
      return;
    }
    
    // Try initial mount ONLY if in social phase (phase-gated)
    try {
      if (isInSocialPhase()) {
        ensureSocializeLauncher();
        updateHUDDisplay();
        showLauncher();
        console.info('[socialize-mobile] Launcher mounted (in social_intermission)');
      } else {
        console.info('[socialize-mobile] Not in social_intermission - launcher will mount on phase entry');
      }
    } catch(e) {
      console.warn('[socialize-mobile] Initial mount failed:', e.message);
    }
    
    // Keep MutationObserver active to remount if the surface changes
    mountObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Only auto-mount if in social_intermission (phase-gated)
          if (!isInSocialPhase()) {
            continue;
          }
          
          // Check if mount target exists but launcher is missing
          let mountTarget;
          if (global.SocialLauncherBootstrap?.resolveMountTarget) {
            mountTarget = global.SocialLauncherBootstrap.resolveMountTarget();
          } else {
            mountTarget = document.querySelector('#tvOverlay') || 
                          document.querySelector('.tvViewport') || 
                          document.querySelector('#tv');
          }
          
          const launcher = document.querySelector('#socializeLauncher');
          
          if (mountTarget && !launcher) {
            try {
              console.info('[socialize-mobile] Auto-mounting launcher after DOM change');
              ensureSocializeLauncher();
              updateHUDDisplay();
              showLauncher();
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
    
    console.info('[socialize-mobile] Mount observer started (phase-gated, observer remains active)');
  }

  // Bootstrap on DOMContentLoaded
  function bootstrap() {
    try {
      // Try to mount launcher if DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          try {
            startMountObserver();
            installResourceChangeListeners();
          } catch(e) {
            console.error('[socialize-mobile] Bootstrap failed:', e.message);
          }
        });
      } else {
        // DOM already loaded
        startMountObserver();
        installResourceChangeListeners();
      }
    } catch(e) {
      console.error('[socialize-mobile] Bootstrap initialization failed:', e.message);
    }
  }
  
  // Install event listeners for resource changes and battery preview
  function installResourceChangeListeners() {
    // Listen for social-resources-changed events
    global.addEventListener('social-resources-changed', (event) => {
      console.log('[socialize-mobile] Resources changed, triggering reorder');
      scheduleReorder();
    });
    
    // Listen for social-battery-preview events
    global.addEventListener('social-battery-preview', (event) => {
      console.log('[socialize-mobile] Battery preview, triggering reorder');
      scheduleReorder();
    });
    
    console.info('[socialize-mobile] Resource change listeners installed');
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
