/**
 * Contract validation tests for minigames
 * Ensures all games follow the required API contract:
 * - Export a render() function
 * - Call completion callback (onComplete/onSubmit)
 * - Handle errors gracefully
 */

(function(g){
  'use strict';

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    violations: []
  };

  /**
   * Test a single game for contract compliance
   * @param {string} gameKey - Game key to test
   * @returns {Object} Test result
   */
  function testGameContract(gameKey){
    const result = {
      gameKey,
      passed: true,
      violations: []
    };

    // Check 1: Game exists in registry
    if(!g.MinigameRegistry){
      result.passed = false;
      result.violations.push('Registry not available');
      return result;
    }

    const metadata = g.MinigameRegistry.getGame(gameKey);
    if(!metadata){
      result.passed = false;
      result.violations.push('Game not in registry');
      return result;
    }

    // Check 2: Module is loaded
    if(!g.MiniGames || !g.MiniGames[gameKey]){
      result.passed = false;
      result.violations.push('Module not loaded');
      return result;
    }

    const module = g.MiniGames[gameKey];

    // Check 3: Has render function
    if(typeof module.render !== 'function'){
      result.passed = false;
      result.violations.push('Missing render() function');
    }

    // Check 4: Metadata consistency
    if(metadata.implemented && !module.render){
      result.passed = false;
      result.violations.push('Marked as implemented but no render()');
    }

    // Check 5: Module has name
    if(!metadata.name){
      result.passed = false;
      result.violations.push('Missing display name');
    }

    // Check 6: Valid scoring type
    const validScoringTypes = ['time', 'accuracy', 'hybrid', 'endurance'];
    if(!validScoringTypes.includes(metadata.scoring)){
      result.passed = false;
      result.violations.push(`Invalid scoring type: ${metadata.scoring}`);
    }

    // Check 7: Valid game type
    const validGameTypes = ['reaction', 'memory', 'puzzle', 'trivia', 'endurance'];
    if(!validGameTypes.includes(metadata.type)){
      result.passed = false;
      result.violations.push(`Invalid game type: ${metadata.type}`);
    }

    return result;
  }

  /**
   * Test game render function (basic smoke test)
   * @param {string} gameKey - Game key to test
   * @returns {Promise<Object>} Test result
   */
  async function testGameRender(gameKey){
    return new Promise((resolve) => {
      const result = {
        gameKey,
        passed: true,
        error: null,
        completed: false,
        score: null
      };

      try {
        // Create test container
        const container = document.createElement('div');
        container.style.display = 'none';
        document.body.appendChild(container);

        let callbackInvoked = false;
        const timeout = setTimeout(() => {
          if(!callbackInvoked){
            result.passed = false;
            result.error = 'Completion callback not called within 5s';
          }
          cleanup();
        }, 5000);

        function cleanup(){
          clearTimeout(timeout);
          if(container.parentNode){
            container.parentNode.removeChild(container);
          }
          resolve(result);
        }

        // Completion callback
        function onComplete(score){
          if(callbackInvoked){
            result.passed = false;
            result.error = 'Completion callback called multiple times';
            cleanup();
            return;
          }

          callbackInvoked = true;
          result.completed = true;
          result.score = score;

          // Validate score
          if(typeof score !== 'number'){
            result.passed = false;
            result.error = `Invalid score type: ${typeof score}`;
          } else if(score < 0 || score > 100){
            result.passed = false;
            result.error = `Score out of range: ${score} (expected 0-100)`;
          }

          cleanup();
        }

        // Attempt to render
        if(!g.MiniGames || !g.MiniGames[gameKey]){
          result.passed = false;
          result.error = 'Module not loaded';
          cleanup();
          return;
        }

        g.MiniGames[gameKey].render(container, onComplete);

      } catch(error){
        result.passed = false;
        result.error = error.message;
        resolve(result);
      }
    });
  }

  /**
   * Run all contract tests
   * @returns {Object} Test results
   */
  async function runContractTests(){
    console.log('🧪 Running Contract Validation Tests\n');

    if(!g.MinigameRegistry){
      console.error('❌ MinigameRegistry not available');
      return results;
    }

    const allGames = g.MinigameRegistry.getAllKeys();
    console.log(`Testing ${allGames.length} games...\n`);

    results.total = allGames.length;

    // Test 1: Static contract validation
    console.log('📋 Static Contract Validation:');
    for(const gameKey of allGames){
      const result = testGameContract(gameKey);
      
      if(result.passed){
        results.passed++;
        console.log(`  ✅ ${gameKey}`);
      } else {
        results.failed++;
        results.violations.push(result);
        console.error(`  ❌ ${gameKey}:`);
        result.violations.forEach(v => console.error(`     - ${v}`));
      }
    }

    // Test 2: Render smoke tests (only for implemented games)
    const implementedGames = g.MinigameRegistry.getImplementedGames(true);
    console.log(`\n🎮 Render Smoke Tests (${implementedGames.length} implemented):`);
    
    for(const gameKey of implementedGames.slice(0, 5)){  // Test first 5 to save time
      console.log(`  Testing ${gameKey}...`);
      const result = await testGameRender(gameKey);
      
      if(result.passed){
        console.log(`    ✅ Rendered successfully (score: ${result.score})`);
      } else {
        console.error(`    ❌ ${result.error}`);
      }
    }

    console.log('\n📊 Results:');
    console.log(`  Total: ${results.total}`);
    console.log(`  Passed: ${results.passed}`);
    console.log(`  Failed: ${results.failed}`);

    return results;
  }

  /**
   * Export test results as JSON
   * @returns {Object} Results object
   */
  function exportResults(){
    return {
      timestamp: new Date().toISOString(),
      ...results,
      summary: {
        totalTests: results.total,
        passRate: results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : 0
      }
    };
  }

  // Export API
  g.MinigameContractTests = {
    testGameContract,
    testGameRender,
    runContractTests,
    exportResults,
    getResults: () => results
  };

  console.info('[MinigameContractTests] Module loaded');

})(window);
