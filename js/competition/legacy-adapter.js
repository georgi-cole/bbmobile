// MODULE: legacy-adapter.js
// Backward-compatible shims for legacy competition functions.
// Each function logs a deprecation warning and delegates to the new CompetitionManager API.
// These adapters do NOT expose the old internal score structures; translations are explicit.

(function (global) {
  'use strict';

  var _warned = {};
  function _deprecate(name) {
    if (!_warned[name]) {
      _warned[name] = true;
      console.warn(
        '[DEPRECATED] ' + name + '() is a legacy competition adapter. ' +
        'Migrate to global.game.competition API (start / submitPerformance / finalizeRound / getPlacements).'
      );
    }
  }

  function _getManager() {
    return (global.game && global.game.competition) || null;
  }

  // ── fillMissingScores ────────────────────────────────────────────────────
  /**
   * Legacy: ensure every player in `ids` has a score in `game.lastCompScores`.
   * Adapter: submits each player's existing score (or 0) to CompetitionManager,
   * then derives placements from the existing `game.lastCompScores` map.
   *
   * @param {Array}  ids   - player IDs
   * @param {object} opts  - { compType, gameKey, humanSkipped }
   */
  if (typeof global.fillMissingScores !== 'function') {
    global.fillMissingScores = function fillMissingScores(ids, opts) {
      _deprecate('fillMissingScores');
      opts = opts || {};
      var g = global.game;
      if (!g) return;
      var scores = g.lastCompScores = g.lastCompScores || {};

      (ids || []).forEach(function (id) {
        if (scores[id] === undefined || scores[id] === null) {
          scores[id] = 0;
        }
      });

      // Submit all scores to new manager if a round is active
      var mgr = _getManager();
      if (mgr && mgr.getPhase() === 'play') {
        (ids || []).forEach(function (id) {
          mgr.submitPerformance(id, scores[id]);
        });
      }
    };
  }

  // ── logScoreboard ────────────────────────────────────────────────────────
  /**
   * Legacy: log a formatted scoreboard to console.
   * Adapter: derives ordering from placements if available.
   */
  if (typeof global.logScoreboard !== 'function') {
    global.logScoreboard = function logScoreboard(title, scoresMap, ids) {
      _deprecate('logScoreboard');
      var mgr = _getManager();
      var placements = mgr ? mgr.getPlacements() : [];
      var order = placements.length > 0
        ? placements
        : (ids || []).map(function (id, i) { return { playerId: id, placement: i + 1 }; });

      console.group('[Legacy Scoreboard] ' + (title || 'Competition'));
      order.forEach(function (entry) {
        var score = scoresMap && scoresMap[entry.playerId] !== undefined
          ? '(score: ' + scoresMap[entry.playerId] + ')'
          : '';
        console.log('  #' + entry.placement + ' ' + entry.playerId + ' ' + score);
      });
      console.groupEnd();
    };
  }

  // ── finishCompPhase ──────────────────────────────────────────────────────
  /**
   * Legacy: called after the competition minigame completes; triggers HOH finalization.
   * Adapter: if a new competition round is active, finalizes it first.
   */
  if (typeof global.finishCompPhase !== 'function') {
    global.finishCompPhase = async function finishCompPhase() {
      _deprecate('finishCompPhase');
      var mgr = _getManager();
      if (mgr && mgr.getPhase() === 'play') {
        try { mgr.finalizeRound(); } catch (e) { console.error('[legacy-adapter] finishCompPhase finalizeRound error', e); }
      }
      // Delegate to original implementation if still defined under backup name
      if (typeof global.__legacy_finishCompPhase === 'function') {
        return global.__legacy_finishCompPhase.apply(this, arguments);
      }
    };
  }

  // ── showCompetitionReveal ────────────────────────────────────────────────
  /**
   * Legacy: display competition reveal UI with score map.
   * Adapter: converts scores to placements for the new API; delegates to original UI if present.
   *
   * @param {string} title
   * @param {object} scoresMap  - { [playerId]: score }
   * @param {Array}  ids        - ordered player IDs
   */
  if (typeof global.showCompetitionReveal !== 'function') {
    global.showCompetitionReveal = async function showCompetitionReveal(title, scoresMap, ids) {
      _deprecate('showCompetitionReveal');
      // Delegate to any pre-existing inline reveal implementation
      if (typeof global.__legacy_showCompetitionReveal === 'function') {
        return global.__legacy_showCompetitionReveal(title, scoresMap, ids);
      }
      // Fallback: log placement-only summary
      global.logScoreboard(title, scoresMap, ids);
    };
  }

  // ── showResultsPopup ─────────────────────────────────────────────────────
  /**
   * Legacy: show the results modal popup.
   * Adapter: delegates to original implementation if present; otherwise logs placements.
   */
  if (typeof global.showResultsPopup !== 'function') {
    global.showResultsPopup = async function showResultsPopup(options) {
      _deprecate('showResultsPopup');
      if (typeof global.__legacy_showResultsPopup === 'function') {
        return global.__legacy_showResultsPopup(options);
      }
      var mgr = _getManager();
      var placements = mgr ? mgr.getPlacements() : [];
      console.info('[legacy-adapter] showResultsPopup — placements:', JSON.stringify(placements));
    };
  }

}(typeof window !== 'undefined' ? window : global));
