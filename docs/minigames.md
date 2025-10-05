# Minigame System Documentation

## Overview

The BBMobile minigame system is a modular, mobile-first architecture for competition minigames. It provides consistent APIs, non-repeating selection, standardized scoring, and comprehensive telemetry.

## Architecture

### Core Modules

#### 1. Registry (`js/minigames/registry.js`)

The registry is the central metadata store for all minigames. Each game entry includes:

```javascript
{
  key: 'countHouse',              // Unique identifier
  name: 'Count House',            // Display name
  description: 'Count objects...', // Brief description
  type: 'puzzle',                 // Category (reaction, memory, puzzle, trivia, endurance)
  scoring: 'accuracy',            // Scoring type (time, accuracy, hybrid, endurance)
  mobileFriendly: true,           // Touch/tap optimized
  implemented: true,              // Ready to play
  module: 'count-house.js',       // Module filename
  minScore: 0,                    // Minimum score
  maxScore: 100,                  // Maximum score
  retired: false                  // Should not be selected
}
```

**API:**
- `MinigameRegistry.getAll()` - Get all games
- `MinigameRegistry.getImplemented()` - Get implemented games only
- `MinigameRegistry.getByKey(key)` - Get specific game metadata
- `MinigameRegistry.getByType(type)` - Filter by type
- `MinigameRegistry.getMobileFriendly()` - Get mobile-optimized games

#### 2. Selector (`js/minigames/selector.js`)

Provides non-repeating pool-based selection to ensure variety within each season.

**Features:**
- Maintains a shuffled pool of games
- Automatically reshuffles when pool is exhausted
- Prevents consecutive repeats
- Even distribution across reshuffles

**API:**
- `MinigameSelector.selectNext()` - Get next game from pool
- `MinigameSelector.reset()` - Clear history and reshuffle
- `MinigameSelector.getHistory()` - Get selection history
- `MinigameSelector.getPoolStatus()` - Check remaining games in pool

**Configuration:**
```javascript
MinigameSelector.configure({
  historyLimit: 20,        // Max history entries to keep
  allowRetired: false,     // Include retired games
  mobileFriendlyOnly: true // Only select mobile-friendly games
});
```

#### 3. Scoring (`js/minigames/scoring.js`)

Unified scoring system with normalization and competitive multipliers.

**Normalization Functions:**
- `MinigameScoring.normalizeTime(ms, minMs, maxMs)` - Convert time to 0-100 score
- `MinigameScoring.normalizeAccuracy(correct, total)` - Convert accuracy to score
- `MinigameScoring.normalizeHybrid(time, accuracy, timeWeight)` - Combine time and accuracy
- `MinigameScoring.normalizeEndurance(duration, maxDuration)` - Convert endurance to score

**Competitive Scoring:**
```javascript
MinigameScoring.calculateFinalScore({
  baseScore: 75,           // Raw game score (0-100)
  difficulty: 'normal',    // 'easy', 'normal', 'hard'
  playerSkill: 0.7,        // Player skill (0-1)
  isCompetition: true      // Apply competitive multiplier
});
```

#### 4. Mobile Utils (`js/minigames/mobile-utils.js`)

Helper utilities for mobile-friendly UI components.

**API:**
- `MobileUtils.isMobile()` - Detect mobile device
- `MobileUtils.getViewportSize()` - Get viewport dimensions
- `MobileUtils.createButton(label, className)` - Create styled button
- `MobileUtils.createContainer(className)` - Create container element
- `MobileUtils.applyMobileStyles(element, styles)` - Apply mobile-optimized styles
- `MobileUtils.createTouchArea(size)` - Create touch-friendly area
- `MobileUtils.setupTouchFeedback(element)` - Add touch feedback

#### 5. Error Handler (`js/minigames/error-handler.js`)

Graceful error handling and recovery for minigames.

**Features:**
- Catches and logs rendering errors
- Provides fallback UI with skip option
- Integrates with telemetry
- Prevents game crashes from breaking competitions

