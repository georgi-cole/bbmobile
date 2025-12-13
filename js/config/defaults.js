// MODULE: config/defaults.js
// Central configuration defaults and storage helpers.
// All game settings are defined here and persisted to localStorage.

(function(global){
  'use strict';

  const STORAGE_KEY = 'bb_cfg_v2';

  // Master config defaults - consolidated from settings.js and ui.config-and-settings.js
  const DEFAULT_CFG = {
    // Visual/UX
    fxCards: true,
    showTopRoster: true,
    colorblindMode: false,
    strictAvatars: false, // When true, use local silhouette instead of external fallback
    autoShowRulesOnStart: true, // When true, shows rules modal automatically after intro
    skipIntros: false, // When true, skip intro video and animated intro sequence
    useRibbon: true,
    modernLiveVoteUI: true, // When true, use modern cinematic Live Vote UI (lv2)
    
    // Core game mechanics
    enableJuryHouse: true,
    doubleChance: 18,   // %
    tripleChance: 7,    // %
    returnChance: 10,   // % chance a juror returns (mid-season)
    jurorReturnAliveMin: 6,  // Min alive players for juror return eligibility (exact constraint: min=max=6 by spec)
    jurorReturnAliveMax: 6,  // Max alive players for juror return eligibility (set to same value for exact constraint)
    jurorReturnMinJurors: 2, // Min jurors needed for return twist to trigger
    selfEvictChance: 1, // % tiny chance of auto self-eviction
    enablePublicFav: true, // Public's Favourite Player feature at finale (default ON)
    
    // Timing (seconds) - comprehensive timer list
    timerStyle: 'hourglass', // 'hourglass' | 'circular'
    tOpening: 90,
    tIntermission: 4,
    tHOH: 40,
    tNoms: 25,
    tVeto: 40,
    tVetoDec: 25,
    tSocial: 25,
    tLiveVote: 30,
    tJury: 35,
    tFinal3Comp1: 35,
    tFinal3Comp2: 35,
    tFinal3Decision: 25,
    tJuryReturn: 30,
    tJurorReturnVoteMs: 6500, // Duration (ms) for juror return vote panel animation
    
    // Card animation settings
    cardHoldMs: 3000,
    cardGapMs: 2000,
    skipCascadeEnabled: true,
    skipTurboWindowMs: 4500,
    skipTurboHoldMs: 450,
    skipTurboGapMs: 100,
    
    // Audio
    musicOn: true,
    sfxOn: true,
    
    // Minigame mode
    miniMode: 'random',  // 'random' | 'clicker' | 'cycle'
    
    // Minigame system (Phase 1-8 unified system)
    useNewMinigames: true,  // When true, use new Phase 1 minigame system with non-repeating pools
    useUnifiedMinigames: true,  // Master switch for unified minigame system (Phases 0-8)
    enableMinigameBridge: true,  // Compatibility bridge for legacy keys (temporary, can disable after migration)
    enableMinigameTelemetryPanel: false,  // Dev debug panel (Ctrl+Shift+D when enabled)
    
    // Progression system (feature-flagged, off by default)
    progressionEnabled: false,  // Enable XP and leveling system
    
    // Social Logic v2 (feature-flagged, on by default)
    social_logic_v2_enabled: true,  // Enable context-aware weighted social popup selection
    social_cadence_enabled: true,  // Enable social decision popup cadence system
    social_inter_delay: 800,  // Inter-popup delay for social decisions (ms)
    
    // AI Social Interactions (feature-flagged, on by default)
    aiSocialEnabled: true,  // Enable AI-to-AI background social interactions during Social phase
    aiSocialAggression: 'low',  // AI action selection aggression: 'low' | 'medium'
    aiSocialMaxPerPhase: 5,  // Soft cap on AI actions per AI per phase
    socialHighlightsEnabled: true,  // Show Social Highlights in Diary Room logs
    
    // Final 4 Eviction (feature-flagged, on by default)
    final4CombinedPower: true,  // When HOH === POV holder, allow eviction of any of the other 3 players (not just nominees)
    
    // Intermission Games (feature-flagged, on by default)
    enableIntermissionGames: true,  // When true, offer Tic Tac Toe game when player is ineligible for HOH/Veto competitions
    
    // Avatar Preloading Configuration
    avatarPreloadConcurrency: 8,    // Max concurrent avatar requests (mobile stability)
    avatarPreloadTimeoutMs: 7000,   // Timeout before forcing ready (ms)
    avatarReadyPercent: 0.99,       // Percentage of avatars needed before ready event
    avatarLoadMode: 'batch',        // 'batch' (gate roster) | 'skeleton' (progressive load)
    avatarLocalFolderEnabled: true  // When false, skip local ./avatars/* lookups (useful for GitHub Pages to avoid 404s)
  };

  // Load configuration from localStorage
  function loadStoredCfg(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return {};
      const data = JSON.parse(raw);
      return (data && typeof data === 'object') ? data : {};
    }catch(e){
      console.warn('[config/defaults] loadStoredCfg failed', e);
      return {};
    }
  }

  // Save configuration to localStorage
  function saveStoredCfg(cfg){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg || {}));
    }catch(e){
      console.warn('[config/defaults] saveStoredCfg failed', e);
    }
  }

  // Initialize game config with defaults and stored settings
  // CRITICAL: Creates both window.cfg and window.game.cfg as aliases to the SAME object
  // This prevents config drift where different modules reference different config objects
  function ensureGameCfg(){
    const g = global.game = global.game || {};
    // Merge order: DEFAULT_CFG (base) -> existing config (from state.js) -> stored config (user overrides)
    const cfg = Object.assign({}, DEFAULT_CFG, g.cfg || {}, loadStoredCfg());
    
    // Create aliases: both window.cfg and window.game.cfg point to same object
    g.cfg = cfg;
    global.cfg = cfg;
    
    return cfg;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFERRED CONFIG SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Configuration keys that can be applied immediately (UI/theme/audio changes)
   * These settings do not affect gameplay logic and can be changed mid-season
   */
  const IMMEDIATE_CONFIG_KEYS = [
    // Visual/UI
    'fxCards',
    'showTopRoster',
    'colorblindMode',
    'strictAvatars',
    'useRibbon',
    'timerStyle',
    
    // Audio
    'musicOn',
    'sfxOn',
    
    // Accessibility
    'autoShowRulesOnStart',
    'skipIntros',
    
    // Avatar preloading (can be changed immediately)
    'avatarPreloadConcurrency',
    'avatarPreloadTimeoutMs',
    'avatarReadyPercent',
    'avatarLoadMode',
    
    // Card animation
    'cardHoldMs',
    'cardGapMs',
    'skipCascadeEnabled',
    'skipTurboWindowMs',
    'skipTurboHoldMs',
    'skipTurboGapMs',
    
    // UI modes
    'modernLiveVoteUI',
    'enableMinigameTelemetryPanel'
  ];

  /**
   * Configuration keys that affect gameflow and must be deferred until season restart
   * These settings change competition mechanics, twist probabilities, or game rules
   */
  const DEFERRED_CONFIG_KEYS = [
    // Game mechanics
    'enableJuryHouse',
    'doubleChance',
    'tripleChance',
    'returnChance',
    'selfEvictChance',
    'enablePublicFav',
    'goldenPOVChance',
    'diamondPOVChance',
    
    // Phase timers
    'tOpening',
    'tIntermission',
    'tHOH',
    'tNoms',
    'tVeto',
    'tVetoDec',
    'tSocial',
    'tLiveVote',
    'tJury',
    'tFinal3Comp1',
    'tFinal3Comp2',
    'tFinal3Decision',
    'tJuryReturn',
    
    // Minigame settings
    'miniMode',
    'useNewMinigames',
    'useUnifiedMinigames',
    'enableMinigameBridge',
    'minigameDuration',
    
    // Roster
    'numPlayers',
    
    // Feature flags affecting gameplay
    'progressionEnabled',
    'social_logic_v2_enabled',
    'social_cadence_enabled',
    'social_inter_delay',
    'aiSocialEnabled',
    'aiSocialAggression',
    'aiSocialMaxPerPhase',
    'socialHighlightsEnabled',
    'final4CombinedPower',
    'enableIntermissionGames'
  ];

  /**
   * Check if a config key should be deferred
   * @param {string} key - Config key name
   * @returns {boolean}
   */
  function isConfigKeyDeferred(key) {
    return DEFERRED_CONFIG_KEYS.includes(key);
  }

  /**
   * Check if a config key can be applied immediately
   * @param {string} key - Config key name
   * @returns {boolean}
   */
  function isConfigKeyImmediate(key) {
    return IMMEDIATE_CONFIG_KEYS.includes(key);
  }

  /**
   * Apply a config change, either immediately or defer it
   * @param {string} key - Config key name
   * @param {*} value - New value
   */
  function applyConfigChange(key, value) {
    const g = global.game = global.game || {};
    const cfg = g.cfg = g.cfg || {};
    
    // Check if game is active (not in lobby)
    const isGameActive = g.phase && g.phase !== 'lobby' && g.week && g.week > 0;
    
    if (isGameActive && isConfigKeyDeferred(key)) {
      // Defer the change - store in pending config
      if (!g.cfgPending) {
        g.cfgPending = {};
      }
      g.cfgPending[key] = value;
      console.info(`[config/defaults] Deferred config change: ${key} = ${value} (will apply next season)`);
      return 'deferred';
    } else {
      // Apply immediately
      cfg[key] = value;
      console.info(`[config/defaults] Applied config change: ${key} = ${value}`);
      return 'applied';
    }
  }

  /**
   * Merge pending config changes into active config
   * Called on season restart (week 1) or full refresh
   */
  function applyPendingConfig() {
    const g = global.game;
    if (!g || !g.cfgPending) {
      console.info('[config/defaults] No pending config changes to apply');
      return;
    }

    const keys = Object.keys(g.cfgPending);
    console.info(`[config/defaults] Applying ${keys.length} pending config changes:`, keys);

    // Merge pending into active config
    Object.assign(g.cfg, g.cfgPending);
    
    // Save merged config
    saveStoredCfg(g.cfg);
    
    // Dispatch telemetry event
    if (g.bus && typeof g.bus.emit === 'function') {
      g.bus.emit('config:pending-applied', {
        keys,
        timestamp: Date.now()
      });
    }

    // Clear pending config
    g.cfgPending = {};
    
    console.info('[config/defaults] ✓ Pending config applied');
  }

  /**
   * Check if there are pending config changes
   * @returns {boolean}
   */
  function hasPendingConfig() {
    const g = global.game;
    return !!(g && g.cfgPending && Object.keys(g.cfgPending).length > 0);
  }

  /**
   * Get list of pending config keys
   * @returns {string[]}
   */
  function getPendingConfigKeys() {
    const g = global.game;
    if (!g || !g.cfgPending) return [];
    return Object.keys(g.cfgPending);
  }

  // Export to global namespace
  const Config = global.Config = global.Config || {};
  Config.DEFAULT_CFG = DEFAULT_CFG;
  Config.STORAGE_KEY = STORAGE_KEY;
  Config.loadStoredCfg = loadStoredCfg;
  Config.saveStoredCfg = saveStoredCfg;
  Config.ensureGameCfg = ensureGameCfg;
  
  // Deferred config system
  Config.IMMEDIATE_CONFIG_KEYS = IMMEDIATE_CONFIG_KEYS;
  Config.DEFERRED_CONFIG_KEYS = DEFERRED_CONFIG_KEYS;
  Config.isConfigKeyDeferred = isConfigKeyDeferred;
  Config.isConfigKeyImmediate = isConfigKeyImmediate;
  Config.applyConfigChange = applyConfigChange;
  Config.applyPendingConfig = applyPendingConfig;
  Config.hasPendingConfig = hasPendingConfig;
  Config.getPendingConfigKeys = getPendingConfigKeys;

  // Initialize config immediately
  ensureGameCfg();

})(window);
