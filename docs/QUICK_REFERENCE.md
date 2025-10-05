# Minigame System Quick Reference

## 🚀 Quick Start

### Adding a New Minigame

1. **Create the module** (`js/minigames/your-game.js`):
```javascript
(function(g){
  'use strict';
  
  function render(container, onComplete){
    container.innerHTML = '';
    // Your game logic here
    // Call onComplete(score) when done (score: 0-100)
  }
  
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.yourGame = { render };
})(window);
```

2. **Register in registry** (`js/minigames/registry.js`):
```javascript
yourGame: {
  key: 'yourGame',
  name: 'Your Game Name',
  description: 'Brief description',
  type: 'puzzle', // reaction, memory, puzzle, trivia, endurance
  scoring: 'accuracy', // time, accuracy, hybrid, endurance
  mobileFriendly: true,
  implemented: true,
  module: 'your-game.js',
  minScore: 0,
  maxScore: 100,
  retired: false
}
```

3. **Add script tag** (`index.html`):
```html
<script defer src="js/minigames/your-game.js"></script>
```

4. **Test it**:
```javascript
MiniGamesRegistry.render('yourGame', container, (score) => {
  console.log('Score:', score);
});
```

## 📚 Core APIs

### MinigameRegistry
```javascript
// Get all games
MinigameRegistry.getAll()

// Get implemented games
MinigameRegistry.getImplemented()

// Get specific game
MinigameRegistry.getByKey('quickTap')

// Filter by type
MinigameRegistry.getByType('reaction')

// Render a game
MinigameRegistry.render('quickTap', container, callback)
```

### MinigameSelector
```javascript
// Select next game (non-repeating pool)
const gameKey = MinigameSelector.selectNext()

// Reset pool
MinigameSelector.reset()

// Get history
const history = MinigameSelector.getHistory()

// Get remaining games in pool
const remaining = MinigameSelector.getPoolStatus()

// Configure
MinigameSelector.configure({
  historyLimit: 20,
  allowRetired: false,
  mobileFriendlyOnly: true
})
```

### MinigameScoring
```javascript
// Normalize time (faster = better)
const score = MinigameScoring.normalizeTime(ms, 1000, 10000)

// Normalize accuracy
const score = MinigameScoring.normalizeAccuracy(correct, total)

// Normalize hybrid
const score = MinigameScoring.normalizeHybrid(timeScore, accuracyScore, 0.5)

// Normalize endurance (longer = better)
const score = MinigameScoring.normalizeEndurance(durationMs, maxMs)

// Calculate final score with multipliers
const final = MinigameScoring.calculateFinalScore({
  baseScore: 75,
  difficulty: 'normal',
  playerSkill: 0.7,
  isCompetition: true
})
```

### MobileUtils
```javascript
// Check if mobile
if(MobileUtils.isMobile()) { ... }

// Get viewport size
const { width, height } = MobileUtils.getViewportSize()

// Create button
const btn = MobileUtils.createButton('Start', 'btn primary')

// Create container
const container = MobileUtils.createContainer('game-container')

// Apply mobile styles
MobileUtils.applyMobileStyles(element, {
  fontSize: '1.2rem',
  padding: '20px'
})

// Create touch area
const area = MobileUtils.createTouchArea('large') // 'small', 'medium', 'large'

// Setup touch feedback
MobileUtils.setupTouchFeedback(button)
```

### MinigameTelemetry
```javascript
// Log game start
MinigameTelemetry.logStart('quickTap', { playerId: 123 })

// Log completion
MinigameTelemetry.logComplete('quickTap', 85, 5000, { playerId: 123 })

// Log error
MinigameTelemetry.logError('quickTap', error, { playerId: 123 })

// Get stats
const stats = MinigameTelemetry.getStats()

// Configure
MinigameTelemetry.configure({
  enabled: true,
  logToConsole: false
})
```

### MinigameErrorHandler
```javascript
// Render with error handling
MinigameErrorHandler.safeRender('quickTap', container, callback, {
  phase: 'HOH',
  playerId: 123,
  week: 5
})
```

## 🎮 Legacy Compatibility

Old code still works, automatically bridges to new system:

```javascript
// Old API (still works)
renderMinigame('clicker', container, callback)
// → Automatically maps to 'quickTap' and uses new system

// Legacy key mappings
'clicker'  → 'quickTap'
'memory'   → 'memoryMatch'
'math'     → 'mathBlitz'
'bar'      → 'timingBar'
'reaction' → 'reactionTimer'
// ... etc
```

## 🧪 Testing

### Manual Test
```javascript
// Test rendering
MiniGamesRegistry.render('quickTap', document.body, (s) => {
  console.log('Score:', s);
});

// Test selection
for(let i = 0; i < 20; i++) {
  console.log(MinigameSelector.selectNext());
}

// Test scoring
const score = MinigameScoring.normalizeTime(3000, 1000, 10000);
console.log('Score:', score); // Higher for faster time
```

