// MODULE: bbSeededRng.js
// Seeded random number generator for deterministic randomness

(function(g){
  'use strict';

  function createSeededRng(seed){
    let state = seed || Math.floor(Math.random() * 1e9);
    
    // Simple LCG implementation
    function next(){
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    }

    function range(min, max){
      return min + Math.floor(next() * (max - min));
    }

    function choice(array){
      if(!array || array.length === 0) return undefined;
      return array[range(0, array.length)];
    }

    function shuffle(array){
      const result = [...array];
      for(let i = result.length - 1; i > 0; i--){
        const j = range(0, i + 1);
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    function setSeed(newSeed){
      state = newSeed;
    }

    function getSeed(){
      return state;
    }

    return {
      next,
      range,
      choice,
      shuffle,
      setSeed,
      getSeed
    };
  }

  // Export API
  g.bbSeededRng = createSeededRng;

})(window);
