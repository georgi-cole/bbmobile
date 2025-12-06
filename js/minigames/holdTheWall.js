// MODULE: minigames/holdTheWall.js
// Hold The Wall timer control wrapper - disables phase timer for endurance challenges

const HoldTheWall = (() => {
  // HoldTheWall minigame: endurance challenge — no phase timer,
  // players who drop get 0 points, results are computed only from players
  // that have NOT dropped and are still holding. Results are shown once,
  // and we advance the phase to results as soon as the player returns to
  // the main screen (or when the game owner triggers results).
  //
  // This module is defensive: it attempts to interoperate with the existing
  // global phase/timer API on window.game.phase and the event bus
  // window.game.bus. It's written to be robust against slightly different
  // naming conventions used elsewhere in the codebase.
  //
  // Testing: see test_holdthewall.html to run the scenario manually.
  //
  // Key behaviours implemented:
  //  - disable/stop any 3-minute phase timer when this minigame starts
  //  - maintain per-player "dropped" state (dropped => 0 points)
  //  - when returning to main screen, immediately advance phase to results
  //    and compute winners only from non-dropped players
  //  - ensure results are shown only once
  //  - emit clear events so other systems can hook in

  // Private state
  const playersHolding = new Set(); // players currently holding (ids)
  const droppedPlayers = new Set(); // players who dropped
  let resultsShown = false;
  let started = false;
  let localPlayerId = null;

  // Helpers to interoperate with global phase/timer API (defensive)
  function tryPauseGlobalPhaseTimer() {
    try {
      const phase = window.game && window.game.phase;
      if (!phase) return;

      // Common APIs that might exist — try them in order:
      if (typeof phase.pause === 'function') {
        phase.pause();
        return;
      }
      if (typeof phase.setTimerEnabled === 'function') {
        phase.setTimerEnabled(false);
        return;
      }
      if (typeof phase.disableTimer === 'function') {
        phase.disableTimer();
        return;
      }
      // Fallback: clear a numeric timeout id if present
      if (phase.currentPhaseTimerId) {
        clearTimeout(phase.currentPhaseTimerId);
        phase.currentPhaseTimerId = null;
      }
      // Best-effort flag so other code can know
      phase.timerEnabled = false;
    } catch (err) {
      console.error('[HoldTheWall] unable to pause global phase timer', err);
    }
  }

  function tryAdvanceToResults() {
    try {
      const phase = window.game && window.game.phase;
      if (!phase) {
        // Fallback: emit an event on the bus
        if (window.game && window.game.bus && typeof window.game.bus.emit === 'function') {
          window.game.bus.emit('phase.advance', 'results');
        }
        return;
      }

      if (typeof phase.advanceTo === 'function') {
        phase.advanceTo('results');
        return;
      }
      if (typeof phase.advance === 'function') {
        phase.advance('results');
        return;
      }
      // fallback: emit event
      if (window.game && window.game.bus && typeof window.game.bus.emit === 'function') {
        window.game.bus.emit('phase.advance', 'results');
      }
    } catch (err) {
      console.error('[HoldTheWall] unable to advance to results', err);
    }
  }

  function publishResults() {
    if (resultsShown) return;
    resultsShown = true;

    // Determine winners: players who have not dropped and are in playersHolding
    const remainingPlayers = Array.from(playersHolding).filter(id => !droppedPlayers.has(id));

    // If there are no remaining players, everyone dropped => no winners (all 0 points)
    const winners = remainingPlayers.length ? remainingPlayers : [];

    const payload = {
      game: 'holdTheWall',
      winners,
      droppedPlayers: Array.from(droppedPlayers),
      allHolding: Array.from(playersHolding)
    };

    // Emit results on bus
    try {
      if (window.game && window.game.bus && typeof window.game.bus.emit === 'function') {
        window.game.bus.emit('minigame.results', payload);
      } else {
        console.info('[HoldTheWall] results', payload);
      }
    } catch (err) {
      console.error('[HoldTheWall] failed to emit results', err);
    }
  }

  // Public event handlers
  function onPlayerJoined(player) {
    // player: { id, name }
    if (!player || !player.id) return;
    playersHolding.add(player.id);
    // If this player had previously dropped (rejoin?), remove from droppedPlayers.
    droppedPlayers.delete(player.id);
  }

  function onPlayerDropped(playerId) {
    if (!playerId) return;
    // Mark dropped and remove from holding set
    droppedPlayers.add(playerId);
    playersHolding.delete(playerId);

    // Award 0 points — emit event so scoring system can pick up
    try {
      if (window.game && window.game.bus && typeof window.game.bus.emit === 'function') {
        window.game.bus.emit('minigame.playerDropped', {
          game: 'holdTheWall',
          playerId,
          points: 0
        });
      }
    } catch (err) {
      console.error('[HoldTheWall] failed to emit playerDropped', err);
    }

    // If all players dropped, we can immediately show results (none remaining)
    if (playersHolding.size === 0) {
      publishResults();
      tryAdvanceToResults();
    }
  }

  function onPlayerLeftToMainScreen(_playerId) {
    // According to the requested behavior: as soon as "they are back to the main screen"
    // the phase should advance to results and we see who from other players won (must be
    // a player that has not dropped). The "they" here refers to the user returning from
    // the minigame to the main screen — so when ANY player returns to main screen, we
    // should advance to results (the server/host will compute winners among remaining).
    //
    // Implementation note: we interpret "they" as the client that opened the main screen or
    // the minigame is being closed by the client. We therefore immediately publish results
    // and request phase advance. If you want this to happen only when the host/operator
    // returns, adjust the condition to check for role.
    
    // Note: playerId validation removed - we publish results regardless of who returned
    // This ensures results are always published when returning to main screen
    
    // If the player who returned had not dropped, ensure they're in holding set
    // (some code paths may remove them earlier). We won't change scoring here.
    // Immediately compute/publish results and advance.
    publishResults();
    tryAdvanceToResults();
  }

  // Called once when the minigame starts
  function start(options = {}) {
    if (started) return;
    started = true;
    resultsShown = false;
    droppedPlayers.clear();
    playersHolding.clear();

    // store local player id if available
    if (options.localPlayerId) localPlayerId = options.localPlayerId;
    if (Array.isArray(options.players)) {
      options.players.forEach(p => {
        if (p && p.id) playersHolding.add(p.id);
      });
    }

    // Disable the global 3-minute timer if present
    tryPauseGlobalPhaseTimer();

    // Listen to bus events relevant to this minigame
    try {
      const bus = window.game && window.game.bus;
      if (bus && typeof bus.on === 'function') {
        // Listen for external playerDropped events (from other systems)
        // Note: We don't call onPlayerDropped here to avoid recursive event loops
        // since onPlayerDropped already emits this event
        bus.on('minigame.playerDropped', evt => {
          // Only handle external drops (not from our own onPlayerDropped calls)
          if (evt && evt.playerId && evt.game !== 'holdTheWall') {
            // Mark as dropped without emitting another event
            droppedPlayers.add(evt.playerId);
            playersHolding.delete(evt.playerId);
          }
        });

        // Player leaving the minigame / returning to main screen
        bus.on('ui.mainScreenShown', evt => {
          // Some systems send { playerId } or nothing. We'll default to local.
          const pid = evt && evt.playerId ? evt.playerId : localPlayerId;
          onPlayerLeftToMainScreen(pid);
        });

        // Also listen for explicit exit event
        bus.on('minigame.exit', evt => {
          const pid = evt && evt.playerId ? evt.playerId : localPlayerId;
          onPlayerLeftToMainScreen(pid);
        });

        // Listen for direct drop events originating from input layer
        bus.on('input.holdTheWall.drop', evt => {
          const pid = evt && evt.playerId ? evt.playerId : (evt && evt.id ? evt.id : null);
          if (pid) onPlayerDropped(pid);
        });
      }
    } catch (err) {
      console.error('[HoldTheWall] failed to attach bus listeners', err);
    }
  }

  // Public API method to compute winners on demand (useful for tests)
  function computeWinners() {
    return Array.from(playersHolding).filter(id => !droppedPlayers.has(id));
  }

  // Reset / cleanup when minigame is finished or unloaded
  function stop() {
    started = false;
    // Do NOT re-enable global timer here — the phase manager should decide
    // when to resume or set next phase duration. Re-enabling globally could
    // reintroduce the incorrect 3-minute behaviour.
    // Clear local state
    playersHolding.clear();
    droppedPlayers.clear();
    resultsShown = false;
  }

  // Public API
  return {
    start,
    stop,
    onPlayerJoined,
    onPlayerDropped,
    computeWinners,
    publishResults // exposed for test harnesses to call
  };
})();

