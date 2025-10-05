# Minigame System Phase 1 — Foundation Documentation

## Overview

Phase 1 of the minigame system refactor introduces a unified, mobile-first architecture for managing competition minigames in BBMobile. This foundation addresses key issues with the legacy system:

- **Inconsistent APIs** between old and new games
- **Game repetition** within seasons
- **Lack of standardized scoring** across different game types
- **Mobile compatibility** gaps

## Architecture

The new system is built on four core modules:

### 1. Registry (`js/minigames/registry.js`)

**Purpose**: Centralized metadata store for all minigames

**Key Features**:
- Comprehensive game metadata (name, type, scoring, mobile-friendly status)
- Filtering capabilities (by implementation, type, mobile-friendly)
- Type-safe game lookup

**API**:
```javascript
// Get all registered games
MinigameRegistry.getRegistry()

// Get specific game
MinigameRegistry.getGame('countHouse')

// Get implemented games
MinigameRegistry.getImplementedGames(excludeRetired = true)

// Get mobile-friendly games
MinigameRegistry.getMobileFriendlyGames()

// Filter by type
MinigameRegistry.getGamesByType('reaction')
```

**Metadata Structure**:
```javascript
{
  key: 'countHouse',
  name: 'Count House',
  description: 'Count objects quickly and accurately',
  type: 'puzzle',           // reaction, memory, puzzle, trivia, endurance
  scoring: 'accuracy',      // time, accuracy, hybrid, endurance
  mobileFriendly: true,
  implemented: true,
  module: 'count-house.js',
  minScore: 0,
  maxScore: 100,
  retired: false
}
```

### 2. Selector (`js/minigames/selector.js`)

**Purpose**: Non-repeating game selection within seasons

**Key Features**:
- Pool-based selection ensuring all games played before any repeat
- Automatic reshuffling when pool exhausted
- No immediate consecutive repeats
- History tracking

**How It Works**:
1. Initialize with available games → creates shuffled pool
2. Each selection pulls next game from pool
3. When pool exhausted, reshuffle and continue
4. Smart swap to avoid consecutive repeats across pool boundaries

**API**:
```javascript
// Initialize pool for season
MinigameSelector.initializeSeasonPool(availableGames)

// Get next game (auto-reshuffles when needed)
MinigameSelector.selectNext(allowRepeatAfterExhaustion = true)

// Get remaining games before reshuffle
MinigameSelector.getRemainingInPool()

// Get selection history
MinigameSelector.getHistory(count = 10)

// Reset state
MinigameSelector.reset()
```

**Example Flow**:
```
Pool: [A, B, C, D, E] (shuffled)
Select: A (4 remaining)
Select: B (3 remaining)
Select: C (2 remaining)
Select: D (1 remaining)
Select: E (0 remaining)
→ Pool exhausted, reshuffle
Pool: [D, C, A, E, B] (new shuffle, E avoided at start)
Select: D (4 remaining)
...
```

### 3. Scoring (`js/minigames/scoring.js`)

**Purpose**: Standardized 0-100 score normalization

**Key Features**:
- Multiple normalization strategies for different game types
- Competitive multipliers (compBeast stat)
- Difficulty adjustments

**Normalization Functions**:

```javascript
// Basic normalization
MinigameScoring.normalize(rawScore, minScore, maxScore)

// Time-based (lower time = higher score)
MinigameScoring.normalizeTime(timeMs, targetTimeMs, maxTimeMs)

// Accuracy-based
MinigameScoring.normalizeAccuracy(correct, total, penalizeIncorrect, incorrect)

// Hybrid (combines time + accuracy)
MinigameScoring.normalizeHybrid({
  correct, total, timeMs, targetTimeMs, accuracyWeight
})

// Endurance (longer duration = higher score)
MinigameScoring.normalizeEndurance(durationMs, targetDurationMs, minDurationMs)

// Apply competitive multipliers
MinigameScoring.applyCompetitiveMultiplier(baseScore, compBeast, difficultyMult)

// Complete calculation
MinigameScoring.calculateFinalScore({
  rawScore, gameKey, compBeast, difficultyMultiplier
})
```

**Scoring Strategies by Type**:
- **Time games**: Exponential decay from target time
- **Accuracy games**: Linear percentage with optional penalties
- **Hybrid games**: Weighted combination (default 60% accuracy, 40% time)
- **Endurance games**: Linear scaling from minimum to target duration

### 4. Mobile Utils (`js/minigames/mobile-utils.js`)

**Purpose**: Touch/tap abstraction and responsive helpers

**Key Features**:
- Unified touch/click event handling
- Device detection and orientation
- Mobile-friendly UI components
- Performance utilities (debounce, throttle)

**API**:

```javascript
// Device detection
MinigameMobileUtils.isMobileDevice()
MinigameMobileUtils.getViewportSize()
MinigameMobileUtils.isPortrait()

// Touch/tap handling
MinigameMobileUtils.addTapListener(element, handler, options)
MinigameMobileUtils.addTapWithFeedback(element, handler, pressedClass)
MinigameMobileUtils.preventTouchDefaults(element)
MinigameMobileUtils.getEventCoordinates(event)

// UI components
MinigameMobileUtils.createResponsiveContainer(options)
MinigameMobileUtils.createButton(text, handler, options)
MinigameMobileUtils.applyMobileFriendlyStyles(element, options)

// Utilities
MinigameMobileUtils.debounce(func, wait)
MinigameMobileUtils.throttle(func, limit)
MinigameMobileUtils.vibrate(pattern)
```

## Integration

### Feature Flag

