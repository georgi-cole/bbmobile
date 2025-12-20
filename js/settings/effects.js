// MODULE: settings/effects.js
// Centralized side effect handlers for config changes.
// These apply UI toggles and updates when settings change.

(function(global){
  'use strict';

  // Side effect map: key -> handler function
  const EFFECT_HANDLERS = {
    // Colorblind mode toggle
    colorblindMode: function(value, cfg){
      try{
        document.body.classList.toggle('cb', !!value);
      }catch(e){
        console.warn('[effects] colorblindMode toggle failed', e);
      }
    },
    
    // Top roster visibility
    showTopRoster: function(value, cfg){
      try{
        global.updateHud?.();
      }catch(e){
        console.warn('[effects] showTopRoster update failed', e);
      }
    },
    
    // Theme changes (handled by theme-switcher.js, but we can trigger HUD update)
    timerStyle: function(value, cfg){
      try{
        global.updateHud?.();
      }catch(e){
        console.warn('[effects] timerStyle update failed', e);
      }
    },
    
    // Jury house toggle
    enableJuryHouse: function(value, cfg){
      try{
        global.updateHud?.();
      }catch(e){
        console.warn('[effects] enableJuryHouse update failed', e);
      }
    },
    
    // Social Spend Debug HUD toggle
    debugSocialHUD: function(value, cfg){
      try{
        if (global.SocialUIAdapter && typeof global.SocialUIAdapter.refreshHUD === 'function') {
          global.SocialUIAdapter.refreshHUD();
        }
      }catch(e){
        console.warn('[effects] debugSocialHUD refresh failed', e);
      }
    }
  };

  // Apply side effects for changed config keys
  function applyEffects(cfg, changedKeys){
    if(!cfg) return;
    
    // If no specific keys provided, apply all effects
    const keys = changedKeys || Object.keys(EFFECT_HANDLERS);
    
    keys.forEach(function(key){
      const handler = EFFECT_HANDLERS[key];
      if(handler && cfg.hasOwnProperty(key)){
        try{
          handler(cfg[key], cfg);
        }catch(e){
          console.warn('[effects] Handler failed for key:', key, e);
        }
      }
    });
  }

  // Apply all registered effects (useful for initial load)
  function applyAllEffects(cfg){
    applyEffects(cfg, Object.keys(EFFECT_HANDLERS));
    // Also trigger global HUD update
    try{
      global.updateHud?.();
    }catch(e){
      console.warn('[effects] Global HUD update failed', e);
    }
  }

  // Export to global namespace
  const SettingsEffects = global.SettingsEffects = global.SettingsEffects || {};
  SettingsEffects.applyEffects = applyEffects;
  SettingsEffects.applyAllEffects = applyAllEffects;
  SettingsEffects.EFFECT_HANDLERS = EFFECT_HANDLERS;

})(window);
