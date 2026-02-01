# Minigames Core Utilities

This directory contains core utilities and components used across all minigames.

## Modules

### Timer System

#### `timer-config.js`
Configuration for timer behavior across game categories.

**Exports**: `window.game.TimerConfig`

**API**:
- `getTimerConfig(category)` - Get full config for a category
- `getDefaultDuration(category, fallback)` - Get default duration in ms
- `shouldShowTimer(category)` - Check if timer should be visible
- `getCountDirection(category)` - Get 'up' or 'down'

**Categories**:
- `arcade`: 60s countdown, visible timer
- `endurance`: Count-up, hidden timer (3min hidden max)
- `logic`: 2min countdown, visible timer
- `trivia`: 15s per question, visible timer

#### `game-timer.js`
Reusable GameTimer class for consistent timing across minigames.

**Exports**: `window.game.GameTimer` (class)

**Usage**:
```javascript
// Create timer for arcade game
const timer = new window.game.GameTimer('arcade', {
  duration: 60000,  // Optional: override default
  autoStart: false  // Optional: start immediately
});

// Register callbacks
timer.onTick((elapsed, remaining) => {
  console.log(`Elapsed: ${elapsed}ms, Remaining: ${remaining}ms`);
});

timer.onComplete(() => {
  console.log('Timer completed!');
  onComplete(finalScore);
});

// Render timer UI
const timerContainer = document.createElement('div');
timer.render(timerContainer);
gameContainer.appendChild(timerContainer);

// Start timer
timer.start();

// Pause/resume
timer.pause();
timer.resume();

// Stop timer
timer.stop();

// Get time values
const elapsed = timer.getElapsed();
const remaining = timer.getRemaining();

// Format time for display
const formattedTime = timer.formatTime(elapsed);

// Clean up
timer.destroy();
```

**Constructor Options**:
- `duration` (number): Duration in milliseconds (overrides category default)
- `countDirection` ('up'|'down'): Count direction (overrides category default)
- `showTimer` (boolean): Whether to show timer UI (overrides category default)
- `autoStart` (boolean): Start timer immediately (default: false)

**Methods**:
- `start()` - Start the timer
- `pause()` - Pause the timer
- `resume()` - Resume from paused state
- `stop(triggerComplete)` - Stop the timer
- `getRemaining()` - Get remaining time in ms (countdown timers)
- `getElapsed()` - Get elapsed time in ms
- `onTick(callback)` - Register tick callback (called every frame)
- `onComplete(callback)` - Register completion callback
- `render(container)` - Render timer UI to container
- `formatTime(ms, showDecimal)` - Format time as MM:SS or M:SS.s
- `destroy()` - Clean up timer resources

**Features**:
- Supports countdown and countup modes
- Pause/resume safe for app backgrounding
- Visual warnings for low time (countdown mode)
- Accessible with ARIA attributes
- Mobile-friendly (uses requestAnimationFrame)

### Other Core Modules

#### `context.js`
Minigame context management for accessing game state.

#### `lifecycle.js`
Lifecycle hooks for minigame loading and cleanup.

#### `key-resolver.js`
Resolves minigame keys from legacy and modern APIs.

#### `compat-bridge.js`
Compatibility layer for legacy minigame APIs.

#### `registry-bootstrap.js`
Bootstrap utilities for minigame registry.

#### `watchdog.js`
Watchdog for detecting and recovering from minigame crashes.

## Adopting GameTimer in Your Minigame

### Step 1: Load Timer Modules
Ensure timer modules are loaded in your test HTML:
```html
<script src="js/minigames/core/timer-config.js"></script>
<script src="js/minigames/core/game-timer.js"></script>
```

### Step 2: Create Timer Instance
In your render function:
```javascript
function render(container, onComplete, options = {}){
  // Create timer based on game category
  const timer = new window.game.GameTimer('arcade'); // or 'endurance', 'logic', 'trivia'
  
  // Register completion callback
  timer.onComplete(() => {
    // Calculate final score
    const score = calculateScore();
    onComplete(score);
  });
  
  // Render timer UI
  const timerContainer = document.createElement('div');
  timer.render(timerContainer);
  container.appendChild(timerContainer);
  
  // Start timer when game starts
  timer.start();
}
```

### Step 3: Update Registry Metadata
Ensure your game entry in `registry.js` has:
- `category`: Game category (arcade, endurance, logic, trivia)
- `estimatedDuration`: Play time in seconds

### Step 4: Fallback for Safety
For backward compatibility, keep fallback logic:
```javascript
if(window.game.GameTimer){
  // Use GameTimer
  const timer = new window.game.GameTimer('arcade');
  // ...
} else {
  // Fallback to original timer logic
  // ...
}
```

## Examples

### Arcade Game (Countdown)
```javascript
const timer = new window.game.GameTimer('arcade', {
  duration: 60000 // 60 seconds
});
timer.onComplete(() => onComplete(score));
timer.render(container);
timer.start();
```

### Endurance Game (Count-up, Hidden)
```javascript
const timer = new window.game.GameTimer('endurance', {
  showTimer: false // Hidden timer
});
timer.onTick((elapsed) => {
  // Check game conditions
  if(playerFailed){
    timer.stop();
    const timeHeld = timer.getElapsed();
    onComplete(calculateScore(timeHeld));
  }
});
timer.start();
```

### Logic Game (Countdown with Custom Duration)
```javascript
const timer = new window.game.GameTimer('logic', {
  duration: 120000 // 2 minutes
});
timer.onTick((elapsed, remaining) => {
  updateGameState(elapsed);
});
timer.onComplete(() => {
  // Time's up
  onComplete(currentScore);
});
timer.render(container);
timer.start();
```

### Trivia Game (Per-Question Timer)
```javascript
let questionTimer = null;

function showQuestion(question){
  // Clean up previous timer
  if(questionTimer){
    questionTimer.destroy();
  }
  
  // Create new timer for this question
  questionTimer = new window.game.GameTimer('trivia', {
    duration: 15000 // 15 seconds per question
  });
  
  questionTimer.onComplete(() => {
    // Time's up for this question
    handleTimeout();
  });
  
  questionTimer.render(timerContainer);
  questionTimer.start();
}
```

## Migration Guide

### Before (Inline Timer)
```javascript
let startTime = Date.now();
let timerInterval = setInterval(() => {
  const elapsed = Date.now() - startTime;
  const remaining = 60000 - elapsed;
  timerDisplay.textContent = formatTime(remaining);
  
  if(remaining <= 0){
    clearInterval(timerInterval);
    endGame();
  }
}, 100);
```

### After (GameTimer)
```javascript
const timer = new window.game.GameTimer('arcade', {
  duration: 60000
});
timer.onComplete(() => endGame());
timer.render(timerDisplay);
timer.start();
```

## Best Practices

1. **Always clean up timers**: Call `timer.destroy()` when game ends or container is removed
2. **Use category defaults**: Let `TimerConfig` handle durations when possible
3. **Provide fallback**: Keep original timer logic as fallback for safety
4. **Test pause/resume**: Ensure timer works correctly when app is backgrounded
5. **Accessibility**: Timer UI includes ARIA attributes automatically

## Testing

Test your timer integration:
1. Load game in browser
2. Verify timer displays correctly
3. Test pause/resume (switch browser tabs)
4. Verify onComplete callback fires
5. Check mobile behavior

## Future Enhancements

Planned features for GameTimer:
- Network time synchronization
- Multiple timer instances per game
- Custom timer styles/themes
- Timer persistence across page reloads
- Performance monitoring and telemetry