**API:**
- `MinigameErrorHandler.safeRender(key, container, onComplete, metadata)` - Render with error handling

#### 6. Telemetry (`js/minigames/telemetry.js`)

Comprehensive event logging and analytics.

**Events Tracked:**
- Game start/completion
- Score submission
- Error occurrences
- Selection patterns
- Performance metrics

**API:**
- `MinigameTelemetry.logStart(gameKey, metadata)` - Log game start
- `MinigameTelemetry.logComplete(gameKey, score, duration, metadata)` - Log completion
- `MinigameTelemetry.logError(gameKey, error, metadata)` - Log error
- `MinigameTelemetry.getStats()` - Get aggregated statistics

#### 7. Accessibility (`js/minigames/accessibility.js`)

Accessibility features for inclusive gameplay.

**Features:**
- Keyboard navigation support
- Screen reader announcements
- High contrast mode
- Reduced motion support
- Focus management

**API:**
- `MinigameA11y.announceGameStart(gameName)` - Announce to screen readers
- `MinigameA11y.setupKeyboardNav(container)` - Enable keyboard navigation
- `MinigameA11y.setHighContrast(enabled)` - Toggle high contrast
- `MinigameA11y.setReducedMotion(enabled)` - Toggle reduced motion

## Game Module Pattern

All game modules follow this consistent structure:

```javascript
// MODULE: minigames/game-name.js
// Game Name - Brief description
// Migrated from legacy minigames.js (if applicable)

(function(g){
  'use strict';

  /**
   * Game Name minigame
   * Description of gameplay mechanics
   * Score calculation explanation
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   */
  function render(container, onComplete){
    // Clear container
    container.innerHTML = '';
    
    // Create UI elements
    const description = document.createElement('div');
    description.className = 'minigame-description';
    description.textContent = 'Game instructions...';
    
    // Game logic here
    // ...
    
    // When game ends, call:
    // onComplete(score); // score should be 0-100
  }

  // Export to global minigames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.gameName = { render };

})(window);
```

### Best Practices

1. **Always clear the container first** - `container.innerHTML = '';`
2. **Return scores in 0-100 range** - Use scoring normalization functions
3. **Use mobile-friendly UI** - Large touch targets, clear labels
4. **Handle errors gracefully** - Wrap game logic in try-catch
5. **Clean up resources** - Clear timers, remove event listeners
6. **Document scoring logic** - Explain how points are calculated

## Integration

### Rendering a Minigame

```javascript
// Get game key from selector
const gameKey = MinigameSelector.selectNext();

// Render using registry
MiniGamesRegistry.render(gameKey, containerElement, function(score) {
  console.log('Game completed with score:', score);
  // Process score...
});
```

### Legacy Compatibility

The system maintains backward compatibility with the old `renderMinigame(type, host, onSubmit)` function:

```javascript
// Old way (still works, automatically mapped)
renderMinigame('clicker', containerElement, function(score) {
  // Handle score...
});
```

Legacy keys are automatically mapped to new module keys:
- `'clicker'` → `'quickTap'`
- `'memory'` → `'memoryMatch'`
- `'math'` → `'mathBlitz'`
- `'bar'` → `'timingBar'`
- `'reaction'` → `'reactionTimer'`
- etc.

## Adding New Games

### Step 1: Create the Module

Create a new file in `js/minigames/your-game.js`:

```javascript
(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    // Your game UI and logic
    const startButton = MobileUtils.createButton('Start Game', 'btn primary');
    startButton.onclick = function() {
      // Game logic...
      const score = 75; // Calculate based on performance
      onComplete(score);
    };
    
    container.appendChild(startButton);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.yourGame = { render };

})(window);
```

### Step 2: Register in Registry

Add entry to `js/minigames/registry.js`:

