/**
 * MODULE: js/ui/settings-debug-juror.js
 * 
 * Settings Debug Integration for Jurors Return Overlay
 * 
 * Adds a debug button to the Settings → Debug tab that forces the Jurors Return
 * twist UI for testing. The button only runs if there are at least 2 evictees.
 * 
 * SAFETY:
 * - Requires minimum 2 evictees to trigger
 * - Shows friendly message when conditions not met
 * - Guards all game API calls
 * - Clone-only behavior (never moves original DOM)
 * - Keyboard accessible with ARIA attributes
 * 
 * INTEGRATION:
 * - Inserts into Settings → Debug area on DOMContentLoaded
 * - Falls back to creating a small debug block if settings not found
 * - Uses guarded calls to JurorReturnOverlay.debugShow()
 */

(function(global) {
  'use strict';

  /**
   * Get evictees from game state with comprehensive fallback chain
   */
  function getEvictees() {
    const g = global.game;
    if (!g) {
      console.warn('[SettingsDebugJuror] window.game not available');
      return [];
    }

    // Try known property names in order of preference
    const propertyNames = [
      'evictees',
      'evicted',
      'evictedPlayers',
      'evictionHistory',
      'evictions'
    ];

    for (const prop of propertyNames) {
      if (Array.isArray(g[prop]) && g[prop].length > 0) {
        console.log('[SettingsDebugJuror] Found evictees via property:', prop);
        return g[prop];
      }
    }

    // Fallback: scan players array for evicted flag
    if (Array.isArray(g.players)) {
      const evictedPlayers = g.players.filter(p => p && p.evicted);
      if (evictedPlayers.length > 0) {
        console.log('[SettingsDebugJuror] Found evictees by scanning players array');
        return evictedPlayers.map(p => p.id);
      }
    }

    // Last resort: scan DOM for evicted elements
    console.warn('[SettingsDebugJuror] No evictees found in game state, attempting DOM scan');
    const domEvicted = document.querySelectorAll('.evicted, .roster .evicted');
    if (domEvicted.length > 0) {
      console.log('[SettingsDebugJuror] Found evictees via DOM scan');
      const ids = [];
      domEvicted.forEach((el, idx) => {
        const dataId = el.getAttribute('data-id') || el.getAttribute('data-player-id');
        ids.push(dataId || idx);
      });
      return ids;
    }

    console.warn('[SettingsDebugJuror] No evictees found via any method');
    return [];
  }

  /**
   * Convert evictee IDs to player objects with name and avatar
   */
  function evicteesToPlayerObjects(evicteeIds) {
    const players = [];
    
    for (const id of evicteeIds) {
      let player = null;
      
      // Try to get full player object via game API
      if (typeof global.getP === 'function') {
        player = global.getP(id);
      } else if (global.game && Array.isArray(global.game.players)) {
        player = global.game.players.find(p => p && p.id === id);
      }
      
      // Build player object
      if (player) {
        players.push({
          id: player.id,
          name: player.name || (global.safeName ? global.safeName(id) : `Player ${id}`),
          avatarUrl: player.avatar || getDicebearUrl(player.name || `Player${id}`)
        });
      } else {
        // Fallback: create minimal player object
        const name = global.safeName ? global.safeName(id) : `Player ${id}`;
        players.push({
          id: id,
          name: name,
          avatarUrl: getDicebearUrl(name)
        });
      }
    }
    
    return players;
  }

  /**
   * Get Dicebear avatar URL
   */
  function getDicebearUrl(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  }

  /**
   * Show toast notification
   */
  function showToast(message, type = 'info') {
    try {
      // Try game's addLog function first
      if (typeof global.addLog === 'function') {
        const cssClass = type === 'error' ? 'warn' : type === 'success' ? 'ok' : '';
        global.addLog(message, cssClass);
        return;
      }
    } catch (err) {
      console.warn('[SettingsDebugJuror] addLog failed:', err);
    }

    // Fallback: create inline toast
    const toast = document.createElement('div');
    toast.className = 'settings-debug-juror-toast';
    toast.textContent = message;
    
    const bgColor = type === 'error' 
      ? 'rgba(255, 51, 102, 0.95)' 
      : type === 'success'
      ? 'rgba(0, 224, 204, 0.95)'
      : 'rgba(96, 165, 250, 0.95)';
    
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${bgColor};
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: toastFadeIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Handle debug button click
   */
  function handleDebugClick() {
    console.log('[SettingsDebugJuror] Debug button clicked');
    
    // Get evictees
    const evicteeIds = getEvictees();
    
    if (evicteeIds.length < 2) {
      const message = evicteeIds.length === 0
        ? 'No evictees available. At least 2 evictees required to run Jurors Return.'
        : 'Only 1 evictee found. At least 2 evictees required to run Jurors Return.';
      
      showToast(message, 'error');
      updateStatusMessage(message);
      return;
    }
    
    console.log('[SettingsDebugJuror] Found', evicteeIds.length, 'evictees, triggering overlay');
    
    // Convert to player objects
    const players = evicteesToPlayerObjects(evicteeIds);
    
    // Try method 1: Call JurorReturnOverlay.debugShow directly
    if (global.JurorReturnOverlay && typeof global.JurorReturnOverlay.debugShow === 'function') {
      try {
        console.log('[SettingsDebugJuror] Calling JurorReturnOverlay.debugShow with', players.length, 'players');
        global.JurorReturnOverlay.debugShow(players);
        showToast('Jurors Return overlay triggered!', 'success');
        return;
      } catch (err) {
        console.error('[SettingsDebugJuror] JurorReturnOverlay.debugShow failed:', err);
      }
    }
    
    // Try method 2: Dispatch custom event
    try {
      console.log('[SettingsDebugJuror] Dispatching jurors_return event');
      const event = new CustomEvent('jurors_return', {
        detail: { debug: true, players: players }
      });
      global.dispatchEvent(event);
      showToast('Jurors Return event dispatched!', 'success');
      return;
    } catch (err) {
      console.error('[SettingsDebugJuror] Event dispatch failed:', err);
    }
    
    // Method 3: Create inline fallback overlay
    console.warn('[SettingsDebugJuror] No overlay system available, creating fallback');
    createFallbackOverlay(players);
    showToast('Jurors Return (fallback mode)', 'info');
  }

  /**
   * Update status message in debug area
   */
  function updateStatusMessage(message) {
    const statusDiv = document.getElementById('debug-juror-status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';
    }
  }

  /**
   * Create fallback overlay if no overlay system available
   */
  function createFallbackOverlay(players) {
    const overlay = document.createElement('div');
    overlay.className = 'settings-debug-juror-fallback';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 15, 22, 0.95);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-y: auto;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
      background: rgba(30, 41, 59, 0.9);
      border-radius: 16px;
      padding: 32px;
      max-width: 800px;
      width: 100%;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = 'text-align:center;margin-bottom:24px;';
    header.innerHTML = `
      <h2 style="color:#00e0cc;font-size:1.8rem;margin:0 0 8px 0;">🗳️ America's Vote (Debug)</h2>
      <p style="color:#8fb4d4;font-size:1rem;">Which juror deserves a second chance?</p>
    `;
    container.appendChild(header);
    
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
    
    players.forEach(player => {
      const item = document.createElement('div');
      item.style.cssText = `
        background: rgba(20, 35, 55, 0.8);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        border: 1px solid rgba(0, 224, 204, 0.3);
      `;
      
      item.innerHTML = `
        <img src="${player.avatarUrl}" alt="${player.name}" style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px solid #00e0cc;
        ">
        <div style="flex:1;">
          <div style="color:#e8f4ff;font-size:1.1rem;font-weight:700;">${player.name}</div>
          <div style="color:#8fb4d4;font-size:0.85rem;">Evictee</div>
        </div>
      `;
      
      list.appendChild(item);
    });
    
    container.appendChild(list);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      margin-top: 24px;
      padding: 12px 32px;
      background: #00e0cc;
      color: #001a18;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    `;
    closeBtn.addEventListener('click', () => overlay.remove());
    container.appendChild(closeBtn);
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }

  /**
   * Insert debug button into Settings → Debug area
   */
  function insertDebugButton() {
    // Try to find Settings → Debug area
    const selectors = [
      '#settings-debug',
      '.settings-debug',
      '#settings .debug',
      '.settings .debug'
    ];
    
    let debugArea = null;
    for (const selector of selectors) {
      debugArea = document.querySelector(selector);
      if (debugArea) {
        console.log('[SettingsDebugJuror] Found debug area via selector:', selector);
        break;
      }
    }
    
    // If no debug area found, try to find settings modal and append
    if (!debugArea) {
      const settingsModal = document.querySelector('#settingsModal, .settings-modal, [role="dialog"]');
      if (settingsModal) {
        console.log('[SettingsDebugJuror] Creating debug area in settings modal');
        debugArea = document.createElement('div');
        debugArea.id = 'settings-debug';
        debugArea.style.cssText = 'padding:16px;background:rgba(20,35,55,0.5);border-radius:8px;margin-top:16px;';
        settingsModal.appendChild(debugArea);
      }
    }
    
    // Last resort: create floating debug block
    if (!debugArea) {
      console.warn('[SettingsDebugJuror] No settings area found, creating floating debug block');
      debugArea = document.createElement('div');
      debugArea.id = 'settings-debug-juror-floating';
      debugArea.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(30, 41, 59, 0.95);
        border: 1px solid rgba(0, 224, 204, 0.3);
        border-radius: 12px;
        padding: 16px;
        z-index: 1000;
        max-width: 280px;
      `;
      document.body.appendChild(debugArea);
    }
    
    // Create button container
    const container = document.createElement('div');
    container.className = 'debug-juror-button-container';
    container.style.cssText = 'margin-top:12px;';
    
    const label = document.createElement('div');
    label.style.cssText = 'color:#8fb4d4;font-size:0.85rem;margin-bottom:8px;font-weight:600;';
    label.textContent = '🗳️ Jurors Return Debug';
    container.appendChild(label);
    
    // Create button
    const button = document.createElement('button');
    button.id = 'btnForceJurorsReturn';
    button.className = 'btn small';
    button.textContent = 'Force Jurors Return (Debug)';
    button.setAttribute('aria-label', 'Force Jurors Return overlay for testing');
    button.setAttribute('title', 'Trigger Jurors Return overlay (requires ≥2 evictees)');
    button.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, #00e0cc 0%, #00b8a3 100%);
      color: #001a18;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 224, 204, 0.2);
      transition: all 0.2s ease;
    `;
    
    // Hover effect
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(0, 224, 204, 0.4)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(0, 224, 204, 0.2)';
    });
    
    // Click handler
    button.addEventListener('click', handleDebugClick);
    
    // Keyboard accessibility
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDebugClick();
      }
    });
    
    container.appendChild(button);
    
    // Status message area
    const statusDiv = document.createElement('div');
    statusDiv.id = 'debug-juror-status';
    statusDiv.setAttribute('role', 'status');
    statusDiv.setAttribute('aria-live', 'polite');
    statusDiv.style.cssText = `
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(255, 165, 0, 0.1);
      border: 1px solid rgba(255, 165, 0, 0.3);
      border-radius: 6px;
      color: #ffb84d;
      font-size: 0.8rem;
      display: none;
    `;
    container.appendChild(statusDiv);
    
    // Check evictee count and show hint if needed
    const evicteeIds = getEvictees();
    if (evicteeIds.length < 2) {
      const hint = evicteeIds.length === 0
        ? 'No evictees yet. Button requires ≥2 evictees.'
        : 'Only 1 evictee found. Button requires ≥2 evictees.';
      statusDiv.textContent = hint;
      statusDiv.style.display = 'block';
      button.style.opacity = '0.6';
    }
    
    debugArea.appendChild(container);
    console.log('[SettingsDebugJuror] Debug button inserted successfully');
  }

  /**
   * Initialize module
   */
  function init() {
    console.log('[SettingsDebugJuror] Initializing...');
    
    // Wait for settings to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(insertDebugButton, 500);
      });
    } else {
      setTimeout(insertDebugButton, 500);
    }
  }

  // Auto-init
  init();

  // Add CSS for toast animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastFadeIn {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);

  console.log('[SettingsDebugJuror] Module loaded');

})(window);
