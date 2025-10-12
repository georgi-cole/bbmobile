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
 */

(function(global) {
  'use strict';

  // Internal state
  let alivePlayers = [];
  const eventTarget = new EventTarget();

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
      alivePlayers = normalized;
      console.info(`[PlayerService] Players updated: ${alivePlayers.length} alive`);
      
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

  // Initialize on load
  seedFromGlobals();

  // Export API
  const PlayerService = {
    getAlivePlayers,
    setAlivePlayers,
    subscribe,
    onNextChange
  };

  // Attach to window
  global.PlayerService = PlayerService;

  console.info('[PlayerService] Module loaded and initialized');

})(window);
