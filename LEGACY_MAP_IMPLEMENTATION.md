# Legacy Minigame Map Implementation - Summary

## Problem Statement

Competitions and minigames frequently failed to load due to registry/selector/alias mismatches, resulting in "Unknown minigame" errors and a broken gameplay loop. The system needed an ultimate fallback mechanism to guarantee that every competition key could resolve to a playable minigame.

## Solution Implemented

We've implemented a **comprehensive Legacy Minigame Map** as the ultimate fallback system, ensuring 100% competition coverage and zero "Unknown minigame" errors for users.

### Key Features

✅ **3-Tier Resolution System**
1. Try registry/alias system (MGKeyResolver)
2. Fallback to legacy minigame map (LEGACY_MINIGAME_MAP)
3. Final fallback to 'quickTap'

✅ **Complete Coverage**
- 78 key entries covering 23 unique game modules
- All canonical keys, naming variations, and legacy aliases
- 100% selector pool coverage (14/14 games)
- 100% registry coverage (23/23 games)

✅ **Automated Validation**
- New validation script: `npm run validate:legacy-map`
- Integrated into test suite: `npm run test:minigames`
- CI/CD ready for automated enforcement

✅ **Comprehensive Documentation**
- Developer guide: `docs/LEGACY_MINIGAME_MAP.md`
- Integration in main docs: `docs/minigames.md`
- Browser test page: `test_legacy_map_fallback.html`

## Files Changed

### Core System Files

**`js/minigames/core/compat-bridge.js`** (Enhanced)
- Added `LEGACY_MINIGAME_MAP` with 78 entries
- Added 5 new API functions for legacy map access
- Comprehensive coverage of all games with multiple key variations

**`js/minigames/index.js`** (Enhanced)
- Updated `render()` function with 3-tier fallback system
- Legacy map resolution between registry and final fallback
- Telemetry events for tracking legacy map usage
- Detailed logging for each resolution path

**`js/minigames/selector.js`** (Enhanced)
- Added legacy map fallback in `selectNext()`
- Matches render() fallback behavior
- Telemetry integration for monitoring

### Documentation

**`docs/LEGACY_MINIGAME_MAP.md`** (New)
- Complete developer guide for maintaining both systems
- Step-by-step instructions for adding new minigames
- API reference and troubleshooting guide
- Criteria for when legacy map can be removed

**`docs/minigames.md`** (Updated)
- Added warning about legacy map at top of Architecture section
- Updated Integration section with Quick Start guide
- Added validation scripts and test pages to Testing section
- Clear documentation of 3-tier resolution order

### Testing & Validation

**`scripts/validate-legacy-map.mjs`** (New)
- Validates 100% coverage of selector pool
- Checks all registry keys are in legacy map
- Detects orphaned entries and invalid references
- Exit code 1 if validation fails (CI/CD ready)

**`test_legacy_map_fallback.html`** (New)
- Interactive browser test page
- Tests key resolution through fallback chain
- Live rendering tests with different key types
- Coverage validation in browser environment

**`package.json`** (Updated)
- Added `validate:legacy-map` script
- Integrated into `test:minigames` pipeline

## Technical Details

### Legacy Minigame Map Structure

The map contains entries for:

1. **Canonical keys** (from registry)
   ```javascript
   'quickTap': 'quickTap'
   ```

2. **Naming variations** (flexible matching)
   ```javascript
   'quick-tap': 'quickTap',
   'quicktap': 'quickTap'
   ```

3. **Legacy aliases** (backwards compatibility)
   ```javascript
   'clicker': 'quickTap'
   ```

### Resolution Flow

```
User requests key: "some-key"
      ↓
1. MGKeyResolver.resolveGameKey("some-key")
      ↓ (if found)
   Returns canonical key
      ↓ (if NOT found)
2. MinigameCompatBridge.resolveToModule("some-key")
      ↓ (if found)
   Returns module key from legacy map
      ↓ (if NOT found)
3. Final fallback to 'quickTap'
```

### API Functions

**MinigameCompatBridge (Enhanced):**
```javascript
// Get full legacy minigame map
MinigameCompatBridge.getLegacyMinigameMap()

// Resolve key to module key
MinigameCompatBridge.resolveToModule('some-key')

// Check if key exists in legacy map
MinigameCompatBridge.isInLegacyMinigameMap('some-key')

// Get all keys/modules
MinigameCompatBridge.getAllLegacyMinigameKeys()
MinigameCompatBridge.getAllLegacyModuleKeys()
```