```javascript
yourGame: {
  key: 'yourGame',
  name: 'Your Game Name',
  description: 'Brief description of gameplay',
  type: 'puzzle', // or 'reaction', 'memory', 'trivia', 'endurance'
  scoring: 'accuracy', // or 'time', 'hybrid', 'endurance'
  mobileFriendly: true,
  implemented: true,
  module: 'your-game.js',
  minScore: 0,
  maxScore: 100,
  retired: false
}
```

### Step 3: Add Script Tag

Add to `index.html`:

```html
<script defer src="js/minigames/your-game.js"></script>
```

### Step 4: Test

1. Open browser console
2. Test rendering: `MiniGamesRegistry.render('yourGame', document.body, (s) => console.log('Score:', s))`
3. Test selection: Verify game appears in selector pool
4. Test on mobile device or emulator

## Game Categories

### Reaction Games
Fast-paced games testing reaction time and speed.
- Examples: Quick Tap, Reaction Royale, Target Practice
- Scoring: Usually time-based (faster = better)

### Memory Games
Test pattern recognition and recall.
- Examples: Memory Match, Sequence Memory, Pattern Match
- Scoring: Accuracy-based (correct matches)

### Puzzle Games
Logic and problem-solving challenges.
- Examples: Count House, Math Blitz, Word Anagram
- Scoring: Hybrid (accuracy + time)

### Trivia Games
Knowledge-based Big Brother questions.
- Examples: Trivia Pulse, Trivia Quiz
- Scoring: Hybrid (correct answers + speed bonus)

### Endurance Games
Sustained performance over time.
- Examples: Hold Wall (planned)
- Scoring: Duration-based (longer = better)

## Scoring Guidelines

### Time-Based Scoring
```javascript
const elapsedMs = Date.now() - startTime;
const score = MinigameScoring.normalizeTime(elapsedMs, 1000, 10000);
// 1000ms = 100 points, 10000ms = 0 points
```

### Accuracy-Based Scoring
```javascript
const correct = 8;
const total = 10;
const score = MinigameScoring.normalizeAccuracy(correct, total);
// 8/10 = 80 points
```

### Hybrid Scoring
```javascript
const timeScore = MinigameScoring.normalizeTime(elapsedMs, 1000, 10000);
const accuracyScore = MinigameScoring.normalizeAccuracy(correct, total);
const score = MinigameScoring.normalizeHybrid(timeScore, accuracyScore, 0.5);
// 50% weight on time, 50% on accuracy
```

## Troubleshooting

### Game Not Appearing in Selection

**Check:**
1. Is `implemented: true` in registry?
2. Is `retired: false` in registry?
3. Is the module script tag in index.html?
4. Is the module loaded? Check `window.MiniGames.yourGame`

### Game Fails to Render

**Common Issues:**
1. Module not loaded yet - ensure `defer` attribute on script tag
2. Syntax error in module - check browser console
3. Missing dependencies - check mobile-utils, scoring modules loaded
4. Container element not found - verify container exists in DOM

**Fix:**
- Use error handler: `MinigameErrorHandler.safeRender()`
- Check telemetry logs: `MinigameTelemetry.getStats()`
- Enable debug mode: `MinigameDebugPanel.show()`

### Score Calculation Issues

**Guidelines:**
- Always return score in 0-100 range
- Use normalization functions for consistency
- Never return negative scores
- Handle edge cases (zero time, zero accuracy)
- Test extreme values (min/max performance)

### Mobile Compatibility Issues

**Checklist:**
- Use `MobileUtils.createButton()` for touch-friendly buttons
- Minimum touch target size: 44x44 pixels
- Avoid hover-only interactions
- Test on actual mobile devices
- Use viewport-relative sizing
- Disable text selection if needed
- Prevent scroll during gameplay

## Testing

### Manual Testing

1. **Selection Test**: Verify no repeats within pool size
   ```javascript
   for(let i = 0; i < 20; i++) {
     console.log(MinigameSelector.selectNext());
   }
   ```

