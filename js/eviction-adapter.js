// MODULE: eviction-adapter.js
// Adapter to bridge old startLiveVote() calls to new EvictionUI system
// This allows gradual migration from old eviction system to new ground-up implementation

(function(global) {
  'use strict';

  /**
   * Bridge function that replaces global.startLiveVote
   * Converts old eviction flow to new event-based system
   */
  function startLiveVote() {
    console.log('[eviction-adapter] startLiveVote called - bridging to new EvictionUI system');

    const g = global.game;
    if (!g || !g.eviction) {
      console.error('[eviction-adapter] No game or eviction state found');
      return;
    }

    // Extract nominees from game state
    const nominees = (g.eviction.nominees || g.nominees || []).map(id => {
      const player = global.getP ? global.getP(id) : null;
      if (!player) {
        console.warn(`[eviction-adapter] Player ${id} not found`);
        return null;
      }

      // Get avatar URL
      let avatarUrl = player.avatar;
      if (!avatarUrl && global.resolveAvatar) {
        avatarUrl = global.resolveAvatar(player);
      }
      if (!avatarUrl) {
        // Fallback to dicebear
        avatarUrl = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(player.name || 'player')}`;
      }

      return {
        id: player.id,
        name: player.name,
        avatarUrl: avatarUrl,
        seatId: player.seatId || id
      };
    }).filter(n => n !== null);

    if (nominees.length === 0) {
      console.error('[eviction-adapter] No valid nominees found');
      return;
    }

    // Determine if human is eligible to vote
    const voters = eligibleVoters();
    const humanId = g.humanId || g.local?.id;
    const eligible = voters.some(v => v.id === humanId);

    console.log('[eviction-adapter] Emitting phase:eviction:start', {
      nominees: nominees.length,
      eligible,
      humanId
    });

    // Emit event to trigger new EvictionUI
    const bus = global.game?.bus || global.bbGameBus;
    if (!bus) {
      console.error('[eviction-adapter] No event bus found');
      return;
    }

    bus.emit('phase:eviction:start', {
      nominees: nominees,
      eligible: eligible,
      phaseId: `eviction-week-${g.week || 'unknown'}`,
      timeoutMs: (g.cfg?.tVote || 25) * 1000 // Convert seconds to milliseconds
    });

    // Set up listener for vote cast event
    setupVoteCastListener();

    // Update UI to show phase started
    if (global.tv?.say) {
      global.tv.say('Live Vote');
    }

    // Start phase music if available
    if (global.phaseMusic) {
      global.phaseMusic('livevote');
    }
  }

  /**
   * Determine eligible voters (copied from old eviction.js logic)
   */
  function eligibleVoters() {
    const g = global.game;
    const remain = alivePlayers().length;

    // Final 4 logic: Only veto holder votes
    if (remain === 4) {
      const holder = global.getP ? global.getP(g.vetoHolder) : null;
      if (holder && !g.eviction.nominees.includes(holder.id)) {
        return [holder];
      }
      // Fallback: any non-HOH, non-nominee
      return alivePlayers().filter(p => 
        p.id !== g.hohId && !g.eviction.nominees.includes(p.id)
      ).slice(0, 1);
    }

    // Normal logic: All non-HOH, non-nominees
    return alivePlayers().filter(p => 
      p.id !== g.hohId && !g.eviction.nominees.includes(p.id)
    );
  }

  /**
   * Get alive players
   */
  function alivePlayers() {
    if (global.alivePlayers && typeof global.alivePlayers === 'function') {
      return global.alivePlayers();
    }
    return (global.game?.players || []).filter(p => !p.evicted);
  }

  /**
   * Set up listener for vote cast event from new EvictionUI
   */
  function setupVoteCastListener() {
    const bus = global.game?.bus || global.bbGameBus;
    if (!bus) return;

    // Remove any existing listener
    if (global.__evictionVoteCastListener) {
      bus.off('eviction:vote:cast', global.__evictionVoteCastListener);
    }

    // Create new listener
    global.__evictionVoteCastListener = function(payload) {
      console.log('[eviction-adapter] Vote cast received:', payload);

      const g = global.game;
      if (!g || !g.eviction) return;

      // Store human vote in game state (compatible with old system)
      g.__human_vote = payload.nomineeId;

      // Update eviction state
      if (!Array.isArray(g.eviction.votes)) {
        g.eviction.votes = [];
      }

      // Add vote to state
      g.eviction.votes.push({
        voter: payload.voterId,
        evict: payload.nomineeId
      });

      console.log('[eviction-adapter] Vote recorded in game state');

      // Log message
      if (global.addLog) {
        const nomineeName = global.safeName ? global.safeName(payload.nomineeId) : 'nominee';
        global.addLog(`You voted to evict ${nomineeName}.`, 'ok');
      }

      // Note: The EvictionUI will handle transition to faux-TV view
      // by calling beginDiaryRoomSequence or emitting continue-to-faux-tv event
    };

    // Attach listener
    bus.on('eviction:vote:cast', global.__evictionVoteCastListener);
  }

  /**
   * Clean up adapter listeners
   */
  function cleanupAdapter() {
    const bus = global.game?.bus || global.bbGameBus;
    if (bus && global.__evictionVoteCastListener) {
      bus.off('eviction:vote:cast', global.__evictionVoteCastListener);
      global.__evictionVoteCastListener = null;
    }
  }

  // Replace global.startLiveVote with adapter function
  global.startLiveVote = startLiveVote;

  // Export cleanup function
  global.cleanupEvictionAdapter = cleanupAdapter;

  console.info('[eviction-adapter] Adapter loaded - startLiveVote bridged to new EvictionUI');

})(window);
