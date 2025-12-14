// MODULE: livevote-adapter.js
// Tiny adapter to ensure backwards compatibility
// Sets global.LiveVoteOverlay = EvictionManager if EvictionManager exists
// This ensures eviction.js and any code expecting LiveVoteOverlay continue to work

(function(global) {
  'use strict';

  // Wait for EvictionManager to be available
  if (global.EvictionManager && typeof global.EvictionManager.show === 'function') {
    global.LiveVoteOverlay = global.EvictionManager;
    console.info('[livevote-adapter] Set LiveVoteOverlay = EvictionManager');
  } else {
    console.warn('[livevote-adapter] EvictionManager not found, adapter not applied');
  }

})(window);
