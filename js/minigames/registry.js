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
    
    reactionRoyale: {
      key: 'reactionRoyale',
      name: 'Reaction Royale',
      description: 'Multi-round reaction time challenge with increasing difficulty',
      type: 'reaction',
      scoring: 'time',
      mobileFriendly: true,
      implemented: true,
      module: 'reaction-royale.js',
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
    
    mathBlitz: {
      key: 'mathBlitz',
      name: 'Math Blitz',
      description: 'Solve math problems quickly',
      type: 'puzzle',
      scoring: 'hybrid',
      mobileFriendly: true,
      implemented: true,
      module: 'math-blitz.js',
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
    
    sequenceMemory: {
      key: 'sequenceMemory',
      name: 'Number Sequence',
      description: 'Memorize and repeat number sequences',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: true,
      module: 'sequence-memory.js',
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
    
    memoryPairs: {
      key: 'memoryPairs',
      name: 'Memory Pairs',
      description: 'Find matching pairs of cards',
      type: 'memory',
      scoring: 'time',
      mobileFriendly: true,
      implemented: true,
      module: 'memory-pairs.js',
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
    
    reactionTimer: {
      key: 'reactionTimer',
      name: 'Reaction Timer',
      description: 'React as fast as you can when the signal appears',
      type: 'reaction',
      scoring: 'time',
      mobileFriendly: true,
      implemented: true,
      module: 'reaction-timer.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
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
      module: 'placeholder.js',
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
    
    logicLocks: {
      key: 'logicLocks',
      name: 'Logic Locks',
      description: 'Solve logic puzzles to unlock the vault',
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
    
    // Phase 2: New Scaffold Games (15 additional minigames)
    bubbleBurst: {
      key: 'bubbleBurst',
      name: 'Bubble Burst',
      description: 'Pop bubbles quickly for points',
      type: 'reaction',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'bubble-burst.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    cardClash: {
      key: 'cardClash',
      name: 'Card Clash',
      description: 'Memory card matching game',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
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
      implemented: false,
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
      implemented: false,
      module: 'clock-stopper.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    comboKeys: {
      key: 'comboKeys',
      name: 'Combo Keys',
      description: 'Memorize and repeat key combinations',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'combo-keys.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    diceDash: {
      key: 'diceDash',
      name: 'Dice Dash',
      description: 'Roll and match dice patterns',
      type: 'reaction',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'dice-dash.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    echoChamber: {
      key: 'echoChamber',
      name: 'Echo Chamber',
      description: 'Audio memory and recall',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'echo-chamber.js',
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
      implemented: false,
      module: 'flash-flood.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    gearShift: {
      key: 'gearShift',
      name: 'Gear Shift',
      description: 'Solve mechanical gear puzzles',
      type: 'puzzle',
      scoring: 'time',
      mobileFriendly: true,
      implemented: false,
      module: 'gear-shift.js',
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
      implemented: false,
      module: 'grid-lock.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    iconMatch: {
      key: 'iconMatch',
      name: 'Icon Match',
      description: 'Match icons from memory',
      type: 'memory',
      scoring: 'accuracy',
      mobileFriendly: true,
      implemented: false,
      module: 'icon-match.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    jumpRope: {
      key: 'jumpRope',
      name: 'Jump Rope',
      description: 'Endurance timing challenge',
      type: 'endurance',
      scoring: 'endurance',
      mobileFriendly: true,
      implemented: false,
      module: 'jump-rope.js',
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
      implemented: false,
      module: 'key-master.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    lightSpeed: {
      key: 'lightSpeed',
      name: 'Light Speed',
      description: 'Ultra-fast reaction challenge',
      type: 'reaction',
      scoring: 'time',
      mobileFriendly: true,
      implemented: false,
      module: 'light-speed.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    },
    
    puzzleDash: {
      key: 'puzzleDash',
      name: 'Puzzle Dash',
      description: 'Speed puzzle solving',
      type: 'puzzle',
      scoring: 'hybrid',
      mobileFriendly: true,
      implemented: false,
      module: 'puzzle-dash.js',
      minScore: 0,
      maxScore: 100,
      retired: false,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    }
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

  // Export API
  g.MinigameRegistry = {
    getRegistry,
    getGame,
    getAllKeys,
    getGamesByFilter,
    getImplementedGames,
    getMobileFriendlyGames,
    getGamesByType
  };

})(window);
