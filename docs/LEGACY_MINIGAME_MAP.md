# Legacy Minigame Map - Developer Guide

## Overview

The **Legacy Minigame Map** (`LEGACY_MINIGAME_MAP` in `js/minigames/core/compat-bridge.js`) serves as the ultimate fallback system to guarantee that every competition/phase can **always** load a playable minigame, even when the registry or key resolution systems fail.

## Purpose

### Problem
Competitions and minigames frequently failed to load due to:
- Registry/selector/alias mismatches
- Keys used by old code that aren't registered in the new system
- New games added to registry but not fully integrated
- Module loading race conditions

### Solution
The legacy map provides a direct, flat mapping of **ALL possible minigame keys** (canonical, aliases, legacy names, variations) to their actual module keys in `g.MiniGames`. This guarantees:
- ✅ **100% competition coverage** - No "Unknown minigame" errors
- ✅ **Backwards compatibility** - Old keys continue working
- ✅ **Future-proof** - New games work even if registry integration incomplete
- ✅ **Zero user impact** - Silent fallback prevents gameplay interruption

## Resolution Order

When a minigame key is requested, the system tries to resolve it in this order:

```
1. MGKeyResolver.resolveGameKey(key)
   ↓ (if not found)
2. MinigameCompatBridge.resolveToModule(key) [LEGACY MAP]
   ↓ (if not found)
3. Final fallback to 'quickTap'
```

## Adding New Minigames

**CRITICAL**: When adding a new minigame, you **MUST** update **BOTH** systems:

### Step 1: Add to Registry (`js/minigames/registry.js`)

```javascript
newGame: {
  key: 'newGame',
  name: 'New Game',
  description: 'Game description',
  type: 'reaction',
  scoring: 'accuracy',
  mobileFriendly: true,
  implemented: true,
  module: 'new-game.js',
  minScore: 0,
  maxScore: 100,
  retired: false
}
```

### Step 2: Add to Legacy Minigame Map (`js/minigames/core/compat-bridge.js`)

```javascript
const LEGACY_MINIGAME_MAP = {
  // ... existing entries ...
  
  // Add ALL possible variations of the key:
  'newGame': 'newGame',           // Canonical camelCase
  'new-game': 'newGame',          // Kebab-case
  'newgame': 'newGame',           // Lowercase
  'ng': 'newGame',                // Optional: short alias
  // ... any other variations that might be used
};
```

### Step 3: Register in Bootstrap (`js/minigames/core/registry-bootstrap.js`)

The bootstrap automatically pulls canonical keys from the registry, but if you have **additional aliases**, add them:

```javascript
const descriptiveAliases = {
  // ... existing entries ...
  'new-game': 'newGame',
  'newgame': 'newGame'
};
```

### Step 4: Create the Module (`js/minigames/new-game.js`)

```javascript
(function(g){
  'use strict';
  
  function render(container, onComplete){
    // Game implementation
  }
  
  // Export - key MUST match the module key in legacy map
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.newGame = { render };
  
})(window);
```

## Validation

After adding a new game, run validation:

```bash
npm run test:minigames
```

This will verify:
- ✅ All registry keys are in bootstrap
- ✅ All selector pool keys resolve
- ✅ No unknown keys in the system

## Legacy Map Structure

The legacy map contains entries for:

1. **Canonical keys** (from registry)
   - `'quickTap': 'quickTap'`

2. **Naming variations** (for flexible matching)
   - `'quick-tap': 'quickTap'`
   - `'quicktap': 'quickTap'`

3. **Legacy aliases** (backwards compatibility)
   - `'clicker': 'quickTap'`

4. **All implemented games** (including retired)
   - Retired games are still playable if explicitly requested

## When Can the Legacy Map Be Removed?

The legacy map can only be removed when:

1. ✅ **100% registry coverage** - Every possible key is in the registry
2. ✅ **Complete alias mapping** - All variations registered in MGKeyResolver
3. ✅ **Full test coverage** - All tests pass without legacy map fallback
4. ✅ **Zero telemetry events** - No `minigame.resolution.legacy-map` events for 30+ days
5. ✅ **Team consensus** - All developers agree the system is stable

**Until then, the legacy map MUST be maintained for every minigame.**

## Telemetry

When the legacy map is used, telemetry events are logged:

```javascript
MinigameTelemetry.logEvent('minigame.resolution.legacy-map', {
  requestedKey: 'some-key',
  resolvedKey: 'actualKey'
});
```

Monitor these events to identify:
- Keys that should be added to the registry
- Aliases that need proper registration
- Code that uses old/unregistered keys

## Troubleshooting

### "Unknown minigame" error appears

1. Check if key exists in legacy map (`compat-bridge.js`)
2. Check if module file exists (`js/minigames/<module>.js`)
3. Check if module exports to correct key (`g.MiniGames.<moduleKey>`)
4. Run validation: `npm run test:minigames`

### Game works in registry but not in competition

1. Check if key is in legacy map with all variations
2. Check bootstrap fallback list includes the key
3. Check selector pool initialization
4. Look for telemetry events showing which resolution path is used

### New game doesn't appear in selector

1. Ensure `implemented: true` in registry
2. Ensure `retired: false` in registry
3. Check selector pool initialization
4. Verify key resolution works: `__mgTestKeys()` in browser console

## API Reference

### MinigameCompatBridge Functions

```javascript
// Get the full legacy minigame map
MinigameCompatBridge.getLegacyMinigameMap()

// Resolve a key to module key
MinigameCompatBridge.resolveToModule('some-key')  // Returns 'actualKey' or null

// Check if key exists in legacy map
MinigameCompatBridge.isInLegacyMinigameMap('some-key')  // Returns boolean

// Get all keys from legacy map
MinigameCompatBridge.getAllLegacyMinigameKeys()  // Returns array of keys

// Get all unique module keys
MinigameCompatBridge.getAllLegacyModuleKeys()  // Returns array of module keys
```

## Summary

The legacy minigame map is a **critical safety net** that prevents "Unknown minigame" errors from ever reaching users. Until the registry/resolver system proves 100% reliable over an extended period, the legacy map MUST be maintained for all minigames.

**Remember**: When adding a game, update BOTH the registry AND the legacy map. This dual-system approach guarantees zero gameplay interruptions.
