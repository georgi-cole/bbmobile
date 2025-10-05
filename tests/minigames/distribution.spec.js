/**
 * Distribution simulation tests for minigames
 * Tests fairness and balance of:
 * - Selection distribution (non-repetition)
 * - Score normalization
 * - Performance metrics
 */

(function(g){
  'use strict';

  /**
   * Run selection distribution simulation
   * Tests that all games are selected fairly over N competitions
   * @param {number} competitions - Number of competitions to simulate
   * @returns {Object} Distribution results
   */
  function simulateSelectionDistribution(competitions = 100){
    console.log(`🎲 Simulating ${competitions} competitions...\n`);

    if(!g.MinigameSelector){
      console.error('❌ MinigameSelector not available');
      return null;
    }

    // Reset selector
    g.MinigameSelector.reset();

    const distribution = {};
    const selectionOrder = [];
    let unknownKeys = 0;
    let fallbacks = 0;

    for(let i = 0; i < competitions; i++){
      try {
        const gameKey = g.MinigameSelector.selectNext(true);
        
        if(!gameKey){
          console.warn(`  ⚠️  Competition ${i + 1}: No game selected`);
          unknownKeys++;
          continue;
        }

        // Check if game exists in registry
        if(g.MinigameRegistry){
          const metadata = g.MinigameRegistry.getGame(gameKey);
          if(!metadata){
            console.warn(`  ⚠️  Competition ${i + 1}: Unknown game "${gameKey}"`);
            unknownKeys++;
            continue;
          }
        }

        // Track distribution
        if(!distribution[gameKey]){
          distribution[gameKey] = 0;
        }
        distribution[gameKey]++;
        selectionOrder.push(gameKey);

      } catch(error){
        console.error(`  ❌ Competition ${i + 1} error:`, error.message);
        fallbacks++;
      }
    }

    // Calculate statistics
    const games = Object.keys(distribution);
    const counts = Object.values(distribution);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...counts);
    const max = Math.max(...counts);

    // Check for fairness (coefficient of variation)
    const cv = (stdDev / mean) * 100;

    console.log('📊 Distribution Results:');
    console.log(`  Games: ${games.length}`);
    console.log(`  Mean: ${mean.toFixed(2)}`);
    console.log(`  Std Dev: ${stdDev.toFixed(2)}`);
    console.log(`  Min: ${min}, Max: ${max}`);
    console.log(`  CV: ${cv.toFixed(2)}%`);
    console.log(`  Unknown keys: ${unknownKeys}`);
    console.log(`  Fallbacks: ${fallbacks}`);

    // Fairness check: CV should be < 20% for good distribution
    const fair = cv < 20;
    console.log(`  ${fair ? '✅' : '❌'} Distribution ${fair ? 'FAIR' : 'UNFAIR'}`);

    return {
      competitions,
      distribution,
      selectionOrder,
      statistics: {
        games: games.length,
        mean,
        stdDev,
        min,
        max,
        cv,
        unknownKeys,
        fallbacks,
        fair
      }
    };
  }

  /**
   * Simulate score distribution for a game
   * Tests that scores are properly normalized
   * @param {string} gameKey - Game to test
   * @param {number} samples - Number of samples
   * @returns {Object} Score distribution results
   */
  function simulateScoreDistribution(gameKey, samples = 100){
    console.log(`📈 Simulating ${samples} scores for "${gameKey}"...\n`);

    const scores = [];
    const rawScores = [];

    // Generate random scores (simulated)
    for(let i = 0; i < samples; i++){
      // Simulate different score patterns
      let rawScore;
      if(Math.random() < 0.1){
        // 10% excellent (90-100)
        rawScore = 90 + Math.random() * 10;
      } else if(Math.random() < 0.3){
        // 20% poor (0-40)
        rawScore = Math.random() * 40;
      } else {
        // 70% average (40-90)
        rawScore = 40 + Math.random() * 50;
      }

      rawScores.push(rawScore);

      // Normalize if scoring module available
      if(g.MinigameScoring){
        const metadata = g.MinigameRegistry ? g.MinigameRegistry.getGame(gameKey) : null;
        const scoringType = metadata ? metadata.scoring : 'accuracy';

        let normalized;
        switch(scoringType){
          case 'time':
            normalized = g.MinigameScoring.normalizeTime(rawScore * 100, 1000, 10000);
            break;
          case 'accuracy':
            normalized = g.MinigameScoring.normalizeAccuracy(rawScore, 100);
            break;
          case 'hybrid':
            normalized = g.MinigameScoring.normalizeHybrid(rawScore, 100, rawScore * 50, 2000, 10000);
            break;
          case 'endurance':
            normalized = g.MinigameScoring.normalizeEndurance(rawScore * 1000, 10000, 60000);
            break;
          default:
            normalized = rawScore;
        }
        scores.push(normalized);
      } else {
        scores.push(rawScore);
      }
    }

    // Calculate statistics
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    // Fairness band check (default 35-70)
    const inFairnessBand = mean >= 35 && mean <= 70;

    console.log('📊 Score Distribution:');
    console.log(`  Samples: ${samples}`);
    console.log(`  Mean: ${mean.toFixed(2)}`);
    console.log(`  Std Dev: ${stdDev.toFixed(2)}`);
    console.log(`  Min: ${min.toFixed(2)}, Max: ${max.toFixed(2)}`);
    console.log(`  ${inFairnessBand ? '✅' : '⚠️'} Mean ${inFairnessBand ? 'within' : 'outside'} fairness band (35-70)`);

    return {
      gameKey,
      samples,
      scores,
      rawScores,
      statistics: {
        mean,
        stdDev,
        min,
        max,
        inFairnessBand
      }
    };
  }

  /**
   * Run comprehensive distribution tests
   * @returns {Object} All test results
   */
  async function runDistributionTests(){
    console.log('🧪 Running Distribution Tests\n');
    console.log('='.repeat(60) + '\n');

    const results = {
      timestamp: new Date().toISOString(),
      selection: null,
      scoring: []
    };

    // Test 1: Selection distribution
    console.log('Test 1: Selection Distribution\n');
    results.selection = simulateSelectionDistribution(100);

    // Test 2: Score distribution (sample a few games)
    if(g.MinigameRegistry){
      const implementedGames = g.MinigameRegistry.getImplementedGames(true);
      const samplGames = implementedGames.slice(0, 3);

      console.log('\n' + '='.repeat(60) + '\n');
      console.log('Test 2: Score Distribution\n');

      for(const gameKey of samplGames){
        const scoreResult = simulateScoreDistribution(gameKey, 50);
        results.scoring.push(scoreResult);
        console.log('');
      }
    }

    console.log('='.repeat(60) + '\n');
    console.log('📊 Summary:');
    
    const selectionPassed = results.selection && 
                           results.selection.statistics.unknownKeys === 0 &&
                           results.selection.statistics.fallbacks < 1 &&
                           results.selection.statistics.fair;
    
    const scoringPassed = results.scoring.every(r => r.statistics.inFairnessBand);

    console.log(`  Selection: ${selectionPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Scoring: ${scoringPassed ? '✅ PASS' : '⚠️ WARNING'}`);
    console.log(`  Overall: ${selectionPassed && scoringPassed ? '✅ PASS' : '❌ FAIL'}`);

    return results;
  }

  /**
   * Export test results
   * @param {Object} results - Test results
   * @returns {string} JSON string
   */
  function exportResults(results){
    return JSON.stringify(results, null, 2);
  }

  // Export API
  g.MinigameDistributionTests = {
    simulateSelectionDistribution,
    simulateScoreDistribution,
    runDistributionTests,
    exportResults
  };

  console.info('[MinigameDistributionTests] Module loaded');

})(window);
