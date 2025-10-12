// SCRIPT: minigames-audit.js
// Dev-only audit script for minigame registry and module loading
// Safe to run in production/dev - non-destructive, read-only analysis
// 
// Usage (in browser console):
//   1. Load this script
//   2. Call: MinigameAudit.run()
//   3. Copy JSON result: MinigameAudit.getJSON()

(function(g){
  'use strict';

  /**
   * Perform comprehensive registry audit
   * @returns {Object} Audit results
   */
  async function performAudit(){
    const startTime = Date.now();
    const result = {
      timestamp: new Date().toISOString(),
      duration: 0,
      registry: {
        available: false,
        totalGames: 0,
        implemented: [],
        notImplemented: [],
        retired: []
      },
      modules: {
        loaded: [],
        notLoaded: [],
        failedToLoad: []
      },
      summary: {
        totalRegistered: 0,
        totalImplemented: 0,
        totalLoaded: 0,
        totalMissing: 0,
        loadSuccessRate: 0
      }
    };

    console.group('🔍 [MinigameAudit] Starting Registry Audit');

    // Check 1: Is MinigameRegistry available?
    if(!g.MinigameRegistry){
      console.error('❌ MinigameRegistry not loaded');
      result.registry.available = false;
      console.groupEnd();
      return result;
    }

    result.registry.available = true;
    console.info('✅ MinigameRegistry is loaded');

    // Check 2: Get all registry keys
    let allKeys = [];
    try {
      if(typeof g.MinigameRegistry.getAllKeys === 'function'){
        allKeys = g.MinigameRegistry.getAllKeys();
        result.registry.totalGames = allKeys.length;
        console.info(`📚 Total games in registry: ${allKeys.length}`);
      } else {
        console.warn('⚠️ getAllKeys() not available');
      }
    } catch(error){
      console.error('❌ Error getting registry keys:', error);
    }

    // Check 3: Categorize games by implementation status
    for(const key of allKeys){
      try {
        const game = g.MinigameRegistry.getGame(key);
        if(game){
          if(game.implemented){
            result.registry.implemented.push({
              key: key,
              name: game.name,
              type: game.type,
              retired: game.retired || false,
              mobileFriendly: game.mobileFriendly || false
            });
          } else {
            result.registry.notImplemented.push({
              key: key,
              name: game.name,
              type: game.type
            });
          }

          if(game.retired){
            result.registry.retired.push(key);
          }
        }
      } catch(error){
        console.warn(`⚠️ Error reading game "${key}":`, error.message);
      }
    }

    console.info(`✅ Implemented games: ${result.registry.implemented.length}`);
    console.info(`⏸️ Not implemented: ${result.registry.notImplemented.length}`);
    console.info(`🚫 Retired games: ${result.registry.retired.length}`);

    // Check 4: Check which modules are loaded
    console.info('');
    console.info('🔍 Checking module load status...');

    for(const gameInfo of result.registry.implemented){
      const key = gameInfo.key;
      
      try {
        const isLoaded = g.MinigameRegistry.isModuleLoaded(key);
        
        if(isLoaded){
          result.modules.loaded.push(key);
          console.info(`✅ Loaded: ${key}`);
        } else {
          result.modules.notLoaded.push(key);
          console.warn(`⚠️ Not loaded: ${key}`);
        }
      } catch(error){
        console.error(`❌ Error checking "${key}":`, error.message);
      }
    }

    // Check 5: Try loading modules that aren't loaded (without modifying runtime state)
    // We'll use a safe read-only approach - just check if loadModule would work
    console.info('');
    console.info('🔍 Testing load capability for unloaded modules...');
    
    for(const key of result.modules.notLoaded){
      try {
        // We won't actually load, just check if the registry entry is valid
        const game = g.MinigameRegistry.getGame(key);
        if(game && game.module){
          console.info(`📦 "${key}" can be loaded from: ${game.module}`);
          // Note: We're NOT calling loadModule() to keep this audit non-destructive
        } else {
          result.modules.failedToLoad.push({
            key: key,
            reason: 'No module path in registry'
          });
          console.error(`❌ "${key}" has no module path`);
        }
      } catch(error){
        result.modules.failedToLoad.push({
          key: key,
          reason: error.message
        });
        console.error(`❌ "${key}" load test failed:`, error.message);
      }
    }

    // Calculate summary
    result.summary.totalRegistered = allKeys.length;
    result.summary.totalImplemented = result.registry.implemented.length;
    result.summary.totalLoaded = result.modules.loaded.length;
    result.summary.totalMissing = result.modules.notLoaded.length;
    result.summary.loadSuccessRate = result.summary.totalImplemented > 0 ? 
      Math.round((result.summary.totalLoaded / result.summary.totalImplemented) * 100) : 0;

    result.duration = Date.now() - startTime;

    console.info('');
    console.info('📊 Summary:');
    console.info(`   Total registered: ${result.summary.totalRegistered}`);
    console.info(`   Implemented: ${result.summary.totalImplemented}`);
    console.info(`   Loaded: ${result.summary.totalLoaded}`);
    console.info(`   Missing: ${result.summary.totalMissing}`);
    console.info(`   Load success rate: ${result.summary.loadSuccessRate}%`);
    console.info(`   Audit duration: ${result.duration}ms`);
    
    console.groupEnd();

    return result;
  }

  /**
   * Run the audit and store results
   */
  async function run(){
    const result = await performAudit();
    g.__minigameAuditResult = result;
    
    console.info('');
    console.info('✅ Audit complete! Results stored in window.__minigameAuditResult');
    console.info('📋 To copy JSON: MinigameAudit.getJSON()');
    console.info('📋 To copy summary: MinigameAudit.getSummary()');
    
    return result;
  }

  /**
   * Get audit results as JSON string
   * @returns {string} JSON string
   */
  function getJSON(){
    if(!g.__minigameAuditResult){
      return JSON.stringify({ error: 'No audit results available. Run MinigameAudit.run() first.' }, null, 2);
    }
    return JSON.stringify(g.__minigameAuditResult, null, 2);
  }

  /**
   * Get summary only
   * @returns {Object} Summary object
   */
  function getSummary(){
    if(!g.__minigameAuditResult){
      return { error: 'No audit results available. Run MinigameAudit.run() first.' };
    }
    return {
      timestamp: g.__minigameAuditResult.timestamp,
      duration: g.__minigameAuditResult.duration,
      summary: g.__minigameAuditResult.summary,
      loaded: g.__minigameAuditResult.modules.loaded,
      notLoaded: g.__minigameAuditResult.modules.notLoaded
    };
  }

  /**
   * Print a formatted report to console
   */
  function printReport(){
    if(!g.__minigameAuditResult){
      console.error('No audit results available. Run MinigameAudit.run() first.');
      return;
    }

    const r = g.__minigameAuditResult;
    
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  MINIGAME REGISTRY AUDIT REPORT');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Timestamp: ${r.timestamp}`);
    console.log(`  Duration: ${r.duration}ms`);
    console.log('');
    console.log('  REGISTRY STATUS:');
    console.log(`    Total games: ${r.registry.totalGames}`);
    console.log(`    Implemented: ${r.registry.implemented.length}`);
    console.log(`    Not implemented: ${r.registry.notImplemented.length}`);
    console.log(`    Retired: ${r.registry.retired.length}`);
    console.log('');
    console.log('  MODULE STATUS:');
    console.log(`    Loaded: ${r.modules.loaded.length}`);
    console.log(`    Not loaded: ${r.modules.notLoaded.length}`);
    console.log(`    Failed: ${r.modules.failedToLoad.length}`);
    console.log('');
    console.log('  SUMMARY:');
    console.log(`    Load success rate: ${r.summary.loadSuccessRate}%`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    
    if(r.modules.notLoaded.length > 0){
      console.log('  ⚠️ UNLOADED MODULES:');
      r.modules.notLoaded.forEach(key => {
        console.log(`    - ${key}`);
      });
      console.log('');
    }
  }

  // Export API
  g.MinigameAudit = {
    run,
    getJSON,
    getSummary,
    printReport
  };

  console.info('[MinigameAudit] Script loaded. Run MinigameAudit.run() to start audit.');

})(window);