2. **Rendering Test**: Test each game renders correctly
   ```javascript
   const games = MinigameRegistry.getImplemented();
   games.forEach(key => {
     MiniGamesRegistry.render(key, testContainer, (s) => console.log(key, s));
   });
   ```

3. **Scoring Test**: Verify score ranges
   ```javascript
   // Test min/max performance scenarios
   // Verify all scores are 0-100
   ```

### Automated Testing

See `test_minigame_selector.html` for comprehensive test suite covering:
- Registry metadata validation
- Selector non-repeat logic
- Scoring normalization functions
- Mobile utils functionality
- Telemetry logging

## Configuration

### Global Settings

Configure via game settings:

```javascript
// Enable new minigame system
cfg.useNewMinigames = true;

// Selector configuration
MinigameSelector.configure({
  historyLimit: 20,
  allowRetired: false,
  mobileFriendlyOnly: true
});

// Telemetry configuration
MinigameTelemetry.configure({
  enabled: true,
  logToConsole: false,
  sendToServer: false
});
```

## Linting Rules

To maintain code quality and prevent deprecated patterns, the ESLint configuration enforces:

### Prohibited Patterns

1. **Direct legacy minigame function calls**
   ```javascript
   // ❌ BAD - Don't call legacy functions directly
   mgClicker(container, callback);
   
   // ✅ GOOD - Use the registry system
   MiniGamesRegistry.render('quickTap', container, callback);
   ```

2. **Manual map lookups for minigames**
   ```javascript
   // ❌ BAD - Don't create custom game maps
   const gameMap = { 'clicker': mgClicker, 'memory': mgMemory };
   
   // ✅ GOOD - Use the registry
   const game = MinigameRegistry.getByKey('quickTap');
   ```

3. **Hardcoded game selection**
   ```javascript
   // ❌ BAD - Don't hardcode game selection
   renderMinigame('clicker', container, callback);
   
   // ✅ GOOD - Use the selector
   const gameKey = MinigameSelector.selectNext();
   MiniGamesRegistry.render(gameKey, container, callback);
   ```

### Required Patterns

1. **All games must be in registry**
2. **All games must follow module pattern**
3. **All games must export via `window.MiniGames.gameName`**
4. **All scores must be 0-100 range**

## Migration from Legacy

If you have old code using the legacy system:

### Before (Legacy)
```javascript
// Old monolithic minigames.js
function mgClicker(host, onSubmit) {
  // Game logic...
  onSubmit(score);
}

// Direct call
renderMinigame('clicker', container, callback);
```

### After (New System)
```javascript
// Individual module: js/minigames/quick-tap.js
(function(g){
  function render(container, onComplete) {
    // Game logic...
    onComplete(score);
  }
  
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.quickTap = { render };
})(window);

// Registry entry in registry.js
quickTap: {
  key: 'quickTap',
  name: 'Quick Tap Race',
  // ... metadata
}

// Automatic routing via bridge
renderMinigame('clicker', container, callback); // Works!
// Or use new API
MiniGamesRegistry.render('quickTap', container, callback);
```

## Future Enhancements

Planned improvements for future phases:

- **Phase 9**: Advanced telemetry and analytics dashboard
- **Phase 10**: Multiplayer minigame support
- **Phase 11**: Dynamic difficulty adjustment
- **Phase 12**: Leaderboards and achievements
- **Phase 13**: Custom minigame creator/editor
- **Phase 14**: AI-powered game recommendations

## Support

For issues or questions:
1. Check browser console for errors
2. Review telemetry logs
3. Test with debug panel enabled
4. Verify all modules loaded correctly
5. Check mobile compatibility

## Changelog

### Phase 1 (Complete)
- Created modular architecture
- Implemented non-repeating selector
- Added unified scoring system
- Created mobile utilities

### Phase 2-7 (Complete)
- Migrated all legacy games
- Added error handling
- Implemented telemetry
- Added accessibility features
- Created debug tools

### Phase 8 (Current)
- Removed legacy code
- Created comprehensive documentation
- Added linting rules
- Final cleanup and polish
