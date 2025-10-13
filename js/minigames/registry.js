// MODULE: minigames/registry.js
// Unified minigame registry with comprehensive metadata for Phase 1 refactor
// Each game entry includes: key, name, type, scoring, mobile-friendly flags, etc.

(function(g){
  'use strict';

  /**
   * Minigame registry with comprehensive metadata
   * 
   * Metadata fields:
   * - key: unique identifier for the game
   * - name: display name
   * - description: brief description
   * - type: category (reaction, memory, puzzle, trivia, endurance)
   * - scoring: scoring type (time, accuracy, hybrid, endurance)
   * - mobileFriendly: true if fully optimized for touch/tap
   * - implemented: true if game is ready to play
   * - module: filename of the game module
   * - minScore: minimum possible score (default 0)
   * - maxScore: maximum possible score (default 100)
   * - retired: true if game should not be selected anymore
   */
  const REGISTRY = {
    // Phase 1: Fully Implemented Mobile-First Games
    countHouse: {
      key: 'countHouse',
      name: 'Count House',
      description: 'Count objects appearing on screen quickly and accurately',
      type: 'puzzle',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'count-house.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    

    
    triviaPulse: {
      key: 'triviaPulse',
      name: 'Trivia Pulse',
      description: 'Time-pressured Big Brother trivia questions',
      type: 'trivia',
      scoring: 'hybrid',
      mobileFriendly: true,
      implemented: true,
      module: 'trivia-pulse.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    quickTap: {
      key: 'quickTap',
      name: 'Quick Tap Race',
      description: 'Tap as many times as possible within time limit',
      type: 'reaction',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'quick-tap.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    // Migrated Legacy Games (now in module format)
    memoryMatch: {
      key: 'memoryMatch',
      name: 'Memory Colors',
      description: 'Watch and repeat color sequence',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'memory-match.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    

    
    timingBar: {
      key: 'timingBar',
      name: 'Timing Bar',
      description: 'Stop the bar near center for high score',
      type: 'reaction',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'timing-bar.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    

    
    patternMatch: {
      key: 'patternMatch',
      name: 'Pattern Match',
      description: 'Match the pattern of shapes',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'pattern-match.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    wordAnagram: {
      key: 'wordAnagram',
      name: 'Word Anagram',
      description: 'Unscramble Big Brother words',
      type: 'puzzle',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'word-anagram.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    targetPractice: {
      key: 'targetPractice',
      name: 'Target Practice',
      description: 'Click moving targets quickly',
      type: 'reaction',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'target-practice.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    

    
    estimationGame: {
      key: 'estimationGame',
      name: 'Estimation',
      description: 'Count dots and guess the total',
      type: 'puzzle',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'estimation-game.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    // Retired Legacy Games (implemented but not preferred)
    wordTyping: {
      key: 'wordTyping',
      name: 'Word Typing',
      description: 'Type passage accurately',
      type: 'puzzle',
      scoring: 'hybrid',
      mobileFriendly: false,
      implemented: true,
      module: 'word-typing.js',
      minScore: 0,
      maxScore: 100,
      retired: true,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    

    
    sliderPuzzle: {
      key: 'sliderPuzzle',
      name: 'Slider Precision',
      description: 'Set slider to exact value',
      type: 'reaction',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'slider-puzzle.js',
      minScore: 0,
      maxScore: 100,
      retired: true,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    pathFinder: {
      key: 'pathFinder',
      name: 'Path Finder',
      description: 'Remember directional path sequence',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'path-finder.js',
      minScore: 0,
      maxScore: 100,
      retired: true,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    simonSays: {
      key: 'simonSays',
      name: 'Simon Says',
      description: 'Press arrow key sequence',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: false,
      implemented: true,
      module: 'simon-says.js',
      minScore: 0,
      maxScore: 100,
      retired: true,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    // Phase 1: Scaffolds (coming soon)
    oteviator: {
      key: 'oteviator',
      name: 'Oteviator',
      description: 'Elevator timing challenge - press at the perfect moment',
      type: 'reaction',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'oteviator.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    comixSpot: {
      key: 'comixSpot',
      name: 'Comix Spot',
      description: 'Spot differences in comic panels quickly',
      type: 'puzzle',
      scoring: 'hybrid',
      mobileFriendly: true,
      implemented: false,
      module: 'comix-spot.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    holdWall: {
      key: 'holdWall',
      name: 'Hold Wall',
      description: 'Endurance wall hold - last as long as possible',
      type: 'endurance',
      scoring: 'endurance',
      mobileFriendly: true,
      implemented: false,
      module: 'hold-wall.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    slipperyShuttle: {
      key: 'slipperyShuttle',
      name: 'Slippery Shuttle',
      description: 'Navigate slippery platforms without falling',
      type: 'puzzle',
      scoring: 'time',
      mobileFriendly: true,
      implemented: false,
      module: 'slippery-shuttle.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    memoryZipline: {
      key: 'memoryZipline',
      name: 'Memory Zipline',
      description: 'Remember and repeat zipline path sequence',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'memory-zipline.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    // New Mobile-Friendly Games (placeholders)
    swipeMaze: {
      key: 'swipeMaze',
      name: 'Swipe Maze',
      description: 'Navigate through a maze using swipe gestures',
      type: 'puzzle',
      scoring: 'time',
      mobileFriendly: true,
      implemented: false,
      module: 'swipe-maze.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer']
    },
    
    patternTrace: {
      key: 'patternTrace',
      name: 'Pattern Trace',
      description: 'Trace the pattern shown on screen',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'placeholder.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'autumn']
    },
    
    audioMatch: {
      key: 'audioMatch',
      name: 'Audio Match',
      description: 'Match sounds to their sources',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'placeholder.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['summer', 'winter']
    },
    
    balanceBridge: {
      key: 'balanceBridge',
      name: 'Balance Bridge',
      description: 'Keep balance while crossing a virtual bridge',
      type: 'reaction',
      scoring: 'endurance',
      mobileFriendly: true,
      implemented: false,
      module: 'placeholder.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn']
    },
    
    colorMatch: {
      key: 'colorMatch',
      name: 'Color Match',
      description: 'Match colors quickly and accurately',
      type: 'reaction',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'color-match.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    colorMix: {
      key: 'colorMix',
      name: 'Color Mix',
      description: 'Mix colors to match the target shade',
      type: 'puzzle',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'placeholder.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    wordLadder: {
      key: 'wordLadder',
      name: 'Word Ladder',
      description: 'Change one word to another by changing one letter at a time',
      type: 'puzzle',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'placeholder.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['autumn', 'winter']
    },
    
    rhythmTap: {
      key: 'rhythmTap',
      name: 'Rhythm Tap',
      description: 'Tap to the rhythm of the beat',
      type: 'reaction',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'placeholder.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['summer', 'autumn']
    },
    
    spotTheDifference: {
      key: 'spotTheDifference',
      name: 'Spot The Difference',
      description: 'Find differences between two similar images',
      type: 'puzzle',
      scoring: 'hybrid',
      mobileFriendly: true,
      implemented: false,
      module: 'placeholder.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    socialStrings: {
      key: 'socialStrings',
      name: 'Social Strings',
      description: 'Connect players with social relationships',
      type: 'puzzle',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'social-strings.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    logicLocks: {
      key: 'logicLocks',
      name: 'Logic Locks',
      description: 'Solve logic puzzles to unlock the vault',
      type: 'puzzle',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'logic-locks.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['autumn', 'winter']
    },
    
    snake: {
      key: 'snake',
      name: 'Snake',
      description: 'Classic snake game - eat food and grow',
      type: 'reaction',
      scoring: 'endurance',
      mobileFriendly: true,
      implemented: false,
      module: 'snake.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    astroJumper: {
      key: 'astroJumper',
      name: 'Astro Jumper',
      description: 'Jump through space avoiding obstacles',
      type: 'reaction',
      scoring: 'endurance',
      mobileFriendly: true,
      implemented: false,
      module: 'placeholder.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'winter']
    },
    

    
    cardClash: {
      key: 'cardClash',
      name: 'Card Clash',
      description: 'Memory card matching game',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'card-clash.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    chainReaction: {
      key: 'chainReaction',
      name: 'Chain Reaction',
      description: 'Create chain combos puzzle',
      type: 'puzzle',
      scoring: 'hybrid',
      mobileFriendly: true,
      implemented: true,
      module: 'chain-reaction.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    clockStopper: {
      key: 'clockStopper',
      name: 'Clock Stopper',
      description: 'Stop the clock at exact times',
      type: 'reaction',
      scoring: 'time',
      mobileFriendly: true,
      implemented: true,
      module: 'clock-stopper.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    

    

    

    
    flashFlood: {
      key: 'flashFlood',
      name: 'Flash Flood',
      description: 'React to flash patterns quickly',
      type: 'reaction',
      scoring: 'time',
      mobileFriendly: true,
      implemented: true,
      module: 'flash-flood.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    

    
    gridLock: {
      key: 'gridLock',
      name: 'Grid Lock',
      description: 'Unlock grid patterns puzzle',
      type: 'puzzle',
      scoring: 'hybrid',
      mobileFriendly: true,
      implemented: true,
      module: 'grid-lock.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    

    

    
    keyMaster: {
      key: 'keyMaster',
      name: 'Key Master',
      description: 'Unlock sequences puzzle',
      type: 'puzzle',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'key-master.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    

    

  };

  /**
   * Get all registered minigames
   * @returns {Object} The complete registry
   */
  function getRegistry(){
    return REGISTRY;
  }

  /**
   * Get a specific minigame by key
   * @param {string} key - The minigame key
   * @returns {Object|null} The minigame metadata or null
   */
  function getGame(key){
    return REGISTRY[key] || null;
  }

  /**
   * Get all game keys
   * @returns {Array<string>} Array of all game keys
   */
  function getAllKeys(){
    return Object.keys(REGISTRY);
  }

  /**
   * Get games filtered by criteria
   * @param {Object} filters - Filter options
   * @param {boolean} filters.implemented - Only implemented games
   * @param {boolean} filters.mobileFriendly - Only mobile-friendly games
   * @param {boolean} filters.excludeRetired - Exclude retired games
   * @param {string} filters.type - Filter by game type
   * @returns {Array<string>} Array of matching game keys
   */
  function getGamesByFilter(filters = {}){
    const keys = getAllKeys();
    
    return keys.filter(key => {
      const game = REGISTRY[key];
      
      // Filter by implemented status
      if(filters.implemented !== undefined && game.implemented !== filters.implemented){
        return false;
      }
      
      // Filter by mobile-friendly
      if(filters.mobileFriendly !== undefined && game.mobileFriendly !== filters.mobileFriendly){
        return false;
      }
      
      // Filter retired games
      if(filters.excludeRetired && game.retired){
        return false;
      }
      
      // Filter by type
      if(filters.type && game.type !== filters.type){
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get all implemented games ready to play
   * @param {boolean} excludeRetired - Whether to exclude retired games
   * @returns {Array<string>} Array of implemented game keys
   */
  function getImplementedGames(excludeRetired = true){
    return getGamesByFilter({
      implemented: true,
      excludeRetired: excludeRetired
    });
  }

  /**
   * Get all mobile-friendly games
   * @returns {Array<string>} Array of mobile-friendly game keys
   */
  function getMobileFriendlyGames(){
    return getGamesByFilter({
      mobileFriendly: true,
      implemented: true,
      excludeRetired: true
    });
  }

  /**
   * Get games by type
   * @param {string} type - Game type (reaction, memory, puzzle, trivia, endurance)
   * @returns {Array<string>} Array of matching game keys
   */
  function getGamesByType(type){
    return getGamesByFilter({
      type: type,
      implemented: true,
      excludeRetired: true
    });
  }

  // ============================================================================
  // RUNTIME HELPERS (PR1: Non-breaking additions for dynamic loading)
  // ============================================================================

  /**
   * Register a game at runtime
   * Allows modules to register themselves dynamically
   * @param {Object} meta - Game metadata (must include 'key' field)
   * @returns {boolean} True if registration succeeded
   */
  function registerGame(meta){
    try {
      if(!meta || !meta.key){
        console.error('[MinigameRegistry] registerGame: metadata must include "key" field');
        return false;
      }

      const key = meta.key;

      // Check if already registered
      if(REGISTRY[key]){
        console.warn(`[MinigameRegistry] Game "${key}" is already registered, skipping`);
        return false;
      }

      // Add to registry with defaults
      REGISTRY[key] = {
        key: key,
        name: meta.name || key,
        description: meta.description || '',
        type: meta.type || 'puzzle',
        scoring: meta.scoring || 'accuracy',
        mobileFriendly: meta.mobileFriendly !== false,
        implemented: meta.implemented !== false,
        module: meta.module || `${key}.js`,
        minScore: meta.minScore || 0,
        maxScore: meta.maxScore || 100,
        retired: meta.retired || false,
        seasons: meta.seasons || ['spring', 'summer', 'autumn', 'winter']
      };

      console.info(`[MinigameRegistry] Registered game: ${key}`);
      return true;
    } catch(error){
      console.error('[MinigameRegistry] registerGame error:', error);
      return false;
    }
  }

  /**
   * Check if a module is loaded in window.MiniGames
   * @param {string} key - Game key
   * @returns {boolean} True if module is loaded
   */
  function isModuleLoaded(key){
    try {
      return !!(g.MiniGames && g.MiniGames[key] && typeof g.MiniGames[key].render === 'function');
    } catch(error){
      console.error(`[MinigameRegistry] isModuleLoaded error for "${key}":`, error);
      return false;
    }
  }

  /**
   * Load a module dynamically (with script-tag fallback)
   * @param {string} key - Game key
   * @returns {Promise<boolean>} Resolves to true if loaded successfully
   */
  function loadModule(key){
    return new Promise((resolve) => {
      try {
        const entry = REGISTRY[key];
        if(!entry){
          console.warn(`[MinigameRegistry] loadModule: "${key}" not in registry`);
          resolve(false);
          return;
        }

        // Already loaded?
        if(isModuleLoaded(key)){
          console.info(`[MinigameRegistry] Module "${key}" already loaded`);
          resolve(true);
          return;
        }

        // Try dynamic import first
        const modulePath = `js/minigames/${entry.module}`;
        
        import(modulePath)
          .then(() => {
            // Check if loaded successfully
            if(isModuleLoaded(key)){
              console.info(`[MinigameRegistry] Module "${key}" loaded via import`);
              resolve(true);
            } else {
              console.warn(`[MinigameRegistry] Module "${key}" imported but not registered`);
              resolve(false);
            }
          })
          .catch((importError) => {
            console.warn(`[MinigameRegistry] Dynamic import failed for "${key}", trying script tag:`, importError.message);
            
            // Fallback: script tag injection
            const script = document.createElement('script');
            script.src = modulePath;
            script.onload = () => {
              if(isModuleLoaded(key)){
                console.info(`[MinigameRegistry] Module "${key}" loaded via script tag`);
                resolve(true);
              } else {
                console.error(`[MinigameRegistry] Module "${key}" script loaded but not registered`);
                resolve(false);
              }
            };
            script.onerror = (scriptError) => {
              console.error(`[MinigameRegistry] Failed to load "${key}" via script tag:`, scriptError);
              resolve(false);
            };
            document.head.appendChild(script);
          });
      } catch(error){
        console.error(`[MinigameRegistry] loadModule error for "${key}":`, error);
        resolve(false);
      }
    });
  }

  /**
   * Unified render API - renders a minigame by key
   * Invokes MinigameLifecycle hooks if available
   * Delegates to module implementations (window.MiniGames or window.MinigameModules)
   * @param {string} key - Game key
   * @param {HTMLElement} host - Container element
   * @param {Function} onComplete - Completion callback function(score)
   * @param {Object} options - Optional game options (debugMode, competitionMode, etc.)
   */
  function render(key, host, onComplete, options = {}){
    try {
      const entry = REGISTRY[key];

      // Check if game exists in registry
      if(!entry){
        console.error(`[MinigameRegistry] render: Game "${key}" not in registry`);
        host.innerHTML = `<div style="padding:20px;text-align:center;"><p style="color:#ff6b9d;">Error: Unknown minigame "${key}"</p><p style="color:#95a9c0;font-size:0.9rem;">Please refresh the page or contact support.</p></div>`;
        
        // Auto-fail after a delay
        setTimeout(() => {
          if(typeof onComplete === 'function'){
            onComplete(0);
          }
        }, 3000);
        return;
      }

      // Invoke lifecycle: beforeRender
      if(g.MinigameLifecycle && typeof g.MinigameLifecycle.beforeRender === 'function'){
        try {
          g.MinigameLifecycle.beforeRender(key, host, options);
        } catch(lifecycleError){
          console.warn('[MinigameRegistry] MinigameLifecycle.beforeRender error:', lifecycleError);
        }
      }

      // Try window.MinigameModules first (new standard)
      if(g.MinigameModules && g.MinigameModules[key] && typeof g.MinigameModules[key].render === 'function'){
        console.info(`[MinigameRegistry] Rendering "${key}" via MinigameModules`);
        
        // Wrap onComplete to invoke lifecycle
        const wrappedOnComplete = (score) => {
          if(g.MinigameLifecycle && typeof g.MinigameLifecycle.afterRender === 'function'){
            try {
              g.MinigameLifecycle.afterRender(key, host, score, options);
            } catch(lifecycleError){
              console.warn('[MinigameRegistry] MinigameLifecycle.afterRender error:', lifecycleError);
            }
          }
          
          if(typeof onComplete === 'function'){
            onComplete(score);
          }
        };
        
        g.MinigameModules[key].render(host, wrappedOnComplete, options);
        return;
      }

      // Fallback to window.MiniGames (legacy standard)
      if(g.MiniGames && g.MiniGames[key] && typeof g.MiniGames[key].render === 'function'){
        console.info(`[MinigameRegistry] Rendering "${key}" via MiniGames (legacy)`);
        
        // Wrap onComplete to invoke lifecycle
        const wrappedOnComplete = (score) => {
          if(g.MinigameLifecycle && typeof g.MinigameLifecycle.afterRender === 'function'){
            try {
              g.MinigameLifecycle.afterRender(key, host, score, options);
            } catch(lifecycleError){
              console.warn('[MinigameRegistry] MinigameLifecycle.afterRender error:', lifecycleError);
            }
          }
          
          if(typeof onComplete === 'function'){
            onComplete(score);
          }
        };
        
        g.MiniGames[key].render(host, wrappedOnComplete, options);
        return;
      }

      // Module not loaded
      console.error(`[MinigameRegistry] render: Module "${key}" not loaded (not in MiniGames or MinigameModules)`);
      host.innerHTML = `<div style="padding:20px;text-align:center;">
        <p style="color:#ff6b9d;margin-bottom:12px;">Error: Minigame "${entry.name}" not loaded</p>
        <p style="color:#95a9c0;font-size:0.9rem;">The game module failed to load. Please refresh the page.</p>
      </div>`;
      
      // Auto-fail after a delay
      setTimeout(() => {
        if(typeof onComplete === 'function'){
          onComplete(0);
        }
      }, 3000);
    } catch(error){
      console.error(`[MinigameRegistry] render error for "${key}":`, error);
      host.innerHTML = `<div style="padding:20px;text-align:center;"><p style="color:#ff6b9d;">Error: Failed to render minigame</p></div>`;
      
      setTimeout(() => {
        if(typeof onComplete === 'function'){
          onComplete(0);
        }
      }, 3000);
    }
  }

  // Export API (existing + new runtime helpers)
  g.MinigameRegistry = {
    // Existing API (unchanged)
    getRegistry,
    getGame,
    getAllKeys,
    getGamesByFilter,
    getImplementedGames,
    getMobileFriendlyGames,
    getGamesByType,
    
    // New runtime helpers (PR1)
    registerGame,
    isModuleLoaded,
    loadModule,
    render
  };

})(window);