### Validation Page
Open `test_phase8_cleanup.html` in browser to run comprehensive tests.

## 🐛 Troubleshooting

### Game Not Appearing
- Check `implemented: true` in registry
- Check `retired: false` in registry
- Verify script tag in index.html
- Check browser console for errors

### Game Fails to Render
- Check module is loaded: `window.MiniGames.gameName`
- Check for syntax errors in console
- Use error handler: `MinigameErrorHandler.safeRender()`
- Check telemetry: `MinigameTelemetry.getStats()`

### Score Issues
- Always return 0-100 range
- Use normalization functions
- Test edge cases (min/max performance)
- Check for negative or >100 values

## 📏 Scoring Guidelines

### Time-Based (faster = better)
```javascript
const elapsedMs = Date.now() - startTime;
const score = MinigameScoring.normalizeTime(elapsedMs, minMs, maxMs);
// Example: normalizeTime(3000, 1000, 10000)
// 1000ms = 100 points, 10000ms = 0 points, 3000ms = ~78 points
```

### Accuracy-Based
```javascript
const score = MinigameScoring.normalizeAccuracy(8, 10);
// 8 correct out of 10 = 80 points
```

### Hybrid (time + accuracy)
```javascript
const timeScore = MinigameScoring.normalizeTime(timeMs, minMs, maxMs);
const accuracyScore = MinigameScoring.normalizeAccuracy(correct, total);
const score = MinigameScoring.normalizeHybrid(timeScore, accuracyScore, 0.5);
// 0.5 = equal weight, 0.3 = 30% time / 70% accuracy, etc.
```

### Endurance (longer = better)
```javascript
const durationMs = Date.now() - startTime;
const score = MinigameScoring.normalizeEndurance(durationMs, maxMs);
// Longer duration = higher score
```

## 🎨 Game Categories

- **Reaction**: Quick Tap, Reaction Royale, Target Practice
- **Memory**: Memory Match, Sequence Memory, Pattern Match
- **Puzzle**: Count House, Math Blitz, Word Anagram
- **Trivia**: Trivia Pulse, Trivia Quiz
- **Endurance**: Hold Wall (planned)

## 🔧 Best Practices

1. **Always clear container**: `container.innerHTML = '';`
2. **Use mobile utils**: Large touch targets (44x44px minimum)
3. **Return 0-100 scores**: Use normalization functions
4. **Handle errors**: Wrap in try-catch or use error handler
5. **Clean up**: Clear timers, remove event listeners
6. **Document scoring**: Explain how points are calculated
7. **Test on mobile**: Verify touch interactions work

## 📖 Full Documentation

For complete details, see:
- [Main Documentation](minigames.md)
- [Documentation Index](README.md)
- [Phase 8 Summary](../PHASE8_CLEANUP_SUMMARY.md)
- [ESLint Rules](../.eslintrc.json)

## 🚫 Deprecated (Don't Use)

```javascript
// ❌ Don't call legacy functions directly
mgClicker(container, callback);

// ❌ Don't create custom game maps
const gameMap = { 'clicker': mgClicker };

// ❌ Don't hardcode game selection
renderMinigame('clicker', container, callback); // Works but not preferred

// ✅ DO use the new APIs
const key = MinigameSelector.selectNext();
MiniGamesRegistry.render(key, container, callback);
```

## 🎯 Common Patterns

### Simple Game
```javascript
function render(container, onComplete){
  container.innerHTML = '';
  
  const button = MobileUtils.createButton('Click Me', 'btn primary');
  let clicks = 0;
  
  button.onclick = () => {
    clicks++;
    if(clicks >= 10) {
      onComplete(100); // Perfect score
    }
  };
  
  container.appendChild(button);
}
```

### Timed Game
```javascript
function render(container, onComplete){
  container.innerHTML = '';
  const startTime = Date.now();
  const timeLimit = 10000; // 10 seconds
  
  // Game logic here
  
  function finish(){
    const elapsed = Date.now() - startTime;
    const score = MinigameScoring.normalizeTime(elapsed, 1000, timeLimit);
    onComplete(score);
  }
}
```

### Accuracy Game
```javascript
function render(container, onComplete){
  container.innerHTML = '';
  let correct = 0;
  const total = 10;
  
  // Game logic here
  
  function finish(){
    const score = MinigameScoring.normalizeAccuracy(correct, total);
    onComplete(score);
  }
}
```

## 💡 Tips

- Use `MinigameDebugPanel.show()` for debugging
- Check telemetry for usage patterns
- Test with different screen sizes
- Verify accessibility (keyboard nav, screen readers)
- Keep games under 30 seconds when possible
- Provide clear instructions
- Use visual/audio feedback for actions

---

**Need more help?** See [full documentation](minigames.md) or check browser console for errors.
