// MODULE: ai-player.js
// Simulates AI player performance for competition placement purposes.
// Uses a seeded RNG for deterministic test output.
// Final history will only store resulting placements, NOT raw performance values.

(function (global) {
  'use strict';

  /**
   * Seeded LCG random number generator (same algorithm as results-calculator).
   * @param {number|undefined} seed
   * @returns {function} () => [0, 1)
   */
  function makeRng(seed) {
    var state = (seed !== undefined && seed !== null) ? (seed >>> 0) : Math.floor(Math.random() * 4294967296);
    return function () {
      state = ((state * 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  /**
   * Generate a performance value from a normal-ish distribution.
   * Uses Box-Muller-like approximation via sum of uniforms.
   * @param {function} rng   - uniform [0,1) source
   * @param {number}   mean  - target mean
   * @param {number}   sigma - target std deviation
   * @returns {number}
   */
  function normalApprox(rng, mean, sigma) {
    // Sum 6 uniforms → approximation of N(3, 0.5)
    var sum = 0;
    for (var i = 0; i < 6; i++) sum += rng();
    // sum ≈ N(3, √(6·(1/12))) = N(3, ~0.707)
    var z = (sum - 3) / 0.707;
    return mean + z * sigma;
  }

  /**
   * Difficulty multipliers: maps difficulty to (mean, sigma) of performance range [0, 100].
   */
  var DIFFICULTY_PROFILES = {
    easy:   { mean: 75, sigma: 10 },
    medium: { mean: 55, sigma: 15 },
    hard:   { mean: 35, sigma: 12 }
  };

  var AIPlayer = {
    /**
     * Generate a performance value for an AI player.
     *
     * @param {object} options
     *   playerId   {string|number} - identifier for the AI player
     *   difficulty {string}        - 'easy' | 'medium' | 'hard' (default: 'medium')
     *   rngSeed    {number}        - optional seed for deterministic output
     * @returns {{ playerId, performance }}
     *   performance is a numeric metric (higher = better by default).
     *   Raw performance is NOT stored in history; only the resulting placement is.
     */
    generatePerformance: function (options) {
      var opts = options || {};
      var playerId = opts.playerId !== undefined ? opts.playerId : ('ai_' + Math.floor(Math.random() * 10000));
      var difficulty = DIFFICULTY_PROFILES[opts.difficulty] || DIFFICULTY_PROFILES.medium;
      var rng = makeRng(opts.rngSeed);

      var raw = normalApprox(rng, difficulty.mean, difficulty.sigma);
      // Clamp to [0, 100]
      var performance = Math.max(0, Math.min(100, Math.round(raw)));

      return { playerId: playerId, performance: performance };
    },

    /**
     * Generate performances for multiple AI players.
     *
     * @param {Array}  playerIds  - array of player IDs
     * @param {object} options    - { difficulty, rngSeed }
     * @returns {Array} [{playerId, performance}]
     */
    generatePerformances: function (playerIds, options) {
      var opts = options || {};
      if (!Array.isArray(playerIds) || playerIds.length === 0) return [];

      // Use a master RNG seeded once, then derive per-player seeds so order doesn't affect individual results
      var masterRng = makeRng(opts.rngSeed);

      return playerIds.map(function (id) {
        var playerSeed = (opts.rngSeed !== undefined && opts.rngSeed !== null)
          ? (opts.rngSeed ^ _hashId(id))
          : undefined;
        return AIPlayer.generatePerformance({
          playerId: id,
          difficulty: opts.difficulty,
          rngSeed: playerSeed
        });
      });
    }
  };

  /** Simple deterministic integer hash for string/number IDs */
  function _hashId(id) {
    var str = String(id);
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return (h >>> 0);
  }

  global.AIPlayer = AIPlayer;

}(typeof window !== 'undefined' ? window : global));
