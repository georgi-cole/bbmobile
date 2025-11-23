// MODULE: settings/categorization.js
// Categorizes settings as immediate (safe to apply while paused) or deferred (affects gameflow)

(function(global){
  'use strict';

  /**
   * Settings categorization
   * 
   * IMMEDIATE: Safe to apply immediately, even mid-game
   * - Theme settings
   * - Audio volume/toggles
   * - Accessibility settings
   * - UI preferences
   * - Visual effects that don't affect game logic
   * 
   * DEFERRED: Affects gameflow, must wait for next season or refresh
   * - Twist percentages (double, triple, return, etc.)
   * - Competition pool selection
   * - Phase durations
   * - Player roster/count
   * - Scoring/progression rules
   * - Feature toggles that affect gameplay
   */
  
  const IMMEDIATE_SETTINGS = new Set([
    // Audio
    'musicOn',
    'sfxOn',
    'autoMusic',
    
    // Visual/Theme
    'colorblindMode',
    'useRibbon',
    'modernLiveVoteUI',
    'skipIntros',
    'autoShowRulesOnStart',
    'strictAvatars',
    'adaptiveBackground',
    
    // UI preferences
    'fxCards',
    'showTopRoster',
    'skipCascadeEnabled',
    
    // Card FX pacing (safe, affects display only)
    'cardHoldMs',
    'cardGapMs',
    'skipTurboWindowMs',
    'skipTurboHoldMs',
    'skipTurboGapMs',
    
    // Debug flags (developer use, safe)
    'debugAlwaysWin',
    'debugUnlimitedTimer',
    'enableMinigameTelemetryPanel'
  ]);

  const DEFERRED_SETTINGS = new Set([
    // Twist percentages
    'doubleChance',
    'tripleChance',
    'returnChance',
    'selfEvictChance',
    'goldenPOVChance',
    'diamondPOVChance',
    
    // Phase durations (affects timing)
    'tOpening',
    'tIntermission',
    'tHOH',
    'tNoms',
    'tVeto',
    'tVetoDec',
    'tSocial',
    'tLiveVote',
    'tJury',
    'tJuryReturn',
    'tFinal3Comp1',
    'tFinal3Comp2',
    'tFinal3Decision',
    
    // Game features
    'enableJuryHouse',
    'enablePublicFav',
    'progressionEnabled',
    
    // Minigame settings (affects competition logic)
    'miniMode',
    'minigameDuration',
    'useNewMinigames',
    'useUnifiedMinigames',
    'enableMinigameBridge',
    
    // Player roster
    'numPlayers'
  ]);

  /**
   * Check if a setting key is immediate (safe to apply now)
   * @param {string} key - Setting key
   * @returns {boolean}
   */
  function isImmediate(key) {
    return IMMEDIATE_SETTINGS.has(key);
  }

  /**
   * Check if a setting key is deferred (must wait for next season)
   * @param {string} key - Setting key
   * @returns {boolean}
   */
  function isDeferred(key) {
    return DEFERRED_SETTINGS.has(key);
  }

  /**
   * Get the application mode for a setting
   * @param {string} key - Setting key
   * @returns {'immediate'|'deferred'|'unknown'}
   */
  function getApplicationMode(key) {
    if (IMMEDIATE_SETTINGS.has(key)) return 'immediate';
    if (DEFERRED_SETTINGS.has(key)) return 'deferred';
    return 'unknown'; // Unknown settings default to immediate for safety
  }

  /**
   * Partition changed settings into immediate and deferred buckets
   * @param {Array<string>} changedKeys - List of changed setting keys
   * @returns {{immediate: Array<string>, deferred: Array<string>, unknown: Array<string>}}
   */
  function partitionChanges(changedKeys) {
    const result = {
      immediate: [],
      deferred: [],
      unknown: []
    };

    changedKeys.forEach(key => {
      const mode = getApplicationMode(key);
      result[mode].push(key);
    });

    return result;
  }

  /**
   * Check if we're currently mid-season (not lobby)
   * @returns {boolean}
   */
  function isMidSeason() {
    const phase = global.game?.phase;
    return phase && phase !== 'lobby';
  }

  // Export to global namespace
  const SettingsCategorization = global.SettingsCategorization = global.SettingsCategorization || {};
  SettingsCategorization.isImmediate = isImmediate;
  SettingsCategorization.isDeferred = isDeferred;
  SettingsCategorization.getApplicationMode = getApplicationMode;
  SettingsCategorization.partitionChanges = partitionChanges;
  SettingsCategorization.isMidSeason = isMidSeason;

  console.info('[settings/categorization] Module loaded');

})(window);