The new system is **opt-in** via the `cfg.useNewMinigames` flag:

```javascript
// In settings
cfg.useNewMinigames = false  // Default: use legacy system
cfg.useNewMinigames = true   // Enable Phase 1 system
```

### Settings UI

A new checkbox in Settings → Gameplay:
- "Use new minigame system (Phase 1) - non-repeating pools"

### Competition Integration

The `pickMinigameType()` function in `competitions.js` checks the flag:

```javascript
function pickMinigameType() {
  // ... legacy mode overrides ...
  
  // NEW SYSTEM: Use Phase 1 when flag enabled
  if(cfg.useNewMinigames && MinigameSelector && MinigameRegistry) {
    const selectedGame = MinigameSelector.selectNext(true);
    if(selectedGame) {
      return selectedGame;
    }
  }
  
  // LEGACY SYSTEM: Fall back to old behavior
  // ...
}
```

### Scoring Integration

The `submitScore()` function uses new normalization when flag enabled:

```javascript
function submitScore(id, base, mult, label) {
  let normalizedBase = base;
  
  if(cfg.useNewMinigames && MinigameScoring) {
    // New system: scores already 0-100
    normalizedBase = Math.max(0, Math.min(100, base));
  } else {
    // Legacy normalization
    if(base > 100) {
      normalizedBase = Math.min(100, (base / 120) * 100);
    }
  }
  
  const final = Math.max(0, Math.min(150, normalizedBase * mult));
  // ...
}
```

## Registered Games (Phase 1)

### Implemented Games (5)

1. **Count House** (`countHouse`)
   - Type: puzzle
   - Scoring: accuracy
   - Mobile-friendly: ✅

2. **Reaction Royale** (`reactionRoyale`)
   - Type: reaction
   - Scoring: time
   - Mobile-friendly: ✅

3. **Trivia Pulse** (`triviaPulse`)
   - Type: trivia
   - Scoring: hybrid
   - Mobile-friendly: ✅

4. **Quick Tap** (`quickTap`)
   - Type: reaction
   - Scoring: accuracy
   - Mobile-friendly: ✅

5. **Reaction Timer** (`reactionTimer`)
   - Type: reaction
   - Scoring: time
   - Mobile-friendly: ✅

### Scaffolds (5)

Games registered but not yet implemented:
- **Oteviator** (reaction)
- **Comix Spot** (puzzle)
- **Hold Wall** (endurance)
- **Slippery Shuttle** (puzzle)
- **Memory Zipline** (memory)

## Testing

### Test Suite

A comprehensive test page (`test_minigame_selector.html`) validates:

1. **Registry Tests**
   - Module loading
   - Game metadata accuracy
   - Filtering functions

2. **Selector Tests**
   - Non-repeating pool behavior
   - Even distribution across reshuffles
   - No consecutive repeats

3. **Scoring Tests**
   - All normalization functions
   - Competitive multipliers
   - Final score calculation

4. **Mobile Utils Tests**
   - Device detection
   - Viewport size
   - Button creation
   - Container creation
   - Style application

### Test Results

✅ All 4 test suites passing
✅ 20 game selections with perfect distribution (4 each for 5 games)
✅ No immediate repeats detected
✅ Pool reshuffling working correctly

## Backwards Compatibility

The system maintains **full backwards compatibility**:

1. **Feature flag defaults to OFF** - no behavior change unless opted-in
2. **Legacy system remains intact** - old selection logic preserved
3. **Graceful fallbacks** - if new modules fail to load, falls back to legacy
4. **Progressive enhancement** - new games can use new system while old games continue working

## Mobile-First Design

All new system components prioritize mobile:

1. **Touch/tap abstractions** prevent dual-event issues
2. **Responsive containers** adapt to viewport
3. **Visual feedback** for all interactions
4. **No accidental zoom/scroll** with proper touch-action settings
5. **Accessible event coordinates** work for both touch and mouse

## Future Extensions

Phase 1 provides foundation for:

- **Phase 2**: Migrate more legacy games to new modules
- **Phase 3**: Remove legacy pathways entirely
- **Phase 4**: Advanced features (difficulty tiers, player preferences, seasonal themes)

## Migration Guide

### For New Games

1. Create game module in `js/minigames/`
2. Add entry to `registry.js` with proper metadata
3. Use mobile utils for UI components
4. Return scores in 0-100 range
5. Test with selector to verify non-repeat behavior

### For Existing Games

1. Update to return 0-100 scores
2. Add mobile-friendly touch handling
3. Register in new registry
4. Mark as `implemented: true`
5. Test with new scoring system

## Performance Considerations

- **Lazy loading**: Modules load with `defer` attribute
- **Minimal overhead**: Selector uses simple array operations
- **No heavy dependencies**: Pure JavaScript implementations
- **Efficient filtering**: O(n) filtering with early exits
- **Memory-conscious**: History limited to last 20 games

## Known Limitations

1. **5 implemented games**: More will be added in future phases
2. **No saved preferences**: Player preferences not yet implemented
3. **Single pool per season**: No per-competition-type pools yet
4. **Basic difficulty**: Advanced difficulty tiers coming in Phase 2

## Support

For issues or questions:
1. Check test page for validation
2. Review console logs (`[MinigameSelector]`, `[MinigameScoring]`, etc.)
3. Verify feature flag is enabled in settings
4. Ensure all modules loaded (check Network tab)

---

**Version**: Phase 1 (Foundation)  
**Status**: ✅ Complete and Tested  
**Compatibility**: Fully backwards compatible  
**Next**: Phase 2 - Game Migration
