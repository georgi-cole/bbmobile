/**
 * PlayerService.js
 * 
 * Single source of truth for alive player state with pub/sub notifications.
 * Provides a stable API for UIs to subscribe to player changes.
 * 
 * Usage:
 *   // Get current alive players
 *   const players = PlayerService.getAlivePlayers();
 * 
 *   // Update alive players (triggers 'players:change' event)
 *   PlayerService.setAlivePlayers([...players]);
 * 
 *   // Subscribe to changes
 *   const unsubscribe = PlayerService.subscribe((players) => {
 *     console.log('Players changed:', players);
 *   });
 *   
 *   // Later: unsubscribe
 *   unsubscribe();
 * 
 *   // One-time subscription
 *   PlayerService.onNextChange((players) => {
 *     console.log('Players changed once:', players);
 *   });
 * 
 *   // Wait for players to be ready (one-time)
 *   PlayerService.onPlayersReady((players) => {
 *     console.log('Players are now ready:', players);
 *   });
 * 
 *   // Check if players are ready synchronously
 *   if (PlayerService.isReady()) {
 *     // Players are available
 *   }
 */

(function(global) {
  'use strict';

  // Internal state
  let alivePlayers = [];
  let playersReady = false;
  let playersReadyEmitted = false;
  const eventTarget = new EventTarget();
  
  // Telemetry helper
  function logTelemetry(event, data = {}) {
    try {
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log(event, data);
      } else {
        console.info(`[PlayerService:Telemetry] ${event}`, data);
      }
    } catch (err) {
      console.warn('[PlayerService] Telemetry logging failed:', err);
    }
  }

  /**
   * Normalize a player object to ensure consistent shape
   * @param {object} p - Player object
   * @returns {object} Normalized player
   */
  function normalizePlayer(p) {
    if (!p) return null;
    
    // Handle various player shapes from different parts of the codebase
    return {
      id: p.id,
      name: p.name || p.nm || `Player ${p.id}`,
      evicted: p.evicted || false,
      hoh: p.hoh || false,
      nominated: p.nominated || false,
      human: p.human || false,
      // Preserve other properties
      ...p
    };
  }

  /**
   * Emit players-ready event once players are available
   * Only emits once per session
   */
  function emitPlayersReady() {
    if (playersReadyEmitted || alivePlayers.length === 0) {
      return;
    }
    
    playersReady = true;
    playersReadyEmitted = true;
    
    console.info(`[PlayerService] Players ready: ${alivePlayers.length} players`);
    logTelemetry('players_ready', { count: alivePlayers.length });
    
    // Dispatch players-ready event
    const event = new CustomEvent('players-ready', {
      detail: { players: alivePlayers.slice(), count: alivePlayers.length }
    });
    eventTarget.dispatchEvent(event);
    
    // Also dispatch on window for global listeners (e.g., MobileRoster)
    try {
      const globalEvent = new CustomEvent('players-ready', {
        detail: { players: alivePlayers.slice(), count: alivePlayers.length }
      });
      global.dispatchEvent(globalEvent);
    } catch (e) {
      console.warn('[PlayerService] Failed to dispatch global players-ready event:', e);
    }
    
    // Dispatch on bbGameBus if available
    if (global.bbGameBus && typeof global.bbGameBus.emit === 'function') {
      try {
        global.bbGameBus.emit('players-ready', { players: alivePlayers.slice(), count: alivePlayers.length });
      } catch (e) {
        console.warn('[PlayerService] Failed to emit players-ready on bbGameBus:', e);
      }
    }
  }

  /**
   * Seed the service from existing global state
   * Checks for players in various global locations
   */
  function seedFromGlobals() {
    try {
      // Try multiple sources for initial player data
      let players = null;
      
      // 1. Try global alivePlayers function
      if (typeof global.alivePlayers === 'function') {
        players = global.alivePlayers();
        if (Array.isArray(players) && players.length > 0) {
          console.info('[PlayerService] Seeded from global.alivePlayers()');
        }
      }
      
      // 2. Try g.game.players
      if (!players || players.length === 0) {
        if (global.g?.game?.players) {
          players = global.g.game.players.filter(p => !p.evicted);
          if (players.length > 0) {
            console.info('[PlayerService] Seeded from g.game.players');
          }
        }
      }
      
      // 3. Try g.players
      if (!players || players.length === 0) {
        if (global.g?.players) {
          players = global.g.players.filter(p => !p.evicted);
          if (players.length > 0) {
            console.info('[PlayerService] Seeded from g.players');
          }
        }
      }
      
      // 4. Try window.game.players
      if (!players || players.length === 0) {
        if (global.game?.players) {
          players = global.game.players.filter(p => !p.evicted);
          if (players.length > 0) {
            console.info('[PlayerService] Seeded from window.game.players');
          }
        }
      }
      
      if (players && Array.isArray(players) && players.length > 0) {
        alivePlayers = players.map(normalizePlayer).filter(Boolean);
        console.info(`[PlayerService] Initialized with ${alivePlayers.length} alive players`);
        
        // Emit players-ready event
        emitPlayersReady();
      } else {
        console.info('[PlayerService] No players found in globals, starting with empty state');
        alivePlayers = [];
      }
    } catch (err) {
      console.warn('[PlayerService] Error seeding from globals:', err);
      alivePlayers = [];
    }
  }

  /**
   * Get current alive players
   * @returns {Array} Array of alive player objects
   */
  function getAlivePlayers() {
    // Re-seed if empty and globals are available
    if (alivePlayers.length === 0) {
      seedFromGlobals();
    }
    return alivePlayers.slice(); // Return a copy to prevent external mutations
  }

  /**
   * Check if players are ready (populated)
   * @returns {boolean} True if players are available
   */
  function isReady() {
    if (alivePlayers.length > 0) {
      return true;
    }
    // Try to seed before returning false
    seedFromGlobals();
    return alivePlayers.length > 0;
  }

  /**
   * Set alive players and notify subscribers
   * @param {Array} players - Array of player objects
   */
  function setAlivePlayers(players) {
    if (!Array.isArray(players)) {
      console.warn('[PlayerService] setAlivePlayers called with non-array:', players);
      return;
    }

    // Normalize and filter out evicted players
    const normalized = players
      .map(normalizePlayer)
      .filter(p => p && !p.evicted);

    // Check if there's an actual change
    const changed = normalized.length !== alivePlayers.length ||
      normalized.some((p, i) => p.id !== alivePlayers[i]?.id);

    if (changed) {
      const wasEmpty = alivePlayers.length === 0;
      alivePlayers = normalized;
      console.info(`[PlayerService] Players updated: ${alivePlayers.length} alive`);
      
      // Emit players-ready if this is the first time we have players
      if (wasEmpty && alivePlayers.length > 0) {
        emitPlayersReady();
      }
      
      // Emit change event
      const event = new CustomEvent('players:change', {
        detail: { players: alivePlayers.slice() }
      });
      eventTarget.dispatchEvent(event);
    }
  }

  /**
   * Subscribe to player changes
   * @param {Function} callback - Called with (players) when players change
   * @returns {Function} Unsubscribe function
   */
  function subscribe(callback) {
    if (typeof callback !== 'function') {
      console.warn('[PlayerService] subscribe called with non-function:', callback);
      return () => {};
    }

    const listener = (event) => {
      try {
        callback(event.detail.players);
      } catch (err) {
        console.error('[PlayerService] Error in subscriber callback:', err);
      }
    };

    eventTarget.addEventListener('players:change', listener);

    // Return unsubscribe function
    return () => {
      eventTarget.removeEventListener('players:change', listener);
    };
  }

  /**
   * Subscribe to the next player change only (one-time)
   * @param {Function} callback - Called with (players) on next change
   * @returns {Function} Unsubscribe function (in case you want to cancel)
   */
  function onNextChange(callback) {
    if (typeof callback !== 'function') {
      console.warn('[PlayerService] onNextChange called with non-function:', callback);
      return () => {};
    }

    const listener = (event) => {
      try {
        callback(event.detail.players);
      } catch (err) {
        console.error('[PlayerService] Error in onNextChange callback:', err);
      } finally {
        eventTarget.removeEventListener('players:change', listener);
      }
    };

    eventTarget.addEventListener('players:change', listener);

    // Return unsubscribe function in case caller wants to cancel
    return () => {
      eventTarget.removeEventListener('players:change', listener);
    };
  }

  /**
   * Subscribe to players-ready event (one-time)
   * If players are already ready, callback is invoked immediately
   * @param {Function} callback - Called with (players) when players become ready
   * @returns {Function} Unsubscribe function (in case you want to cancel)
   */
  function onPlayersReady(callback) {
    if (typeof callback !== 'function') {
      console.warn('[PlayerService] onPlayersReady called with non-function:', callback);
      return () => {};
    }

    // If already ready, invoke immediately
    if (playersReady && alivePlayers.length > 0) {
      try {
        callback(alivePlayers.slice());
      } catch (err) {
        console.error('[PlayerService] Error in onPlayersReady callback:', err);
      }
      return () => {};
    }

    // Otherwise, wait for event
    const listener = (event) => {
      try {
        callback(event.detail.players);
      } catch (err) {
        console.error('[PlayerService] Error in onPlayersReady callback:', err);
      } finally {
        eventTarget.removeEventListener('players-ready', listener);
      }
    };

    eventTarget.addEventListener('players-ready', listener);

    // Return unsubscribe function in case caller wants to cancel
    return () => {
      eventTarget.removeEventListener('players-ready', listener);
    };
  }

  // Initialize on load
  seedFromGlobals();

  // Export API
  const PlayerService = {
    getAlivePlayers,
    setAlivePlayers,
    subscribe,
    onNextChange,
    onPlayersReady,
    isReady
  };

  // Attach to window
  global.PlayerService = PlayerService;

  console.info('[PlayerService] Module loaded and initialized');

})(window);