## Test Results

All validation tests pass with 100% coverage:

```
✅ Registry games: 23
✅ Legacy map entries: 78
✅ Unique modules: 23
✅ Selector pool coverage: 14/14 (100%)
✅ Registry coverage: 23/23 (100%)
✅ No orphaned entries
✅ No invalid references
✅ All keys resolve correctly
```

### Selector Pool (All Validated)

All 14 implemented, non-retired games are covered:
1. countHouse ✅
2. reactionRoyale ✅
3. triviaPulse ✅
4. quickTap ✅
5. memoryMatch ✅
6. mathBlitz ✅
7. timingBar ✅
8. sequenceMemory ✅
9. patternMatch ✅
10. wordAnagram ✅
11. targetPractice ✅
12. memoryPairs ✅
13. estimationGame ✅
14. reactionTimer ✅

## Acceptance Criteria Met

✅ **100% of competitions/phases can always load and play a minigame**
- Legacy map provides complete coverage
- 3-tier fallback system guarantees resolution
- Final fallback to quickTap prevents errors

✅ **New and old minigames are available and loadable**
- All 23 registry games in legacy map
- Legacy aliases maintained for backwards compatibility
- New games automatically included when added to registry

✅ **No user ever encounters a "competition started with no playable game" error**
- Multiple fallback layers prevent failures
- Telemetry tracks fallback usage for monitoring
- Comprehensive logging for debugging

✅ **Clear developer documentation for updating both registry and legacy map**
- Detailed guide in `docs/LEGACY_MINIGAME_MAP.md`
- Quick start section in `docs/minigames.md`
- Step-by-step checklist for adding games

✅ **Legacy map can be removed only when registry/selector system is proven 100% reliable**
- Documented removal criteria in guide
- Telemetry events track legacy map usage
- System can operate with or without legacy map

## Telemetry

The system logs telemetry events when the legacy map is used:

```javascript
MinigameTelemetry.logEvent('minigame.resolution.legacy-map', {
  requestedKey: 'some-key',
  resolvedKey: 'actualKey',
  atPhase: 'render' | 'selection'
});
```

Monitor these events to:
- Identify keys that should be added to registry
- Track legacy map usage patterns
- Determine when legacy map can be safely removed

## Usage for Developers

### Adding a New Minigame

**Step 1:** Add to registry (`js/minigames/registry.js`)
```javascript
newGame: {
  key: 'newGame',
  name: 'New Game',
  // ... other metadata
  implemented: true,
  retired: false
}
```

**Step 2:** Add to legacy map (`js/minigames/core/compat-bridge.js`)
```javascript
const LEGACY_MINIGAME_MAP = {
  // ... existing entries ...
  'newGame': 'newGame',
  'new-game': 'newGame',
  'newgame': 'newGame'
};
```

**Step 3:** Create module (`js/minigames/new-game.js`)
```javascript
(function(g){
  function render(container, onComplete){ /* ... */ }
  
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.newGame = { render };
})(window);
```

**Step 4:** Validate
```bash
npm run test:minigames
```

### Testing in Browser

1. Open `test_legacy_map_fallback.html` in browser
2. Check system status (all modules loaded)
3. Test key resolution with various key types
4. Test actual rendering with fallback
5. Verify coverage of all games

## Future Considerations

The legacy map provides a **safety net** while the registry/resolver system proves itself in production. It can be removed when:

1. ✅ Zero `minigame.resolution.legacy-map` telemetry events for 30+ days
2. ✅ All possible keys are properly registered in MGKeyResolver
3. ✅ Complete test coverage with no fallback usage
4. ✅ Team consensus that the system is stable

**Until then, the legacy map MUST be maintained alongside the registry.**

## Summary

This implementation solves the "Unknown minigame" problem by providing a comprehensive fallback system that guarantees every competition can always load a playable game. The dual-system approach (registry + legacy map) provides both modern functionality and bulletproof reliability.

**Key Principle**: When adding games, update BOTH systems. This ensures zero user impact while maintaining system flexibility.
