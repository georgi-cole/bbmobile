// MODULE: social/social-registry-aliases.js
// Legacy actionId → catalog actionId alias mapping
// Ensures legacy actionIds from older implementations map to current catalog entries
// so the enricher can emit spendPrompt for legacy ids

(function(global){
  'use strict';

  // Alias map: legacy actionId → catalog actionId
  const LEGACY_ALIASES = {
    // Legacy small talk/chat variants → secret_chat
    'small_talk': 'secret_chat',
    'compliment': 'secret_chat',
    'strategize': 'secret_chat',
    
    // Legacy rumor/deception → plant_rumor
    'gossip': 'plant_rumor',
    'lie': 'plant_rumor',
    
    // Legacy interrogation → probe_hoh
    'interrogate': 'probe_hoh',
    
    // Legacy backstab → betrayal_tease
    'backstab': 'betrayal_tease',
    
    // Legacy insult → rivalry_poke
    'insult': 'rivalry_poke',
    
    // Add more aliases as needed for backward compatibility
  };

  // Expose globally for registry to use
  global.SocialRegistryAliases = {
    LEGACY_ALIASES,
    
    /**
     * Resolve a legacy actionId to its catalog equivalent
     * @param {string} actionId - The actionId to resolve
     * @returns {string} - The resolved actionId (or original if no alias found)
     */
    resolve(actionId) {
      return LEGACY_ALIASES[actionId] || actionId;
    },
    
    /**
     * Check if an actionId is a legacy alias
     * @param {string} actionId - The actionId to check
     * @returns {boolean}
     */
    isAlias(actionId) {
      return actionId in LEGACY_ALIASES;
    }
  };

  console.info('[social-registry-aliases] ✓ Loaded', Object.keys(LEGACY_ALIASES).length, 'legacy aliases');
})(window);
