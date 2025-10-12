// MODULE: minigames/loader.js
// Runtime module registration helper for minigames
// Allows modules to self-register at runtime

(function(g){
  'use strict';

  // Initialize MinigameModules namespace if not exists
  if(typeof g.MinigameModules === 'undefined'){
    g.MinigameModules = {};
  }

  /**
   * Register a minigame module
   * Modules call this to register themselves in the global registry
   * 
   * @param {string} key - Game key (must match registry key)
   * @param {Object} impl - Implementation object with render function
   * @param {Object} meta - Optional metadata for runtime registration
   * @returns {boolean} True if registration succeeded
   */
  function register(key, impl, meta = null){
    try {
      if(!key){
        console.error('[MinigameModules] register: key is required');
        return false;
      }

      if(!impl || typeof impl.render !== 'function'){
        console.error(`[MinigameModules] register: "${key}" implementation must have a render function`);
        return false;
      }

      // Register in MinigameModules
      g.MinigameModules[key] = impl;
      console.info(`[MinigameModules] Registered: ${key}`);

      // Also register in legacy MiniGames for backwards compatibility
      if(typeof g.MiniGames === 'undefined'){
        g.MiniGames = {};
      }
      if(!g.MiniGames[key]){
        g.MiniGames[key] = impl;
      }

      // If metadata provided, register in MinigameRegistry
      if(meta && g.MinigameRegistry && typeof g.MinigameRegistry.registerGame === 'function'){
        g.MinigameRegistry.registerGame(meta);
      }

      return true;
    } catch(error){
      console.error(`[MinigameModules] register error for "${key}":`, error);
      return false;
    }
  }

  /**
   * Check if a module is registered
   * @param {string} key - Game key
   * @returns {boolean} True if registered
   */
  function isRegistered(key){
    return !!(g.MinigameModules[key] && typeof g.MinigameModules[key].render === 'function');
  }

  /**
   * Get a registered module
   * @param {string} key - Game key
   * @returns {Object|null} Module implementation or null
   */
  function getModule(key){
    return g.MinigameModules[key] || null;
  }

  /**
   * List all registered module keys
   * @returns {Array<string>} Array of registered keys
   */
  function listRegistered(){
    return Object.keys(g.MinigameModules);
  }

  // Export API on MinigameModules namespace
  g.MinigameModules.register = register;
  g.MinigameModules.isRegistered = isRegistered;
  g.MinigameModules.getModule = getModule;
  g.MinigameModules.listRegistered = listRegistered;

  console.info('[MinigameModules] Loader initialized');

})(window);
