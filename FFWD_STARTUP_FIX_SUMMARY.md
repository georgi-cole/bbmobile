# Fast-Forward (FFWD) Startup State Fix - Summary

## Problem Statement

Fast-forward (FFWD) appeared pre-activated at startup, causing:
- Cards to auto-accelerate on page load
- First button click logging "already active"
- State mismatches where `__ffActive` read false immediately after activation
- Different game objects being used for reads vs writes

## Root Cause

The codebase had multiple game object references:
- Local `game` variable in state.js module scope
- Global `window.game` reference used by UI components

FFWD functions were writing to local `game` while UI was reading from `window.game`, causing state desynchronization.

## Solution Architecture

### Single Source of Truth Pattern

All FFWD operations now use `window.game` as the canonical source:

```
┌─────────────────────────────────────────────────┐
│              window.game (CANONICAL)            │
│  ┌──────────────────────────────────────────┐  │
│  │  __ffActive: false (boot default)        │  │
│  │  __ffMultiplier: 1 (boot default)        │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
           ▲                    ▲                ▲
           │                    │                │
    ┌──────┴───────┐    ┌──────┴───────┐   ┌───┴────┐
    │  state.js    │    │ skip-ctrl.js │   │tv-skip │
    │ - normalize  │    │ - drainLoop  │   │  init  │
    │ - activate   │    │              │   │        │
    │ - deactivate │    │              │   │        │
    └──────────────┘    └──────────────┘   └────────┘
```

## Changes Made

### 1. state.js (Core State Management)

#### Boot-time Initialization
```javascript
function initFastForwardState(){
  const g = global.game;
  if(!g) return;
  
  g.__ffActive = false;
  g.__ffMultiplier = 1;
  
  console.info('[fast-forward] Boot-time init: FFWD state reset to defaults');
}

// Run at module load
if(typeof global !== 'undefined' && global.game){
  initFastForwardState();
}
```

#### Read from window.game
```javascript
function normalizeDuration(ms){
  const g = global.game;  // Read from window.game
  if(!g || !g.__ffActive) return ms;
  // ... compression logic
}
```

#### Write to window.game First
```javascript
function activateFastForward(options){
  const g = global.game;  // Use window.game as source
  
  // Write to window.game first
  g.__ffActive = true;
  g.__ffMultiplier = multiplier;
  
  // Sync local reference for backward compatibility
  if(game !== g){
    game.__ffActive = true;
    game.__ffMultiplier = multiplier;
  }
}
```

### 2. runtime/skip-controller.js

#### Use window.game for State Checks
```javascript
async function drainLoop() {
  // Check fast-forward using window.game as single source
  const isFastForward = g.game?.__ffActive === true;
  
  if (isFastForward) {
    // Acceleration path
    await g.CardManager.acceleratePendingTimeouts();
    fastForwardGsapTimelines();
    return;
  }
  
  // Legacy drain path
  // ...
}
```

### 3. tv-skip.js (UI Initialization)

#### Safety Reset at UI Init
```javascript
function init(){
  // Safety: Detect and deactivate any stray FFWD state
  if(g.game && g.game.__ffActive){
    console.warn('[TVSkip] Detected stray FFWD state at init, deactivating...');
    if(typeof g.deactivateFastForward === 'function'){
      g.deactivateFastForward();
    } else {
      g.game.__ffActive = false;
      g.game.__ffMultiplier = 1;
    }
  }
  // ... rest of init
}
```

### 4. settings.js (Import Handlers)

#### Reset After Settings Import
```javascript
var obj = JSON.parse(fr.result);
var g = global.game = global.game || {};
g.cfg = Object.assign({}, DEFAULT_CFG, g.cfg || {}, obj || {});
saveStoredCfg(g.cfg);

// Safety: Clear any saved FFWD state
if(typeof global.deactivateFastForward === 'function'){
  global.deactivateFastForward();
}
```

#### Reset After Save Import
```javascript
var obj = JSON.parse(fr.result);
global.game = obj;

// Safety: Clear any saved FFWD state
if(typeof global.deactivateFastForward === 'function'){
  global.deactivateFastForward();
}
```

## Validation & Testing

### Test Suite (test_ffwd_startup_fix.html)

Created comprehensive test suite with 6 tests:

1. **Boot-time State Reset**
   - Verifies `__ffActive=false` and `__ffMultiplier=1` after module load
   
2. **Single Source of Truth**
   - Verifies all operations read/write window.game consistently
   
