// MODULE: results-calculator.js
// Given performance records, produces an ordered array of placements.
// Tie-breaker: identical performances are resolved randomly via seeded RNG.

(function (global) {
  'use strict';

  /**
   * Seeded LCG random number generator.
   * @param {number} seed
   * @returns {function} () => [0, 1)
   */
  function makeRng(seed) {
    var state = (seed !== undefined && seed !== null) ? (seed >>> 0) : Math.floor(Math.random() * 4294967296);
    return function () {
      state = ((state * 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  var ResultsCalculator = {
    /**
     * Compute placements from performance records.
     *
     * @param {Array}  performances  [{playerId, performance}]
     * @param {object} config        { order: 'desc'|'asc', rngSeed: number|undefined }
     * @returns {Array} [{playerId, placement}] sorted by placement ASC
     */
    calculate: function (performances, config) {
      if (!Array.isArray(performances) || performances.length === 0) return [];

      var order = (config && config.order === 'asc') ? 'asc' : 'desc';
      var rng = makeRng(config && config.rngSeed);

      // Filter out entries with missing playerId
      var valid = performances.filter(function (p) {
        return p != null && p.playerId !== undefined && p.playerId !== null;
      });

      if (valid.length === 0) return [];

      // Sort: primary by performance, secondary by random (tie-break)
      // Attach a random key per entry so ties resolve consistently within this call
      var tagged = valid.map(function (p) {
        return { playerId: p.playerId, performance: p.performance, _r: rng() };
      });

      tagged.sort(function (a, b) {
        var pa = (a.performance === undefined || a.performance === null) ? (order === 'desc' ? -Infinity : Infinity) : a.performance;
        var pb = (b.performance === undefined || b.performance === null) ? (order === 'desc' ? -Infinity : Infinity) : b.performance;

        if (pa !== pb) {
          return order === 'desc' ? pb - pa : pa - pb;
        }
        // Tie: use random key for deterministic-random ordering
        return a._r - b._r;
      });

      // Assign placements (dense ranking: tied players already in random order so each gets a unique placement)
      return tagged.map(function (entry, idx) {
        return { playerId: entry.playerId, placement: idx + 1 };
      });
    }
  };

  global.ResultsCalculator = ResultsCalculator;

}(typeof window !== 'undefined' ? window : global));
