// MODULE: minigames/core/key-resolver.js
// Key resolution layer for minigame aliases and canonical keys
// Provides deterministic resolution of legacy and descriptive names to canonical keys

(function(g){
  'use strict';

  /**
   * Canonical key registry
   * All valid minigame keys that exist in the registry
   */
  const canonicalKeys = new Set();

  /**
   * Alias mapping: any key → canonical key
   * Supports both legacy and descriptive aliases
   */
  const aliasMap = new Map();

  /**
   * Reverse mapping: canonical → all aliases
   */
  const reverseAliasMap = new Map();

  /**
   * Track unknown keys for audit
   */
  const unknownKeys = new Set();

  /**
   * Register a canonical key
   * @param {string} key - Canonical key (e.g., 'quickTap')
   */
  function registerCanonicalKey(key){
    if(!key || typeof key !== 'string'){
      console.warn('[KeyResolver] Invalid canonical key:', key);
      return;
    }
    canonicalKeys.add(key);
  }

  /**
   * Register an alias for a canonical key
   * @param {string} alias - Alias (e.g., 'clicker', 'timingBar')
   * @param {string} canonicalKey - The canonical key it maps to
   */
  function registerAlias(alias, canonicalKey){
    if(!alias || !canonicalKey){
      console.warn('[KeyResolver] Invalid alias registration:', alias, '->', canonicalKey);
      return;
    }

    // Ensure canonical key is registered
    if(!canonicalKeys.has(canonicalKey)){
      console.warn('[KeyResolver] Canonical key not registered:', canonicalKey);
    }

    aliasMap.set(alias, canonicalKey);

    // Update reverse map
    if(!reverseAliasMap.has(canonicalKey)){
      reverseAliasMap.set(canonicalKey, []);
    }
    if(!reverseAliasMap.get(canonicalKey).includes(alias)){
      reverseAliasMap.get(canonicalKey).push(alias);
    }
  }

  /**
   * Resolve a game key to its canonical form
   * @param {string} requestedKey - The key to resolve
   * @returns {string|null} Canonical key or null if unknown
   */
  function resolveGameKey(requestedKey){
    if(!requestedKey || typeof requestedKey !== 'string'){
      return null;
    }

    // Check if it's already canonical
    if(canonicalKeys.has(requestedKey)){
      return requestedKey;
    }

    // Check if it's an alias
    if(aliasMap.has(requestedKey)){
      return aliasMap.get(requestedKey);
    }

    // Unknown key
    unknownKeys.add(requestedKey);
    console.warn('[KeyResolver] Unknown minigame key:', requestedKey);
    return null;
  }

  /**
   * Get all aliases for a canonical key
   * @param {string} canonicalKey - The canonical key
   * @returns {Array<string>} Array of aliases (empty if none)
   */
  function getAliases(canonicalKey){
    return reverseAliasMap.get(canonicalKey) || [];
  }

  /**
   * Get all registered canonical keys
   * @returns {Array<string>} Array of canonical keys
   */
  function getCanonicalKeys(){
    return Array.from(canonicalKeys);
  }

  /**
   * Audit unknown keys from a list of seeds
   * @param {Array<string>} seeds - Keys to audit
   * @returns {Object} Audit result with known and unknown keys
   */
  function auditUnknown(seeds){
    if(!seeds || !Array.isArray(seeds)){
      return { known: [], unknown: [] };
    }

    const known = [];
    const unknown = [];

    for(const seed of seeds){
      const resolved = resolveGameKey(seed);
      if(resolved){
        known.push({ requested: seed, resolved });
      } else {
        unknown.push(seed);
      }
    }

    return { known, unknown };
  }

  /**
   * Get audit summary
   * @returns {Object} Summary of registered keys and unknown attempts
   */
  function getAuditSummary(){
    return {
      canonicalCount: canonicalKeys.size,
      aliasCount: aliasMap.size,
      unknownCount: unknownKeys.size,
      canonicalKeys: Array.from(canonicalKeys),
      unknownKeys: Array.from(unknownKeys)
    };
  }

  /**
   * Clear unknown keys tracking (for testing)
   */
  function clearUnknownTracking(){
    unknownKeys.clear();
  }

  /**
   * Check if a key is registered (canonical or alias)
   * @param {string} key - Key to check
   * @returns {boolean} True if registered
   */
  function isRegistered(key){
    return canonicalKeys.has(key) || aliasMap.has(key);
  }

  // Export API
  g.MGKeyResolver = {
    registerCanonicalKey,
    registerAlias,
    resolveGameKey,
    getAliases,
    getCanonicalKeys,
    auditUnknown,
    getAuditSummary,
    clearUnknownTracking,
    isRegistered
  };

  console.info('[MGKeyResolver] Module loaded');

})(window);
