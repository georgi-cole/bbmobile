// MODULE: minigames/debug-panel.js
// Developer debug panel for viewing minigame telemetry and statistics

(function(g){
  'use strict';

  let panelElement = null;
  let isVisible = false;
  let autoRefreshInterval = null;

  /**
   * Create the debug panel UI
   * @returns {HTMLElement} Panel element
   */
  function createPanelUI(){
    const panel = document.createElement('div');
    panel.id = 'minigame-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: min(400px, 90vw);
      max-height: 80vh;
      background: rgba(13, 21, 31, 0.98);
      border: 2px solid rgba(131, 191, 255, 0.5);
      border-radius: 12px;
      padding: 16px;
      z-index: 10000;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #e3ecf5;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(10px);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(131, 191, 255, 0.3);
    `;

    const title = document.createElement('div');
    title.textContent = '🎮 Minigame Debug';
    title.style.cssText = `
      font-weight: bold;
      font-size: 14px;
      color: #83bfff;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: rgba(255, 109, 109, 0.2);
      border: 1px solid rgba(255, 109, 109, 0.5);
      color: #ff6d6d;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0;
      transition: all 0.2s;
    `;
    closeBtn.addEventListener('click', hide);
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 109, 109, 0.4)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 109, 109, 0.2)';
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    `;

    const tabs = ['Events', 'Stats', 'Games', 'Test'];
    tabs.forEach(tabName => {
      const tab = document.createElement('button');
      tab.textContent = tabName;
      tab.dataset.tab = tabName.toLowerCase();
      tab.style.cssText = `
        flex: 1;
        padding: 6px 10px;
        background: rgba(131, 191, 255, 0.1);
        border: 1px solid rgba(131, 191, 255, 0.3);
        border-radius: 6px;
        color: #83bfff;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.2s;
      `;
      tab.addEventListener('click', () => switchTab(tabName.toLowerCase()));
      tabsContainer.appendChild(tab);
    });

    // Content area
    const content = document.createElement('div');
    content.id = 'debug-panel-content';
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 4px;
    `;

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex;
      gap: 6px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(131, 191, 255, 0.3);
    `;

    const refreshBtn = createActionButton('🔄', 'Refresh', refresh);
    const clearBtn = createActionButton('🗑️', 'Clear', clearData);
    const exportBtn = createActionButton('💾', 'Export', exportData);

    actions.appendChild(refreshBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(exportBtn);

    // Assemble panel
    panel.appendChild(header);
    panel.appendChild(tabsContainer);
    panel.appendChild(content);
    panel.appendChild(actions);

    return panel;
  }

  /**
   * Create action button
   */
  function createActionButton(emoji, label, onClick){
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.title = label;
    btn.style.cssText = `
      flex: 1;
      padding: 6px;
      background: rgba(131, 191, 255, 0.15);
      border: 1px solid rgba(131, 191, 255, 0.3);
      border-radius: 6px;
      color: #83bfff;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    `;
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(131, 191, 255, 0.25)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(131, 191, 255, 0.15)';
    });
    return btn;
  }

  /**
   * Switch to a different tab
   */
  function switchTab(tabName){
    const content = document.getElementById('debug-panel-content');
    if(!content) return;

    // Update tab styles
    const tabs = panelElement.querySelectorAll('[data-tab]');
    tabs.forEach(tab => {
      const isActive = tab.dataset.tab === tabName;
      tab.style.background = isActive ? 
        'rgba(131, 191, 255, 0.3)' : 
        'rgba(131, 191, 255, 0.1)';
      tab.style.borderColor = isActive ? 
        'rgba(131, 191, 255, 0.6)' : 
        'rgba(131, 191, 255, 0.3)';
    });

    // Update content
    switch(tabName){
      case 'events':
        showEventsTab(content);
        break;
      case 'stats':
        showStatsTab(content);
        break;
      case 'games':
        showGamesTab(content);
        break;
      case 'test':
        showTestTab(content);
        break;
    }
  }

  /**
   * Show events tab
   */
  function showEventsTab(container){
    if(!g.MinigameTelemetry){
      container.innerHTML = '<div style="color:#ff6d6d;">Telemetry not available</div>';
      return;
    }

    const events = g.MinigameTelemetry.getRecentEvents(20);
    if(events.length === 0){
      container.innerHTML = '<div style="color:#95a9c0;">No events yet</div>';
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    
    events.reverse().forEach(event => {
      const timestamp = new Date(event.timestamp).toLocaleTimeString();
      const emoji = {
        selection: '🎯',
        start: '▶️',
        complete: '✅',
        error: '❌'
      }[event.type] || '📊';

      const color = {
        selection: '#83bfff',
        start: '#77d58d',
        complete: '#77d58d',
        error: '#ff6d6d'
      }[event.type] || '#95a9c0';

      html += `
        <div style="
          background: rgba(255,255,255,0.03);
          padding: 8px;
          border-radius: 6px;
          border-left: 3px solid ${color};
        ">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:${color};font-weight:bold;">${emoji} ${event.type}</span>
            <span style="color:#95a9c0;font-size:10px;">${timestamp}</span>
          </div>
          <div style="color:#b6c9dc;font-size:11px;">
            ${formatEventData(event.data)}
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * Show stats tab
   */
  function showStatsTab(container){
    if(!g.MinigameTelemetry){
      container.innerHTML = '<div style="color:#ff6d6d;">Telemetry not available</div>';
      return;
    }

    const stats = g.MinigameTelemetry.getStats();
    
    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="background:rgba(131,191,255,0.1);padding:10px;border-radius:6px;">
          <div style="color:#83bfff;font-weight:bold;margin-bottom:8px;">Session</div>
          <div style="color:#b6c9dc;">
            Duration: ${(stats.sessionDurationMs / 1000 / 60).toFixed(1)} min
          </div>
        </div>
        
        <div style="background:rgba(119,213,141,0.1);padding:10px;border-radius:6px;">
          <div style="color:#77d58d;font-weight:bold;margin-bottom:8px;">Events</div>
          <div style="color:#b6c9dc;line-height:1.6;">
            Selections: ${stats.totalSelections}<br>
            Starts: ${stats.totalStarts}<br>
            Completions: ${stats.totalCompletions}<br>
            Errors: ${stats.totalErrors}
          </div>
        </div>
        
        <div style="background:rgba(242,206,123,0.1);padding:10px;border-radius:6px;">
          <div style="color:#f2ce7b;font-weight:bold;margin-bottom:8px;">Performance</div>
          <div style="color:#b6c9dc;line-height:1.6;">
            Completion Rate: ${stats.completionRate}<br>
            Error Rate: ${stats.errorRate}
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  }

  /**
   * Show games tab
   */
  function showGamesTab(container){
    if(!g.MinigameTelemetry){
      container.innerHTML = '<div style="color:#ff6d6d;">Telemetry not available</div>';
      return;
    }

    const gameStats = g.MinigameTelemetry.getAllGameStats();
    const games = Object.keys(gameStats);
    
    if(games.length === 0){
      container.innerHTML = '<div style="color:#95a9c0;">No game data yet</div>';
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    
    games.forEach(gameKey => {
      const stats = gameStats[gameKey];
      const registry = g.MinigameRegistry;
      const gameName = registry ? (registry.getGame(gameKey)?.name || gameKey) : gameKey;

      html += `
        <div style="
          background: rgba(255,255,255,0.03);
          padding: 10px;
          border-radius: 6px;
          border: 1px solid rgba(131,191,255,0.2);
        ">
          <div style="color:#83bfff;font-weight:bold;margin-bottom:6px;">${gameName}</div>
          <div style="color:#b6c9dc;font-size:11px;line-height:1.6;">
            Plays: ${stats.plays || 0}<br>
            Avg Score: ${stats.averageScore}<br>
            Avg Time: ${stats.averageTime}<br>
            Completion: ${stats.completionRate}<br>
            Errors: ${stats.errors || 0}
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * Show test tab with game selector
   */
  function showTestTab(container){
    container.innerHTML = '';
    container.style.cssText = 'overflow-y: auto; overflow-x: hidden; max-height: 60vh;';
    
    // Check if GameSelector is available
    if(!g.DebugGameSelector){
      container.innerHTML = `
        <div style="color:#ff6d6d;padding:20px;text-align:center;">
          DebugGameSelector not loaded<br>
          <small>Please ensure debug/GameSelector.js is loaded</small>
        </div>
      `;
      return;
    }

    // Info message
    const info = document.createElement('div');
    info.style.cssText = `
      background: rgba(242, 206, 123, 0.1);
      border: 1px solid rgba(242, 206, 123, 0.3);
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 11px;
      color: #f2ce7b;
    `;
    info.innerHTML = `
      <strong>⚙️ Game Tester</strong><br>
      Launch any game in test mode to verify functionality.<br>
      Click "Full Screen Test" to open in a larger window.
    `;
    container.appendChild(info);

    // Game selector dropdown
    const selectorDiv = document.createElement('div');
    selectorDiv.style.cssText = 'margin-bottom: 12px;';

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #1d2734;
      color: #e3ecf5;
      border: 1px solid #2c3a4d;
      border-radius: 6px;
      font-size: 11px;
    `;

    const defaultOption = document.createElement('option');
    defaultOption.textContent = '-- Select a game --';
    defaultOption.value = '';
    select.appendChild(defaultOption);

    // Get available games
    const games = g.GameConfig ? g.GameConfig.getAllGames({ supportsDebugMode: true }) : [];
    games.forEach(game => {
      const option = document.createElement('option');
      option.value = game.key;
      option.textContent = game.name;
      select.appendChild(option);
    });

    selectorDiv.appendChild(select);
    container.appendChild(selectorDiv);

    // Button to launch full screen test
    const launchBtn = document.createElement('button');
    launchBtn.textContent = '🚀 Full Screen Test';
    launchBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: rgba(131, 191, 255, 0.2);
      border: 1px solid rgba(131, 191, 255, 0.5);
      color: #83bfff;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 11px;
      transition: all 0.2s;
    `;
    launchBtn.disabled = true;

    select.addEventListener('change', () => {
      launchBtn.disabled = !select.value;
    });

    launchBtn.addEventListener('click', () => {
      if(select.value){
        openFullScreenTest(select.value);
      }
    });

    launchBtn.addEventListener('mouseenter', () => {
      if(!launchBtn.disabled){
        launchBtn.style.background = 'rgba(131, 191, 255, 0.3)';
      }
    });

    launchBtn.addEventListener('mouseleave', () => {
      launchBtn.style.background = 'rgba(131, 191, 255, 0.2)';
    });

    container.appendChild(launchBtn);

    // Mini preview area (optional)
    const preview = document.createElement('div');
    preview.style.cssText = `
      margin-top: 12px;
      padding: 10px;
      background: rgba(13, 21, 31, 0.5);
      border: 1px solid rgba(131, 191, 255, 0.2);
      border-radius: 6px;
      font-size: 10px;
      color: #95a9c0;
      min-height: 60px;
    `;
    preview.textContent = 'Select a game to see details...';

    select.addEventListener('change', () => {
      if(select.value && g.GameConfig){
        const game = g.GameConfig.getGame(select.value);
        if(game){
          preview.innerHTML = `
            <strong style="color:#83bfff;">${game.name}</strong><br>
            <em>${game.description}</em><br>
            <br>
            Type: ${game.type}<br>
            Module: ${game.module}
          `;
        }
      } else {
        preview.textContent = 'Select a game to see details...';
      }
    });

    container.appendChild(preview);
  }

  /**
   * Open full screen test window
   */
  function openFullScreenTest(gameKey){
    // Hide the debug panel
    hide();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'debug-game-test-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      display: flex;
      flex-direction: column;
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close Test';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 10px 20px;
      background: rgba(220, 38, 38, 0.8);
      border: 1px solid rgba(220, 38, 38, 1);
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      z-index: 10001;
    `;
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    overlay.appendChild(closeBtn);

    // Game container
    const gameContainer = document.createElement('div');
    gameContainer.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 20px;
    `;
    overlay.appendChild(gameContainer);

    document.body.appendChild(overlay);

    // Use DebugGameSelector to render the game
    if(g.DebugGameSelector){
      const selector = g.DebugGameSelector.createSelector(gameContainer);
      selector.loadGame(gameKey);
    }
  }

  /**
   * Format event data for display
   */
  function formatEventData(data){
    const parts = [];
    
    if(data.gameKey){
      const registry = g.MinigameRegistry;
      const gameName = registry ? (registry.getGame(data.gameKey)?.name || data.gameKey) : data.gameKey;
      parts.push(`Game: ${gameName}`);
    }
    
    if(data.score !== undefined){
      parts.push(`Score: ${typeof data.score === 'number' ? data.score.toFixed(1) : data.score}`);
    }
    
    if(data.normalizedScore !== undefined){
      parts.push(`Normalized: ${data.normalizedScore.toFixed(1)}`);
    }
    
    if(data.timeMs !== undefined){
      parts.push(`Time: ${(data.timeMs / 1000).toFixed(2)}s`);
    }
    
    if(data.message){
      parts.push(`Error: ${data.message}`);
    }
    
    if(data.fallbackGame){
      parts.push(`Fallback: ${data.fallbackGame}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'No data';
  }

  /**
   * Refresh panel content
   */
  function refresh(){
    if(!panelElement) return;
    
    const activeTab = panelElement.querySelector('[data-tab][style*="rgba(131, 191, 255, 0.3)"]');
    const tabName = activeTab ? activeTab.dataset.tab : 'events';
    switchTab(tabName);
  }

  /**
   * Clear telemetry data
   */
  function clearData(){
    if(!g.MinigameTelemetry) return;
    
    if(confirm('Clear all telemetry data?')){
      g.MinigameTelemetry.clearTelemetry();
      refresh();
    }
  }

  /**
   * Export telemetry data
   */
  function exportData(){
    if(!g.MinigameTelemetry) return;
    
    const data = g.MinigameTelemetry.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `minigame-telemetry-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.info('[DebugPanel] Telemetry data exported');
  }

  /**
   * Show the debug panel
   */
  function show(){
    if(isVisible) return;
    
    if(!panelElement){
      panelElement = createPanelUI();
      document.body.appendChild(panelElement);
    }
    
    panelElement.style.display = 'flex';
    isVisible = true;
    
    // Show events tab by default
    switchTab('events');
    
    // Start auto-refresh
    if(autoRefreshInterval){
      clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(refresh, 2000);
    
    console.info('[DebugPanel] Panel shown');
  }

  /**
   * Hide the debug panel
   */
  function hide(){
    if(!isVisible) return;
    
    if(panelElement){
      panelElement.style.display = 'none';
    }
    
    isVisible = false;
    
    // Stop auto-refresh
    if(autoRefreshInterval){
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
    
    console.info('[DebugPanel] Panel hidden');
  }

  /**
   * Toggle debug panel visibility
   */
  function toggle(){
    if(isVisible){
      hide();
    } else {
      show();
    }
  }

  // Export API
  g.MinigameDebugPanel = {
    show,
    hide,
    toggle,
    refresh
  };

  // Add keyboard shortcut (Ctrl+Shift+D)
  document.addEventListener('keydown', (e) => {
    if(e.ctrlKey && e.shiftKey && e.key === 'D'){
      e.preventDefault();
      toggle();
    }
  });

  // Add to window for console access
  g.__showMinigameDebug = show;
  g.__hideMinigameDebug = hide;
  g.__toggleMinigameDebug = toggle;

  console.info('[MinigameDebugPanel] Module loaded (Press Ctrl+Shift+D to toggle)');

})(window);
