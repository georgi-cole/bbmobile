// MODULE: utils/seeded-rng.js
// Seeded RNG utility using mulberry32 PRNG for deterministic randomness.
// Provides SeededRNG.create(seedParts) and SeededRNG.seedFrom(...parts).
//
// Usage:
//   const rng = SeededRNG.create([week, phase, humanId]);
//   const val = rng.next(); // 0-1 float, deterministic
//
//   const seed = SeededRNG.seedFrom('hoh', 5, 'p1'); // hashed 32-bit seed

(function(g){
  'use strict';

  /**
   * Hash any number of parts into a single unsigned 32-bit seed.
   * Uses FNV-1a (Fowler–Noll–Vo) hash for good distribution.
   * @param {...*} parts - Values to hash (numbers, strings, anything stringify-able)
   * @returns {number} Unsigned 32-bit integer seed
   */
  function seedFrom(...parts) {
    let hash = 2166136261; // FNV-1a offset basis (32-bit)
    for (const part of parts) {
      const str = String(part == null ? '' : part);
      for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0; // FNV prime, unsigned 32-bit
      }
    }
    return hash >>> 0;
  }

  /**
   * Create a mulberry32 seeded PRNG.
   * mulberry32 is fast, passes TestU01, and has a 2^32 period.
   *
   * @param {Array|number} seedParts - Array of parts to hash into a seed, or a single seed number
   * @returns {Object} RNG object: { next, range, choice, shuffle, getSeed }
   */
  function create(seedParts) {
    let seed;
    if (Array.isArray(seedParts)) {
      seed = seedFrom(...seedParts);
    } else {
      seed = (typeof seedParts === 'number') ? (seedParts >>> 0) : seedFrom(Date.now());
    }
    // Ensure non-zero seed (mulberry32 produces 0 for seed=0 on first call)
    if (seed === 0) seed = 1;

    // mulberry32 PRNG
    function next() {
      seed += 0x6D2B79F5;
      let z = seed;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Generate a random integer in [min, max)
     * @param {number} min - Inclusive lower bound
     * @param {number} max - Exclusive upper bound
     */
    function range(min, max) {
      return min + Math.floor(next() * (max - min));
    }

    /**
     * Pick a random element from an array
     * @param {Array} array
     */
    function choice(array) {
      if (!array || array.length === 0) return undefined;
      return array[range(0, array.length)];
    }

    /**
     * Return a shuffled copy of an array (Fisher-Yates)
     * @param {Array} array
     */
    function shuffle(array) {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = range(0, i + 1);
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    /** Return current internal state (useful for audit/replay) */
    function getSeed() { return seed; }

    return { next, range, choice, shuffle, getSeed };
  }

  // Export
  g.SeededRNG = { create, seedFrom };

  console.info('[SeededRNG] Module loaded - mulberry32 PRNG + FNV-1a seed hashing');

})(window);
