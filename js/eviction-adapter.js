// MODULE: eviction-adapter.js
// Adapter to bridge old startLiveVote() calls to new EvictionUI system
// This allows gradual migration from old eviction system to new ground-up implementation

(function(global) {
  'use strict';

  /**
   * Wait for nominees to appear in game state with polling
   * @param {number} timeoutMs - Maximum time to wait in milliseconds
   * @param {number} intervalMs - Polling interval in milliseconds
   * @returns {Promise<Array>} - Array of nominee IDs (empty if timeout)
   */
  async function waitForNominees(timeoutMs = 2000, intervalMs = 100) {
    const startTime = Date.now();
    const g = global.game;
    
    // Check all possible nominee locations
    const checkNominees = () => {
      // Check game.eviction.nominees
      if (g?.eviction?.nominees && Array.isArray(g.eviction.nominees) && g.eviction.nominees.length > 0) {
        return { source: 'game.eviction.nominees', ids: g.eviction.nominees };
      }
      
      // Check game.nominees
      if (g?.nominees && Array.isArray(g.nominees) && g.nominees.length > 0) {
        return { source: 'game.nominees', ids: g.nominees };
      }
      
      // Check game.phaseData.eviction.nominees
      if (g?.phaseData?.eviction?.nominees && Array.isArray(g.phaseData.eviction.nominees) && g.phaseData.eviction.nominees.length > 0) {
        return { source: 'game.phaseData.eviction.nominees', ids: g.phaseData.eviction.nominees };
      }
      
      // Check global.nominations
      if (global.nominations && Array.isArray(global.nominations) && global.nominations.length > 0) {
        return { source: 'global.nominations', ids: global.nominations };
      }
      
      return null;
    };
    
    // Try immediate check
    const immediate = checkNominees();
    if (immediate) {
      console.log(`[eviction-adapter] Nominees found immediately from ${immediate.source}`);
      return immediate;
    }
    
    // Poll with timeout
    return new Promise((resolve) => {
      const pollInterval = setInterval(() => {
        const result = checkNominees();
        const elapsed = Date.now() - startTime;
        
        if (result) {
          clearInterval(pollInterval);
          console.log(`[eviction-adapter] Nominees found after ${elapsed}ms from ${result.source}`);
          resolve(result);
        } else if (elapsed >= timeoutMs) {
          clearInterval(pollInterval);
          console.warn(`[eviction-adapter] Timeout waiting for nominees after ${elapsed}ms`);
          resolve({ source: 'timeout', ids: [] });
        }
      }, intervalMs);
    });
  }

  /**
   * Build nominee objects from IDs, with heuristic fallback
   * @param {Array} nomineeIds - Array of nominee IDs
   * @param {string} source - Source where nominees were found
   * @returns {Array} - Array of nominee objects
   */
  function buildNomineeObjects(nomineeIds, source) {
    const g = global.game;
    
    // If no IDs provided, try to infer from player flags
    if (!nomineeIds || nomineeIds.length === 0) {
      console.log('[eviction-adapter] No nominee IDs provided, attempting heuristic inference');
      
      // Get all alive players
      const alive = alivePlayers();
      
      // Infer nominees from player.nominated flag or player.status
      const inferred = alive.filter(p => {
        return p.nominated === true || 
               p.status === 'nominated' ||
               (Array.isArray(g?.nominees) && g.nominees.includes(p.id));
      });
      
      if (inferred.length > 0) {
        nomineeIds = inferred.map(p => p.id);
        source = 'heuristic-player-flags';
        console.log(`[eviction-adapter] Inferred ${nomineeIds.length} nominees from player flags`);
      } else {
        console.error('[eviction-adapter] Could not infer nominees from player flags');
        return [];
      }
    }
    
    // Map IDs to nominee objects
    const nominees = nomineeIds.map(id => {
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
    
    console.log(`[eviction-adapter] Built ${nominees.length} nominee objects from ${source}`);
    return nominees;
  }

  /**
   * Bridge function that replaces global.startLiveVote
   * Converts old eviction flow to new event-based system
   */
  async function startLiveVote() {
    console.log('[eviction-adapter] startLiveVote called - bridging to new EvictionUI system');

    const g = global.game;
    if (!g || !g.eviction) {
      console.error('[eviction-adapter] No game or eviction state found');
      return;
    }

    // Wait for nominees to appear (with 2s timeout)
    const nomineeResult = await waitForNominees(2000, 100);
    
    // Build nominee objects from IDs
    const nominees = buildNomineeObjects(nomineeResult.ids, nomineeResult.source);

    if (nominees.length === 0) {
      console.error('[eviction-adapter] No valid nominees found after waiting and heuristic fallback');
      return;
    }

    // Determine if human is eligible to vote
    const voters = eligibleVoters();
    const humanId = g.humanId || g.local?.id;
    const eligible = voters.some(v => v.id === humanId);

    console.log('[eviction-adapter] Emitting phase:eviction:start', {
      nominees: nominees.length,
      nomineeSource: nomineeResult.source,
      eligible,
      humanId,
      nomineeNames: nominees.map(n => n.name).join(', ')
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
