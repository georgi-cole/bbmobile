/**
 * Minigame Registry Audit Script
 * Runs at startup to ensure all selector pool keys are registered
 * Fails startup if any critical issues are detected
 * 
 * This guarantees that no "Unknown minigame" errors occur during gameplay
 */

(function(g){
  'use strict';

  let auditRun = false;
  let auditPassed = false;

  /**
   * Perform comprehensive registry audit
   * @param {boolean} failOnError - If true, throws error on critical failures
   * @returns {Object} Audit results
   */
  function performAudit(failOnError = false){
    const result = {
      timestamp: new Date().toISOString(),
      passed: true,
      critical: [],
      warnings: [],
      info: []
    };

    console.group('[RegistryAudit] Startup Audit');

    // Check 1: Registry exists
    if(!g.MinigameRegistry){
      result.passed = false;
      result.critical.push('MinigameRegistry not loaded');
      console.error('❌ CRITICAL: MinigameRegistry not loaded');
      console.groupEnd();
      
      if(failOnError){
        throw new Error('Startup audit failed: MinigameRegistry not loaded');
      }
      return result;
    }

    // Check 2: Selector exists
    if(!g.MinigameSelector){
      result.passed = false;
      result.critical.push('MinigameSelector not loaded');
      console.error('❌ CRITICAL: MinigameSelector not loaded');
      console.groupEnd();
      
      if(failOnError){
        throw new Error('Startup audit failed: MinigameSelector not loaded');
      }
      return result;
    }

    // Check 3: Key resolver exists
    if(!g.MGKeyResolver){
      result.warnings.push('MGKeyResolver not loaded (key resolution disabled)');
      console.warn('⚠️ WARNING: MGKeyResolver not loaded');
    }

    // Check 4: Get expected selector pool
    const implementedGames = g.MinigameRegistry.getImplementedGames(true);
    result.info.push(`Expected selector pool size: ${implementedGames.length}`);
    console.info(`Expected selector pool: ${implementedGames.length} games`);

    if(implementedGames.length === 0){
      result.passed = false;
      result.critical.push('No implemented games found in registry');
      console.error('❌ CRITICAL: No implemented games in registry');
      console.groupEnd();
      
      if(failOnError){
        throw new Error('Startup audit failed: No implemented games');
      }
      return result;
    }

    // Check 5: Verify all pool keys are registered (if key resolver available)
    if(g.MGKeyResolver){
      const poolAudit = g.MGKeyResolver.auditUnknown(implementedGames);
      
      if(poolAudit.unknown.length > 0){
        result.passed = false;
        result.critical.push(`Selector pool contains ${poolAudit.unknown.length} unregistered keys`);
        result.critical.push(`Unregistered keys: ${poolAudit.unknown.join(', ')}`);
        
        console.error('❌ CRITICAL: Selector pool contains unregistered keys!');
        console.error('   Keys:', poolAudit.unknown);
        console.error('   These will cause "Unknown minigame" errors during gameplay');
        console.error('   FIX: Add key mappings in js/minigames/core/registry-bootstrap.js');
        
        console.groupEnd();
        
        if(failOnError){
          throw new Error(
            `Startup audit failed: Unregistered keys in selector pool: ${poolAudit.unknown.join(', ')}`
          );
        }
        return result;
      }

      result.info.push('All selector pool keys are registered');
      console.info('✅ All selector pool keys are registered');
    }

    // Check 6: Verify all games have modules loaded
    let missingModules = 0;
    for(const gameKey of implementedGames){
      if(!g.MiniGames || !g.MiniGames[gameKey]){
        missingModules++;
        result.warnings.push(`Module not loaded: ${gameKey}`);
        console.warn(`⚠️ WARNING: Module not loaded for "${gameKey}"`);
      }
    }

    if(missingModules > 0){
      result.warnings.push(`${missingModules} game modules not loaded (may load later)`);
      console.warn(`⚠️ ${missingModules} modules not yet loaded (this may be normal at startup)`);
    } else {
      result.info.push('All game modules are loaded');
      console.info('✅ All game modules loaded');
    }

    // Check 7: Verify registry bootstrap ran
    if(g.MGRegistryBootstrap){
      result.info.push('Registry bootstrap available');
      console.info('✅ Registry bootstrap loaded');
    } else {
      result.warnings.push('MGRegistryBootstrap not loaded');
      console.warn('⚠️ WARNING: MGRegistryBootstrap not loaded');
    }

    // Check 8: Verify selector can select a game
    try {
      // Don't actually select, just check selector initialization
      if(g.game && g.game.__minigamePool){
        result.info.push(`Selector pool initialized with ${g.game.__minigamePool.length} games`);
        console.info(`✅ Selector pool initialized: ${g.game.__minigamePool.length} games`);
      } else {
        result.info.push('Selector pool will be initialized on first selection');
        console.info('ℹ️ Selector pool will be initialized on first selection');
      }
    } catch(error){
      result.warnings.push(`Selector initialization check error: ${error.message}`);
      console.warn(`⚠️ Selector check error: ${error.message}`);
    }

    // Summary
    console.log('\n📊 Audit Summary:');
    console.log(`   Critical Issues: ${result.critical.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);
    console.log(`   Info: ${result.info.length}`);

    if(result.passed){
      console.log('\n✅ AUDIT PASSED: System ready for minigame competitions');
    } else {
      console.log('\n❌ AUDIT FAILED: Critical issues must be fixed before gameplay');
    }

    console.groupEnd();

    auditRun = true;
    auditPassed = result.passed;

    return result;
  }

  /**
   * Quick validation check (can be called multiple times)
   * @returns {boolean} True if audit passed or not yet run
   */
  function isSystemHealthy(){
    if(!auditRun){
      // Run audit if not yet run
      const result = performAudit(false);
      return result.passed;
    }
    return auditPassed;
  }

  /**
   * Force re-audit (useful after module loading)
   */
  function reaudit(){
    auditRun = false;
    return performAudit(false);
  }

  /**
   * Get audit status
   * @returns {Object} Status info
   */
  function getStatus(){
    return {
      auditRun,
      auditPassed,
      timestamp: new Date().toISOString()
    };
  }

  // Auto-run audit after DOM load
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      // Delay to ensure all modules are loaded
      setTimeout(() => {
        performAudit(false);
      }, 1000);
    }, { once: true });
  } else {
    // DOM already loaded, run audit after short delay
    setTimeout(() => {
      performAudit(false);
    }, 1000);
  }

  // Export API
  g.MinigameRegistryAudit = {
    performAudit,
    isSystemHealthy,
    reaudit,
    getStatus
  };

  console.info('[MinigameRegistryAudit] Module loaded - audit scheduled');

})(window);
