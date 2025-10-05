// MODULE: minigames/index.js
// Legacy minigames registry and bridge to new Phase 1 system
// This module provides backwards compatibility while the new system (registry.js,
// selector.js, scoring.js, mobile-utils.js) is being rolled out.
// Use cfg.useNewMinigames=true to enable the new non-repeating pool system.

(function(g){
  'use strict';

  // Registry of all available minigames
  const REGISTRY = {
    // Phase 1: Fully Implemented Mobile-First Games
    countHouse: {
      name: 'Count House',
      description: 'Count objects quickly and accurately',
      implemented: true,
      module: 'count-house.js'
    },
    reactionRoyale: {
      name: 'Reaction Royale',
      description: 'Multi-round reaction challenge',
      implemented: true,
      module: 'reaction-royale.js'
    },
    triviaPulse: {
      name: 'Trivia Pulse',
      description: 'Time-pressured Big Brother trivia',
      implemented: true,
      module: 'trivia-pulse.js'
    },
    
    // Legacy: Still available but not preferred
    quickTap: {
      name: 'Quick Tap Race',
      description: 'Tap as many times as possible',
      implemented: true,
      retired: false,
      module: 'quick-tap.js'
    },
    reactionTimer: {
      name: 'Reaction Timer',
      description: 'React as fast as you can',
      implemented: true,
      retired: false,
      module: 'reaction-timer.js'
    },
    triviaQuiz: {
      name: 'Trivia Quiz',
      description: 'Answer Big Brother trivia',
      implemented: true,
      retired: false,
      module: 'trivia-quiz.js'
    },
    
    // Phase 1: Scaffolds (coming soon)
    oteviator: {
      name: 'Oteviator',
      description: 'Elevator timing challenge',
      implemented: false,
      module: 'oteviator.js'
    },
    comixSpot: {
      name: 'Comix Spot',
      description: 'Spot differences in comic panels',
      implemented: false,
      module: 'comix-spot.js'
    },
    holdWall: {
      name: 'Hold Wall',
      description: 'Endurance wall hold',
      implemented: false,
      module: 'hold-wall.js'
    },
    slipperyShuttle: {
      name: 'Slippery Shuttle',
      description: 'Navigate slippery platforms',
      implemented: false,
      module: 'slippery-shuttle.js'
    },
    memoryZipline: {
      name: 'Memory Zipline',
      description: 'Remember zipline path sequence',
      implemented: false,
      module: 'memory-zipline.js'
    },
    socialStrings: {
      name: 'Social Strings',
      description: 'Connect relationship puzzle',
      implemented: false,
      module: 'social-strings.js'
    },
    swipeMaze: {
      name: 'Swipe Maze',
      description: 'Navigate maze with swipes',
      implemented: false,
      module: 'swipe-maze.js'
    },
    
    // Other existing scaffolds
    memoryMatch: {
      name: 'Memory Match',
      description: 'Match pairs of cards',
      implemented: false,
      module: 'memory-match.js'
    },
    sliderPuzzle: {
      name: 'Slider Puzzle',
      description: 'Arrange tiles in order',
      implemented: false,
      module: 'slider-puzzle.js'
    },
    sequenceMemory: {
      name: 'Sequence Memory',
      description: 'Remember patterns',
      implemented: false,
      module: 'sequence-memory.js'
    },
    colorMatch: {
      name: 'Color Match',
      description: 'Match colors quickly',
      implemented: false,
      module: 'color-match.js'
    },
    towerStack: {
      name: 'Tower Stack',
      description: 'Stack blocks carefully',
      implemented: false,
      module: 'tower-stack.js'
    },
    mathBlitz: {
      name: 'Math Blitz',
      description: 'Solve math problems fast',
      implemented: false,
      module: 'math-blitz.js'
    },
    guessNumber: {
      name: 'Guess The Number',
      description: 'Find the hidden number',
      implemented: false,
      module: 'guess-number.js'
    },
    miniMaze: {
      name: 'Mini Maze',
      description: 'Navigate to the exit',
      implemented: false,
      module: 'mini-maze.js'
    },
    spotDifference: {
      name: 'Spot The Difference',
      description: 'Find differences in images',
      implemented: false,
      module: 'spot-difference.js'
    },
    wordBuilder: {
      name: 'Word Builder',
      description: 'Make words from letters',
      implemented: false,
      module: 'word-builder.js'
    },
    hiddenObject: {
      name: 'Hidden Object',
      description: 'Find hidden items',
      implemented: false,
      module: 'hidden-object.js'
    },
    balanceGame: {
      name: 'Balance Game',
      description: 'Keep balance as long as possible',
      implemented: false,
      module: 'balance-game.js'
    }
  };

  // Get list of implemented minigames only
  function getImplemented(){
    return Object.keys(REGISTRY).filter(key => REGISTRY[key].implemented);
  }

  // Get random minigame (prefer new implemented, avoid retired)
  // Optional historyArray parameter for recent-history weighting
  function getRandom(historyArray){
    const implemented = getImplemented();
    
    // Filter out retired games if possible
    const nonRetired = implemented.filter(key => !REGISTRY[key].retired);
    
    let pool = nonRetired.length > 0 ? nonRetired : (implemented.length > 0 ? implemented : Object.keys(REGISTRY));
    
    // Apply history weighting if provided
    if(historyArray && Array.isArray(historyArray) && historyArray.length > 0){
      const recentGames = historyArray.slice(-3);
      const lastGame = historyArray[historyArray.length - 1];
      
      // Build weighted pool (penalize recently used)
      const weighted = [];
      for(const game of pool){
        const recentCount = recentGames.filter(g => g === game).length;
        const weight = Math.max(1, 5 - recentCount * 2);
        for(let i = 0; i < weight; i++){
          weighted.push(game);
        }
      }
      
      // Pick from weighted pool
      let chosen = weighted[Math.floor(Math.random() * weighted.length)];
      
      // Avoid immediate repeat if pool has >1 game
      if(chosen === lastGame && pool.length > 1){
        const alternatives = pool.filter(g => g !== lastGame);
        if(alternatives.length > 0){
          const altWeighted = [];
          for(const game of alternatives){
            const recentCount = recentGames.filter(g => g === game).length;
            const weight = Math.max(1, 5 - recentCount * 2);
            for(let i = 0; i < weight; i++){
              altWeighted.push(game);
            }
          }
          chosen = altWeighted[Math.floor(Math.random() * altWeighted.length)];
        }
      }
      
      return chosen;
    }
    
    // No history provided, use original logic
    if(nonRetired.length > 0){
      // Prefer new Phase 1 games (80% chance)
      const phase1Games = ['countHouse', 'reactionRoyale', 'triviaPulse'];
      const availablePhase1 = phase1Games.filter(key => nonRetired.includes(key));
      
      if(availablePhase1.length > 0 && Math.random() < 0.8){
        return availablePhase1[Math.floor(Math.random() * availablePhase1.length)];
      }
      
      return nonRetired[Math.floor(Math.random() * nonRetired.length)];
    }
    
    // Fall back to any implemented (including retired if necessary)
    if(implemented.length > 0){
      return implemented[Math.floor(Math.random() * implemented.length)];
    }
    
    // Last resort: any game
    const all = Object.keys(REGISTRY);
    return all[Math.floor(Math.random() * all.length)];
  }

  // Render a minigame by key
  function render(key, container, onComplete){
    const entry = REGISTRY[key];
    if(!entry){
      console.error('[MiniGames] Unknown minigame:', key);
      
      // Log error to telemetry
      if(g.MinigameTelemetry){
        g.MinigameTelemetry.logError(key, 'Unknown minigame key', {});
      }
      
      // Fallback to first implemented
      const impl = getImplemented();
      if(impl.length > 0){
        return render(impl[0], container, onComplete);
      }
      return;
    }

    // Use error handler if available
    if(g.MinigameErrorHandler){
      const metadata = {
        phase: g.game?.phase,
        playerId: g.game?.humanId,
        week: g.game?.week
      };
      
      g.MinigameErrorHandler.safeRender(key, container, onComplete, metadata);
    } else {
      // Fallback to direct rendering (legacy mode)
      // Check if module is loaded
      if(g.MiniGames && g.MiniGames[key] && typeof g.MiniGames[key].render === 'function'){
        try {
          g.MiniGames[key].render(container, onComplete);
          
          // Log start to telemetry
          if(g.MinigameTelemetry){
            g.MinigameTelemetry.logStart(key, {
              playerId: g.game?.humanId,
              phase: g.game?.phase,
              week: g.game?.week
            });
          }
        } catch(error){
          console.error(`[MiniGames] Error rendering "${key}":`, error);
          
          // Log error
          if(g.MinigameTelemetry){
            g.MinigameTelemetry.logError(key, error, {});
          }
          
          // Module not loaded, show error
          container.innerHTML = `<div style="padding:20px;text-align:center;"><p>Minigame "${entry.name}" failed to load.</p><button class="btn" onclick="this.parentElement.parentElement.innerHTML='';(${onComplete})(50)">Skip</button></div>`;
        }
      } else {
        // Module not loaded, show error
        container.innerHTML = `<div style="padding:20px;text-align:center;"><p>Minigame "${entry.name}" failed to load.</p><button class="btn" onclick="this.parentElement.parentElement.innerHTML='';(${onComplete})(50)">Skip</button></div>`;
      }
    }
  }

  // Bridge to legacy renderMinigame system
  function bridgeToLegacy(){
    if(typeof g.renderMinigame === 'function'){
      // Save original
      g.__originalRenderMinigame = g.renderMinigame;
    }

    // Override with new system - map ALL legacy game keys to new modules
    const originalFn = g.renderMinigame;
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

      const newType = legacyMap[type];
      if(newType && REGISTRY[newType]){
        // Use new module system
        render(newType, host, onSubmit);
      } else if(originalFn){
        // Fall back to original for old types (shouldn't happen after migration)
        originalFn(type, host, onSubmit);
      } else {
        // No fallback, use first available
        const impl = getImplemented();
        if(impl.length > 0){
          render(impl[0], host, onSubmit);
        }
      }
    };
  }

  // Export API
  g.MiniGamesRegistry = {
    registry: REGISTRY,
    getImplemented,
    getRandom,
    render
  };

  // Auto-bridge to legacy system
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bridgeToLegacy, { once: true });
  } else {
    bridgeToLegacy();
  }

})(window);
