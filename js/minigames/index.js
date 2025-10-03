// MODULE: minigames/index.js
// Minigames registry for mobile-friendly competitions

(function(g){
  'use strict';

  // Registry of all available minigames
  const REGISTRY = {
    // Fully implemented
    quickTap: {
      name: 'Quick Tap Race',
      description: 'Tap as many times as possible',
      implemented: true,
      module: 'quick-tap.js'
    },
    reactionTimer: {
      name: 'Reaction Timer',
      description: 'React as fast as you can',
      implemented: true,
      module: 'reaction-timer.js'
    },
    triviaQuiz: {
      name: 'Trivia Quiz',
      description: 'Answer Big Brother trivia',
      implemented: true,
      module: 'trivia-quiz.js'
    },
    
    // Scaffolds (coming soon)
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

  // Get random minigame (prefer implemented)
  function getRandom(){
    const implemented = getImplemented();
    if(implemented.length > 0){
      return implemented[Math.floor(Math.random() * implemented.length)];
    }
    // Fall back to any
    const all = Object.keys(REGISTRY);
    return all[Math.floor(Math.random() * all.length)];
  }

  // Render a minigame by key
  function render(key, container, onComplete){
    const entry = REGISTRY[key];
    if(!entry){
      console.error('[MiniGames] Unknown minigame:', key);
      // Fallback to first implemented
      const impl = getImplemented();
      if(impl.length > 0){
        return render(impl[0], container, onComplete);
      }
      return;
    }

    // Check if module is loaded
    if(g.MiniGames && g.MiniGames[key] && typeof g.MiniGames[key].render === 'function'){
      g.MiniGames[key].render(container, onComplete);
    } else {
      // Module not loaded, show error
      container.innerHTML = `<div style="padding:20px;text-align:center;"><p>Minigame "${entry.name}" failed to load.</p><button class="btn" onclick="this.parentElement.parentElement.innerHTML='';(${onComplete})(50)">Skip</button></div>`;
    }
  }

  // Bridge to legacy renderMinigame system
  function bridgeToLegacy(){
    if(typeof g.renderMinigame === 'function'){
      // Save original
      g.__originalRenderMinigame = g.renderMinigame;
    }

    // Override with new system (for new minigame types)
    const originalFn = g.renderMinigame;
    g.renderMinigame = function(type, host, onSubmit){
      // Map legacy types to new minigames
      const legacyMap = {
        'clicker': 'quickTap',
        'reaction': 'reactionTimer',
        'trivia': 'triviaQuiz'
      };

      const newType = legacyMap[type];
      if(newType && REGISTRY[newType]){
        render(newType, host, onSubmit);
      } else if(originalFn){
        // Fall back to original for old types
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
