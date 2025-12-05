// MODULE: ui/social/carouselIntegration.js
// Integration layer to use carousel components in Social Maneuvers phase
// Provides optional carousel-based UI rendering while maintaining backward compatibility

(function(global) {
  'use strict';

  /**
   * Enhanced Social UI renderer with carousels
   * Uses ActionsCarousel and PlayersCarousel modules if available
   * Falls back to standard grid layout if modules not loaded
   * 
   * @param {HTMLElement} container - Container element for the social UI
   * @param {number} playerId - Current player ID
   * @param {Object} options - Optional configuration
   * @param {boolean} options.useCarousels - Enable carousel mode (default: true)
   * @param {boolean} options.showHistory - Show history button (default: true)
   */
  function renderSocialUIWithCarousels(container, playerId, options = {}) {
    const useCarousels = options.useCarousels !== false;
    const showHistory = options.showHistory !== false;

    // Check if Social Maneuvers is enabled
    if (!global.SocialManeuvers?.isEnabled?.()) {
      console.info('[carouselIntegration] Social Maneuvers is disabled');
      return;
    }

    // Check if player is evicted
    const player = global.getP?.(playerId);
    if (player && player.evicted) {
      renderEvictedMessage(container);
      return;
    }

    // Get data
    const resources = global.SocialManeuvers.SocialResources?.getAll(playerId) || { energy: 0, influence: 0, information: 0 };
    const alivePlayers = global.alivePlayers?.() || [];
    const otherPlayers = alivePlayers.filter(p => p.id !== playerId);
    const availableActions = global.SocialManeuvers.SOCIAL_ACTIONS || [];

    // Track state
    let selectedPlayers = [];
    let selectedAction = null;
    let actionsCarousel = null;
    let playersCarousel = null;
    let historyButton = null;

    // Create main container with 100vh mobile layout
    const wrapper = document.createElement('div');
    wrapper.className = 'social-module-container';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Social Maneuvers Interface');

    // 1. Top bar with resources and history button
    if (showHistory && global.HistoryButton) {
      const topBar = document.createElement('div');
      topBar.className = 'social-module-topbar';
      topBar.id = 'socialTopBar';
      wrapper.appendChild(topBar);

      historyButton = global.HistoryButton.init({
        container: topBar,
        resources: resources,
        onOpen: () => {
          handleHistoryButtonClick(playerId, selectedPlayers);
        }
      });
    } else {
      // Fallback: Simple resources display
      const resourcesHUD = createSimpleResourcesHUD(resources);
      wrapper.appendChild(resourcesHUD);
    }

    // 2. Actions section with carousel
    const actionsSection = document.createElement('div');
    actionsSection.className = 'social-module-actions';
    actionsSection.id = 'socialActionsSection';
    wrapper.appendChild(actionsSection);

    if (useCarousels && global.ActionsCarousel) {
      // Use carousel for actions
      actionsCarousel = global.ActionsCarousel.init({
        container: actionsSection,
        actions: availableActions,
        enableKeyboard: true,
        onSelect: (actionId) => {
          selectedAction = availableActions.find(a => a.id === actionId);
          handleActionSelection(selectedAction);
        }
      });
    } else {
      // Fallback: Render actions in grid/list
      renderActionsGrid(actionsSection, availableActions, (action) => {
        selectedAction = action;
        handleActionSelection(action);
      });
    }

    // 3. Players section with carousel
    const playersSection = document.createElement('div');
    playersSection.className = 'social-module-players';
    playersSection.id = 'socialPlayersSection';
    wrapper.appendChild(playersSection);

    if (useCarousels && global.PlayersCarousel) {
      // Use carousel for players
      playersCarousel = global.PlayersCarousel.init({
        container: playersSection,
        players: otherPlayers,
        multiSelect: false,
        maxVisible: 8,
        excludeIds: [playerId],
        onSelect: (playerIds) => {
          selectedPlayers = playerIds.map(id => otherPlayers.find(p => p.id === id)).filter(Boolean);
          handlePlayerSelection(selectedPlayers);
        }
      });
    } else {
      // Fallback: Render players in grid
      renderPlayersGrid(playersSection, otherPlayers, (players) => {
        selectedPlayers = players;
        handlePlayerSelection(players);
      });
    }

    // 4. CTA section with execute button
    const ctaSection = document.createElement('div');
    ctaSection.className = 'social-module-cta';
    ctaSection.id = 'socialCTASection';
    
    const executeBtn = document.createElement('button');
    executeBtn.className = 'social-action-button';
    executeBtn.textContent = 'Execute Action';
    executeBtn.disabled = true;
    executeBtn.setAttribute('aria-label', 'Execute selected social action');
    executeBtn.style.cssText = 'width: 100%; padding: 16px; font-size: 1.1em; font-weight: bold; background: #f7b955; color: #000; border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;';
    
    executeBtn.onclick = () => {
      if (selectedPlayers.length > 0 && selectedAction) {
        executeSelectedAction(playerId, selectedPlayers, selectedAction, container);
      }
    };
    
    ctaSection.appendChild(executeBtn);
    wrapper.appendChild(ctaSection);

    // Append to container
    container.innerHTML = '';
    container.appendChild(wrapper);

    // Event handlers
    function handleActionSelection(action) {
      console.info('[carouselIntegration] Action selected:', action?.id);
      
      if (!action) {
        executeBtn.disabled = true;
        return;
      }

      // Check if action supports multi-target
      if (action.multiTarget && playersCarousel) {
        // Switch players carousel to multi-select mode
        playersCarousel.destroy();
        playersCarousel = global.PlayersCarousel.init({
          container: playersSection,
          players: otherPlayers,
          multiSelect: true,
          maxVisible: 8,
          excludeIds: [playerId],
          onSelect: (playerIds) => {
            selectedPlayers = playerIds.map(id => otherPlayers.find(p => p.id === id)).filter(Boolean);
            handlePlayerSelection(selectedPlayers);
          }
        });
      } else if (!action.multiTarget && playersCarousel && selectedPlayers.length > 1) {
        // Switch back to single-select if needed
        playersCarousel.destroy();
        playersCarousel = global.PlayersCarousel.init({
          container: playersSection,
          players: otherPlayers,
          multiSelect: false,
          maxVisible: 8,
          excludeIds: [playerId],
          onSelect: (playerIds) => {
            selectedPlayers = playerIds.map(id => otherPlayers.find(p => p.id === id)).filter(Boolean);
            handlePlayerSelection(selectedPlayers);
          }
        });
      }

      updateExecuteButton();
    }

    function handlePlayerSelection(players) {
      console.info('[carouselIntegration] Players selected:', players.map(p => p.id));
      
      // Update available actions based on selected player
      if (players.length > 0 && actionsCarousel) {
        const targetId = players[0].id;
        const updatedActions = global.SocialManeuvers.getAvailableActions?.(playerId, targetId) || availableActions;
        actionsCarousel.updateActions(updatedActions);
      }

      updateExecuteButton();
    }

    function updateExecuteButton() {
      const canExecute = selectedPlayers.length > 0 && selectedAction && selectedAction.canAfford !== false;
      executeBtn.disabled = !canExecute;
      
      if (canExecute) {
        const cost = selectedAction.cost || selectedAction.costs?.energy || 1;
        executeBtn.textContent = `Execute "${selectedAction.label}" (${cost}⚡)`;
        executeBtn.style.background = '#f7b955';
      } else if (selectedAction && selectedAction.canAfford === false) {
        executeBtn.textContent = 'Insufficient Energy';
        executeBtn.style.background = '#555';
      } else if (!selectedAction) {
        executeBtn.textContent = 'Select an Action';
        executeBtn.style.background = '#555';
      } else {
        executeBtn.textContent = 'Select a Player';
        executeBtn.style.background = '#555';
      }
    }

    function handleHistoryButtonClick(actorId, targets) {
      console.info('[carouselIntegration] History button clicked');
      
      // Generate history content
      const historyHtml = generateHistoryContent(actorId, targets);
      
      // Show in modal
      if (historyButton) {
        historyButton.showHistoryModal(historyHtml);
      }
    }
  }

  /**
   * Execute the selected action
   */
  function executeSelectedAction(playerId, selectedPlayers, selectedAction, container) {
    if (!global.SocialManeuvers?.executeAction) {
      console.error('[carouselIntegration] SocialManeuvers.executeAction not available');
      return;
    }

    const primaryTarget = selectedPlayers[0];
    const extraTargets = selectedPlayers.slice(1).map(p => p.id);
    
    console.info('[carouselIntegration] Executing action:', selectedAction.id, 'on', primaryTarget.id, 'extras:', extraTargets);
    
    const result = global.SocialManeuvers.executeAction(playerId, primaryTarget.id, selectedAction.id, extraTargets);
    
    // Show feedback
    showFeedback(result, playerId);
    
    // Refresh UI after a delay
    setTimeout(() => {
      renderSocialUIWithCarousels(container, playerId);
    }, 2500);
  }

  /**
   * Show action result feedback
   */
  function showFeedback(result, playerId) {
    if (!result) return;

    // Create feedback overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    const feedbackBox = document.createElement('div');
    feedbackBox.style.cssText = 'background: linear-gradient(135deg, rgba(22, 33, 62, 0.98), rgba(13, 27, 42, 0.98)); padding: 30px; border-radius: 16px; max-width: 500px; text-align: center; border: 2px solid ' + (result.succeeded ? '#2ecc71' : '#e74c3c');
    
    feedbackBox.innerHTML = `
      <div style="font-size: 3em; margin-bottom: 16px;">${result.succeeded ? '✓' : '✗'}</div>
      <h2 style="color: ${result.succeeded ? '#2ecc71' : '#e74c3c'}; margin: 0 0 12px 0;">
        ${result.succeeded ? 'Success!' : 'Failed'}
      </h2>
      <p style="color: #e3ecf5; font-size: 1.1em; margin: 0;">${result.message || 'Action completed'}</p>
    `;
    
    overlay.appendChild(feedbackBox);
    document.body.appendChild(overlay);
    
    // Remove after delay
    setTimeout(() => {
      overlay.remove();
    }, 2000);
  }

  /**
   * Generate history content HTML
   */
  function generateHistoryContent(playerId, targets) {
    // TODO: Use actual history data from SocialManeuvers memory system
    // For now, return placeholder
    return `
      <div style="padding: 20px;">
        <h3 style="color: #3498db; margin-top: 0;">Recent Activity</h3>
        <p style="opacity: 0.7;">History tracking will be populated with actual interaction data.</p>
        <p style="opacity: 0.7;">Player ID: ${playerId}</p>
      </div>
    `;
  }

  /**
   * Render evicted message
   */
  function renderEvictedMessage(container) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #999; font-size: 1.1rem;">
        <h3 style="margin-bottom: 12px; color: #ff6b6b;">You Have Been Evicted</h3>
        <p>You can no longer participate in social interactions.</p>
      </div>
    `;
  }

  /**
   * Create simple resources HUD (fallback)
   */
  function createSimpleResourcesHUD(resources) {
    const hud = document.createElement('div');
    hud.className = 'social-module-topbar';
    hud.style.cssText = 'display: flex; gap: 12px; padding: 12px 16px; background: rgba(0, 0, 0, 0.3);';
    
    ['energy', 'influence', 'information'].forEach(type => {
      const indicator = document.createElement('div');
      indicator.className = `social-resource-indicator ${type}`;
      indicator.style.cssText = 'padding: 6px 12px; background: rgba(255, 255, 255, 0.08); border-radius: 20px; font-weight: 600;';
      
      const icon = { energy: '⚡', influence: '👑', information: '🔍' }[type];
      indicator.innerHTML = `<span style="margin-right: 6px;">${icon}</span><span>${resources[type] || 0}</span>`;
      
      hud.appendChild(indicator);
    });
    
    return hud;
  }

  /**
   * Render actions in grid (fallback)
   */
  function renderActionsGrid(container, actions, onSelect) {
    const header = document.createElement('div');
    header.style.cssText = 'padding: 16px; font-size: 1.1em; font-weight: bold; color: #f7b955;';
    header.textContent = 'Choose Action';
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; gap: 12px; padding: 0 16px 16px; max-height: 400px; overflow-y: auto;';
    
    actions.forEach(action => {
      const card = document.createElement('div');
      card.style.cssText = 'padding: 14px; background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer;';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong>${action.label}</strong>
          <span style="color: #3498db;">⚡ ${action.cost || 1}</span>
        </div>
        <p style="font-size: 0.9em; opacity: 0.8; margin: 0;">${action.description}</p>
      `;
      card.onclick = () => onSelect(action);
      grid.appendChild(card);
    });
    
    container.appendChild(grid);
  }

  /**
   * Render players in grid (fallback)
   */
  function renderPlayersGrid(container, players, onSelect) {
    const header = document.createElement('div');
    header.style.cssText = 'padding: 16px; font-size: 1.1em; font-weight: bold; color: #f7b955;';
    header.textContent = 'Select Players';
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; padding: 0 16px 16px;';
    
    let selected = [];
    
    players.forEach(player => {
      const card = document.createElement('div');
      card.style.cssText = 'padding: 12px; text-align: center; background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer;';
      card.innerHTML = `<strong>${player.name}</strong>`;
      card.onclick = () => {
        selected = [player];
        onSelect(selected);
        // Visual feedback
        grid.querySelectorAll('div').forEach(c => c.style.borderColor = 'rgba(255, 255, 255, 0.1)');
        card.style.borderColor = '#f7b955';
      };
      grid.appendChild(card);
    });
    
    container.appendChild(grid);
  }

  // Export to global
  global.SocialCarouselIntegration = {
    renderSocialUIWithCarousels
  };

})(window);
