// MODULE: backgroundManager.js
// Dev-only personal background override manager for intro hub
// Allows maintainer to manually select backgrounds or schedule date-specific backgrounds
// UI panel only shown when localStorage.devBackgroundManager === "true" or URL ?bgmgr=1
// Persists preferences in localStorage under key "bgmgr.preferences.v1"
// Includes "Apply to all" feature to publish background overrides to repository

(function(g) {
  'use strict';

  const STORAGE_KEY = 'bgmgr.preferences.v1';
  const DEV_FLAG_KEY = 'devBackgroundManager';
  const TOKEN_STORAGE_KEY = 'bgmgr.gh_token';
  const REPO_OWNER = 'georgi-cole';
  const REPO_NAME = 'bbmobile';
  const BRANCH_NAME = 'main';
  const OVERRIDE_FILE_PATH = 'bg_override.json';
  
  let availableBackgrounds = [];
  let preferences = {
    manualOverride: null,      // { id: string } or null
    schedule: {}                // { "2025-12-24": "xmasEve", "2025-12-25": "xmasDay" }
  };
  let panelElement = null;
  let isInitialized = false;
  let publishInProgress = false;

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

  // ===== ASSET LOADING =====

  async function loadAssetsFromManifest() {
    try {
      const response = await fetch('/assets/skins/skins.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data && Array.isArray(data.backgrounds)) {
        availableBackgrounds = data.backgrounds;
        console.info('[BackgroundManager] Loaded backgrounds from manifest:', availableBackgrounds.length);
        return availableBackgrounds;
      } else {
        throw new Error('Invalid manifest format');
      }
    } catch (err) {
      console.error('[BackgroundManager] Failed to load manifest:', err);
      // Keep existing backgrounds if load fails
      return availableBackgrounds;
    }
  }

  async function refreshAssetsAndPopulateUI() {
    const backgrounds = await loadAssetsFromManifest();
    if (panelElement) {
      rebuildPanelUI();
    }
    return backgrounds;
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

  // ===== GITHUB API =====

  function getStoredToken() {
    try {
      return sessionStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function storeToken(token) {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('[BackgroundManager] Failed to store token:', err);
    }
  }

  async function getFileFromGitHub(token) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${OVERRIDE_FILE_PATH}?ref=${BRANCH_NAME}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'BBMobile-BackgroundManager'
        }
      });
      
      if (response.status === 404) {
        // File doesn't exist yet
        return { exists: false, sha: null };
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      return {
        exists: true,
        sha: data.sha,
        content: data.content ? JSON.parse(atob(data.content)) : null
      };
    } catch (err) {
      console.error('[BackgroundManager] Failed to get file from GitHub:', err);
      throw err;
    }
  }

  async function putFileToGitHub(token, content, commitMessage, sha = null) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${OVERRIDE_FILE_PATH}`;
    
    const body = {
      message: commitMessage,
      content: btoa(JSON.stringify(content, null, 2)),
      branch: BRANCH_NAME
    };
    
    if (sha) {
      body.sha = sha;
    }
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'BBMobile-BackgroundManager'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('[BackgroundManager] Failed to put file to GitHub:', err);
      throw err;
    }
  }

  async function publishOverrideToRepo(manualOverrideId, commitMessage, token) {
    if (publishInProgress) {
      throw new Error('Publish already in progress');
    }
    
    publishInProgress = true;
    
    try {
      // Validate token
      if (!token || token.trim() === '') {
        throw new Error('GitHub token is required');
      }
      
      // Get existing file (to get SHA)
      const fileData = await getFileFromGitHub(token);
      
      // Prepare content
      const overrideContent = {
        manualOverrideId: manualOverrideId || null,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'BackgroundManager'
      };
      
      // Put file to GitHub
      const result = await putFileToGitHub(token, overrideContent, commitMessage, fileData.sha);
      
      console.info('[BackgroundManager] Successfully published override to repo:', result);
      return result;
    } finally {
      publishInProgress = false;
    }
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
    const storedToken = getStoredToken();
    
    panelElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 700;">🎨 Background Manager</h3>
        <button id="bgmgr-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px; line-height: 1;">×</button>
      </div>
      
      <div style="margin-bottom: 16px; padding: 8px; background: rgba(100, 149, 237, 0.1); border-radius: 6px; font-size: 12px; color: #cbd5e1;">
        ⚠️ Dev-only tool. Personal changes (localStorage) only. Use "Apply to all" to publish to repo.
      </div>
      
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label style="font-weight: 600; font-size: 13px;">Manual Override</label>
          <button id="bgmgr-refresh" style="background: rgba(100, 149, 237, 0.2); border: 1px solid rgba(100, 149, 237, 0.5); color: #93c5fd; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 11px;">↻ Refresh</button>
        </div>
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
      
      <!-- Publish to Repo Section -->
      <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid rgba(100, 149, 237, 0.3);">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #fbbf24;">🚀 Apply to All Users</h4>
        
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px;">GitHub Token (repo scope)</label>
          <input type="password" id="bgmgr-token" placeholder="ghp_..." 
            value="${storedToken || ''}"
            style="width: 100%; padding: 8px; border-radius: 6px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 149, 237, 0.3); color: #e2e8f0; font-size: 12px; font-family: monospace;">
          <div style="margin-top: 4px; font-size: 10px; color: #94a3b8;">
            Token stored in sessionStorage. See docs for how to create one.
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px;">Commit Message</label>
          <input type="text" id="bgmgr-commit-msg" 
            value="bgmgr: set manualOverrideId -> ${currentOverride || 'null'}"
            style="width: 100%; padding: 8px; border-radius: 6px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(100, 149, 237, 0.3); color: #e2e8f0; font-size: 12px;">
        </div>
        
        <button id="bgmgr-publish" 
          ${publishInProgress ? 'disabled' : ''}
          style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${publishInProgress ? 'rgba(100, 149, 237, 0.3)' : 'rgba(34, 197, 94, 0.3)'}; border: 2px solid ${publishInProgress ? 'rgba(100, 149, 237, 0.5)' : 'rgba(34, 197, 94, 0.6)'}; color: ${publishInProgress ? '#94a3b8' : '#86efac'}; cursor: ${publishInProgress ? 'not-allowed' : 'pointer'}; font-weight: 700; font-size: 13px;">
          ${publishInProgress ? '⏳ Publishing...' : '✓ Publish Override to Repo'}
        </button>
        
        <div id="bgmgr-publish-status" style="margin-top: 8px; padding: 8px; border-radius: 6px; font-size: 11px; display: none;"></div>
        
        <div style="margin-top: 8px; padding: 8px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; font-size: 10px; color: #fbbf24;">
          ⚠️ This commits ${OVERRIDE_FILE_PATH} to ${BRANCH_NAME} branch and affects all users immediately.
        </div>
      </div>
      
      <div style="padding-top: 12px; margin-top: 12px; border-top: 1px solid rgba(100, 149, 237, 0.2); font-size: 11px; color: #94a3b8;">
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
    const refreshBtn = panelElement.querySelector('#bgmgr-refresh');
    const tokenInput = panelElement.querySelector('#bgmgr-token');
    const commitMsgInput = panelElement.querySelector('#bgmgr-commit-msg');
    const publishBtn = panelElement.querySelector('#bgmgr-publish');
    
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
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳';
        try {
          await refreshAssetsAndPopulateUI();
          showPublishStatus('✓ Assets refreshed', 'success');
        } catch (err) {
          showPublishStatus('✗ Failed to refresh: ' + err.message, 'error');
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.textContent = '↻ Refresh';
        }
      });
    }
    
    if (tokenInput) {
      tokenInput.addEventListener('change', (e) => {
        storeToken(e.target.value);
      });
    }
    
    if (publishBtn) {
      publishBtn.addEventListener('click', async () => {
        if (publishInProgress) return;
        
        const token = tokenInput ? tokenInput.value.trim() : '';
        const commitMsg = commitMsgInput ? commitMsgInput.value.trim() : '';
        const overrideId = currentOverride || null;
        
        if (!token) {
          showPublishStatus('✗ GitHub token is required', 'error');
          return;
        }
        
        if (!commitMsg) {
          showPublishStatus('✗ Commit message is required', 'error');
          return;
        }
        
        try {
          publishInProgress = true;
          rebuildPanelUI();
          showPublishStatus('⏳ Publishing to repository...', 'info');
          
          await publishOverrideToRepo(overrideId, commitMsg, token);
          
          showPublishStatus(`✓ Successfully published! Override set to: ${overrideId || 'null'}`, 'success');
        } catch (err) {
          console.error('[BackgroundManager] Publish error:', err);
          showPublishStatus('✗ Publish failed: ' + err.message, 'error');
        } finally {
          publishInProgress = false;
          setTimeout(() => rebuildPanelUI(), 100);
        }
      });
    }
  }
  
  function showPublishStatus(message, type = 'info') {
    if (!panelElement) return;
    
    const statusEl = panelElement.querySelector('#bgmgr-publish-status');
    if (!statusEl) return;
    
    const colors = {
      success: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.5)', text: '#86efac' },
      error: { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.5)', text: '#fca5a5' },
      info: { bg: 'rgba(100, 149, 237, 0.2)', border: 'rgba(100, 149, 237, 0.5)', text: '#93c5fd' }
    };
    
    const color = colors[type] || colors.info;
    
    statusEl.style.display = 'block';
    statusEl.style.background = color.bg;
    statusEl.style.border = `1px solid ${color.border}`;
    statusEl.style.color = color.text;
    statusEl.textContent = message;
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
    refreshAssetsAndPopulateUI,
    loadAssetsFromManifest,
    publishOverrideToRepo,
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