3. **activateFastForward() Behavior**
   - Verifies activation sets flags correctly
   - Verifies re-entry prevention (duplicate calls ignored)
   
4. **deactivateFastForward() Behavior**
   - Verifies deactivation resets flags to defaults
   
5. **Import Safety Reset**
   - Verifies import handlers clear FFWD state
   
6. **normalizeDuration() Consistency**
   - Verifies duration normalization reads from window.game
   - Verifies compression only when FFWD active

### Existing Tests

All existing npm tests pass:
```bash
npm run test:all
✓ Minigame validation passed
✓ Legacy map validation passed
✓ Runtime validation passed
✓ E2E competition tests passed
```

### Security Scan

CodeQL security scan: **0 vulnerabilities found**

### Linting

No new linting errors introduced (15 pre-existing warnings remain).

## Verification Flow

### Cold Start Sequence

```
1. Page loads
   ├─> state.js module executes
   │   └─> initFastForwardState() runs
   │       └─> window.game.__ffActive = false
   │       └─> window.game.__ffMultiplier = 1
   │       └─> Log: "Boot-time init: FFWD state reset"
   │
2. UI initializes
   ├─> tv-skip.js init() runs
   │   └─> Checks window.game.__ffActive
   │       └─> If true (stray state): deactivate
   │       └─> If false: continue normally
   │
3. User clicks ⏩ FFWD
   ├─> fastForwardPhase() called
   │   └─> activateFastForward() called
   │       └─> Checks window.game.__ffActive (false)
   │       └─> Sets window.game.__ffActive = true
   │       └─> Log: "activated (phase=...)"
   │       └─> Cards accelerate
   │
4. Phase ends
   └─> setPhase() called
       └─> deactivateFastForward() called
           └─> Sets window.game.__ffActive = false
           └─> Log: "deactivated (normal speed restored)"
```

### Import Sequence

```
1. User imports settings/save
   ├─> settings.js import handler runs
   │   └─> JSON.parse() creates new game object
   │   └─> window.game = parsed object
   │   └─> deactivateFastForward() called
   │       └─> window.game.__ffActive = false
   │       └─> window.game.__ffMultiplier = 1
   │
2. Game continues normally
   └─> FFWD only active after explicit user click
```

## Acceptance Criteria - Status

| Criterion | Status | Verification |
|-----------|--------|--------------|
| FFWD OFF by default on app load | ✅ PASS | Boot-time init + test suite |
| FFWD OFF after importing saves | ✅ PASS | Import handlers + Test 5 |
| All reads/writes use window.game | ✅ PASS | Code review + Test 2 |
| SkipController uses acceleration only after click | ✅ PASS | drainLoop() checks window.game.__ffActive |
| First click logs "activated (phase=...)" | ✅ PASS | activateFastForward() logging |
| Cards run at normal speed until FFWD clicked | ✅ PASS | Boot-time reset + UI safety reset |

## Benefits

### Reliability
- Consistent state across all modules
- No more startup state mismatches
- Predictable behavior

### Maintainability
- Single source of truth pattern is easier to reason about
- Well-documented dual-write for backward compatibility
- Comprehensive test coverage prevents regressions

### User Experience
- Cards and timers behave as expected on startup
- FFWD only activates when explicitly requested
- No confusing "already active" messages on first use

## Migration Notes

### For Future Development

When adding new FFWD-related features:

1. **Always read from window.game**
   ```javascript
   const isActive = window.game?.__ffActive === true;
   ```

2. **Always write to window.game first**
   ```javascript
   window.game.__ffActive = true;
   ```

3. **Add safety resets for new load paths**
   - If adding new import/load functionality
   - Call `deactivateFastForward()` after loading state

4. **Test with test_ffwd_startup_fix.html**
   - Ensure all 6 tests still pass
   - Add new tests for new behaviors

### Backward Compatibility

The dual-write pattern maintains compatibility with any code still using the local `game` reference:

```javascript
// Write to both for safety
window.game.__ffActive = true;        // Primary (canonical)
if(game !== window.game){             // Fallback (backward compat)
  game.__ffActive = true;
}
```

This can be removed once all code is confirmed to use `window.game` exclusively.

## Conclusion

This fix resolves the FFWD startup state issue by:
1. Establishing window.game as the single source of truth
2. Adding boot-time and UI initialization safety resets
3. Ensuring import handlers clear stray FFWD state
4. Maintaining backward compatibility during transition

The changes are minimal, surgical, and fully tested, with no security vulnerabilities introduced.
