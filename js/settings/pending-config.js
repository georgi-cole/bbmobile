// MODULE: settings/pending-config.js
// Manages pending configuration changes that should be deferred until next season/refresh
// Separates immediate UI-only changes from game-affecting changes

(function(global) {
  'use strict';
  
  const PendingConfig = {};
  
  // Storage for pending changes
  let pendingChanges = {};
  let hasPendingChanges = false;
  
  /**
   * Settings that can be applied immediately (UI-only, non-gameplay affecting)
   * These are safe to change during active gameplay
   */
  const IMMEDIATE_SETTINGS = [
    'colorblindMode',     // Visual theme only
    'musicOn',            // Audio control
    'sfxOn',              // Audio control
    'fxCards',            // Card reveal animations
    'showTopRoster',      // UI visibility
    'skipCascadeEnabled', // Card skip UI
    'autoShowRulesOnStart', // Pre-game UI
    'skipIntros',         // Pre-game UI
    'useRibbon',          // Visual effect
    'useRealityIntro',    // Pre-game sequence
    'timerStyle',         // UI style
    'cardHoldMs',         // Card timing (safe)
    'cardGapMs',          // Card timing (safe)
    'skipTurboWindowMs',  // Card skip timing (safe)
    'skipTurboHoldMs',    // Card skip timing (safe)
    'skipTurboGapMs'      // Card skip timing (safe)
  ];
  
  /**
   * Settings that affect core game logic and must be deferred
   * These can cause desync or corrupt game state if changed mid-game
   */
  const DEFERRED_SETTINGS = [
    'numPlayers',         // Player roster size
    'doubleChance',       // Twist probabilities
    'tripleChance',       // Twist probabilities
    'returnChance',       // Twist probabilities
    'selfEvictChance',    // Twist probabilities
    'goldenPOVChance',    // Twist probabilities
    'diamondPOVChance',   // Twist probabilities
    'enableJuryHouse',    // Core game mechanic
    'enablePublicFav',    // Finale mechanic
    'tOpening',           // Phase duration
    'tIntermission',      // Phase duration
    'tHOH',               // Phase duration
    'tNoms',              // Phase duration
    'tVeto',              // Phase duration
    'tVetoDec',           // Phase duration
    'tSocial',            // Phase duration
    'tLiveVote',          // Phase duration
    'tJury',              // Phase duration
    'tFinal3Comp1',       // Phase duration
    'tFinal3Comp2',       // Phase duration
    'tFinal3Decision',    // Phase duration
    'tJuryReturn',        // Phase duration
    'minigameDuration',   // Competition duration
    'debugAlwaysWin'      // Debug setting
  ];
  
  /**
   * Check if a setting key should be applied immediately or deferred
   * @param {string} key - Setting key
   * @returns {'immediate'|'deferred'|'unknown'}
   */
  function getSettingType(key) {
    if (IMMEDIATE_SETTINGS.includes(key)) return 'immediate';
    if (DEFERRED_SETTINGS.includes(key)) return 'deferred';
    return 'unknown';
  }
  
  /**
   * Check if game is currently in an active gameplay phase
   * Returns true if game is running (not in lobby or finale)
   * @returns {boolean}
   */
  function isGameActive() {
    const game = global.game;
    if (!game || !game.phase) return false;
    
    // Lobby and finale are safe phases for immediate config changes
    const safePhases = ['lobby', 'finale', 'opening'];
    if (safePhases.includes(game.phase)) return false;
    
    // If week hasn't started yet, consider it inactive
    if (!game.week || game.week < 1) return false;
    
    return true;
  }
  
  /**
   * Add a setting change to the pending queue
   * @param {string} key - Setting key
   * @param {*} value - New value
   * @param {string} type - Setting type ('immediate' or 'deferred')
   */
  function addPendingChange(key, value, type) {
    pendingChanges[key] = { value, type, timestamp: Date.now() };
    hasPendingChanges = true;
    
    console.info('[PendingConfig] Added pending change:', key, '=', value, `(${type})`);
    
    // Persist to localStorage for recovery
    savePendingChanges();
  }
  
  /**
   * Apply a config change - either immediately or defer to pending queue
   * @param {string} key - Setting key
   * @param {*} value - New value
   * @param {Object} cfg - Current config object
   * @returns {boolean} True if applied immediately, false if deferred
   */
  function applyConfigChange(key, value, cfg) {
    const type = getSettingType(key);
    const gameActive = isGameActive();
    
    // Always apply immediately if game is not active
    if (!gameActive) {
      cfg[key] = value;
      console.info('[PendingConfig] Applied immediately (game inactive):', key, '=', value);
      return true;
    }
    
    // Apply immediately if it's an immediate setting
    if (type === 'immediate') {
      cfg[key] = value;
      console.info('[PendingConfig] Applied immediately (safe setting):', key, '=', value);
      return true;
    }
    
    // Defer if it's a game-affecting setting
    if (type === 'deferred') {
      addPendingChange(key, value, type);
      return false;
    }
    
    // Unknown settings: err on the side of caution and defer
    console.warn('[PendingConfig] Unknown setting type, deferring:', key);
    addPendingChange(key, value, 'deferred');
    return false;
  }
  
  /**
   * Get all pending changes
   * @returns {Object} Map of key -> {value, type, timestamp}
   */
  function getPendingChanges() {
    return { ...pendingChanges };
  }
  
  /**
   * Check if there are any pending changes
   * @returns {boolean}
   */
  function hasPending() {
    return hasPendingChanges && Object.keys(pendingChanges).length > 0;
  }
  
  /**
   * Clear a specific pending change
   * @param {string} key - Setting key to clear
   */
  function clearPendingChange(key) {
    if (pendingChanges[key]) {
      delete pendingChanges[key];
      console.info('[PendingConfig] Cleared pending change:', key);
      
      // Update hasPending flag
      hasPendingChanges = Object.keys(pendingChanges).length > 0;
      savePendingChanges();
    }
  }
  
  /**
   * Clear all pending changes
   */
  function clearAllPending() {
    pendingChanges = {};
    hasPendingChanges = false;
    console.info('[PendingConfig] Cleared all pending changes');
    savePendingChanges();
  }
  
  /**
   * Apply all pending changes to the config
   * Called when starting a new season or when safe to apply
   * @param {Object} cfg - Config object to apply changes to
   * @returns {number} Number of changes applied
   */
  function applyAllPending(cfg) {
    if (!hasPending()) {
      console.info('[PendingConfig] No pending changes to apply');
      return 0;
    }
    
    const keys = Object.keys(pendingChanges);
    console.info(`[PendingConfig] Applying ${keys.length} pending changes`);
    
    keys.forEach(key => {
      const change = pendingChanges[key];
      cfg[key] = change.value;
      console.info('[PendingConfig] Applied:', key, '=', change.value);
    });
    
    const count = keys.length;
    clearAllPending();
    
    // Notify user
    if (global.addLog) {
      global.addLog(`Applied ${count} pending setting${count === 1 ? '' : 's'} for new season`, 'ok');
    }
    
    return count;
  }
  
  /**
   * Get a human-readable summary of pending changes
   * @returns {Array<string>} Array of change descriptions
   */
  function getPendingSummary() {
    if (!hasPending()) return [];
    
    const summary = [];
    Object.keys(pendingChanges).forEach(key => {
      const change = pendingChanges[key];
      const label = getSettingLabel(key);
      summary.push(`${label}: ${formatValue(change.value)}`);
    });
    
    return summary;
  }
  
  /**
   * Get a human-readable label for a setting key
   * @param {string} key - Setting key
   * @returns {string} Human-readable label
   */
  function getSettingLabel(key) {
    const labels = {
      numPlayers: 'Player Count',
      doubleChance: 'Double Eviction %',
      tripleChance: 'Triple Eviction %',
      returnChance: 'Jury Return %',
      selfEvictChance: 'Self-Eviction %',
      goldenPOVChance: 'Golden POV %',
      diamondPOVChance: 'Diamond POV %',
      enableJuryHouse: 'Jury House',
      enablePublicFav: 'Public Favorite',
      tHOH: 'HOH Duration (s)',
      tNoms: 'Nominations Duration (s)',
      tVeto: 'Veto Duration (s)',
      tVetoDec: 'Veto Decision Duration (s)',
      tLiveVote: 'Live Vote Duration (s)',
      minigameDuration: 'Minigame Duration (s)'
    };
    
    return labels[key] || key;
  }
  
  /**
   * Format a setting value for display
   * @param {*} value - Setting value
   * @returns {string} Formatted value
   */
  function formatValue(value) {
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    if (typeof value === 'number') return String(value);
    return String(value);
  }
  
  /**
   * Save pending changes to localStorage
   */
  function savePendingChanges() {
    try {
      const data = {
        changes: pendingChanges,
        timestamp: Date.now()
      };
      localStorage.setItem('bb_pending_config', JSON.stringify(data));
    } catch (e) {
      console.warn('[PendingConfig] Failed to save pending changes:', e);
    }
  }
  
  /**
   * Load pending changes from localStorage
   */
  function loadPendingChanges() {
    try {
      const raw = localStorage.getItem('bb_pending_config');
      if (!raw) return;
      
      const data = JSON.parse(raw);
      if (data && data.changes && typeof data.changes === 'object') {
        pendingChanges = data.changes;
        hasPendingChanges = Object.keys(pendingChanges).length > 0;
        
        console.info('[PendingConfig] Loaded pending changes from storage:', Object.keys(pendingChanges));
      }
    } catch (e) {
      console.warn('[PendingConfig] Failed to load pending changes:', e);
    }
  }
  
  /**
   * Initialize the pending config system
   */
  function init() {
    loadPendingChanges();
    console.info('[PendingConfig] ✓ Initialized');
  }
  
  // Export API
  PendingConfig.init = init;
  PendingConfig.getSettingType = getSettingType;
  PendingConfig.isGameActive = isGameActive;
  PendingConfig.applyConfigChange = applyConfigChange;
  PendingConfig.addPendingChange = addPendingChange;
  PendingConfig.getPendingChanges = getPendingChanges;
  PendingConfig.hasPending = hasPending;
  PendingConfig.clearPendingChange = clearPendingChange;
  PendingConfig.clearAllPending = clearAllPending;
  PendingConfig.applyAllPending = applyAllPending;
  PendingConfig.getPendingSummary = getPendingSummary;
  
  // Export to global namespace
  global.PendingConfig = PendingConfig;
  
  // Auto-initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
  
})(window);
