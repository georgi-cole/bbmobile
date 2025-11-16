// MODULE: suppress-auto-rules.js
// Early suppression of automatic Rules modal and Profile modal behaviors
// This must load BEFORE rules.js and player-profile-modal.js

(function(g) {
  'use strict';
  
  console.info('[suppress-auto-rules] Setting suppression flags...');
  
  // Suppress automatic Rules modal after intro video
  g.__bbSuppressAutoRules = true;
  
  // Ensure config object exists
  if (!g.game) {
    g.game = {};
  }
  if (!g.game.cfg) {
    g.game.cfg = {};
  }
  
  // Force autoShowRulesOnStart to false
  g.game.cfg.autoShowRulesOnStart = false;
  
  console.info('[suppress-auto-rules] Suppression flags set:', {
    __bbSuppressAutoRules: g.__bbSuppressAutoRules,
    autoShowRulesOnStart: g.game.cfg.autoShowRulesOnStart
  });
  
})(window);
