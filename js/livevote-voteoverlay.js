// MODULE: livevote-voteoverlay.js (stub)
// Provides minimal stubs for livevote overlay UI
// Real implementation available in archive/ui-archive/js/livevote-voteoverlay.js

(function(global) {
  'use strict';

  console.debug('[livevote-voteoverlay] Stub loaded - using lv2-shim for vote UI');

  // Export minimal LiveVoteOverlay stub
  global.LiveVoteOverlay = {
    isAvailable: false,
    show: function() {
      console.warn('[LiveVoteOverlay] Stub called - no action taken');
    }
  };

})(window);