// Register the module globally for use by the minigame system
// This wraps the logic module and integrates with the existing hold-wall.js render function
(function(g){
  'use strict';
  
  // Wait for the hold-wall.js module to load, then wrap it with our timer control logic
  function initializeHoldTheWallWrapper(){
    // Check if hold-wall render function is available
    if(!g.MiniGames || !g.MiniGames.holdWall || typeof g.MiniGames.holdWall.render !== 'function'){
      console.warn('[HoldTheWall] hold-wall.js not loaded yet, will retry...');
      setTimeout(initializeHoldTheWallWrapper, 100);
      return;
    }
    
    const originalRender = g.MiniGames.holdWall.render;
    
    // Create a wrapper render function that uses our timer control logic
    function render(container, onComplete, options = {}){
      console.info('[HoldTheWall] Wrapper render called - disabling phase timer');
      
      // Get player information for initialization
      const players = [];
      let localPlayerId = null;
      
      // Try to get players from game state
      if(g.game && g.game.players && Array.isArray(g.game.players)){
        const alivePlayers = g.game.players.filter(p => !p.evicted);
        alivePlayers.forEach(p => {
          if(p && p.id){
            players.push({ id: p.id, name: p.name || p.id });
            if(p.human){
              localPlayerId = p.id;
            }
          }
        });
      }
      
      // Start our timer control logic
      HoldTheWall.start({
        localPlayerId: localPlayerId || 'player1',
        players: players.length > 0 ? players : [
          { id: 'player1', name: 'You' }
        ]
      });
      
      // Wrap the onComplete callback to stop our logic when done
      const wrappedOnComplete = (score) => {
        console.info('[HoldTheWall] Game complete, stopping timer control logic');
        HoldTheWall.stop();
        if(typeof onComplete === 'function'){
          onComplete(score);
        }
      };
      
      // Call the original render function
      originalRender(container, wrappedOnComplete, options);
    }
    
    // Replace the holdWall render function with our wrapper
    g.MiniGames.holdWall.render = render;
    console.info('[HoldTheWall] Successfully wrapped hold-wall.js render function');
  }
  
  // Initialize when DOM is ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initializeHoldTheWallWrapper);
  } else {
    initializeHoldTheWallWrapper();
  }
  
})(window);
