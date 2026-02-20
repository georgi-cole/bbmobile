// MODULE: minigames/score-pipeline.js
// Score Pipeline v2: Canonical scoring pipeline wrapping central-scoring.js.
// Provides normalizeScore, toDisplayScore, generateCompetitionScores, buildStandings.
// Feature-flagged via window.game.cfg.scoringPipeline.useV2 === true.
// Backward-compat alias: window.MinigameScoring = window.MinigameScoring || window.ScorePipeline

(function(g) {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────

  /** Internal score scale: all pipeline scores are in 0-1000. */
  const INTERNAL_SCALE = 1000;

  /** Display scale: toDisplayScore() converts to 0.0-100.0 (1 decimal). */
  const DISPLAY_SCALE = 100.0;

  /** Canonical game type identifiers (mirrors registry .scoring field). */
  const GAME_TYPES = {
    ACCURACY:  'accuracy',
    TIME:      'time',
    HYBRID:    'hybrid',
    ENDURANCE: 'endurance'
  };

  // ─── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Derive a deterministic RNG seed array from competition context.
   * Uses SeededRNG.seedFrom when available; falls back to string parts.
   * @param {string} compType
   * @param {number} [week]
   * @param {*}      [humanId]
   * @returns {Array} seedParts array suitable for SeededRNG.create()
   */
  function makeCompSeed(compType, week, humanId) {
    if (g.SeededRNG && typeof g.SeededRNG.seedFrom === 'function') {
      return [g.SeededRNG.seedFrom(compType, week, humanId)];
    }
    const gGame = g.game || {};
    return [String(compType), String(week || gGame.week || 1), String(humanId != null ? humanId : (gGame.humanId != null ? gGame.humanId : 0))];
  }

  // ─── ScorePipeline ────────────────────────────────────────────────────────

  var ScorePipeline = {
    INTERNAL_SCALE: INTERNAL_SCALE,
    DISPLAY_SCALE:  DISPLAY_SCALE,
    GAME_TYPES:     GAME_TYPES,

    /**
     * Normalize a raw game score to the internal scale (0-1000).
     * Delegates to window.MinigameScoring when available; uses simple linear
     * fallback otherwise.  Handles all GAME_TYPES.
     *
     * @param {number|Object} raw        Raw score value, or {correct,total,timeMs}
     *                                   for hybrid scoring.
     * @param {Object}        gameConfig Registry entry or ad-hoc config:
     *   .scoring / .type  - one of GAME_TYPES (default: 'accuracy')
     *   .minScore         - raw min (default 0)
     *   .maxScore         - raw max (default 100)
     *   .targetTimeMs     - ideal time for TIME/HYBRID
     *   .maxTimeMs        - ceiling for TIME
     *   .targetDurationMs - ideal hold duration for ENDURANCE
     *   .minDurationMs    - floor for ENDURANCE
     *   .accuracyWeight   - accuracy weight for HYBRID (default 0.6)
     * @returns {number} Score in 0-1000.
     */
    normalizeScore: function(raw, gameConfig) {
      var cfg  = gameConfig || {};
      var ms   = g.MinigameScoring;
      var type = cfg.scoring || cfg.type || GAME_TYPES.ACCURACY;

      if (type === GAME_TYPES.ENDURANCE) {
        if (ms && typeof ms.normalizeEndurance === 'function') {
          return ms.normalizeEndurance(raw, cfg.targetDurationMs, cfg.minDurationMs);
        }
        var target  = cfg.targetDurationMs || 30000;
        var clamped = Math.max(0, Math.min(target, raw || 0));
        return Math.round((clamped / target) * INTERNAL_SCALE);
      }

      if (type === GAME_TYPES.TIME) {
        if (ms && typeof ms.normalizeTime === 'function') {
          return ms.normalizeTime(raw, cfg.targetTimeMs, cfg.maxTimeMs);
        }
        return INTERNAL_SCALE; // fallback: perfect score
      }

      if (type === GAME_TYPES.HYBRID) {
        if (ms && typeof ms.normalizeHybrid === 'function') {
          var params = (raw && typeof raw === 'object') ? raw : {};
          return ms.normalizeHybrid(Object.assign(
            { targetTimeMs: cfg.targetTimeMs, accuracyWeight: cfg.accuracyWeight },
            params
          ));
        }
        return Math.round(INTERNAL_SCALE / 2);
      }

      // Default: accuracy / linear normalization
      var minScore = cfg.minScore !== undefined ? cfg.minScore : 0;
      var maxScore = cfg.maxScore !== undefined ? cfg.maxScore : 100;
      if (ms && typeof ms.normalize === 'function') {
        return ms.normalize(raw, minScore, maxScore);
      }
      if (maxScore === minScore) return Math.round(INTERNAL_SCALE / 2);
      var cl = Math.max(minScore, Math.min(maxScore, raw || 0));
      return Math.round(((cl - minScore) / (maxScore - minScore)) * INTERNAL_SCALE);
    },

    /**
     * Convert an internal-scale score (0-1000) to display format (0.0-100.0, 1 decimal).
     * @param {number} internalScore
     * @returns {number} e.g. 87.3
     */
    toDisplayScore: function(internalScore) {
      var clamped = Math.max(0, Math.min(INTERNAL_SCALE, internalScore || 0));
      return Math.round(clamped / INTERNAL_SCALE * DISPLAY_SCALE * 10) / 10;
    },

    /**
     * Deterministically generate all opponent scores for a competition.
     * Wraps window.MinigameScoring.generateOpponentScoresForCompetition and
     * respects any authoritativeWinner (endurance games).
     *
     * @param {Object}  params
     * @param {number}  params.humanScore                 Human score, internal scale (0-1000).
     * @param {*}       params.humanId                   Human player ID.
     * @param {Array}   params.opponents                 [{id, compBeast?, persona?}, …]
     * @param {string}  [params.compType='hoh']
     * @param {Array}   [params.seedParts]               Seed array; defaults from game state.
     * @param {*}       [params.authoritativeWinnerId]   ID of endurance winner; skipped in generation.
     * @param {number}  [params.authoritativeWinnerScore] Their score (internal scale).
     * @param {number}  [params.difficultyMultiplier=1.0]
     * @param {boolean} [params.humanSkipped=false]
     * @returns {Array} [[id, internalScore], …] for each non-authoritative opponent.
     */
    generateCompetitionScores: function(params) {
      var ms = g.MinigameScoring;
      if (!ms || typeof ms.generateOpponentScoresForCompetition !== 'function') return [];

      var p                    = params || {};
      var humanScore           = p.humanScore || 0;
      var humanId              = p.humanId;
      var opponents            = p.opponents || [];
      var compType             = p.compType || 'hoh';
      var authoritativeWinnerId    = p.authoritativeWinnerId    != null ? p.authoritativeWinnerId    : null;
      var authoritativeWinnerScore = p.authoritativeWinnerScore != null ? p.authoritativeWinnerScore : null;
      var difficultyMultiplier = p.difficultyMultiplier != null ? p.difficultyMultiplier : 1.0;
      var humanSkipped         = !!p.humanSkipped;
      var gGame                = g.game || {};
      var seedParts            = p.seedParts || makeCompSeed(compType, gGame.week, gGame.humanId);

      return ms.generateOpponentScoresForCompetition(humanScore, humanId, opponents, {
        seedParts:                seedParts,
        compType:                 compType,
        authoritativeWinnerId:    authoritativeWinnerId,
        authoritativeWinnerScore: authoritativeWinnerScore,
        difficultyMultiplier:     difficultyMultiplier,
        humanSkipped:             humanSkipped
      });
    },

    /**
     * Build a sorted standings array from a scores map.
     *
     * @param {Map|Object} scoresMap   Map<id, internalScore> or plain object.
     * @param {Object}     [opts]
     * @param {number}     [opts.maxResults]  Limit output to top N.
     * @param {boolean}    [opts.endurance]   When true, non-winner displayScores are 0
     *                                         (endurance "last-person-standing" display).
     * @returns {Array} [{rank, id, score, displayScore}, …] sorted by score descending.
     */
    buildStandings: function(scoresMap, opts) {
      var options = opts || {};
      var entries;
      if (scoresMap instanceof Map) {
        entries = Array.from(scoresMap.entries());
      } else {
        entries = Object.keys(scoresMap || {}).map(function(k) { return [k, +(scoresMap[k])]; });
      }

      entries.sort(function(a, b) { return b[1] - a[1]; });

      var limit = options.maxResults ? Math.min(options.maxResults, entries.length) : entries.length;
      var standings = [];
      for (var i = 0; i < limit; i++) {
        var id    = entries[i][0];
        var score = entries[i][1];
        standings.push({
          rank:         i + 1,
          id:           id,
          score:        score,
          displayScore: (options.endurance && i > 0) ? 0 : this.toDisplayScore(score)
        });
      }
      return standings;
    }
  };

  // ─── Exports ──────────────────────────────────────────────────────────────

  g.ScorePipeline = ScorePipeline;

  // Backward-compat alias: keep existing MinigameScoring if already loaded;
  // otherwise make MinigameScoring an alias so legacy callers keep working.
  g.MinigameScoring = g.MinigameScoring || ScorePipeline;

  console.info('[ScorePipeline] Module loaded – INTERNAL_SCALE:', INTERNAL_SCALE, 'DISPLAY_SCALE:', DISPLAY_SCALE);

})(window);
