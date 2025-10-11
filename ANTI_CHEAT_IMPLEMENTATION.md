# Anti-Cheat Module Implementation

## Overview
This PR adds a comprehensive anti-cheat system for minigame submissions in competitions (HOH, Final 3 Part 1/2/3). The system validates gameplay sessions to ensure fair competition by enforcing:

1. **Minimum play time** - Prevents instant/too-fast completions
2. **Maximum duration** - Prevents stalling or leaving games open indefinitely
3. **Minimum distinct inputs** - Ensures players actually interact with the game
4. **Visibility/focus checks** - Detects if player backgrounds the app during gameplay
5. **Input cadence variability** - Identifies automated/bot-like input patterns

## Files Modified

### 1. `js/anti-cheat.js` (NEW)
Core anti-cheat validation module with session tracking and validation logic.

**Key Features:**
- Session management (start, end, validate, cleanup)
- Input tracking and analysis
- Visibility change monitoring
- Cadence variability calculation using coefficient of variation
- Configurable thresholds per game
- Backwards compatible design (graceful degradation if module not loaded)

**API:**
```javascript
// Start a session
const sessionId = AntiCheat.startSession({
  container: gameContainer,
  gameKey: 'quickTap',
  thresholds: {
    minPlayTime: 3000,      // 3 seconds minimum
    maxDuration: 300000,    // 5 minutes maximum
    minDistinctInputs: 3,   // At least 3 distinct inputs
    minCadenceVariability: 0.15  // Coefficient of variation threshold
  }
});

// Validate session
const validation = AntiCheat.validate(sessionId);
if (!validation.valid) {
  console.log(validation.reason); // Why validation failed
}

// Cleanup
AntiCheat.cleanup(sessionId);
```

### 2. `js/competitions.js` (MODIFIED)
Integrated anti-cheat validation into all competition entry points.

**Changes:**
- `renderHOH()`: Added session start/validate/cleanup
- `renderF3P1()`: Added session start/validate/cleanup
- `beginF3P2Competition()`: Added session start/validate/cleanup
- `beginF3P3Competition()`: Added session start/validate/cleanup

**Integration Pattern:**
```javascript
// Start session when rendering minigame
let antiCheatSessionId = null;
if(global.AntiCheat){
  antiCheatSessionId = global.AntiCheat.startSession({
    container: host,
    gameKey: mg,
    thresholds: { minPlayTime: 3000, maxDuration: 300000, minDistinctInputs: 3 }
  });
}

// Validate before submission
global.renderMinigame?.(mg, host, (base) => {
  if(antiCheatSessionId && global.AntiCheat){
    const validation = global.AntiCheat.validate(antiCheatSessionId);
    
    if(!validation.valid){
      // Block submission and show error
      host.innerHTML = `<div class="tiny" style="color:#ff6b9d;">⚠️ Submission blocked: ${validation.reason}</div>`;
      global.AntiCheat.cleanup(antiCheatSessionId);
      return;
    }
    
    global.AntiCheat.cleanup(antiCheatSessionId);
  }
  
  // Submit score if validation passed
  if(submitScore(you.id, base, humanMultiplier, `HOH/${mg}`)){
    host.innerHTML='<div class="tiny muted">Submission received. Waiting for others…</div>';
    maybeFinishComp();
  }
});
```

### 3. `index.html` (MODIFIED)
Added script tag to load anti-cheat module after AntiCheatWrapper.

```html
<script defer src="js/anti-cheat.js"></script><!-- Anti-cheat validation module -->
```

### 4. `test_anti_cheat.html` (NEW)
Comprehensive test suite with 7 test cases.

**Test Coverage:**
1. Basic session creation and validation
2. Minimum play time enforcement
3. Maximum duration enforcement
4. Minimum input requirements
5. Input cadence variability detection
6. Backgrounding detection
7. Full integration test

## Backwards Compatibility

The implementation is **fully backwards compatible**:

1. **Optional Loading**: All integration points check for `global.AntiCheat` existence before using it
2. **Graceful Degradation**: If module not loaded, games work normally without validation
3. **No Breaking Changes**: Existing minigame API unchanged
4. **Legacy Games**: Work without modification

Example:
```javascript
// This pattern is used throughout:
if(global.AntiCheat){
  // Use anti-cheat validation
} else {
  // Continue without validation (legacy behavior)
}
```

## Configuration

Default thresholds can be customized per game:

```javascript
const DEFAULT_THRESHOLDS = {
  minPlayTime: 3000,        // 3 seconds minimum
  maxDuration: 300000,      // 5 minutes maximum
  minDistinctInputs: 3,     // At least 3 inputs required
  minCadenceVariability: 0.15, // Minimum CoV for input timing
  allowNoInputGames: true   // Allow watch-only games
};
```

## Technical Details

### Input Tracking
- Monitors: `click`, `touchstart`, `keydown`, `mousedown` events
- Tracks event type, timestamp, and target element
- Calculates distinct inputs considering both type and rough timing

### Cadence Variability
Uses **Coefficient of Variation (CV)** to detect automated patterns:
- CV = Standard Deviation / Mean
- Higher CV = more variable/human-like timing
- Lower CV = uniform/automated timing
- Minimum threshold: 0.15 (15% variation)

### Visibility Monitoring
- Listens to `visibilitychange` event
- Marks session as backgrounded if `document.hidden` becomes true
- Also monitors mobile app state changes if available

## Validation Flow

```
1. Player starts minigame
   ↓
2. Anti-cheat session started (tracking begins)
   ↓
3. Player completes game
   ↓
4. Game calls onComplete(score)
   ↓
5. Anti-cheat validates session:
   - Check play time (min/max)
   - Check input count
   - Check input cadence
   - Check visibility status
   ↓
6a. If VALID: Submit score normally
6b. If INVALID: Block submission, show error
   ↓
7. Cleanup session
```

## Error Messages

When validation fails, users see clear error messages:
- "Game completed too quickly (1.5s < 3.0s minimum)"
- "Game took too long (6.2m > 5.0m maximum)"
- "Too few distinct inputs (2 < 3 minimum)"
- "Input pattern appears automated (variability: 0.12 < 0.15 minimum)"
- "App was backgrounded during gameplay"

## Testing

Run the test suite by opening `test_anti_cheat.html` in a browser.

All tests verify proper functionality:
- ✅ Session tracking works correctly
- ✅ Time validations enforce min/max bounds
- ✅ Input tracking counts distinct actions
- ✅ Cadence analysis detects uniform patterns
- ✅ Module integrates with main game

## Future Enhancements

Potential improvements:
1. Telemetry integration to track validation failures
2. Adjustable difficulty tiers with different thresholds
3. Machine learning-based pattern detection
4. Per-game threshold customization in registry
5. Debug mode with detailed validation logs

## Conclusion

This implementation provides robust anti-cheat protection while maintaining full backwards compatibility with existing systems. The modular design allows for easy customization and future enhancements.
