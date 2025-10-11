// MODULE: minigames/opponent-synth.js
// Synthetic opponent score generation for minigame competitions
// Generates seeded, plausible AI opponent scores after human completion
// Targets ~20% human win rate using Beta distribution

(function(g){
  'use strict';

  // Target human win rate (20% = 1 win in 5 competitions on average)
  const TARGET_WIN_RATE = 0.20;

  /**
   * Generate Beta distribution random variable
   * Uses acceptance-rejection method for simplicity
   * Beta(alpha, beta) generates values in [0, 1]
   * 
   * @param {number} alpha - Shape parameter (>0)
   * @param {number} beta - Shape parameter (>0)
   * @param {function} rng - Random number generator function
   * @returns {number} Random value from Beta(alpha, beta) distribution
   */
  function betaRandom(alpha, beta, rng){
    // Use Gamma ratio method for better accuracy
    // Beta(a,b) = Gamma(a) / (Gamma(a) + Gamma(b))
    
    function gammaRandom(shape){
      // Marsaglia and Tsang method for Gamma distribution
      if(shape < 1){
        return gammaRandom(shape + 1) * Math.pow(rng(), 1 / shape);
      }
      
      const d = shape - 1/3;
      const c = 1 / Math.sqrt(9 * d);
      
      while(true){
        let x, v;
        do {
          x = normalRandom(rng);
          v = 1 + c * x;
        } while(v <= 0);
        
        v = v * v * v;
        const u = rng();
        const x2 = x * x;
        
        if(u < 1 - 0.0331 * x2 * x2){
          return d * v;
        }
        if(Math.log(u) < 0.5 * x2 + d * (1 - v + Math.log(v))){
          return d * v;
        }
      }
    }
    
    function normalRandom(rng){
      // Box-Muller transform
      const u1 = rng();
      const u2 = rng();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    
    const x = gammaRandom(alpha);
    const y = gammaRandom(beta);
    return x / (x + y);
  }

  /**
   * Generate synthetic opponent scores for a competition
   * Uses Beta distribution to control win probability
   * 
   * @param {Object} options - Configuration options
   * @param {number} options.humanScore - Human player's score (0-100)
   * @param {Array} options.opponents - Array of opponent player objects {id, compBeast, persona}
   * @param {string} options.gameKey - Key of the minigame being played
   * @param {number} options.seed - Seed for deterministic RNG
   * @param {number} options.targetWinRate - Target win rate for human (default 0.20)
   * @returns {Map} Map of opponent ID to score
   */
  function generate(options){
    const {
      humanScore,
      opponents,
      gameKey = 'unknown',
      seed,
      targetWinRate = TARGET_WIN_RATE
    } = options;

    if(!opponents || opponents.length === 0){
      return new Map();
    }

    // Initialize seeded RNG
    const rng = seed !== undefined ? g.bbSeededRng(seed) : g.bbSeededRng(Date.now());
    const random = () => rng.next();

    // Get game metadata for score bounds
    const gameMetadata = getGameMetadata(gameKey);
    const minScore = gameMetadata.minScore;
    const maxScore = gameMetadata.maxScore;

    // Calculate Beta distribution parameters
    // For 20% win rate: Beta(2, 8) gives mean = 2/(2+8) = 0.2
    // We'll shift and scale this to create opponent scores relative to human
    const betaAlpha = targetWinRate * 10;
    const betaBeta = (1 - targetWinRate) * 10;

    const scores = new Map();

    for(const opponent of opponents){
      // Generate base win probability for this opponent using Beta distribution
      const winProb = betaRandom(betaAlpha, betaBeta, random);
      
      // Convert win probability to score relative to human
      // If winProb is high, opponent should score higher than human
      // Add some variance based on opponent's compBeast stat
      const compBeastFactor = opponent.compBeast || 0.5;
      const variance = (random() - 0.5) * 0.15; // ±7.5% variance
      
      // Calculate opponent score based on win probability
      let opponentScore;
      if(winProb > 0.5){
        // Opponent should beat human
        const margin = 5 + random() * 15; // 5-20 point margin
        opponentScore = humanScore + margin;
      } else {
        // Opponent should lose to human
        const margin = 5 + random() * 15; // 5-20 point margin
        opponentScore = humanScore - margin;
      }
      
      // Apply compBeast multiplier (0.2 - 0.9 range)
      const compMultiplier = 0.85 + compBeastFactor * 0.3 + variance;
      opponentScore *= compMultiplier;
      
      // Apply persona adjustments
      opponentScore = applyPersonaAdjustment(opponentScore, opponent.persona, random);
      
      // Clamp to valid game bounds
      opponentScore = Math.max(minScore, Math.min(maxScore, opponentScore));
      
      // Round to 1 decimal place
      opponentScore = Math.round(opponentScore * 10) / 10;
      
      scores.set(opponent.id, opponentScore);
    }

    return scores;
  }

  /**
   * Get game metadata including score bounds
   * 
   * @param {string} gameKey - Game key
   * @returns {Object} Game metadata {minScore, maxScore}
   */
  function getGameMetadata(gameKey){
    const Registry = g.MinigameRegistry || g.MiniGamesRegistry;
    
    if(Registry && typeof Registry.getGame === 'function'){
      const game = Registry.getGame(gameKey);
      if(game){
        return {
          minScore: game.minScore || 0,
          maxScore: game.maxScore || 100
        };
      }
    }
    
    // Fallback to standard bounds
    return { minScore: 0, maxScore: 100 };
  }

  /**
   * Apply persona-based adjustments to score
   * Personas affect score variability and consistency
   * 
   * @param {number} baseScore - Base calculated score
   * @param {Object} persona - Player persona {aggr, loyalty, chaos}
   * @param {function} random - RNG function
   * @returns {number} Adjusted score
   */
  function applyPersonaAdjustment(baseScore, persona, random){
    if(!persona){
      return baseScore;
    }
    
    let adjusted = baseScore;
    
    // High aggression = higher risk/reward (more variance)
    if(persona.aggr > 0.7){
      const swing = (random() - 0.5) * 20; // ±10 point swing
      adjusted += swing;
    }
    
    // Low chaos = more consistent (less variance)
    if(persona.chaos < 0.3){
      // Pull towards mean, reducing variance
      const mean = 50;
      adjusted = adjusted * 0.9 + mean * 0.1;
    }
    
    // High chaos = more unpredictable
    if(persona.chaos > 0.7){
      const wildSwing = (random() - 0.5) * 30; // ±15 point swing
      adjusted += wildSwing;
    }
    
    return adjusted;
  }

  /**
   * Calculate expected win rate based on human score relative to opponents
   * Useful for validating the distribution is working correctly
   * 
   * @param {number} humanScore - Human player's score
   * @param {Map} opponentScores - Map of opponent scores
   * @returns {number} Expected win rate (0-1)
   */
  function calculateWinRate(humanScore, opponentScores){
    if(!opponentScores || opponentScores.size === 0){
      return 1.0;
    }
    
    let beatCount = 0;
    for(const [, score] of opponentScores){
      if(humanScore > score){
        beatCount++;
      }
    }
    
    return beatCount / opponentScores.size;
  }

  // Export API
  g.OpponentSynth = {
    generate,
    calculateWinRate,
    TARGET_WIN_RATE
  };

  console.info('[OpponentSynth] Module loaded - Target win rate:', TARGET_WIN_RATE);

})(window);
