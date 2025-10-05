// MODULE: minigames/scoring.js
// Scoring normalization system for fair competition across all minigames
// Maps all game results to a standard 0-100 scale

(function(g){
  'use strict';

  /**
   * Normalize a raw score to 0-100 scale
   * @param {number} rawScore - The raw score from the game
   * @param {number} minScore - Minimum possible score (default 0)
   * @param {number} maxScore - Maximum possible score (default 100)
   * @returns {number} Normalized score (0-100)
   */
  function normalize(rawScore, minScore = 0, maxScore = 100){
    if(maxScore === minScore){
      console.warn('[MinigameScoring] maxScore equals minScore, returning 50');
      return 50;
    }
    
    // Clamp to valid range
    const clamped = Math.max(minScore, Math.min(maxScore, rawScore));
    
    // Normalize to 0-100
    const normalized = ((clamped - minScore) / (maxScore - minScore)) * 100;
    
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * Normalize time-based score (lower time = higher score)
   * @param {number} timeMs - Time in milliseconds
   * @param {number} targetTimeMs - Target/ideal time (default 1000ms)
   * @param {number} maxTimeMs - Maximum time for minimum score (default 5000ms)
   * @returns {number} Normalized score (0-100)
   */
  function normalizeTime(timeMs, targetTimeMs = 1000, maxTimeMs = 5000){
    if(timeMs <= targetTimeMs){
      // Perfect or better than target = 100
      return 100;
    }
    
    if(timeMs >= maxTimeMs){
      // At or beyond max time = minimum score
      return 20; // Give some points for completing
    }
    
    // Exponential decay: score drops faster as time increases
    // Score = 100 * e^(-k * (time - target))
    // At maxTime, score should be ~20
    const k = Math.log(100 / 20) / (maxTimeMs - targetTimeMs);
    const score = 100 * Math.exp(-k * (timeMs - targetTimeMs));
    
    return Math.max(20, Math.min(100, score));
  }

  /**
   * Normalize accuracy-based score
   * @param {number} correct - Number of correct answers
   * @param {number} total - Total number of questions/items
   * @param {boolean} penalizeIncorrect - Whether incorrect answers reduce score
   * @param {number} incorrect - Number of incorrect answers (if penalizing)
   * @returns {number} Normalized score (0-100)
   */
  function normalizeAccuracy(correct, total, penalizeIncorrect = false, incorrect = 0){
    if(total === 0){
      console.warn('[MinigameScoring] Total is 0, returning 0');
      return 0;
    }
    
    let baseScore = (correct / total) * 100;
    
    if(penalizeIncorrect && incorrect > 0){
      // Subtract percentage for incorrect answers
      const penalty = (incorrect / total) * 20; // Max 20% penalty
      baseScore = Math.max(0, baseScore - penalty);
    }
    
    return Math.max(0, Math.min(100, baseScore));
  }

  /**
   * Normalize hybrid score (combines time and accuracy)
   * @param {Object} params - Scoring parameters
   * @param {number} params.correct - Correct answers
   * @param {number} params.total - Total questions
   * @param {number} params.timeMs - Time taken
   * @param {number} params.targetTimeMs - Target time per question
   * @param {number} params.accuracyWeight - Weight for accuracy (0-1, default 0.6)
   * @returns {number} Normalized score (0-100)
   */
  function normalizeHybrid(params){
    const {
      correct,
      total,
      timeMs,
      targetTimeMs = 1000,
      accuracyWeight = 0.6
    } = params;
    
    const accuracyScore = normalizeAccuracy(correct, total);
    const timeScore = normalizeTime(timeMs, targetTimeMs * total, targetTimeMs * total * 2);
    
    const timeWeight = 1 - accuracyWeight;
    const hybridScore = (accuracyScore * accuracyWeight) + (timeScore * timeWeight);
    
    return Math.max(0, Math.min(100, hybridScore));
  }

  /**
   * Normalize endurance score (longer duration = higher score)
   * @param {number} durationMs - Duration lasted in milliseconds
   * @param {number} targetDurationMs - Target duration for full score (default 30000ms)
   * @param {number} minDurationMs - Minimum duration for any points (default 1000ms)
   * @returns {number} Normalized score (0-100)
   */
  function normalizeEndurance(durationMs, targetDurationMs = 30000, minDurationMs = 1000){
    if(durationMs <= minDurationMs){
      // Too short = minimal points
      return Math.max(0, (durationMs / minDurationMs) * 10);
    }
    
    if(durationMs >= targetDurationMs){
      // Met or exceeded target = 100
      return 100;
    }
    
    // Linear scaling between min and target
    const progress = (durationMs - minDurationMs) / (targetDurationMs - minDurationMs);
    const score = 10 + (progress * 90); // Scale from 10 to 100
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get scoring strategy for a game
   * @param {string} gameKey - The game key
   * @returns {Object} Scoring strategy info
   */
  function getScoringStrategy(gameKey){
    const registry = g.MinigameRegistry;
    if(!registry){
      console.warn('[MinigameScoring] MinigameRegistry not available');
      return { type: 'accuracy', normalizer: normalize };
    }
    
    const game = registry.getGame(gameKey);
    if(!game){
      console.warn('[MinigameScoring] Game not found:', gameKey);
      return { type: 'accuracy', normalizer: normalize };
    }
    
    // Map scoring type to normalizer function
    const strategies = {
      'time': normalizeTime,
      'accuracy': normalizeAccuracy,
      'hybrid': normalizeHybrid,
      'endurance': normalizeEndurance
    };
    
    return {
      type: game.scoring || 'accuracy',
      normalizer: strategies[game.scoring] || normalize,
      minScore: game.minScore || 0,
      maxScore: game.maxScore || 100
    };
  }

  /**
   * Apply competitive multiplier (based on player's compBeast stat)
   * @param {number} baseScore - The normalized base score (0-100)
   * @param {number} compBeast - Player's competition beast rating (0-1)
   * @param {number} difficultyMultiplier - Additional difficulty adjustment (default 1.0)
   * @returns {number} Final score with multiplier applied
   */
  function applyCompetitiveMultiplier(baseScore, compBeast = 0.5, difficultyMultiplier = 1.0){
    // Base multiplier from compBeast: 0.75 to 1.25
    const compMultiplier = 0.75 + (compBeast * 0.5);
    
    // Apply both multipliers
    const finalMultiplier = compMultiplier * difficultyMultiplier;
    
    // Apply multiplier and clamp to reasonable range (0-150)
    const finalScore = baseScore * finalMultiplier;
    
    return Math.max(0, Math.min(150, finalScore));
  }

  /**
   * Calculate final competition score with all modifiers
   * @param {Object} params - Scoring parameters
   * @param {number} params.rawScore - Raw game score
   * @param {string} params.gameKey - Game identifier
   * @param {number} params.compBeast - Player's competition beast rating
   * @param {number} params.difficultyMultiplier - Difficulty adjustment
   * @param {Object} params.customNormalization - Custom normalization params (optional)
   * @returns {number} Final competition score
   */
  function calculateFinalScore(params){
    const {
      rawScore,
      gameKey,
      compBeast = 0.5,
      difficultyMultiplier = 1.0,
      customNormalization = null
    } = params;
    
    // Get scoring strategy for this game
    const strategy = getScoringStrategy(gameKey);
    
    // Normalize score to 0-100
    let normalizedScore;
    if(customNormalization){
      // Use custom normalization if provided
      normalizedScore = normalize(rawScore, 
                                   customNormalization.minScore || 0,
                                   customNormalization.maxScore || 100);
    } else if(strategy.type === 'accuracy' || !customNormalization){
      // Default normalization
      normalizedScore = normalize(rawScore, strategy.minScore, strategy.maxScore);
    } else {
      // Use game's specific normalizer
      normalizedScore = rawScore; // Assume already normalized by game
    }
    
    // Apply competitive multipliers
    const finalScore = applyCompetitiveMultiplier(normalizedScore, compBeast, difficultyMultiplier);
    
    return finalScore;
  }

  // Export API
  g.MinigameScoring = {
    normalize,
    normalizeTime,
    normalizeAccuracy,
    normalizeHybrid,
    normalizeEndurance,
    getScoringStrategy,
    applyCompetitiveMultiplier,
    calculateFinalScore
  };

})(window);
