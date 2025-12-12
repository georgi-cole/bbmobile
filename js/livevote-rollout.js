// MODULE: livevote-rollout.js (stub)
// Provides minimal stubs for livevote rollout UI
// Real implementation available in archive/ui-archive/js/livevote-rollout.js

(function(global) {
  'use strict';

  console.debug('[livevote-rollout] Stub loaded - using lv2-shim for vote UI');

  // Export minimal LiveVoteRollout stub
  global.LiveVoteRollout = {
    isAvailable: false,
    show: function() {
      console.warn('[LiveVoteRollout] Stub called - no action taken');
    },
    addVote: function() {
      console.debug('[LiveVoteRollout] Stub addVote called');
    }
  };

})(window);
