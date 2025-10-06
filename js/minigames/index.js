// MODULE: minigames/index.js
// Legacy bridge to new minigame system (Phase 8 cleanup)
// 
// This module provides backwards compatibility by overriding the legacy
// renderMinigame() function and mapping old game keys to new module keys.
// 
// The actual registry is now maintained in js/minigames/registry.js
// See docs/minigames.md for complete documentation.

(function(g){
  'use strict';

  /**
   * Get reference to the registry from registry.js
   * Falls back to empty object if not loaded yet
   */
  function getRegistry(){
    return (g.MinigameRegistry && g.MinigameRegistry.registry) || {};
  }

  /**
   * Get list of implemented minigames only
   * Delegates to MinigameRegistry if available
   */
  function getImplemented(){
    if(g.MinigameRegistry && typeof g.MinigameRegistry.getImplemented === 'function'){
      return g.MinigameRegistry.getImplemented();
    }
    // Fallback if registry not loaded
    const REGISTRY = getRegistry();
    return Object.keys(REGISTRY).filter(key => REGISTRY[key].implemented);
  }

  /**
   * Get random minigame (prefer new implemented, avoid retired)
   * @deprecated Use MinigameSelector.selectNext() for better non-repeating selection
   * @param {Array} historyArray - Optional history for weighting
   */
  function getRandom(historyArray){
    // Delegate to MinigameRegistry if available
    if(g.MinigameRegistry && typeof g.MinigameRegistry.getRandom === 'function'){
      return g.MinigameRegistry.getRandom(historyArray);
    }
    
    // Fallback implementation
    const REGISTRY = getRegistry();
    const implemented = getImplemented();
    const nonRetired = implemented.filter(key => REGISTRY[key] && !REGISTRY[key].retired);
    
    if(nonRetired.length > 0){
      return nonRetired[Math.floor(Math.random() * nonRetired.length)];
    }
    
    if(implemented.length > 0){
      return implemented[Math.floor(Math.random() * implemented.length)];
    }
    
    // Last resort
    const all = Object.keys(REGISTRY);
    return all[Math.floor(Math.random() * all.length)] || 'quickTap';
  }

  /**
   * Render a minigame by key
   * Delegates to MinigameRegistry if available, otherwise renders directly
   * Enhanced with key resolution and fallback handling
   * 
   * Fallback order:
   * 1. Try registry/alias system (MGKeyResolver)
   * 2. Try legacy minigame map (LEGACY_MINIGAME_MAP)
   * 3. Final fallback to quickTap
   * 
   * @param {string} key - Game key (e.g., 'quickTap', 'memoryMatch')
   * @param {HTMLElement} container - Container element
   * @param {Function} onComplete - Callback function(score)
   */
  function render(key, container, onComplete){
    // Resolve key through resolver if available
    let resolvedKey = key;
    let resolutionMethod = 'none';
    
    if(g.MGKeyResolver){
      const resolved = g.MGKeyResolver.resolveGameKey(key);
      if(!resolved){
        console.warn('[MiniGames] Key not in registry/resolver:', key);
        
        // FALLBACK: Try legacy minigame map
        if(g.MinigameCompatBridge){
          const legacyResolved = g.MinigameCompatBridge.resolveToModule(key);
          if(legacyResolved){
            console.info('[MiniGames] ✓ Resolved via legacy minigame map:', key, '→', legacyResolved);
            resolvedKey = legacyResolved;
            resolutionMethod = 'legacy-map';
            
            if(g.MinigameTelemetry){
              g.MinigameTelemetry.logEvent('minigame.resolution.legacy-map', {
                requestedKey: key,
                resolvedKey: legacyResolved
              });
            }
          } else {
            console.warn('[MiniGames] Key not in legacy map either, using fallback');
            if(g.MinigameTelemetry){
              g.MinigameTelemetry.logEvent('minigame.key.unknown', {
                requestedKey: key,
                atPhase: 'render'
              });
              g.MinigameTelemetry.logEvent('minigame.fallback.used', {
                reason: 'unknown',
                requestedKey: key,
                fallbackKey: 'quickTap'
              });
            }
            resolvedKey = 'quickTap';
            resolutionMethod = 'final-fallback';
          }
        } else {
          // No compat bridge, final fallback
          console.warn('[MiniGames] No compat bridge available, using quickTap');
          resolvedKey = 'quickTap';
          resolutionMethod = 'final-fallback';
        }
      } else {
        resolvedKey = resolved;
        resolutionMethod = 'registry';
        if(resolved !== key){
          console.info('[MiniGames] Resolved alias:', key, '→', resolved);
        }
      }
    } else {
      // No resolver, try legacy map directly
      if(g.MinigameCompatBridge){
        const legacyResolved = g.MinigameCompatBridge.resolveToModule(key);
        if(legacyResolved){
          console.info('[MiniGames] Resolved via legacy map (no resolver):', key, '→', legacyResolved);
          resolvedKey = legacyResolved;
          resolutionMethod = 'legacy-map';
        }
      }
    }
    
    // Delegate to MinigameRegistry if available
    if(g.MinigameRegistry && typeof g.MinigameRegistry.render === 'function'){
      return g.MinigameRegistry.render(resolvedKey, container, onComplete);
    }
    
    // Fallback rendering (if registry.js not loaded yet)
    const REGISTRY = getRegistry();
    const entry = REGISTRY[resolvedKey];
    
    if(!entry){
      console.error('[MiniGames] Unknown minigame:', resolvedKey);
      
      // FALLBACK: Try legacy minigame map one more time
      if(resolutionMethod !== 'legacy-map' && g.MinigameCompatBridge){
        const legacyResolved = g.MinigameCompatBridge.resolveToModule(key);
        if(legacyResolved && legacyResolved !== resolvedKey){
          console.info('[MiniGames] ✓ Second attempt via legacy map:', key, '→', legacyResolved);
          return render(legacyResolved, container, onComplete);
        }
      }
      
      if(g.MinigameTelemetry){
        g.MinigameTelemetry.logEvent('minigame.fallback.used', {
          reason: 'not-in-registry',
          requestedKey: key,
          resolvedKey: resolvedKey,
          fallbackKey: 'quickTap'
        });
      }
      
      // Try quickTap as final fallback
      if(resolvedKey !== 'quickTap' && REGISTRY['quickTap']){
        console.warn('[MiniGames] Falling back to quickTap');
        return render('quickTap', container, onComplete);
      }
      
      container.innerHTML = '<div style="padding:20px;text-align:center;"><p style="color:#e3ecf5;">Unknown minigame. Please refresh.</p></div>';
      return;
    }

    // Check if module is loaded
    if(g.MiniGames && g.MiniGames[resolvedKey] && typeof g.MiniGames[resolvedKey].render === 'function'){
      try {
        g.MiniGames[resolvedKey].render(container, onComplete);
      } catch(error){
        console.error(`[MiniGames] Error rendering "${resolvedKey}":`, error);
        if(g.MinigameTelemetry){
          g.MinigameTelemetry.logEvent('minigame.fallback.used', {
            reason: 'error',
            gameKey: resolvedKey,
            error: error.message
          });
        }
        container.innerHTML = `<div style="padding:20px;text-align:center;"><p>Minigame "${entry.name}" failed to load.</p><button class="btn" onclick="this.parentElement.parentElement.innerHTML='';(${onComplete})(50)">Skip</button></div>`;
      }
    } else {
      container.innerHTML = `<div style="padding:20px;text-align:center;"><p>Minigame "${entry.name || resolvedKey}" is loading...</p></div>`;
    }
  }

  /**
   * Bridge to legacy renderMinigame system
   * Overrides the global renderMinigame function to map legacy keys to new modules
   */
  function bridgeToLegacy(){
    if(typeof g.renderMinigame === 'function'){
      // Save original for reference
      g.__originalRenderMinigame = g.renderMinigame;
    }

    /**
     * Override renderMinigame with new system
     * Maps legacy game type keys to new module keys
     * 
     * @param {string} type - Legacy game type key
     * @param {HTMLElement} host - Container element
     * @param {Function} onSubmit - Callback function(score)
     */
    g.renderMinigame = function(type, host, onSubmit){
      // Complete mapping of legacy game keys to new module keys
      const legacyMap = {
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

      // Map legacy key to new key
      const newType = legacyMap[type] || type;
      
      // Render using new system
      render(newType, host, onSubmit);
    };
  }

  /**
   * Export legacy compatibility API
   * Note: Prefer using MinigameRegistry, MinigameSelector directly for new code
   */
  if(!g.MiniGamesRegistry){
    g.MiniGamesRegistry = {};
  }
  
  // Add compatibility methods if they don't exist
  if(!g.MiniGamesRegistry.getImplemented){
    g.MiniGamesRegistry.getImplemented = getImplemented;
  }
  if(!g.MiniGamesRegistry.getRandom){
    g.MiniGamesRegistry.getRandom = getRandom;
  }
  if(!g.MiniGamesRegistry.render){
    g.MiniGamesRegistry.render = render;
  }

  // Auto-bridge to legacy system
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bridgeToLegacy, { once: true });
  } else {
    bridgeToLegacy();
  }

})(window);
