// MODULE: minigames/core/compat-bridge.js
// Compatibility bridge for legacy minigame keys
// Provides alias mapping and deprecation warnings

(function(g){
  'use strict';

  /**
   * Legacy key to new key mapping
   * This allows old code to continue working while we migrate
   */
  const LEGACY_KEY_MAP = {
    'clicker': 'quickTap',
    'memory': 'memoryMatch',
    'math': 'mathBlitz',
    'bar': 'timingBar',
    'typing': 'wordTyping',
    'reaction': 'reactionTimer',
    'numseq': 'sequenceMemory',
    'pattern': 'patternMatch',
    'slider': 'sliderPuzzle',
    'anagram': 'wordAnagram',
    'path': 'pathFinder',
    'target': 'targetPractice',
    'pairs': 'memoryPairs',
    'simon': 'simonSays',
    'estimate': 'estimationGame'
  };

  /**
   * Legacy Minigame Module Map (FALLBACK SYSTEM)
   * Direct mapping of ALL minigame keys to their g.MiniGames module keys
   * 
   * This serves as the ultimate fallback when:
   * 1. Registry/alias system fails to resolve a key
   * 2. A competition/selector uses an unregistered key
   * 3. Module is loaded but key resolution failed
   * 
   * CRITICAL: This map guarantees every competition can load a playable game.
   * When adding new minigames, ALWAYS add entries here with all possible keys/aliases.
   * 
   * Format: 'anyPossibleKey' -> 'g.MiniGames.moduleKey'
   */
  const LEGACY_MINIGAME_MAP = {
    // Phase 1: Fully Implemented Mobile-First Games
    'countHouse': 'countHouse',
    'count-house': 'countHouse',
    'counthouse': 'countHouse',
    
    'reactionRoyale': 'reactionRoyale',
    'reaction-royale': 'reactionRoyale',
    'reactionroyale': 'reactionRoyale',
    
    'triviaPulse': 'triviaPulse',
    'trivia-pulse': 'triviaPulse',
    'triviapulse': 'triviaPulse',
    
    'quickTap': 'quickTap',
    'quick-tap': 'quickTap',
    'quicktap': 'quickTap',
    'clicker': 'quickTap',  // Legacy alias
    
    // Migrated Legacy Games
    'memoryMatch': 'memoryMatch',
    'memory-match': 'memoryMatch',
    'memorymatch': 'memoryMatch',
    'memory': 'memoryMatch',  // Legacy alias
    
    'mathBlitz': 'mathBlitz',
    'math-blitz': 'mathBlitz',
    'mathblitz': 'mathBlitz',
    'math': 'mathBlitz',  // Legacy alias
    
    'timingBar': 'timingBar',
    'timing-bar': 'timingBar',
    'timingbar': 'timingBar',
    'bar': 'timingBar',  // Legacy alias
    
    'sequenceMemory': 'sequenceMemory',
    'sequence-memory': 'sequenceMemory',
    'sequencememory': 'sequenceMemory',
    'numseq': 'sequenceMemory',  // Legacy alias
    
    'patternMatch': 'patternMatch',
    'pattern-match': 'patternMatch',
    'patternmatch': 'patternMatch',
    'pattern': 'patternMatch',  // Legacy alias
    
    'wordAnagram': 'wordAnagram',
    'word-anagram': 'wordAnagram',
    'wordanagram': 'wordAnagram',
    'anagram': 'wordAnagram',  // Legacy alias
    
    'targetPractice': 'targetPractice',
    'target-practice': 'targetPractice',
    'targetpractice': 'targetPractice',
    'target': 'targetPractice',  // Legacy alias
    
    'memoryPairs': 'memoryPairs',
    'memory-pairs': 'memoryPairs',
    'memorypairs': 'memoryPairs',
    'pairs': 'memoryPairs',  // Legacy alias
    
    'estimationGame': 'estimationGame',
    'estimation-game': 'estimationGame',
    'estimationgame': 'estimationGame',
    'estimate': 'estimationGame',  // Legacy alias
    
    'reactionTimer': 'reactionTimer',
    'reaction-timer': 'reactionTimer',
    'reactiontimer': 'reactionTimer',
    'reaction': 'reactionTimer',  // Legacy alias
    
    // Retired Legacy Games (still playable if needed)
    'wordTyping': 'wordTyping',
    'word-typing': 'wordTyping',
    'wordtyping': 'wordTyping',
    'typing': 'wordTyping',  // Legacy alias
    
    'sliderPuzzle': 'sliderPuzzle',
    'slider-puzzle': 'sliderPuzzle',
    'sliderpuzzle': 'sliderPuzzle',
    'slider': 'sliderPuzzle',  // Legacy alias
    
    'pathFinder': 'pathFinder',
    'path-finder': 'pathFinder',
    'pathfinder': 'pathFinder',
    'path': 'pathFinder',  // Legacy alias
    
    'simonSays': 'simonSays',
    'simon-says': 'simonSays',
    'simonsays': 'simonSays',
    'simon': 'simonSays',  // Legacy alias
    
    // Phase 1: Scaffolds (future games)
    'oteviator': 'oteviator',
    'comixSpot': 'comixSpot',
    'comix-spot': 'comixSpot',
    'holdWall': 'holdWall',
    'hold-wall': 'holdWall',
    'slipperyShuttle': 'slipperyShuttle',
    'slippery-shuttle': 'slipperyShuttle',
    'memoryZipline': 'memoryZipline',
    'memory-zipline': 'memoryZipline',
    
    // New Mobile-Friendly Games (placeholders)
    'swipeMaze': 'placeholder',
    'swipe-maze': 'placeholder',
    'swipemaze': 'placeholder',
    'patternTrace': 'placeholder',
    'pattern-trace': 'placeholder',
    'patterntrace': 'placeholder',
    'audioMatch': 'placeholder',
    'audio-match': 'placeholder',
    'audiomatch': 'placeholder',
    'balanceBridge': 'placeholder',
    'balance-bridge': 'placeholder',
    'balancebridge': 'placeholder',
    'colorMix': 'placeholder',
    'color-mix': 'placeholder',
    'colormix': 'placeholder',
    'wordLadder': 'placeholder',
    'word-ladder': 'placeholder',
    'wordladder': 'placeholder',
    'rhythmTap': 'placeholder',
    'rhythm-tap': 'placeholder',
    'rhythmtap': 'placeholder',
    'spotTheDifference': 'placeholder',
    'spot-the-difference': 'placeholder',
    'spotthedifference': 'placeholder',
    'logicLocks': 'placeholder',
    'logic-locks': 'placeholder',
    'logiclocks': 'placeholder',
    'astroJumper': 'placeholder',
    'astro-jumper': 'placeholder',
    'astrojumper': 'placeholder',
    
    // Phase 2: New Minigames (15 additional games)
    'bubbleBurst': 'bubbleBurst',
    'bubble-burst': 'bubbleBurst',
    'bubbleburst': 'bubbleBurst',
    
    'cardClash': 'cardClash',
    'card-clash': 'cardClash',
    'cardclash': 'cardClash',
    
    'chainReaction': 'chainReaction',
    'chain-reaction': 'chainReaction',
    'chainreaction': 'chainReaction',
    
    'clockStopper': 'clockStopper',
    'clock-stopper': 'clockStopper',
    'clockstopper': 'clockStopper',
    
    'comboKeys': 'comboKeys',
    'combo-keys': 'comboKeys',
    'combokeys': 'comboKeys',
    
    'diceDash': 'diceDash',
    'dice-dash': 'diceDash',
    'dicedash': 'diceDash',
    
    'echoChamber': 'echoChamber',
    'echo-chamber': 'echoChamber',
    'echochamber': 'echoChamber',
    
    'flashFlood': 'flashFlood',
    'flash-flood': 'flashFlood',
    'flashflood': 'flashFlood',
    
    'gearShift': 'gearShift',
    'gear-shift': 'gearShift',
    'gearshift': 'gearShift',
    
    'gridLock': 'gridLock',
    'grid-lock': 'gridLock',
    'gridlock': 'gridLock',
    
    'iconMatch': 'iconMatch',
    'icon-match': 'iconMatch',
    'iconmatch': 'iconMatch',
    
    'jumpRope': 'jumpRope',
    'jump-rope': 'jumpRope',
    'jumprope': 'jumpRope',
    
    'keyMaster': 'keyMaster',
    'key-master': 'keyMaster',
    'keymaster': 'keyMaster',
    
    'lightSpeed': 'lightSpeed',
    'light-speed': 'lightSpeed',
    'lightspeed': 'lightSpeed',
    
    'puzzleDash': 'puzzleDash',
    'puzzle-dash': 'puzzleDash',
    'puzzledash': 'puzzleDash'
  };

  /**
   * Reverse mapping (new key to legacy keys)
   * Used for backwards compatibility checks
   */
  const NEW_TO_LEGACY_MAP = {};
  for(const [legacyKey, newKey] of Object.entries(LEGACY_KEY_MAP)){
    if(!NEW_TO_LEGACY_MAP[newKey]){
      NEW_TO_LEGACY_MAP[newKey] = [];
    }
    NEW_TO_LEGACY_MAP[newKey].push(legacyKey);
  }

  /**
   * Track which legacy keys have been accessed (for deprecation warnings)
   */
  const accessedLegacyKeys = new Set();

  /**
   * Resolve a game key (legacy or new) to the current canonical key
   * @param {string} key - Game key (legacy or new)
   * @param {boolean} warnDeprecation - Show deprecation warning if legacy key
   * @returns {string} Canonical game key
   */
  function resolveKey(key, warnDeprecation = true){
    if(!key){
      return null;
    }

    // If it's a legacy key, map it
    if(LEGACY_KEY_MAP[key]){
      const newKey = LEGACY_KEY_MAP[key];
      
      // Show deprecation warning (once per key per session)
      if(warnDeprecation && !accessedLegacyKeys.has(key)){
        console.warn(
          `[CompatBridge] DEPRECATED: Legacy minigame key "${key}" used. ` +
          `Please update to "${newKey}". Legacy keys will be removed in a future version.`
        );
        accessedLegacyKeys.add(key);
      }

      return newKey;
    }

    // Already a new key, return as-is
    return key;
  }

  /**
   * Get all aliases for a game key
   * @param {string} key - Game key (legacy or new)
   * @returns {Array<string>} All known aliases including the key itself
   */
  function getAliases(key){
    const canonicalKey = resolveKey(key, false);
    const aliases = [canonicalKey];

    // Add legacy aliases if they exist
    if(NEW_TO_LEGACY_MAP[canonicalKey]){
      aliases.push(...NEW_TO_LEGACY_MAP[canonicalKey]);
    }

    return aliases;
  }

  /**
   * Check if a key is a legacy key
   * @param {string} key - Game key to check
   * @returns {boolean} True if key is legacy
   */
  function isLegacyKey(key){
    return key in LEGACY_KEY_MAP;
  }

  /**
   * Check if a key is a current/canonical key
   * @param {string} key - Game key to check
   * @returns {boolean} True if key is current
   */
  function isCurrentKey(key){
    // Check if key exists in registry
    if(g.MinigameRegistry){
      const game = g.MinigameRegistry.getGame(key);
      return game !== null;
    }

    // Fallback: not in legacy map means probably current
    return !isLegacyKey(key);
  }

  /**
   * Get legacy keys that have been accessed (for monitoring)
   * @returns {Array<string>} Array of accessed legacy keys
   */
  function getAccessedLegacyKeys(){
    return Array.from(accessedLegacyKeys);
  }

  /**
   * Clear accessed legacy keys tracking (for testing)
   */
  function clearAccessedKeys(){
    accessedLegacyKeys.clear();
  }

  /**
   * Get full legacy map (for reference)
   * @returns {Object} Legacy key mapping
   */
  function getLegacyMap(){
    return { ...LEGACY_KEY_MAP };
  }

  /**
   * Get full legacy minigame map (for reference)
   * @returns {Object} Legacy minigame module mapping
   */
  function getLegacyMinigameMap(){
    return { ...LEGACY_MINIGAME_MAP };
  }

  /**
   * Resolve a key to its module key using the legacy minigame map
   * This is the ultimate fallback for when registry/alias systems fail
   * @param {string} key - Game key to resolve
   * @returns {string|null} Module key or null if not found
   */
  function resolveToModule(key){
    if(!key){
      return null;
    }
    
    // Direct lookup in legacy minigame map
    return LEGACY_MINIGAME_MAP[key] || null;
  }

  /**
   * Check if a key exists in the legacy minigame map
   * @param {string} key - Game key to check
   * @returns {boolean} True if key exists in legacy map
   */
  function isInLegacyMinigameMap(key){
    return key in LEGACY_MINIGAME_MAP;
  }

  /**
   * Get all keys from legacy minigame map
   * @returns {Array<string>} All keys in the legacy map
   */
  function getAllLegacyMinigameKeys(){
    return Object.keys(LEGACY_MINIGAME_MAP);
  }

  /**
   * Get all unique module keys from legacy minigame map
   * @returns {Array<string>} All unique module keys
   */
  function getAllLegacyModuleKeys(){
    const modules = new Set(Object.values(LEGACY_MINIGAME_MAP));
    return Array.from(modules);
  }

  /**
   * Validate that all legacy keys map to valid registry entries
   * @returns {Object} Validation result with any errors
   */
  function validateMapping(){
    const errors = [];
    const warnings = [];

    if(!g.MinigameRegistry){
      errors.push('MinigameRegistry not available for validation');
      return { valid: false, errors, warnings };
    }

    // Check each legacy mapping
    for(const [legacyKey, newKey] of Object.entries(LEGACY_KEY_MAP)){
      const game = g.MinigameRegistry.getGame(newKey);
      
      if(!game){
        errors.push(`Legacy key "${legacyKey}" maps to unknown game "${newKey}"`);
      } else if(game.retired){
        warnings.push(`Legacy key "${legacyKey}" maps to retired game "${newKey}"`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      totalMappings: Object.keys(LEGACY_KEY_MAP).length,
      accessedCount: accessedLegacyKeys.size
    };
  }

  // Export API
  g.MinigameCompatBridge = {
    resolveKey,
    getAliases,
    isLegacyKey,
    isCurrentKey,
    getAccessedLegacyKeys,
    clearAccessedKeys,
    getLegacyMap,
    validateMapping,
    // Legacy minigame map functions (fallback system)
    getLegacyMinigameMap,
    resolveToModule,
    isInLegacyMinigameMap,
    getAllLegacyMinigameKeys,
    getAllLegacyModuleKeys
  };

  console.info('[MinigameCompatBridge] Module loaded with', Object.keys(LEGACY_KEY_MAP).length, 'legacy key mappings');
  console.info('[MinigameCompatBridge] Legacy minigame map loaded with', Object.keys(LEGACY_MINIGAME_MAP).length, 'key entries covering', getAllLegacyModuleKeys().length, 'unique modules');

})(window);
