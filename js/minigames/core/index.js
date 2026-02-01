// MODULE: minigames/core/index.js
// Core minigame utilities and components
// Re-exports all core modules for convenient importing

(function(g){
  'use strict';

  // This file serves as a convenience export for core modules
  // Individual modules are already registered on window.game
  // This file exists for documentation and potential future bundling

  // Core modules available:
  // - window.game.TimerConfig (from timer-config.js)
  // - window.game.GameTimer (from game-timer.js)
  // - window.game.MinigameContext (from context.js)
  // - window.game.MinigameLifecycle (from lifecycle.js)
  // - window.game.KeyResolver (from key-resolver.js)
  // - window.game.CompatBridge (from compat-bridge.js)
  // - window.game.RegistryBootstrap (from registry-bootstrap.js)
  // - window.game.MinigameWatchdog (from watchdog.js)

  console.log('[Core] Core minigame modules loaded');

})(window.game = window.game || {});
