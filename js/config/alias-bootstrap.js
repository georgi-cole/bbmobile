// MODULE: config/alias-bootstrap.js
// Defensive bootstrap shim to ensure window.cfg and window.game.cfg always alias the same object.
// This prevents config drift when modules load out of order or create separate config objects.
// Should execute after config/defaults.js but before other modules that read config.

(function(global){
  'use strict';
  
  function ensureConfigAlias(){
    // Get or create the canonical config object
    let cfg = null;
    
    // Priority 1: Use Config.ensureGameCfg if available (centralized)
    if(typeof global.Config !== 'undefined' && typeof global.Config.ensureGameCfg === 'function'){
      cfg = global.Config.ensureGameCfg();
    }
    // Priority 2: Use existing game.cfg if present
    else if(global.game && global.game.cfg && typeof global.game.cfg === 'object'){
      cfg = global.game.cfg;
    }
    // Priority 3: Use existing window.cfg if present
    else if(global.cfg && typeof global.cfg === 'object'){
      cfg = global.cfg;
    }
    // Priority 4: Load from storage
    else if(typeof global.Config !== 'undefined' && typeof global.Config.loadStoredCfg === 'function'){
      cfg = global.Config.loadStoredCfg();
    }
    // Priority 5: Create empty config
    else {
      cfg = {};
    }
    
    // Ensure both game and game.cfg exist
    global.game = global.game || {};
    
    // Create aliases: both window.cfg and window.game.cfg point to the same object
    global.game.cfg = cfg;
    global.cfg = cfg;
    
    console.info('[config/alias-bootstrap] Config aliases established:', {
      'window.cfg === window.game.cfg': global.cfg === global.game.cfg,
      'numPlayers': cfg.numPlayers || 'not set'
    });
    
    return cfg;
  }
  
  // Execute immediately if DOM is already loaded
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ensureConfigAlias, { once: true });
  } else {
    ensureConfigAlias();
  }
  
  // Also ensure aliases after a short delay to catch late-loading modules
  setTimeout(ensureConfigAlias, 100);
  
  // Expose for manual invocation if needed
  global.ensureConfigAlias = ensureConfigAlias;
  
})(window);
