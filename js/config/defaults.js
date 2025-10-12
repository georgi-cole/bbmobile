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
    useRibbon: true,
    
    // Core game mechanics
    enableJuryHouse: true,
    doubleChance: 18,   // %
    tripleChance: 7,    // %
    returnChance: 10,   // % chance a juror returns (mid-season)
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
    
    // Popup system refresh (feature-flagged, off by default)
    popup_refresh_enabled: false,  // Enable new BasePopup/PopupManager system
    
    // Social Logic v2 (feature-flagged, off by default)
    social_logic_v2_enabled: false,  // Enable context-aware weighted social popup selection
    social_inter_delay: 800  // Inter-popup delay for social decisions (ms)
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
  function ensureGameCfg(){
    const g = global.game = global.game || {};
    g.cfg = Object.assign({}, DEFAULT_CFG, g.cfg || {}, loadStoredCfg());
    return g.cfg;
  }

  // Export to global namespace
  const Config = global.Config = global.Config || {};
  Config.DEFAULT_CFG = DEFAULT_CFG;
  Config.STORAGE_KEY = STORAGE_KEY;
  Config.loadStoredCfg = loadStoredCfg;
  Config.saveStoredCfg = saveStoredCfg;
  Config.ensureGameCfg = ensureGameCfg;

})(window);
