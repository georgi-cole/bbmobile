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

    const tabs = ['Events', 'Stats', 'Games'];
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
