// MODULE: storage-adapter.js
// Persists competition placements (only — no raw scores) to:
//   - global.game.competitionHistory  (in-memory)
//   - localStorage key 'bb_competition_history'
// Also tracks playerStats.bestPlacement in:
//   - global.game.playerStats
//   - localStorage key 'bb_player_stats'

(function (global) {
  'use strict';

  var HISTORY_KEY = 'bb_competition_history';
  var STATS_KEY   = 'bb_player_stats';

  function _safeLocalStorage() {
    try { return global.localStorage || null; }
    catch (e) { return null; }
  }

  function _loadHistory() {
    var g = global.game = global.game || {};
    if (!Array.isArray(g.competitionHistory)) {
      var ls = _safeLocalStorage();
      if (ls) {
        try { g.competitionHistory = JSON.parse(ls.getItem(HISTORY_KEY) || 'null') || []; }
        catch (e) { g.competitionHistory = []; }
      } else {
        g.competitionHistory = [];
      }
    }
    return g.competitionHistory;
  }

  function _loadStats() {
    var g = global.game = global.game || {};
    if (!g.playerStats || typeof g.playerStats !== 'object') {
      var ls = _safeLocalStorage();
      if (ls) {
        try { g.playerStats = JSON.parse(ls.getItem(STATS_KEY) || 'null') || {}; }
        catch (e) { g.playerStats = {}; }
      } else {
        g.playerStats = {};
      }
    }
    return g.playerStats;
  }

  function _persistHistory(history) {
    var ls = _safeLocalStorage();
    if (ls) {
      try { ls.setItem(HISTORY_KEY, JSON.stringify(history)); }
      catch (e) { console.warn('[StorageAdapter] Could not persist competition history', e); }
    }
  }

  function _persistStats(stats) {
    var ls = _safeLocalStorage();
    if (ls) {
      try { ls.setItem(STATS_KEY, JSON.stringify(stats)); }
      catch (e) { console.warn('[StorageAdapter] Could not persist player stats', e); }
    }
  }

  var CompetitionStorageAdapter = {
    /**
     * Persist a finished round's placements (no raw scores).
     *
     * @param {object} roundData
     *   timestamp  {string}  - ISO timestamp
     *   roundId    {string}
     *   placements {Array}   - [{playerId, placement}]
     *   config     {object}  - round configuration (order, etc.)
     */
    saveRound: function (roundData) {
      if (!roundData || !Array.isArray(roundData.placements)) {
        console.warn('[StorageAdapter] saveRound: invalid roundData', roundData);
        return;
      }

      // Store only placements — never raw performance metrics
      var entry = {
        timestamp: roundData.timestamp || new Date().toISOString(),
        roundId:   roundData.roundId   || ('round_' + Date.now()),
        placements: roundData.placements.map(function (p) {
          return { playerId: p.playerId, placement: p.placement };
        }),
        config: roundData.config ? {
          order:  roundData.config.order,
          isFinal: !!roundData.config.isFinal
        } : {}
      };

      var history = _loadHistory();
      history.push(entry);
      _persistHistory(history);

      // Update bestPlacement per player
      var stats = _loadStats();
      entry.placements.forEach(function (p) {
        var pid = String(p.playerId);
        if (!stats[pid]) stats[pid] = {};
        var current = stats[pid].bestPlacement;
        if (current === undefined || current === null || p.placement < current) {
          stats[pid].bestPlacement = p.placement;
        }
      });
      _persistStats(stats);
    },

    /**
     * Return the full competition history (array of round entries).
     * @returns {Array}
     */
    getHistory: function () {
      return _loadHistory().slice();
    },

    /**
     * Return stats for a specific player.
     * @param {string|number} playerId
     * @returns {object} e.g. { bestPlacement: 1 }
     */
    getPlayerStats: function (playerId) {
      var stats = _loadStats();
      return stats[String(playerId)] || {};
    },

    /**
     * Clear all persisted history and stats (useful in tests).
     */
    clearAll: function () {
      var g = global.game = global.game || {};
      g.competitionHistory = [];
      g.playerStats = {};
      var ls = _safeLocalStorage();
      if (ls) {
        try { ls.removeItem(HISTORY_KEY); ls.removeItem(STATS_KEY); }
        catch (e) { /* ignore */ }
      }
    }
  };

  global.CompetitionStorageAdapter = CompetitionStorageAdapter;

}(typeof window !== 'undefined' ? window : global));
