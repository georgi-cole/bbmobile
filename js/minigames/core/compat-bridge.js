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
    validateMapping
  };

  console.info('[MinigameCompatBridge] Module loaded with', Object.keys(LEGACY_KEY_MAP).length, 'legacy mappings');

})(window);
