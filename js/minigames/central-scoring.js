// MODULE: minigames/central-scoring.js
// Centralized scoring and opponent synthesis system for all minigames
// Provides unified scoring normalization, win determination, and AI opponent generation

(function(g){
  'use strict';

  // ============================================================================
  // CONSTANTS
  // ============================================================================
  
  const SCALE = 1000; // New scoring scale: 0-1000 (was 0-100)
  
  const DEFAULT_WIN_CHANCES = {
    hoh: 0.20,  // 20% win chance for HOH competitions
    pov: 0.30   // 30% win chance for POV competitions
  };

  // ============================================================================
  // MinigameScoring - Score normalization and calculation
  // ============================================================================
  
  const MinigameScoring = {
    SCALE,
    
    /**
     * Normalize a raw score to 0-1000 scale
     * @param {number} rawScore - The raw score from the game
     * @param {number} minScore - Minimum possible score (default 0)
     * @param {number} maxScore - Maximum possible score (default 100)
     * @returns {number} Normalized score (0-1000)
     */
    normalize(rawScore, minScore = 0, maxScore = 100){
      if(maxScore === minScore){
        console.warn('[MinigameScoring] maxScore equals minScore, returning middle value');
        return SCALE / 2;
      }
      
      // Clamp to valid range
      const clamped = Math.max(minScore, Math.min(maxScore, rawScore));
      
      // Normalize to 0-1000
      const normalized = ((clamped - minScore) / (maxScore - minScore)) * SCALE;
      
      return Math.max(0, Math.min(SCALE, normalized));
    },

    /**
     * Normalize time-based score (lower time = higher score)
     * @param {number} timeMs - Time in milliseconds
     * @param {number} targetTimeMs - Target/ideal time (default 1000ms)
     * @param {number} maxTimeMs - Maximum time for minimum score (default 5000ms)
     * @returns {number} Normalized score (0-1000)
     */
    normalizeTime(timeMs, targetTimeMs = 1000, maxTimeMs = 5000){
      if(timeMs <= targetTimeMs){
        // Perfect or better than target = 1000
        return SCALE;
      }
      
      if(timeMs >= maxTimeMs){
        // At or beyond max time = minimum score (20% of scale)
        return Math.round(SCALE * 0.20);
      }
      
      // Exponential decay: score drops faster as time increases
      const k = Math.log(SCALE / (SCALE * 0.20)) / (maxTimeMs - targetTimeMs);
      const score = SCALE * Math.exp(-k * (timeMs - targetTimeMs));
      
      return Math.round(Math.max(SCALE * 0.20, Math.min(SCALE, score)));
    },

    /**
     * Normalize accuracy-based score
     * @param {number} correct - Number of correct answers
     * @param {number} total - Total number of questions/items
     * @param {boolean} penalizeIncorrect - Whether incorrect answers reduce score
     * @param {number} incorrect - Number of incorrect answers (if penalizing)
     * @returns {number} Normalized score (0-1000)
     */
    normalizeAccuracy(correct, total, penalizeIncorrect = false, incorrect = 0){
      if(total === 0){
        console.warn('[MinigameScoring] Total is 0, returning 0');
        return 0;
      }
      
      let baseScore = (correct / total) * SCALE;
      
      if(penalizeIncorrect && incorrect > 0){
        // Subtract percentage for incorrect answers (max 20% penalty)
        const penalty = (incorrect / total) * SCALE * 0.20;
        baseScore = Math.max(0, baseScore - penalty);
      }
      
      return Math.round(Math.max(0, Math.min(SCALE, baseScore)));
    },

    /**
     * Normalize hybrid score (combines time and accuracy)
     * @param {Object} params - Scoring parameters
     * @param {number} params.correct - Correct answers
     * @param {number} params.total - Total questions
     * @param {number} params.timeMs - Time taken
     * @param {number} params.targetTimeMs - Target time per question
     * @param {number} params.accuracyWeight - Weight for accuracy (0-1, default 0.6)
     * @returns {number} Normalized score (0-1000)
     */
    normalizeHybrid(params){
      const {
        correct,
        total,
        timeMs,
        targetTimeMs = 1000,
        accuracyWeight = 0.6
      } = params;
      
      const accuracyScore = this.normalizeAccuracy(correct, total);
      const timeScore = this.normalizeTime(timeMs, targetTimeMs * total, targetTimeMs * total * 2);
      
      const timeWeight = 1 - accuracyWeight;
      const hybridScore = (accuracyScore * accuracyWeight) + (timeScore * timeWeight);
      
      return Math.round(Math.max(0, Math.min(SCALE, hybridScore)));
    },

    /**
     * Normalize endurance score (longer duration = higher score)
     * @param {number} durationMs - Duration lasted in milliseconds
     * @param {number} targetDurationMs - Target duration for full score (default 30000ms)
     * @param {number} minDurationMs - Minimum duration for any points (default 1000ms)
     * @returns {number} Normalized score (0-1000)
     */
    normalizeEndurance(durationMs, targetDurationMs = 30000, minDurationMs = 1000){
      if(durationMs <= minDurationMs){
        // Too short = minimal points (10% of scale)
        return Math.round(Math.max(0, (durationMs / minDurationMs) * SCALE * 0.10));
      }
      
      if(durationMs >= targetDurationMs){
        // Met or exceeded target = 1000
        return SCALE;
      }
      
      // Linear scaling between min and target
      const progress = (durationMs - minDurationMs) / (targetDurationMs - minDurationMs);
      const score = (SCALE * 0.10) + (progress * (SCALE * 0.90)); // Scale from 100 to 1000
      
      return Math.round(Math.max(0, Math.min(SCALE, score)));
    },

    /**
     * Calculate final competition score with all modifiers
     * @param {Object} params - Scoring parameters
     * @param {number} params.rawScore - Raw game score
     * @param {number} params.minScore - Minimum possible raw score (default 0)
     * @param {number} params.maxScore - Maximum possible raw score (default 100)
     * @param {number} params.compBeast - Player's competition beast rating (0-1 or 0-10)
     * @param {number} params.difficultyMultiplier - Difficulty adjustment (default 1.0)
     * @returns {number} Final competition score (0-1000)
     */
    calculateFinalScore(params){
      const {
        rawScore,
        minScore = 0,
        maxScore = 100,
        compBeast = 0.5,
        difficultyMultiplier = 1.0
      } = params;
      
      // Normalize raw score to 0-1000
      const normalizedScore = this.normalize(rawScore, minScore, maxScore);
      
      // Normalize compBeast to 0-1 range (handle both 0-1 and 0-10 scales)
      const normalizedCompBeast = compBeast > 1 ? compBeast / 10 : compBeast;
      
      // Apply competitive multiplier: base 0.75 to 1.25 based on compBeast
      const compMultiplier = 0.75 + (normalizedCompBeast * 0.5);
      
      // Apply both multipliers
      const finalMultiplier = compMultiplier * difficultyMultiplier;
      
      // Apply multiplier and clamp to scale (0-1500 max for exceptional performance)
      const finalScore = normalizedScore * finalMultiplier;
      
      return Math.round(Math.max(0, Math.min(SCALE * 1.5, finalScore)));
    }
  };

  // ============================================================================
  // GameUtils - Win determination and result logic
  // ============================================================================
  
  const GameUtils = {
    /**
     * Determine game result with phase-specific win probability
     * @param {boolean} playerSucceeded - Whether the player completed successfully
     * @param {string} phase - Competition phase ('hoh' or 'pov')
     * @param {Object} options - Additional options
     * @param {boolean} options.debugMode - If true, bypass win probability
     * @returns {boolean} Whether the player should win
     */
    determineGameResult(playerSucceeded, phase = 'hoh', options = {}){
      // If player failed, they never win
      if(!playerSucceeded){
        return false;
      }
      
      const { debugMode = false } = options;
      const cfg = (g.game && g.game.cfg) || g.cfg || {};
      
      // Check debug override
      if(debugMode || cfg.debugAlwaysWin === true){
        return true;
      }
      
      // Get phase-specific win chance from config
      const winChances = cfg.playerWinChances || DEFAULT_WIN_CHANCES;
      const winChance = winChances[phase] || winChances.hoh || DEFAULT_WIN_CHANCES.hoh;
      
      // Apply win probability
      const rng = g.rng || Math.random;
      return rng() < winChance;
    }
  };

  // ============================================================================
  // OpponentSynth - Synthetic opponent score generation
  // ============================================================================
  
  const OpponentSynth = {
    /**
     * Generate opponent scores for a competition
     * Produces realistic AI scores near the human's score with appropriate variance
     * 
     * @param {number} humanScore - Human player's final score (0-1000)
     * @param {Array} opponents - Array of opponent player objects {id, compBeast, persona}
     * @param {Object} options - Configuration options
     * @param {string} options.phase - Competition phase ('hoh' or 'pov')
     * @param {number} options.seed - Seed for deterministic RNG
     * @returns {Map} Map of opponent ID to score
     */
    generateOpponentScores(humanScore, opponents, options = {}){
      if(!opponents || opponents.length === 0){
        return new Map();
      }

      const { phase = 'hoh', seed } = options;
      const cfg = (g.game && g.game.cfg) || g.cfg || {};
      
      // Get phase-specific target win rate
      const winChances = cfg.playerWinChances || DEFAULT_WIN_CHANCES;
      const targetWinRate = winChances[phase] || DEFAULT_WIN_CHANCES.hoh;
      
      // Initialize seeded RNG
      const rng = seed !== undefined ? g.bbSeededRng(seed) : g.bbSeededRng(Date.now());
      const random = () => rng.next();

      // Calculate per-opponent beat probability to achieve target win rate
      // If we want P(beat all N opponents) = targetWinRate, then:
      // P(beat one opponent) = targetWinRate^(1/N)
      const numOpponents = opponents.length;
      const perOpponentBeatProb = Math.pow(targetWinRate, 1 / numOpponents);
      
      const scores = new Map();

      for(const opponent of opponents){
        // Generate random value to decide if human beats this opponent
        const randValue = random();
        const humanBeatsOpponent = randValue < perOpponentBeatProb;
        
        // Base score calculation with compBeast factor
        const compBeastFactor = opponent.compBeast || 0.5;
        
        // Normalize compBeast to 0-1 range
        const normalizedCompBeast = compBeastFactor > 1 ? compBeastFactor / 10 : compBeastFactor;
        
        // Calculate opponent score relative to human
        let opponentScore;
        if(humanBeatsOpponent){
          // Human wins: opponent scores below human
          const marginPct = 0.05 + random() * 0.15; // 5-20% below human
          opponentScore = humanScore * (1 - marginPct);
        } else {
          // Opponent wins: opponent scores above human
          const marginPct = 0.05 + random() * 0.15; // 5-20% above human
          opponentScore = humanScore * (1 + marginPct);
        }
        
        // Apply compBeast multiplier with variance
        const variance = (random() - 0.5) * 0.08; // ±4% variance
        const compMultiplier = 0.90 + normalizedCompBeast * 0.20 + variance;
        opponentScore *= compMultiplier;
        
        // Apply persona adjustments (smaller impact)
        opponentScore = this._applyPersonaAdjustment(opponentScore, opponent.persona, random);
        
        // Clamp to valid scale bounds
        opponentScore = Math.max(0, Math.min(SCALE * 1.5, opponentScore));
        
        // Round to whole number
        opponentScore = Math.round(opponentScore);
        
        scores.set(opponent.id, opponentScore);
      }

      return scores;
    },

    /**
     * Generate complete competition results (player + opponents)
     * @param {number} humanScore - Human player's final score
     * @param {string} humanId - Human player's ID
     * @param {Array} opponents - Array of opponent player objects
     * @param {Object} options - Configuration options
     * @returns {Object} Complete results {humanScore, opponentScores, rankings, didWin}
     */
    generateCompetitionResults(humanScore, humanId, opponents, options = {}){
      const opponentScores = this.generateOpponentScores(humanScore, opponents, options);
      
      // Build full results map
      const allScores = new Map([[humanId, humanScore], ...opponentScores]);
      
      // Calculate rankings
      const rankings = [...allScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, score], index) => ({ id, score, rank: index + 1 }));
      
      const humanRank = rankings.find(r => r.id === humanId)?.rank || 0;
      const didWin = humanRank === 1;
      
      return {
        humanScore,
        opponentScores,
        rankings,
        didWin,
        humanRank
      };
    },

    /**
     * Apply persona-based adjustments to score (internal helper)
     * @private
     */
    _applyPersonaAdjustment(baseScore, persona, random){
      if(!persona){
        return baseScore;
      }
      
      let adjusted = baseScore;
      
      // High chaos = more unpredictable (±5% swing)
      if(persona.chaos > 0.7){
        const wildSwing = (random() - 0.5) * SCALE * 0.10; // ±50 points
        adjusted += wildSwing;
      }
      
      // Low chaos = more consistent (pull toward mean slightly)
      if(persona.chaos < 0.3){
        const mean = SCALE / 2;
        adjusted = adjusted * 0.95 + mean * 0.05;
      }
      
      // High aggression = slight increase in variability (±3% swing)
      if(persona.aggr > 0.7){
        const swing = (random() - 0.5) * SCALE * 0.06; // ±30 points
        adjusted += swing;
      }
      
      return adjusted;
    }
  };

  // ============================================================================
  // EXPORTS
  // ============================================================================
  
  // Export unified API
  g.MinigameScoring = MinigameScoring;
  g.GameUtils = g.GameUtils || {}; // Preserve existing GameUtils if any
  Object.assign(g.GameUtils, GameUtils);
  g.OpponentSynth = OpponentSynth;

  console.info('[CentralScoring] Module loaded - SCALE:', SCALE, 'Default win chances:', DEFAULT_WIN_CHANCES);

})(window);
