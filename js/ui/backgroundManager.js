// MODULE: backgroundManager.js
// Dev-only personal background override manager for intro hub
// Allows maintainer to manually select backgrounds or schedule date-specific backgrounds
// UI panel only shown when localStorage.devBackgroundManager === "true" or URL ?bgmgr=1
// Persists preferences in localStorage under key "bgmgr.preferences.v1"

(function(g) {
  'use strict';

  const STORAGE_KEY = 'bgmgr.preferences.v1';
  const DEV_FLAG_KEY = 'devBackgroundManager';
  
  let availableBackgrounds = [];
  let preferences = {
    manualOverride: null,      // { id: string } or null
    schedule: {}                // { "2025-12-24": "xmasEve", "2025-12-25": "xmasDay" }
  };
  let panelElement = null;
  let isInitialized = false;

  // ===== STORAGE =====

  function loadPreferences() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        preferences = {
          manualOverride: parsed.manualOverride || null,
          schedule: parsed.schedule || {}
        };
        console.info('[BackgroundManager] Preferences loaded:', preferences);
      }
    } catch (err) {
      console.warn('[BackgroundManager] Failed to load preferences:', err);
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      console.info('[BackgroundManager] Preferences saved:', preferences);
    } catch (err) {
      console.warn('[BackgroundManager] Failed to save preferences:', err);
    }
  }

  // ===== DEV FLAG CHECK =====

  function isDevModeEnabled() {
    // Check localStorage flag
    try {
      const flag = localStorage.getItem(DEV_FLAG_KEY);
      if (flag === 'true') return true;
    } catch (err) {
      // localStorage not available
    }
    
    // Check URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('bgmgr') === '1') return true;
    
    return false;
  }

  // ===== PUBLIC API =====

  function setAvailableBackgrounds(list) {
    if (!Array.isArray(list)) {
      console.error('[BackgroundManager] setAvailableBackgrounds: list must be an array');
      return;
    }
    availableBackgrounds = list;
    console.info('[BackgroundManager] Available backgrounds set:', list.length);
    
    // Rebuild panel UI if already shown
    if (panelElement) {
      rebuildPanelUI();
    }
  }

  function setManualOverride(id) {
    if (id === null || id === undefined) {
      preferences.manualOverride = null;
    } else {
      preferences.manualOverride = { id };
    }
    savePreferences();
    emitChangeEvent();
    console.info('[BackgroundManager] Manual override set:', id);
  }

  function setScheduleEntry(key, id) {
    if (!key || !id) {
      console.error('[BackgroundManager] setScheduleEntry: key and id are required');
      return;
    }
    preferences.schedule[key] = id;
    savePreferences();
    emitChangeEvent();
    console.info('[BackgroundManager] Schedule entry set:', key, '->', id);
  }

  function removeScheduleEntry(key) {
    if (!key) {
      console.error('[BackgroundManager] removeScheduleEntry: key is required');
      return;
    }
    delete preferences.schedule[key];
    savePreferences();
    emitChangeEvent();
    console.info('[BackgroundManager] Schedule entry removed:', key);
  }

  function getActiveBackground(meta, autoResolverFn) {
    // Priority: Manual override > Date schedule > Auto resolver
    
    // 1. Check manual override
    if (preferences.manualOverride && preferences.manualOverride.id) {
      console.info('[BackgroundManager] Using manual override:', preferences.manualOverride.id);
      return preferences.manualOverride.id;
    }
    
    // 2. Check date-based schedule
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    if (preferences.schedule[today]) {
      console.info('[BackgroundManager] Using scheduled background for', today, ':', preferences.schedule[today]);
      return preferences.schedule[today];
    }
    
    // 3. Fall back to auto resolver
    if (typeof autoResolverFn === 'function') {
      const result = autoResolverFn(meta);
      console.info('[BackgroundManager] Using auto-resolved background:', result);
      return result;
    }
    
    // 4. Final fallback
    console.warn('[BackgroundManager] No resolver provided, using default');
    return 'day';
  }

  // ===== EVENT EMISSION =====

  function emitChangeEvent() {
    // Emit on game bus if available
    if (g.game && g.game.bus && typeof g.game.bus.emit === 'function') {
      g.game.bus.emit('ui:background:changed', {
        manualOverride: preferences.manualOverride,
        schedule: preferences.schedule
      });
    }
    
    // Emit DOM CustomEvent
    const event = new CustomEvent('bgmgr:changed', {
      detail: {
        manualOverride: preferences.manualOverride,
        schedule: preferences.schedule
      },
      bubbles: true
    });
    window.dispatchEvent(event);
  }

  // ===== DEV PANEL UI =====

  function createPanel() {
    if (panelElement) return panelElement;
    
    const panel = document.createElement('div');
    panel.id = 'backgroundManagerPanel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(15, 23, 42, 0.95);
      border: 2px solid rgba(100, 149, 237, 0.5);
      border-radius: 12px;
      padding: 16px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      color: #e2e8f0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
    `;
    
    panelElement = panel;
    rebuildPanelUI();
    
    return panel;
  }

  function rebuildPanelUI() {
    if (!panelElement) return;
    
    const currentOverride = preferences.manualOverride ? preferences.manualOverride.id : '';
    const today = new Date().toISOString().split('T')[0];
    const todayScheduled = preferences.schedule[today] || '';
    
    panelElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 700;">🎨 Background Manager</h3>
        <button id="bgmgr-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px; line-height: 1;">×</button>
      </div>
      
      <div style="margin-bottom: 16px; padding: 8px; background: rgba(100, 149, 237, 0.1); border-radius: 6px; font-size: 12px; color: #cbd5e1;">
        ⚠️ Dev-only tool. Changes are personal (localStorage) and do not affect other users.
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Manual Override</label>
        <select id="bgmgr-manual-select" style="width: 100%; padding: 8px; border-radius: 6px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 149, 237, 0.3); color: #e2e8f0; font-size: 13px;">
          <option value="">-- Auto (use schedule or resolver) --</option>
          ${availableBackgrounds.map(bg => `<option value="${bg.id}" ${bg.id === currentOverride ? 'selected' : ''}>${bg.label || bg.id}</option>`).join('')}
        </select>
        <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">
          Current: ${currentOverride || 'None (auto)'}
        </div>
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Schedule Today (${today})</label>
        <select id="bgmgr-today-select" style="width: 100%; padding: 8px; border-radius: 6px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 149, 237, 0.3); color: #e2e8f0; font-size: 13px;">
          <option value="">-- No schedule for today --</option>
          ${availableBackgrounds.map(bg => `<option value="${bg.id}" ${bg.id === todayScheduled ? 'selected' : ''}>${bg.label || bg.id}</option>`).join('')}
        </select>
        <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">
          Scheduled: ${todayScheduled || 'None'}
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <button id="bgmgr-clear-manual" style="width: 100%; padding: 8px 12px; border-radius: 6px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #fca5a5; cursor: pointer; font-weight: 600; font-size: 13px;">
          Clear Manual Override
        </button>
      </div>
      
      <div style="margin-bottom: 12px;">
        <button id="bgmgr-clear-today" style="width: 100%; padding: 8px 12px; border-radius: 6px; background: rgba(251, 146, 60, 0.2); border: 1px solid rgba(251, 146, 60, 0.5); color: #fdba74; cursor: pointer; font-weight: 600; font-size: 13px;">
          Clear Today's Schedule
        </button>
      </div>
      
      <div style="padding-top: 12px; border-top: 1px solid rgba(100, 149, 237, 0.2); font-size: 11px; color: #94a3b8;">
        <div>Available backgrounds: ${availableBackgrounds.length}</div>
        <div>Schedule entries: ${Object.keys(preferences.schedule).length}</div>
      </div>
    `;
    
    // Wire event listeners
    const closeBtn = panelElement.querySelector('#bgmgr-close');
    const manualSelect = panelElement.querySelector('#bgmgr-manual-select');
    const todaySelect = panelElement.querySelector('#bgmgr-today-select');
    const clearManualBtn = panelElement.querySelector('#bgmgr-clear-manual');
    const clearTodayBtn = panelElement.querySelector('#bgmgr-clear-today');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        hidePanel();
      });
    }
    
    if (manualSelect) {
      manualSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        setManualOverride(value || null);
        rebuildPanelUI();
      });
    }
    
    if (todaySelect) {
      todaySelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value) {
          setScheduleEntry(today, value);
        } else {
          removeScheduleEntry(today);
        }
        rebuildPanelUI();
      });
    }
    
    if (clearManualBtn) {
      clearManualBtn.addEventListener('click', () => {
        setManualOverride(null);
        rebuildPanelUI();
      });
    }
    
    if (clearTodayBtn) {
      clearTodayBtn.addEventListener('click', () => {
        removeScheduleEntry(today);
        rebuildPanelUI();
      });
    }
  }

  function showPanel() {
    if (!isDevModeEnabled()) {
      console.warn('[BackgroundManager] Dev mode not enabled. Set localStorage.devBackgroundManager="true" or use ?bgmgr=1');
      return;
    }
    
    if (!panelElement) {
      const panel = createPanel();
      document.body.appendChild(panel);
    } else {
      panelElement.style.display = 'block';
      rebuildPanelUI();
    }
    
    console.info('[BackgroundManager] Panel shown');
  }

  function hidePanel() {
    if (panelElement) {
      panelElement.style.display = 'none';
    }
    console.info('[BackgroundManager] Panel hidden');
  }

  // ===== INITIALIZATION =====

  function init() {
    if (isInitialized) {
      console.warn('[BackgroundManager] Already initialized');
      return;
    }
    
    loadPreferences();
    
    // Auto-show panel if dev mode is enabled
    if (isDevModeEnabled()) {
      console.info('[BackgroundManager] Dev mode enabled, showing panel');
      showPanel();
    }
    
    isInitialized = true;
    console.info('[BackgroundManager] Initialized');
  }

  // ===== PUBLIC API EXPORT =====

  const API = {
    init,
    setAvailableBackgrounds,
    setManualOverride,
    setScheduleEntry,
    removeScheduleEntry,
    getActiveBackground,
    showPanel,
    hidePanel,
    // Dev inspection
    getPreferences: () => ({ ...preferences }),
    isDevModeEnabled
  };

  // Export to window.game namespace
  if (!g.game) g.game = {};
  g.game.BackgroundManager = API;
  
  // Also export to window for direct access
  g.BackgroundManager = API;
  
  console.info('[BackgroundManager] Module loaded');

})(window);
