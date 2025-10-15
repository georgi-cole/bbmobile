// MODULE: minigames/instructions.js
// Context-aware instructions for each minigame
// Provides brief, mobile-friendly instructions for competition phases

(function(g){
  'use strict';

  /**
   * Get instructions for a specific minigame
   * Returns object with title, brief description, and optional detailed steps
   * 
   * @param {string} gameKey - The minigame key
   * @returns {Object} Instruction object with title, description, and optional steps
   */
  function getInstructions(gameKey){
    const instructions = INSTRUCTIONS_MAP[gameKey];
    if(!instructions){
      console.warn(`[MinigameInstructions] No instructions found for game: ${gameKey}`);
      return {
        title: 'Competition',
        description: 'Play the minigame to compete!',
        steps: []
      };
    }
    return instructions;
  }

  /**
   * Instructions map for all minigames
   * Each entry contains:
   * - title: Display name of the game
   * - description: Brief one-liner instruction
   * - steps: Optional array of detailed steps (if description is long, split into steps)
   */
  const INSTRUCTIONS_MAP = {
    // Active Mobile-First Games
    countHouse: {
      title: 'Count House',
      description: 'Count the objects that appear on screen, then enter your answer!',
      steps: []
    },
    
    reactionRoyale: {
      title: 'Reaction Royale',
      description: 'Tap when the signal changes! 5 rounds, get faster each time!',
      steps: []
    },
    
    triviaPulse: {
      title: 'Trivia Pulse',
      description: 'Answer Big Brother trivia questions quickly and accurately!',
      steps: []
    },
    
    quickTap: {
      title: 'Quick Tap Race',
      description: 'Tap the button as many times as you can in 5 seconds!',
      steps: []
    },
    
    memoryMatch: {
      title: 'Memory Colors',
      description: 'Watch the color sequence, then tap the buttons in the same order!',
      steps: []
    },
    
    mathBlitz: {
      title: 'Math Blitz',
      description: 'Solve math problems as fast as you can!',
      steps: []
    },
    
    timingBar: {
      title: 'Timing Bar',
      description: 'Stop the bar near center for high score! You get 3 tries.',
      steps: []
    },
    
    sequenceMemory: {
      title: 'Number Sequence',
      description: 'Memorize the number sequence, then repeat it!',
      steps: []
    },
    
    patternMatch: {
      title: 'Pattern Match',
      description: 'Watch the pattern, then recreate it from memory!',
      steps: []
    },
    
    wordAnagram: {
      title: 'Word Anagram',
      description: 'Unscramble Big Brother words as fast as you can!',
      steps: []
    },
    
    targetPractice: {
      title: 'Target Practice',
      description: 'Click the moving targets! You have 10 seconds.',
      steps: []
    },
    
    memoryPairs: {
      title: 'Memory Pairs',
      description: 'Find matching pairs of cards. Fewer moves = higher score!',
      steps: []
    },
    
    estimationGame: {
      title: 'Estimation',
      description: 'Look at the dots, then guess how many there are!',
      steps: []
    },
    
    // New Phase 1 Games
    cardClash: {
      title: 'Card Clash',
      description: 'Match cards quickly to score points!',
      steps: []
    },
    
    chainReaction: {
      title: 'Chain Reaction',
      description: 'Click tiles of the same color to create chains! 3 rounds.',
      steps: []
    },
    
    clockStopper: {
      title: 'Clock Stopper',
      description: 'Stop the clock at the target time! You get 3 attempts.',
      steps: []
    },
    
    flashFlood: {
      title: 'Flash Flood',
      description: 'Click only the GREEN tiles as fast as you can!',
      steps: []
    },
    
    gridLock: {
      title: 'Grid Lock',
      description: 'Click tiles to toggle them. Make all tiles the same color!',
      steps: []
    },
    
    keyMaster: {
      title: 'Key Master',
      description: 'Guess the 4-digit code using bulls and cows clues!',
      steps: []
    },
    
    memoryZipline: {
      title: 'Memory Zipline',
      description: 'Remember the path shown, then recreate it!',
      steps: []
    },
    
    miniMaze: {
      title: 'Mini Maze',
      description: 'Navigate the maze to reach the goal!',
      steps: []
    },
    
    spotDifference: {
      title: 'Spot Difference',
      description: 'Find the differences between two images!',
      steps: []
    },
    
    swipeMaze: {
      title: 'Swipe Maze',
      description: 'Swipe to navigate through the maze!',
      steps: []
    },
    
    towerStack: {
      title: 'Tower Stack',
      description: 'Stack blocks as high as you can without falling!',
      steps: []
    },
    
    triviaQuiz: {
      title: 'Trivia Quiz',
      description: 'Answer trivia questions quickly!',
      steps: []
    },
    
    wordBuilder: {
      title: 'Word Builder',
      description: 'Make words from the letters shown!',
      steps: []
    },
    
    comixSpot: {
      title: 'Comix Spot',
      description: 'Find all the differences between two comic panels! 3 rounds, 5 differences per round (7 in hard mode).',
      steps: []
    },
    
    holdWall: {
      title: 'Hold Wall',
      description: 'Hold your finger on the wall as long as possible without moving! Try to last 15+ seconds.',
      steps: []
    },
    
    slipperyShuttle: {
      title: 'Slippery Shuttle',
      description: 'Navigate slippery platforms with momentum physics to reach the goal! Use arrow keys or buttons.',
      steps: []
    },
    
    socialStrings: {
      title: 'Social Strings',
      description: 'Match pairs of houseguests who have alliances! 3 rounds with increasing difficulty.',
      steps: []
    },
    
    oteviator: {
      title: 'Oteviator',
      description: 'Press at the perfect moment when the elevator reaches the target floor! 5 floors to master.',
      steps: []
    },
    
    colorMatch: {
      title: 'Color Match',
      description: 'Mix RGB values to match the target color! 4 rounds. Slider mode available for precision.',
      steps: []
    },
    
    logicLocks: {
      title: 'Logic Locks',
      description: 'Crack the 4-digit code using bulls (correct position) and cows (correct digit, wrong position)! Code revealed after 6 attempts.',
      steps: []
    },
    
    snake: {
      title: 'Snake',
      description: 'Control the snake to eat food and grow! Portal mode available for edge-wrapping gameplay.',
      steps: []
    },
    
    // Retired Games (still need instructions for backwards compatibility)
    wordTyping: {
      title: 'Word Typing',
      description: 'Type the passage as accurately as possible!',
      steps: []
    },
    
    reactionTimer: {
      title: 'Reaction Timer',
      description: 'Wait for GREEN, then tap as fast as you can!',
      steps: []
    },
    
    sliderPuzzle: {
      title: 'Slider Precision',
      description: 'Set the slider to the exact target value!',
      steps: []
    },
    
    pathFinder: {
      title: 'Path Finder',
      description: 'Memorize the path, then click the arrows in order!',
      steps: []
    },
    
    simonSays: {
      title: 'Simon Says',
      description: 'Press the arrow key sequence shown!',
      steps: []
    }
  };

  // Expose to global
  g.MinigameInstructions = {
    getInstructions: getInstructions
  };

})(window);
