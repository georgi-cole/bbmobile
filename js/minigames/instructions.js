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
    bubbleBurst: {
      title: 'Bubble Burst',
      description: 'Pop as many bubbles as you can in 10 seconds!',
      steps: []
    },
    
    cardClash: {
      title: 'Card Clash',
      description: 'Match cards quickly to score points!',
      steps: []
    },
    
    chainReaction: {
      title: 'Chain Reaction',
      description: 'Click tiles of the same color to create chains! 5 rounds.',
      steps: []
    },
    
    clockStopper: {
      title: 'Clock Stopper',
      description: 'Stop the clock at the target time! You get 3 attempts.',
      steps: []
    },
    
    colorMatch: {
      title: 'Color Match',
      description: 'Match the color combinations as fast as you can!',
      steps: []
    },
    
    comboKeys: {
      title: 'Combo Keys',
      description: 'Press the key combinations shown on screen!',
      steps: []
    },
    
    diceDash: {
      title: 'Dice Dash',
      description: 'Match the target dice sum! Roll until you get it right.',
      steps: []
    },
    
    echoChamber: {
      title: 'Echo Chamber',
      description: 'Remember the sequence of sounds, then play them back!',
      steps: []
    },
    
    flashFlood: {
      title: 'Flash Flood',
      description: 'Click only the GREEN tiles as fast as you can!',
      steps: []
    },
    
    gearShift: {
      title: 'Gear Shift',
      description: 'Rotate gears to match the target pattern!',
      steps: []
    },
    
    gridLock: {
      title: 'Grid Lock',
      description: 'Click tiles to toggle them. Make all tiles the same color!',
      steps: []
    },
    
    iconMatch: {
      title: 'Icon Match',
      description: 'Match the icons shown as quickly as possible!',
      steps: []
    },
    
    jumpRope: {
      title: 'Jump Rope',
      description: 'Click when the rope is at the bottom! Time your jumps.',
      steps: []
    },
    
    keyMaster: {
      title: 'Key Master',
      description: 'Guess the 4-digit code to unlock! Use the clues.',
      steps: []
    },
    
    lightSpeed: {
      title: 'Light Speed',
      description: 'Click as soon as the light turns GREEN! React fast.',
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
    
    puzzleDash: {
      title: 'Puzzle Dash',
      description: 'Solve the puzzle pieces as fast as you can!',
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
