// MODULE: minigames/rules-registry.js
// Centralized registry for minigame rules content
// Each entry provides structured rules documentation for a specific minigame

(function(g){
  'use strict';

  /**
   * Rules Registry Structure:
   * Each key corresponds to a minigame registry key.
   * Each entry contains:
   * - title: Display name of the game
   * - sections: Array of rule sections with:
   *   - h: Heading text
   *   - p: Optional array of paragraph strings
   *   - list: Optional array of bullet point strings
   */
  const RULES = {
    // Phase 2 Expansion Games
    hangman: {
      title: 'Hangman',
      sections: [
        {
          h: 'Goal',
          p: ['Guess the hidden Big Brother-themed word by selecting letters before running out of attempts.']
        },
        {
          h: 'How to Play',
          list: [
            'A word is hidden with blank spaces for each letter',
            'Tap letters on the keyboard to guess',
            'Correct letters appear in the word',
            'Wrong letters reduce your remaining attempts',
            'Guess the complete word before attempts run out'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap letters on the on-screen keyboard to make your guesses.']
        },
        {
          h: 'Scoring',
          list: [
            'Full points for completing with all attempts remaining',
            'Partial points based on remaining attempts',
            'Bonus for solving quickly'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Start with common vowels (A, E, I, O, U)',
            'Look for common Big Brother terms',
            'Consider word length when guessing'
          ]
        }
      ]
    },

    tiltLabyrinth: {
      title: 'Tilt Labyrinth',
      sections: [
        {
          h: 'Goal',
          p: ['Guide the ball through the maze to the goal by tilting your device.']
        },
        {
          h: 'How to Play',
          list: [
            'Tilt your device to move the ball',
            'Navigate through walls and obstacles',
            'Reach the green goal area',
            'Avoid falling into holes (if present)'
          ]
        },
        {
          h: 'Controls',
          p: ['Tilt your device in any direction to move the ball. The ball responds to gravity based on device orientation.']
        },
        {
          h: 'Scoring',
          list: [
            'Fastest completion time earns highest score',
            'Penalties for restarting or extended time',
            'Bonus for completing without touching walls'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Use gentle tilts for better control',
            'Plan your path before moving',
            'Practice makes perfect with tilt controls'
          ]
        }
      ]
    },

    tetris: {
      title: 'Tetris',
      sections: [
        {
          h: 'Goal',
          p: ['Stack falling blocks to create complete horizontal lines and score as many points as possible.']
        },
        {
          h: 'How to Play',
          list: [
            'Blocks fall from the top of the screen',
            'Move blocks left or right',
            'Rotate blocks to fit spaces',
            'Complete horizontal lines to clear them',
            'Game ends when blocks reach the top'
          ]
        },
        {
          h: 'Controls',
          list: [
            'Tap left/right arrows to move blocks',
            'Tap rotate button to spin blocks',
            'Tap down arrow for fast drop'
          ]
        },
        {
          h: 'Scoring',
          list: [
            'Points for each line cleared',
            'Bonus for clearing multiple lines at once',
            'Higher score for lasting longer'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Leave space for long pieces',
            'Try to clear multiple lines at once for bonuses',
            'Keep the stack as low as possible',
            'Plan ahead for incoming pieces'
          ]
        }
      ]
    },

    travelingDots: {
      title: 'Traveling Dots',
      sections: [
        {
          h: 'Goal',
          p: ['Draw the shortest path connecting all dots on the screen without crossing your path.']
        },
        {
          h: 'How to Play',
          list: [
            'Multiple dots appear on the screen',
            'Tap dots in sequence to connect them',
            'Create a path visiting all dots',
            'Avoid crossing your existing path',
            'Complete the path as efficiently as possible'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap dots to connect them in order. A line will be drawn between consecutive dots.']
        },
        {
          h: 'Scoring',
          list: [
            'Shorter total path length = higher score',
            'Bonus for efficient routing',
            'Penalties for crossing paths or backtracking'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Plan your entire route before starting',
            'Look for clusters of nearby dots',
            'Try to minimize sharp turns',
            'Start from an edge dot when possible'
          ]
        }
      ]
    },

    minesweeps: {
      title: 'Minesweeps',
      sections: [
        {
          h: 'Goal',
          p: ['Clear the grid by revealing all safe cells while avoiding hidden mines.']
        },
        {
          h: 'How to Play',
          list: [
            'Tap cells to reveal them',
            'Numbers show how many mines are adjacent',
            'Use logic to determine mine locations',
            'Flag suspected mines (long press)',
            'Clear all non-mine cells to win'
          ]
        },
        {
          h: 'Controls',
          list: [
            'Tap to reveal a cell',
            'Long press to flag/unflag a potential mine'
          ]
        },
        {
          h: 'Scoring',
          list: [
            'Points for each safe cell revealed',
            'Bonus for completing without hitting mines',
            'Faster completion = higher score'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Start by revealing corner cells',
            'Use the numbers to deduce mine locations',
            'Flag mines to track your progress',
            'Look for patterns in the numbers'
          ]
        }
      ]
    },

    railSwitchSprint: {
      title: 'Rail Switch Sprint',
      sections: [
        {
          h: 'Goal',
          p: ['Switch train tracks to guide trains to their correct colored stations before time runs out.']
        },
        {
          h: 'How to Play',
          list: [
            'Trains enter from different directions',
            'Each train has a color matching a station',
            'Tap switches to change track directions',
            'Guide each train to its matching station',
            'Complete all trains before time expires'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap junction switches to toggle track direction and route trains appropriately.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each train reaching correct station',
            'Bonus for completing all trains',
            'Time bonus for finishing early',
            'Penalties for wrong routing'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Plan the route before the train arrives',
            'Prioritize trains close to their stations',
            'Watch for multiple incoming trains',
            'Switch tracks quickly but carefully'
          ]
        }
      ]
    },

    threeDigitsQuiz: {
      title: 'Three Digits Quiz',
      sections: [
        {
          h: 'Goal',
          p: ['Answer three sequential number-based questions with hints to achieve the highest score.']
        },
        {
          h: 'How to Play',
          list: [
            'Three questions are presented in sequence',
            'Each question asks for a specific number',
            'Hints are provided with graded accuracy',
            'Submit your answer for each question',
            'More accurate answers earn more points'
          ]
        },
        {
          h: 'Controls',
          p: ['Enter your numeric answer using the number pad, then tap Submit.']
        },
        {
          h: 'Scoring',
          list: [
            'Full points for exact answers',
            'Partial points based on closeness',
            'Bonus for answering all three correctly',
            'Hints reduce potential points'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Read hints carefully for clues',
            'Use logic and estimation',
            'Consider the range of possible answers',
            'Answer as precisely as possible'
          ]
        }
      ]
    },

    // Core Mobile-First Games
    countHouse: {
      title: 'Count House',
      sections: [
        {
          h: 'Goal',
          p: ['Quickly and accurately count the number of objects appearing on screen.']
        },
        {
          h: 'How to Play',
          list: [
            'Objects appear briefly on screen',
            'Count how many you see',
            'Enter your count using the number pad',
            'Submit before time expires'
          ]
        },
        {
          h: 'Controls',
          p: ['Use the on-screen number pad to enter your count, then tap Submit.']
        },
        {
          h: 'Scoring',
          p: ['Exact count = 100 points. Points decrease based on how far off your guess is.']
        },
        {
          h: 'Tips',
          list: [
            'Focus on grouping objects mentally',
            'Practice quick counting techniques',
            'Don\'t spend too long recounting'
          ]
        }
      ]
    },

    triviaPulse: {
      title: 'Trivia Pulse',
      sections: [
        {
          h: 'Goal',
          p: ['Answer Big Brother trivia questions correctly and quickly.']
        },
        {
          h: 'How to Play',
          list: [
            'Questions appear about Big Brother history and gameplay',
            'Select from multiple choice answers',
            'Faster correct answers score more points',
            'Answer as many as possible before time runs out'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap the correct answer from the choices provided.']
        },
        {
          h: 'Scoring',
          list: [
            'Correct answer = full points',
            'Bonus for quick answers',
            'No points for incorrect answers'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Read questions carefully',
            'Trust your first instinct',
            'Knowledge of Big Brother helps!'
          ]
        }
      ]
    },

    quickTap: {
      title: 'Quick Tap Race',
      sections: [
        {
          h: 'Goal',
          p: ['Tap the screen as many times as possible within the time limit.']
        },
        {
          h: 'How to Play',
          list: [
            'Timer starts when you begin tapping',
            'Tap anywhere on the screen rapidly',
            'Each tap counts toward your total',
            'Keep tapping until time expires'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap anywhere on the screen as quickly as possible.']
        },
        {
          h: 'Scoring',
          p: ['Score is based on total number of taps. More taps = higher score.']
        },
        {
          h: 'Tips',
          list: [
            'Use multiple fingers if allowed',
            'Find a rhythm for consistent tapping',
            'Minimize finger travel distance'
          ]
        }
      ]
    },

    memoryMatch: {
      title: 'Memory Colors',
      sections: [
        {
          h: 'Goal',
          p: ['Watch and repeat the color sequence shown to you.']
        },
        {
          h: 'How to Play',
          list: [
            'Colored buttons light up in sequence',
            'Watch and memorize the pattern',
            'Repeat the sequence by tapping the buttons',
            'Sequences get longer with each round'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap the colored buttons to repeat the sequence you saw.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each correct sequence',
            'Bonus for longer sequences',
            'Game ends on first mistake'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Focus on the entire sequence',
            'Use visual or verbal memory techniques',
            'Practice makes your memory stronger'
          ]
        }
      ]
    },

    timingBar: {
      title: 'Timing Bar',
      sections: [
        {
          h: 'Goal',
          p: ['Stop the moving bar as close to the center as possible.']
        },
        {
          h: 'How to Play',
          list: [
            'A bar moves back and forth across the screen',
            'A target zone is marked in the center',
            'Tap to stop the bar',
            'Get as close to the center as you can',
            'Complete multiple rounds'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap anywhere to stop the bar. Timing is everything!']
        },
        {
          h: 'Scoring',
          list: [
            'Perfect center = maximum points',
            'Score decreases based on distance from center',
            'Average of all rounds determines final score'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Anticipate the bar speed',
            'Account for your reaction time',
            'Stay focused on the center marker'
          ]
        }
      ]
    },

    patternMatch: {
      title: 'Pattern Match',
      sections: [
        {
          h: 'Goal',
          p: ['Memorize and recreate the pattern of shapes shown to you.']
        },
        {
          h: 'How to Play',
          list: [
            'A grid of shapes appears briefly',
            'Memorize the pattern',
            'Recreate the pattern by tapping shapes',
            'Complete multiple patterns'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap shapes in the grid to recreate the pattern you memorized.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each correctly placed shape',
            'Bonus for perfect patterns',
            'Fewer mistakes = higher score'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Look for recognizable patterns or groupings',
            'Focus on position relationships',
            'Take a mental snapshot of the entire grid'
          ]
        }
      ]
    },

    wordAnagram: {
      title: 'Word Anagram',
      sections: [
        {
          h: 'Goal',
          p: ['Unscramble Big Brother-themed words by rearranging letters.']
        },
        {
          h: 'How to Play',
          list: [
            'Scrambled letters appear on screen',
            'Drag or tap letters to rearrange them',
            'Form the correct Big Brother word',
            'Submit your answer',
            'Complete multiple words'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap or drag letters to rearrange them into the correct word.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each word solved',
            'Bonus for quick solutions',
            'Hints available but reduce score'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Look for common letter patterns',
            'Try rearranging vowels first',
            'Think of Big Brother terms'
          ]
        }
      ]
    },

    targetPractice: {
      title: 'Target Practice',
      sections: [
        {
          h: 'Goal',
          p: ['Click or tap moving targets as quickly and accurately as possible.']
        },
        {
          h: 'How to Play',
          list: [
            'Targets appear and move on screen',
            'Tap each target before it disappears',
            'Targets may move at different speeds',
            'Hit as many targets as possible',
            'Avoid missing or hitting wrong areas'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap directly on targets as they appear.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each target hit',
            'Bonus for consecutive hits',
            'Penalties for missing targets',
            'Accuracy and speed both matter'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Anticipate target movement',
            'Focus on accuracy first, then speed',
            'Track multiple targets at once'
          ]
        }
      ]
    },

    estimationGame: {
      title: 'Estimation',
      sections: [
        {
          h: 'Goal',
          p: ['Estimate the number of dots displayed on screen as accurately as possible.']
        },
        {
          h: 'How to Play',
          list: [
            'Dots appear briefly on screen',
            'Estimate the total count',
            'Enter your estimate using the number pad',
            'Submit before time runs out',
            'Complete multiple rounds'
          ]
        },
        {
          h: 'Controls',
          p: ['Use the number pad to enter your estimate, then tap Submit.']
        },
        {
          h: 'Scoring',
          list: [
            'Closer estimates score higher',
            'Perfect guess = maximum points',
            'Points decrease with distance from actual count'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Use grouping techniques mentally',
            'Look for symmetry or patterns',
            'Don\'t overthink - trust your instinct'
          ]
        }
      ]
    },

    // Additional Implemented Games
    cardClash: {
      title: 'Card Clash',
      sections: [
        {
          h: 'Goal',
          p: ['Match pairs of cards by flipping them over and remembering their positions.']
        },
        {
          h: 'How to Play',
          list: [
            'Cards are placed face-down in a grid',
            'Tap two cards to flip them',
            'If they match, they stay face-up',
            'If they don\'t match, they flip back down',
            'Match all pairs to complete the game'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap cards to flip them over.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each matched pair',
            'Bonus for fewer attempts',
            'Time bonus for quick completion'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Focus on remembering card positions',
            'Work systematically through the grid',
            'Try to match cards you\'ve already seen'
          ]
        }
      ]
    },

    chainReaction: {
      title: 'Chain Reaction',
      sections: [
        {
          h: 'Goal',
          p: ['Create chain combos by matching and clearing connected pieces.']
        },
        {
          h: 'How to Play',
          list: [
            'Pieces appear on the board',
            'Match three or more of the same type',
            'Cleared pieces may trigger chain reactions',
            'Score points for combos and chains',
            'Complete the objective before time runs out'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap or drag pieces to swap positions and create matches.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each match',
            'Multiplier for chain reactions',
            'Bonus for large combos'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Look for opportunities to create chains',
            'Plan moves ahead for bigger combos',
            'Focus on creating cascading effects'
          ]
        }
      ]
    },

    clockStopper: {
      title: 'Clock Stopper',
      sections: [
        {
          h: 'Goal',
          p: ['Stop the clock at exact target times with precision timing.']
        },
        {
          h: 'How to Play',
          list: [
            'A clock hand rotates continuously',
            'A target time is displayed',
            'Tap to stop the clock',
            'Try to stop it exactly at the target',
            'Complete multiple rounds'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap to stop the clock at the target time.']
        },
        {
          h: 'Scoring',
          list: [
            'Perfect timing = maximum points',
            'Points decrease based on accuracy',
            'Bonus for multiple perfect stops'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Watch the clock speed carefully',
            'Anticipate your reaction time',
            'Stay focused on the target marker'
          ]
        }
      ]
    },

    flashFlood: {
      title: 'Flash Flood',
      sections: [
        {
          h: 'Goal',
          p: ['React quickly to flash patterns and tap them before they disappear.']
        },
        {
          h: 'How to Play',
          list: [
            'Patterns flash briefly on screen',
            'Memorize the highlighted areas',
            'Tap the areas that were highlighted',
            'Complete multiple patterns',
            'React faster as difficulty increases'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap the areas that were highlighted in the flash pattern.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each correct tap',
            'Bonus for perfect recall',
            'Faster reactions score higher'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Focus intensely during the flash',
            'Use spatial memory',
            'Don\'t second-guess your memory'
          ]
        }
      ]
    },

    gridLock: {
      title: 'Grid Lock',
      sections: [
        {
          h: 'Goal',
          p: ['Unlock grid patterns by solving logic puzzles.']
        },
        {
          h: 'How to Play',
          list: [
            'A locked grid is presented',
            'Clues indicate which cells to toggle',
            'Tap cells to lock/unlock them',
            'Match the solution pattern',
            'Complete multiple puzzles'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap grid cells to toggle their state.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for completing puzzles',
            'Fewer moves = higher score',
            'Time bonus for quick solutions'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Study the clues carefully',
            'Work systematically through the grid',
            'Look for logical deductions'
          ]
        }
      ]
    },

    keyMaster: {
      title: 'Key Master',
      sections: [
        {
          h: 'Goal',
          p: ['Unlock sequences by solving pattern-based puzzles.']
        },
        {
          h: 'How to Play',
          list: [
            'A sequence lock is presented',
            'Determine the correct unlock pattern',
            'Input the pattern using buttons or keys',
            'Unlock the sequence',
            'Progress through multiple locks'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap keys or buttons to input your unlock pattern.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each unlock',
            'Bonus for solving without hints',
            'Faster solutions score higher'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Look for patterns in the sequence',
            'Try common combinations first',
            'Use logic to eliminate wrong answers'
          ]
        }
      ]
    },

    colorMatch: {
      title: 'Color Match',
      sections: [
        {
          h: 'Goal',
          p: ['Match colors quickly and accurately under time pressure.']
        },
        {
          h: 'How to Play',
          list: [
            'A color appears on screen',
            'Select the matching color from options',
            'Tap the correct color quickly',
            'Complete as many matches as possible',
            'Difficulty increases over time'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap the color option that matches the displayed color.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each correct match',
            'Bonus for speed',
            'Combo multipliers for streaks'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Trust your color perception',
            'React quickly but accurately',
            'Watch for subtle shade differences'
          ]
        }
      ]
    },

    snake: {
      title: 'Snake',
      sections: [
        {
          h: 'Goal',
          p: ['Guide the snake to eat food and grow as long as possible without crashing.']
        },
        {
          h: 'How to Play',
          list: [
            'Snake moves continuously forward',
            'Change direction using controls',
            'Eat food to grow longer',
            'Avoid hitting walls or your own tail',
            'Survive as long as possible'
          ]
        },
        {
          h: 'Controls',
          p: ['Use arrow buttons or swipe to change the snake\'s direction.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each food eaten',
            'Bonus for longer snake',
            'Survival time adds to score'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Plan your path to avoid trapping yourself',
            'Stay near the edges initially',
            'Don\'t rush - patience is key',
            'Practice makes perfect'
          ]
        }
      ]
    },

    logicLocks: {
      title: 'Logic Locks',
      sections: [
        {
          h: 'Goal',
          p: ['Solve logic puzzles to unlock the vault by deducing the correct combinations.']
        },
        {
          h: 'How to Play',
          list: [
            'Clues are provided about the lock combination',
            'Use logical deduction to find the solution',
            'Input your answer',
            'Complete multiple locks',
            'Each lock has different logic rules'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap or input your solution based on the lock type.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each solved lock',
            'Bonus for solving without hints',
            'Fewer attempts = higher score'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Read clues very carefully',
            'Eliminate impossible combinations',
            'Use process of elimination',
            'Write down clues if needed'
          ]
        }
      ]
    },

    socialStrings: {
      title: 'Social Strings',
      sections: [
        {
          h: 'Goal',
          p: ['Identify which houseguests are in alliances together by analyzing social connections.']
        },
        {
          h: 'How to Play',
          list: [
            'View a network of houseguest connections',
            'Identify alliance groups',
            'Tap or connect houseguests in the same alliance',
            'Complete the social network map',
            'Work quickly for bonus points'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap houseguests to select them and identify alliance groups.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for correctly identified alliances',
            'Bonus for complete accuracy',
            'Time bonus for quick completion'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Look for obvious connection clusters',
            'Isolate smaller groups first',
            'Use houseguest knowledge if available'
          ]
        }
      ]
    },

    holdWall: {
      title: 'Hold Wall',
      sections: [
        {
          h: 'Goal',
          p: ['Hold onto the wall as long as possible in this endurance challenge.']
        },
        {
          h: 'How to Play',
          list: [
            'Press and hold the screen to grip the wall',
            'Maintain your hold as long as you can',
            'Fatigue increases over time',
            'Last as long as possible before letting go'
          ]
        },
        {
          h: 'Controls',
          p: ['Press and hold anywhere on the screen to maintain your grip.']
        },
        {
          h: 'Scoring',
          p: ['Score is based entirely on hold duration. Longer hold = higher score.']
        },
        {
          h: 'Tips',
          list: [
            'Find a comfortable holding position',
            'Stay focused and patient',
            'Prepare for increasing difficulty over time'
          ]
        }
      ]
    },

    memoryZipline: {
      title: 'Memory Zipline',
      sections: [
        {
          h: 'Goal',
          p: ['Remember and repeat increasingly complex zipline path sequences.']
        },
        {
          h: 'How to Play',
          list: [
            'Watch a zipline path sequence',
            'Memorize the route taken',
            'Replay the sequence by tapping platforms',
            'Sequences get longer each round',
            'One mistake ends the game'
          ]
        },
        {
          h: 'Controls',
          p: ['Tap platforms in the correct order to repeat the zipline path.']
        },
        {
          h: 'Scoring',
          list: [
            'Points for each correct sequence',
            'Bonus for longer sequences',
            'Perfect recall earns maximum points'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Visualize the path in your mind',
            'Create a mental story of the route',
            'Focus on direction changes'
          ]
        }
      ]
    },

    swipeMaze: {
      title: 'Swipe Maze',
      sections: [
        {
          h: 'Goal',
          p: ['Navigate through a maze using swipe gestures to reach the goal.']
        },
        {
          h: 'How to Play',
          list: [
            'Swipe to move in any direction',
            'Navigate around walls and obstacles',
            'Find the path to the exit',
            'Complete maze as quickly as possible'
          ]
        },
        {
          h: 'Controls',
          p: ['Swipe up, down, left, or right to move through the maze.']
        },
        {
          h: 'Scoring',
          list: [
            'Faster completion = higher score',
            'Bonus for efficient paths',
            'Penalties for excessive moves'
          ]
        },
        {
          h: 'Tips',
          list: [
            'Look ahead to plan your route',
            'Avoid dead ends when possible',
            'Use a systematic approach',
            'Practice improves speed'
          ]
        }
      ]
    }
  };

  /**
   * Get rules for a specific minigame
   * @param {string} key - Minigame registry key
   * @returns {Object|null} Rules object or null if not found
   */
  function getRules(key){
    return RULES[key] || null;
  }

  /**
   * Check if rules exist for a given key
   * @param {string} key - Minigame registry key
   * @returns {boolean} True if rules exist
   */
  function hasRules(key){
    return !!RULES[key];
  }

  /**
   * Get all available rule keys
   * @returns {Array<string>} Array of minigame keys with rules
   */
  function getAllRuleKeys(){
    return Object.keys(RULES);
  }

  // Export to global namespace
  g.MinigameRulesRegistry = {
    getRules: getRules,
    hasRules: hasRules,
    getAllRuleKeys: getAllRuleKeys
  };

  // Log initialization
  console.info('[MinigameRulesRegistry] Initialized with', Object.keys(RULES).length, 'rule entries');

})(window);
