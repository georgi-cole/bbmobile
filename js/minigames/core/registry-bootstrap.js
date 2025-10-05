// MODULE: minigames/core/registry-bootstrap.js
// Bootstrap minigame key resolver with all canonical keys and aliases
// Ensures comprehensive coverage of legacy and descriptive names

(function(g){
  'use strict';

  /**
   * Bootstrap the key resolver with all known keys and aliases
   * Should be called after MGKeyResolver and MinigameRegistry are loaded
   */
  function bootstrap(){
    if(!g.MGKeyResolver){
      console.error('[RegistryBootstrap] MGKeyResolver not available');
      return;
    }

    console.group('[RegistryBootstrap] Initializing key mappings');

    // Get all canonical keys from the registry
    const registry = g.MinigameRegistry;
    if(registry && typeof registry.getAllKeys === 'function'){
      const canonicalKeys = registry.getAllKeys();
      
      console.info('Registering', canonicalKeys.length, 'canonical keys from MinigameRegistry');
      
      for(const key of canonicalKeys){
        g.MGKeyResolver.registerCanonicalKey(key);
      }
    } else {
      console.warn('[RegistryBootstrap] MinigameRegistry not available, using hardcoded list');
      
      // Fallback: hardcoded list of canonical keys
      const fallbackKeys = [
        'countHouse', 'reactionRoyale', 'triviaPulse', 'quickTap',
        'memoryMatch', 'mathBlitz', 'timingBar', 'sequenceMemory',
        'patternMatch', 'wordAnagram', 'targetPractice', 'memoryPairs',
        'estimationGame', 'wordTyping', 'reactionTimer', 'sliderPuzzle',
        'pathFinder', 'simonSays'
      ];
      
      for(const key of fallbackKeys){
        g.MGKeyResolver.registerCanonicalKey(key);
      }
    }

    // Register all aliases (legacy ↔ descriptive names)
    // Legacy aliases (old one-word names)
    const legacyAliases = {
      'clicker': 'quickTap',
      'memory': 'memoryMatch',
      'math': 'mathBlitz',
      'bar': 'timingBar',
      'typing': 'wordTyping',
      'reaction': 'reactionTimer',
      'numseq': 'sequenceMemory',
      'pattern': 'patternMatch',
      'slider': 'sliderPuzzle',
      'anagram': 'wordAnagram',
      'path': 'pathFinder',
      'target': 'targetPractice',
      'pairs': 'memoryPairs',
      'simon': 'simonSays',
      'estimate': 'estimationGame'
    };

    console.info('Registering', Object.keys(legacyAliases).length, 'legacy aliases');
    for(const [alias, canonical] of Object.entries(legacyAliases)){
      g.MGKeyResolver.registerAlias(alias, canonical);
    }

    // Register descriptive aliases (alternative naming conventions)
    // These handle cases where selector might use different naming
    const descriptiveAliases = {
      'quick-tap': 'quickTap',
      'quicktap': 'quickTap',
      'memory-match': 'memoryMatch',
      'memorymatch': 'memoryMatch',
      'math-blitz': 'mathBlitz',
      'mathblitz': 'mathBlitz',
      'timing-bar': 'timingBar',
      'timingbar': 'timingBar',
      'sequence-memory': 'sequenceMemory',
      'sequencememory': 'sequenceMemory',
      'pattern-match': 'patternMatch',
      'patternmatch': 'patternMatch',
      'word-anagram': 'wordAnagram',
      'wordanagram': 'wordAnagram',
      'target-practice': 'targetPractice',
      'targetpractice': 'targetPractice',
      'memory-pairs': 'memoryPairs',
      'memorypairs': 'memoryPairs',
      'estimation-game': 'estimationGame',
      'estimationgame': 'estimationGame',
      'word-typing': 'wordTyping',
      'wordtyping': 'wordTyping',
      'reaction-timer': 'reactionTimer',
      'reactiontimer': 'reactionTimer',
      'slider-puzzle': 'sliderPuzzle',
      'sliderpuzzle': 'sliderPuzzle',
      'path-finder': 'pathFinder',
      'pathfinder': 'pathFinder',
      'simon-says': 'simonSays',
      'simonsays': 'simonSays',
      'count-house': 'countHouse',
      'counthouse': 'countHouse',
      'reaction-royale': 'reactionRoyale',
      'reactionroyale': 'reactionRoyale',
      'trivia-pulse': 'triviaPulse',
      'triviapulse': 'triviaPulse'
    };

    console.info('Registering', Object.keys(descriptiveAliases).length, 'descriptive aliases');
    for(const [alias, canonical] of Object.entries(descriptiveAliases)){
      g.MGKeyResolver.registerAlias(alias, canonical);
    }

    // Log summary
    const summary = g.MGKeyResolver.getAuditSummary();
    console.info('✅ Bootstrap complete:', summary);
    console.groupEnd();

    return summary;
  }

  /**
   * Perform startup audit after a delay
   * Checks if any keys in the system are unregistered
   */
  function performStartupAudit(){
    setTimeout(() => {
      console.group('[RegistryBootstrap] Startup Audit');
      
      const summary = g.MGKeyResolver.getAuditSummary();
      console.info('Canonical keys registered:', summary.canonicalCount);
      console.info('Total aliases registered:', summary.aliasCount);
      console.info('Unknown keys encountered:', summary.unknownCount);
      
      if(summary.unknownCount > 0){
        console.warn('⚠️ Unknown keys detected:', summary.unknownKeys);
      } else {
        console.info('✅ No unknown keys detected');
      }

      // Audit against MinigameSelector pool if available
      if(g.game && g.game.__minigamePool){
        const poolAudit = g.MGKeyResolver.auditUnknown(g.game.__minigamePool);
        if(poolAudit.unknown.length > 0){
          console.warn('⚠️ Pool contains unknown keys:', poolAudit.unknown);
        } else {
          console.info('✅ All pool keys are registered');
        }
      }

      console.groupEnd();
    }, 500);
  }

  // Auto-bootstrap when ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      bootstrap();
      performStartupAudit();
    }, { once: true });
  } else {
    bootstrap();
    performStartupAudit();
  }

  // Export for manual invocation
  g.MGRegistryBootstrap = {
    bootstrap,
    performStartupAudit
  };

  /**
   * Dev utility: Test key registration
   * Returns information about registered keys and sample selection
   */
  function testKeys(){
    const resolver = g.MGKeyResolver;
    const registry = g.MinigameRegistry;
    const selector = g.MinigameSelector;
    
    if(!resolver){
      return { error: 'MGKeyResolver not loaded' };
    }

    const summary = resolver.getAuditSummary();
    const result = {
      registered: summary.canonicalKeys,
      aliasCount: summary.aliasCount,
      unknownCount: summary.unknownCount,
      unknownKeys: summary.unknownKeys,
      sampleSelection: null
    };

    // Try to get a sample selection
    if(selector && registry){
      try {
        const sample = selector.selectNext(false);
        result.sampleSelection = sample;
        
        // Show aliases for the sample
        if(sample && resolver){
          result.sampleAliases = resolver.getAliases(sample);
        }
      } catch(e){
        result.sampleError = e.message;
      }
    }

    return result;
  }

  /**
   * Dev utility: Force render a specific key
   * Uses resolver and attempts render for QA
   */
  function forceKey(key){
    const resolver = g.MGKeyResolver;
    const registry = g.MinigameRegistry;
    
    if(!key){
      console.error('[ForceKey] No key provided');
      return { error: 'No key provided' };
    }

    const result = {
      requestedKey: key,
      resolvedKey: null,
      registered: false,
      inRegistry: false
    };

    // Try to resolve
    if(resolver){
      result.resolvedKey = resolver.resolveGameKey(key);
      result.registered = resolver.isRegistered(key);
    }

    // Check registry
    if(registry){
      const game = registry.getGame(result.resolvedKey || key);
      result.inRegistry = !!game;
      if(game){
        result.gameInfo = {
          name: game.name,
          implemented: game.implemented,
          retired: game.retired,
          mobileFriendly: game.mobileFriendly
        };
      }
    }

    console.info('[ForceKey] Analysis:', result);
    
    // Attempt render if possible
    if(result.resolvedKey && g.MiniGamesRegistry && typeof g.MiniGamesRegistry.render === 'function'){
      console.info('[ForceKey] To render, call: MiniGamesRegistry.render("' + result.resolvedKey + '", container, callback)');
    }

    return result;
  }

  // Export dev utilities to window for console access
  g.__mgTestKeys = testKeys;
  g.__mgForceKey = forceKey;

  console.info('[RegistryBootstrap] Module loaded');
  console.info('[RegistryBootstrap] Dev utilities: __mgTestKeys(), __mgForceKey(key)');

})(window);
