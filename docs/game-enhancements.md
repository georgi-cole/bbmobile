# Game System Enhancements

This document describes the comprehensive game system enhancements including debug capabilities, unified win probability logic, game hardening, and anti-cheat measures.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Win Probability System](#win-probability-system)
5. [Anti-Cheat System](#anti-cheat-system)
6. [Debug Mode](#debug-mode)
7. [Adding New Games](#adding-new-games)
8. [Usage Examples](#usage-examples)

## Overview

The game system has been enhanced with the following features:

- **Debug Mode**: Test games in isolation with win probability bias disabled
- **Win Probability Logic**: 25% human win rate when player succeeds (configurable)
- **Anti-Cheat Measures**: Copy/paste prevention, app backgrounding detection
- **Game Hardening**: Randomized patterns, timed reveals, difficulty scaling
- **Unified Architecture**: Reusable utilities and components

## Architecture

### Module Structure

```
js/
├── minigames/
│   ├── gameUtils.js           # Core utilities for win logic & anti-cheat
│   ├── GameConfig.js          # Game registry and configuration
│   ├── components/
│   │   └── AntiCheatWrapper.js  # Anti-cheat wrapper component
│   ├── memory-match.js        # Enhanced memory game
│   ├── pattern-match.js       # Enhanced pattern game
│   └── ...
├── debug/
│   └── GameSelector.js        # Debug game selector UI
└── ...
```

### Key Constants

- `PLAYER_WIN_CHANCE = 0.25` - Human players win ~25% of time when they succeed
- Configurable difficulty levels: `easy`, `medium`, `hard`
- Auto-hide timers, allowed mistakes, pattern lengths per difficulty

## Core Components

### 1. GameUtils (`js/minigames/gameUtils.js`)

Central utilities module providing:

#### Win Probability Logic

```javascript
// Determine game result with 25% win bias
const shouldWin = GameUtils.determineGameResult(playerSucceeded, debugMode);
```

- **Parameters:**
  - `playerSucceeded` (boolean): Whether player completed game successfully
  - `debugMode` (boolean): If true, bypasses win probability (shows actual result)
- **Returns:** `boolean` - Whether player should be shown as winner

#### Generate Competition Results

```javascript
// Create realistic AI competitor scores
const results = GameUtils.generateCompetitionResults(playerScore, numCompetitors, difficulty);
```

- **Parameters:**
  - `playerScore` (number): Human player's score (0-100)
  - `numCompetitors` (number): Number of AI competitors
  - `difficulty` (string): 'easy', 'medium', or 'hard'
- **Returns:** Array of competitor results with scores

#### Utility Functions

```javascript
// Get anti-copy CSS styles
const styles = GameUtils.getAntiCopyStyles();

// Disable copy/paste on element
const cleanup = GameUtils.disableCopyPaste(element);

// Generate random sequence
const sequence = GameUtils.generateRandomSequence(items, length);

// Get difficulty settings
const settings = GameUtils.getDifficultySettings('medium');
```

### 2. GameConfig (`js/minigames/GameConfig.js`)

Game registry and configuration:

```javascript
// Get all available games
const games = GameConfig.getAllGames({ supportsDebugMode: true });

// Get specific game
const game = GameConfig.getGame('memoryMatch');

// Get games by type
const memoryGames = GameConfig.getAllGames({ type: 'memory' });
```

**Game Configuration Schema:**

```javascript
{
  id: 'memoryMatch',
  key: 'memoryMatch',
  name: 'Memory Colors',
  description: 'Watch and repeat a sequence of colored blocks',
  module: 'memory-match.js',
  type: 'memory',
  supportsDebugMode: true
}
```

### 3. AntiCheatWrapper (`js/minigames/components/AntiCheatWrapper.js`)

Wrapper component for detecting and preventing cheating:

```javascript
// Create wrapper
const antiCheat = AntiCheatWrapper.createWrapper(container, {
  onCheatDetected: (event) => {
    console.warn('Cheat detected:', event);
    // Handle cheat
  },
  competitionMode: true,
  strictMode: true,
  showWarning: true
});

// Start monitoring (during memorize/input phase)
antiCheat.startMonitoring();

// Stop monitoring (after submission)
antiCheat.stopMonitoring();

// Cleanup
antiCheat.cleanup();

// Check if cheat detected
const cheated = antiCheat.wasCheatDetected();
```

**Anti-Copy Protection:**

```javascript
// Protect element from copy/paste/select
const cleanup = AntiCheatWrapper.protectElement(element);

// Later: cleanup when no longer needed
cleanup();
```

### 4. DebugGameSelector (`js/debug/GameSelector.js`)

Debug UI for testing games in isolation:

```javascript
// Create selector
const selector = DebugGameSelector.createSelector(container);

// Load specific game in debug mode
selector.loadGame('memoryMatch');
```

## Win Probability System

### How It Works

1. Player completes a game successfully
2. System calculates raw score (0-100)
3. Determines if player "succeeded" (e.g., score >= 60)
4. If succeeded:
   - **Debug Mode**: Shows actual result (100% win rate)
   - **Competition Mode**: 25% chance to show as winner
   - If not selected to win, score is adjusted to failing range (30-55)

### Implementation in Games

```javascript
function render(container, onComplete, options = {}) {
  const { debugMode = false, competitionMode = false } = options;
  
  // ... game logic ...
  
  // On completion:
  const rawScore = calculateScore();
  const playerSucceeded = rawScore >= 60;
  
  let finalScore = rawScore;
  if(GameUtils && !debugMode && competitionMode) {
    const shouldWin = GameUtils.determineGameResult(playerSucceeded, false);
    if(!shouldWin && playerSucceeded) {
      // Force loss despite success (25% win rate)
      finalScore = Math.round(30 + Math.random() * 25);
    }
  }
  
  onComplete(finalScore);
}
```

### Why 25%?

The 25% win rate creates a balanced game experience:
- Prevents human players from dominating every competition
- Maintains challenge and unpredictability
- Mirrors reality TV game show dynamics
- Can be adjusted via `PLAYER_WIN_CHANCE` constant

## Anti-Cheat System

### Features

1. **Copy/Paste Prevention**
   - Disables text selection on patterns/sequences
   - Blocks copy/cut/paste events
   - Disables context menu (right-click)

2. **App Backgrounding Detection**
   - Monitors for tab/window switching
   - Detects app state changes (mobile)
   - Invalidates attempt if player leaves during competition phase

3. **Ephemeral Content**
   - Patterns generated only after Start button pressed
   - Content auto-hides after reveal duration
   - Visual traces cleared from DOM

### Usage in Games

```javascript
// Enable anti-cheat in competition mode
const options = {
  competitionMode: true,  // Enable anti-cheat
  debugMode: false,       // Disable for testing
  difficulty: 'medium'
};

render(container, onComplete, options);
```

### Competition Phases

**Safe Phases** (no monitoring):
- Lobby/waiting
- Instructions reading
- After submission

**Protected Phases** (active monitoring):
- Pattern/sequence reveal
- Memorization period
- Answer input phase

## Debug Mode

### Accessing Debug Tools

**Method 1: Keyboard Shortcut**
```
Press: Ctrl + Shift + D
```

**Method 2: Console**
```javascript
window.__showMinigameDebug();
```

### Debug Panel Features

1. **Events Tab**: View recent game events with timestamps
2. **Stats Tab**: Session statistics and performance metrics
3. **Games Tab**: Per-game statistics and completion rates
4. **Test Tab**: ⭐ NEW - Launch games in isolated test mode

### Test Tab Usage

1. Open debug panel (Ctrl+Shift+D)
2. Click "Test" tab
3. Select a game from dropdown
4. Click "🚀 Full Screen Test" to launch
5. Game runs with:
   - Debug mode enabled (25% bias disabled)
   - Actual success/failure shown
   - Enhanced logging
   - No competition restrictions

### Benefits of Debug Mode

- **Verify Game Logic**: Ensure patterns are truly random
- **Test Difficulty Levels**: Compare easy/medium/hard
- **Check Anti-Cheat**: Verify protection works
- **Performance Testing**: Measure load times and responsiveness
- **Win Rate Analysis**: Confirm actual success rates

## Adding New Games

### Step 1: Create Game Module

Create `js/minigames/my-game.js`:

```javascript
(function(g){
  'use strict';

  function render(container, onComplete, options = {}){
    const { 
      debugMode = false, 
      difficulty = 'medium',
      competitionMode = false
    } = options;
    
    // Get difficulty settings
    const diffSettings = g.GameUtils ? 
      g.GameUtils.getDifficultySettings(difficulty) : 
      { patternLength: 6, revealDuration: 3000 };
    
    // Anti-cheat setup (if needed)
    let antiCheat = null;
    if(competitionMode && g.AntiCheatWrapper){
      antiCheat = g.AntiCheatWrapper.createWrapper(container, {
        onCheatDetected: () => onComplete(0),
        competitionMode: true
      });
    }
    
    // Game implementation...
    
    // On completion:
    const rawScore = calculateScore();
    const playerSucceeded = rawScore >= 60;
    
    let finalScore = rawScore;
    if(g.GameUtils && !debugMode && competitionMode){
      const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
      if(!shouldWin && playerSucceeded){
        finalScore = Math.round(30 + Math.random() * 25);
      }
    }
    
    onComplete(finalScore);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.myGame = { render };

})(window);
```

### Step 2: Register in GameConfig

Add to `js/minigames/GameConfig.js`:

```javascript
const AVAILABLE_GAMES = [
  // ... existing games ...
  {
    id: 'myGame',
    key: 'myGame',
    name: 'My Game',
    description: 'Description of what the game does',
    module: 'my-game.js',
    type: 'memory', // or 'reaction', 'puzzle', 'trivia'
    supportsDebugMode: true
  }
];
```

### Step 3: Register in MinigameRegistry

Add to `js/minigames/registry.js`:

```javascript
const REGISTRY = {
  // ... existing games ...
  myGame: {
    key: 'myGame',
    name: 'My Game',
    description: 'Description',
    type: 'memory',
    scoring: 'accuracy',
    mobileFriendly: true,
    implemented: true,
    module: 'my-game.js',
    minScore: 0,
    maxScore: 100,
    retired: false
  }
};
```

### Step 4: Test in Debug Mode

1. Load the game
2. Open debug panel (Ctrl+Shift+D)
3. Go to Test tab
4. Select your game
5. Click "Full Screen Test"
6. Verify:
   - Patterns are randomized
   - Debug info shows correctly
   - Win logic works as expected
   - Anti-cheat activates if enabled

## Usage Examples

### Example 1: Launch Game in Competition Mode

```javascript
const container = document.getElementById('game-container');

// Competition mode with anti-cheat enabled
MiniGames.memoryMatch.render(container, (score) => {
  console.log('Player score:', score);
  // Process competition result
}, {
  competitionMode: true,
  debugMode: false,
  difficulty: 'hard'
});
```

### Example 2: Test Game in Debug Mode

```javascript
const container = document.getElementById('game-container');

// Debug mode - no win bias, enhanced logging
MiniGames.memoryMatch.render(container, (score) => {
  console.log('Debug score:', score);
}, {
  competitionMode: false,
  debugMode: true,
  difficulty: 'medium'
});
```

### Example 3: Custom Difficulty

```javascript
// Easy mode - shorter patterns, longer reveal times
render(container, onComplete, {
  difficulty: 'easy'  // 4 items, 5s reveal, 2 mistakes allowed
});

// Hard mode - longer patterns, shorter reveal times
render(container, onComplete, {
  difficulty: 'hard'  // 8 items, 2s reveal, 0 mistakes allowed
});
```

### Example 4: Check Win Rate Simulation

```javascript
// Run 100 simulations to verify 25% win rate
let wins = 0;
for(let i = 0; i < 100; i++){
  const succeeded = true; // Player succeeded
  const shouldWin = GameUtils.determineGameResult(succeeded, false);
  if(shouldWin) wins++;
}
console.log(`Win rate: ${wins}%`); // Should be ~25%
```

## Best Practices

1. **Always Generate Patterns After Start**: Never pre-generate sequences that could be viewed in DOM
2. **Use Timed Reveals**: Auto-hide content after reveal duration expires
3. **Apply Anti-Copy Protection**: Use `protectElement()` on all pattern displays
4. **Enable Anti-Cheat in Competition**: Pass `competitionMode: true` for real games
5. **Test in Debug Mode First**: Verify game logic before enabling competition mode
6. **Clear Ephemeral Content**: Remove patterns from DOM after use
7. **Monitor During Critical Phases**: Start monitoring during memorize/input only
8. **Cleanup on Completion**: Always call cleanup functions for anti-cheat and protection

## Troubleshooting

### Win Rate Not Working

- Check `debugMode` is `false`
- Verify `competitionMode` is `true`
- Ensure `GameUtils` is loaded
- Check player succeeded (score >= threshold)

### Anti-Cheat Not Triggering

- Verify `AntiCheatWrapper` is loaded
- Check `competitionMode` is enabled
- Ensure `startMonitoring()` was called
- Verify monitoring during correct phase

### Debug Panel Not Showing

- Press Ctrl+Shift+D (not just Ctrl+D)
- Check console for errors
- Verify all modules are loaded
- Try `window.__showMinigameDebug()`

### Patterns Visible in DOM

- Ensure pattern generated after Start
- Check auto-hide timeout is working
- Verify ephemeral clearing on hide
- Use anti-copy protection on display

## Future Enhancements

Potential improvements for future versions:

1. **Adaptive Difficulty**: Adjust based on player performance
2. **Network Monitoring**: Detect connection issues during games
3. **Replay Detection**: Prevent replaying same game multiple times
4. **Screen Recording Detection**: Alert if screen capture is active
5. **Performance Analytics**: Track frame rates and lag
6. **A/B Testing**: Compare different win rates and difficulty curves

## Support

For issues or questions:
- Check console for error messages
- Review this documentation
- Test in debug mode first
- Verify all modules are loaded in correct order

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: Game System Team
