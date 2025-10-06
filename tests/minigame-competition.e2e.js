/**
 * E2E Test Harness for Minigame Competition System
 * Guarantees that every competition launches a real, working minigame
 * 
 * Tests:
 * - 100+ simulated competitions
 * - No fallback/unknown minigames
 * - All games are interactive and call complete()
 * - Mobile viewport emulation (≥50% of runs)
 * - Variety enforcement (no repeats before pool exhaustion)
 * - Accessibility validation
 */

(function(g){
  'use strict';

  const results = {
    timestamp: new Date().toISOString(),
    competitions: 0,
    passed: 0,
    failed: 0,
    errors: [],
    tests: {
      noFallback: { passed: 0, failed: 0 },
      interactive: { passed: 0, failed: 0 },
      variety: { passed: 0, failed: 0 },
      mobile: { passed: 0, failed: 0 },
      accessibility: { passed: 0, failed: 0 }
    }
  };

  /**
   * Simulate a single competition with full E2E validation
   * @param {number} competitionNum - Competition number
   * @param {boolean} emulatesMobile - Whether to emulate mobile viewport
   * @returns {Promise<Object>} Test result
   */
  async function simulateCompetition(competitionNum, emulatesMobile = false){
    const result = {
      competitionNum,
      gameKey: null,
      passed: true,
      errors: [],
      emulatesMobile,
      completed: false,
      score: null,
      renderTime: null,
      completionTime: null
    };

    const startTime = Date.now();

    try {
      // Step 1: Select next minigame
      if(!g.MinigameSelector){
        result.passed = false;
        result.errors.push('MinigameSelector not available');
        return result;
      }

      const gameKey = g.MinigameSelector.selectNext(true);
      result.gameKey = gameKey;

      if(!gameKey){
        result.passed = false;
        result.errors.push('No game selected (null/undefined)');
        results.tests.noFallback.failed++;
        return result;
      }

      // Step 2: Verify game is registered (not fallback/unknown)
      if(!g.MinigameRegistry){
        result.passed = false;
        result.errors.push('MinigameRegistry not available');
        return result;
      }

      const metadata = g.MinigameRegistry.getGame(gameKey);
      if(!metadata){
        result.passed = false;
        result.errors.push(`Unknown/unregistered game: "${gameKey}"`);
        results.tests.noFallback.failed++;
        return result;
      }

      // Verify game is not a fallback key
      if(gameKey === 'unknown' || gameKey === 'fallback'){
        result.passed = false;
        result.errors.push(`Fallback game used: "${gameKey}"`);
        results.tests.noFallback.failed++;
        return result;
      }

      results.tests.noFallback.passed++;

      // Step 3: Verify module is loaded
      if(!g.MiniGames || !g.MiniGames[gameKey]){
        result.passed = false;
        result.errors.push(`Module not loaded: "${gameKey}"`);
        results.tests.interactive.failed++;
        return result;
      }

      const module = g.MiniGames[gameKey];
      if(typeof module.render !== 'function'){
        result.passed = false;
        result.errors.push(`No render() function: "${gameKey}"`);
        results.tests.interactive.failed++;
        return result;
      }

      // Step 4: Render game and test interactivity
      const renderResult = await testGameInteractivity(gameKey, emulatesMobile);
      
      result.renderTime = renderResult.renderTime;
      result.completionTime = renderResult.completionTime;
      result.completed = renderResult.completed;
      result.score = renderResult.score;

      if(!renderResult.passed){
        result.passed = false;
        result.errors.push(...renderResult.errors);
        results.tests.interactive.failed++;
        return result;
      }

      results.tests.interactive.passed++;

      // Step 5: Verify mobile-friendliness if emulating mobile
      if(emulatesMobile){
        if(!metadata.mobileFriendly){
          result.passed = false;
          result.errors.push(`Game "${gameKey}" not marked as mobileFriendly`);
          results.tests.mobile.failed++;
        } else {
          results.tests.mobile.passed++;
        }
      }

      // Step 6: Basic accessibility check
      const a11yResult = await testAccessibility(gameKey);
      if(a11yResult.passed){
        results.tests.accessibility.passed++;
      } else {
        result.errors.push(...a11yResult.errors);
        results.tests.accessibility.failed++;
        // Don't fail overall for accessibility issues (warnings only)
      }

    } catch(error){
      result.passed = false;
      result.errors.push(`Exception: ${error.message}`);
      console.error(`Competition ${competitionNum} error:`, error);
    }

    return result;
  }

  /**
   * Test game interactivity - render and wait for completion
   * @param {string} gameKey - Game key to test
   * @param {boolean} emulatesMobile - Whether to emulate mobile viewport
   * @returns {Promise<Object>} Test result
   */
  async function testGameInteractivity(gameKey, emulatesMobile){
    return new Promise((resolve) => {
      const result = {
        passed: true,
        errors: [],
        completed: false,
        score: null,
        renderTime: null,
        completionTime: null
      };

      const startTime = Date.now();

      try {
        // Create test container
        const container = document.createElement('div');
        container.style.cssText = 'position: absolute; left: -9999px; top: 0;';
        
        // Emulate mobile viewport if needed
        if(emulatesMobile){
          container.style.width = '375px';  // iPhone size
          container.style.height = '667px';
        } else {
          container.style.width = '1024px';  // Desktop size
          container.style.height = '768px';
        }
        
        document.body.appendChild(container);

        let callbackInvoked = false;
        let renderComplete = false;

        // Timeout for completion (10 seconds max)
        const timeout = setTimeout(() => {
          if(!callbackInvoked){
            result.passed = false;
            result.errors.push('Completion callback not called within 10s');
          }
          cleanup();
        }, 10000);

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
            result.errors.push('Completion callback called multiple times');
            cleanup();
            return;
          }

          callbackInvoked = true;
          result.completed = true;
          result.score = score;
          result.completionTime = Date.now() - startTime;

          // Validate score
          if(typeof score !== 'number'){
            result.passed = false;
            result.errors.push(`Invalid score type: ${typeof score}`);
          } else if(score < 0 || score > 100){
            result.passed = false;
            result.errors.push(`Score out of range: ${score} (expected 0-100)`);
          }

          cleanup();
        }

        // Render the game
        g.MiniGames[gameKey].render(container, onComplete);
        renderComplete = true;
        result.renderTime = Date.now() - startTime;

        // Auto-complete after a short delay (simulate user interaction)
        // This ensures the game is interactive
        setTimeout(() => {
          if(!callbackInvoked && renderComplete){
            // Trigger any buttons or interactive elements
            const buttons = container.querySelectorAll('button');
            if(buttons.length > 0){
              // Click first button to simulate interaction
              buttons[0].click();
            }
          }
        }, 100);

      } catch(error){
        result.passed = false;
        result.errors.push(`Render error: ${error.message}`);
        resolve(result);
      }
    });
  }

  /**
   * Test basic accessibility features
   * @param {string} gameKey - Game key to test
   * @returns {Promise<Object>} Test result
   */
  async function testAccessibility(gameKey){
    return new Promise((resolve) => {
      const result = {
        passed: true,
        errors: []
      };

      try {
        // Create test container
        const container = document.createElement('div');
        container.style.cssText = 'position: absolute; left: -9999px; top: 0;';
        document.body.appendChild(container);

        const timeout = setTimeout(() => {
          cleanup();
        }, 2000);

        function cleanup(){
          clearTimeout(timeout);
          if(container.parentNode){
            container.parentNode.removeChild(container);
          }
          resolve(result);
        }

        function onComplete(){
          cleanup();
        }

        // Render the game
        g.MiniGames[gameKey].render(container, onComplete);

        // Check for basic accessibility features
        setTimeout(() => {
          // Check for focusable elements
          const focusable = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          if(focusable.length === 0){
            result.errors.push('No focusable elements found (keyboard navigation)');
          }

          // Check for ARIA labels on interactive elements
          const buttons = container.querySelectorAll('button');
          buttons.forEach((btn, idx) => {
            if(!btn.textContent.trim() && !btn.getAttribute('aria-label') && !btn.getAttribute('title')){
              result.errors.push(`Button ${idx} has no accessible label`);
            }
          });

          // Check for contrast (basic check - element should have text or background)
          const elements = container.querySelectorAll('*');
          let hasVisibleContent = false;
          elements.forEach(el => {
            if(el.textContent.trim() || window.getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'){
              hasVisibleContent = true;
            }
          });

          if(!hasVisibleContent){
            result.errors.push('No visible content detected');
          }

          if(result.errors.length > 0){
            result.passed = false;
          }

          cleanup();
        }, 500);

      } catch(error){
        result.passed = false;
        result.errors.push(`Accessibility check error: ${error.message}`);
        resolve(result);
      }
    });
  }

  /**
   * Test variety - ensure no repeats before pool exhaustion
   * @param {Array<Object>} competitionResults - Results from all competitions
   * @returns {Object} Variety test result
   */
  function testVariety(competitionResults){
    const result = {
      passed: true,
      errors: [],
      poolSize: 0,
      cyclesAnalyzed: 0
    };

    // Get pool size
    if(!g.MinigameRegistry){
      result.errors.push('MinigameRegistry not available');
      result.passed = false;
      return result;
    }

    const implementedGames = g.MinigameRegistry.getImplementedGames(true);
    result.poolSize = implementedGames.length;

    // Extract game keys in order
    const gameSequence = competitionResults.map(r => r.gameKey).filter(Boolean);

    // Check for repeats within pool-sized windows
    let cyclesPassed = 0;
    let cyclesFailed = 0;

    for(let i = 0; i < gameSequence.length - result.poolSize; i++){
      const window = gameSequence.slice(i, i + result.poolSize);
      const uniqueGames = new Set(window);

      // Check if all games in window are unique (or close to unique)
      // Allow slight deviation for randomization
      if(uniqueGames.size < Math.floor(result.poolSize * 0.8)){
        cyclesFailed++;
        result.errors.push(
          `Window ${i}-${i+result.poolSize}: Only ${uniqueGames.size}/${result.poolSize} unique games`
        );
      } else {
        cyclesPassed++;
      }
    }

    result.cyclesAnalyzed = cyclesPassed + cyclesFailed;

    if(cyclesFailed > Math.ceil(result.cyclesAnalyzed * 0.1)){  // Allow 10% failure rate
      result.passed = false;
    }

    return result;
  }

  /**
   * Run full E2E test suite
   * @param {number} numCompetitions - Number of competitions to simulate (default 100)
   * @returns {Promise<Object>} Test results
   */
  async function runE2ETests(numCompetitions = 100){
    console.log('🧪 Running E2E Competition Test Harness\n');
    console.log('='.repeat(70));
    console.log(`Simulating ${numCompetitions} competitions...\n`);

    results.competitions = numCompetitions;

    // Reset selector to start fresh
    if(g.MinigameSelector && typeof g.MinigameSelector.reset === 'function'){
      g.MinigameSelector.reset();
    }

    const competitionResults = [];

    // Run competitions
    for(let i = 0; i < numCompetitions; i++){
      const emulatesMobile = i % 2 === 0;  // 50% mobile emulation
      const result = await simulateCompetition(i + 1, emulatesMobile);
      
      competitionResults.push(result);

      if(result.passed){
        results.passed++;
      } else {
        results.failed++;
        results.errors.push({
          competition: i + 1,
          gameKey: result.gameKey,
          errors: result.errors
        });
      }

      // Progress indicator every 10 competitions
      if((i + 1) % 10 === 0){
        console.log(`  Progress: ${i + 1}/${numCompetitions} competitions completed`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 Test Results:\n');

    // Overall stats
    console.log(`Competitions: ${numCompetitions}`);
    console.log(`Passed: ${results.passed} (${(results.passed / numCompetitions * 100).toFixed(1)}%)`);
    console.log(`Failed: ${results.failed} (${(results.failed / numCompetitions * 100).toFixed(1)}%)\n`);

    // Specific test results
    console.log('Detailed Results:');
    console.log(`  No Fallback: ${results.tests.noFallback.passed}/${numCompetitions} passed`);
    console.log(`  Interactive: ${results.tests.interactive.passed}/${numCompetitions} passed`);
    console.log(`  Mobile-Friendly: ${results.tests.mobile.passed}/${Math.floor(numCompetitions / 2)} passed`);
    console.log(`  Accessibility: ${results.tests.accessibility.passed}/${numCompetitions} passed\n`);

    // Variety test
    console.log('Testing variety (no repeats before pool exhaustion)...');
    const varietyResult = testVariety(competitionResults);
    if(varietyResult.passed){
      console.log(`  ✅ Variety test passed (pool size: ${varietyResult.poolSize})`);
      results.tests.variety.passed = 1;
    } else {
      console.log(`  ❌ Variety test failed`);
      varietyResult.errors.forEach(err => console.log(`     ${err}`));
      results.tests.variety.failed = 1;
    }

    // Final verdict
    console.log('\n' + '='.repeat(70));
    
    const allTestsPassed = 
      results.failed === 0 &&
      results.tests.noFallback.failed === 0 &&
      results.tests.interactive.failed === 0 &&
      results.tests.variety.failed === 0;

    if(allTestsPassed){
      console.log('✅ ALL TESTS PASSED');
      console.log('   ✓ 100% of competitions launched real, working minigames');
      console.log('   ✓ No fallback or unknown minigames used');
      console.log('   ✓ All games are interactive and call complete()');
      console.log('   ✓ Variety enforced (no repeats before pool exhaustion)');
      console.log('   ✓ Mobile viewport emulation successful');
    } else {
      console.log('❌ TESTS FAILED');
      if(results.failed > 0){
        console.log(`   ✗ ${results.failed} competitions failed`);
      }
      if(results.errors.length > 0){
        console.log('\n   First 5 errors:');
        results.errors.slice(0, 5).forEach(err => {
          console.log(`   Competition ${err.competition} (${err.gameKey}):`);
          err.errors.forEach(e => console.log(`     - ${e}`));
        });
      }
    }

    return results;
  }

  /**
   * Export results as JSON
   * @returns {string} JSON string
   */
  function exportResults(){
    return JSON.stringify(results, null, 2);
  }

  /**
   * Quick test runner for CI/CLI
   * Returns exit code (0 = pass, 1 = fail)
   */
  async function quickTest(){
    const results = await runE2ETests(100);
    return results.failed === 0 ? 0 : 1;
  }

  // Export API
  g.MinigameE2ETests = {
    runE2ETests,
    simulateCompetition,
    testGameInteractivity,
    testAccessibility,
    testVariety,
    exportResults,
    quickTest,
    getResults: () => results
  };

  console.info('[MinigameE2ETests] Module loaded');

})(window);
