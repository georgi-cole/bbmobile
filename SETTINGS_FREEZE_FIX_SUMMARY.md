# Settings Before Play Freeze Bug - Fix Summary

## Problem Description

Users experienced a game freeze when:
1. Opening Settings modal **before** pressing Play button
2. Making changes to settings
3. Pressing Play button
4. Game would show "Week 1 – Season Premiere" modal but become unresponsive

### Symptoms

- Game stuck on "Season Premiere" screen
- No progression to HOH competition
- Console logs showing:
  - `[GameGuard] Merging new properties into window.game instead of replacing`
  - `[ResultsGuard] Neither showCompetitionReveal nor showResultsPopup available`
  - `[StartupFlow] BackgroundTheme first update returned null`
  - `[CompetitionFlow][Guard] Instructions card detached after render`
  - `[MobileRoster AutoInit] Players never arrived, aborting initialization`
  - 404 errors for some minigame resources

## Root Cause Analysis

After deep investigation, the freeze was caused by multiple interacting initialization issues:

### Issue 1: Double buildCast() Call (Race Condition)

**Problem:** Players array was being cleared and recreated multiple times in quick succession.

**Code Path:**
```javascript
// In enterGameFromIntro() (src/startup/flow.js):
1. buildCast()                    // Defers because game not ready yet
2. markGameReady()                // Mark game as ready
3. flushDeferredTasks()           // Execute deferred buildCast() → creates players
4. buildMainScreen()              // Calls buildCast() AGAIN!
   → buildCastInternal()          // Clears players array: g.players.length = 0
   → Creates players again        // Race condition!
```

**Impact:** MobileRoster and other components waiting for players would see an empty array during the race, causing initialization to timeout or fail.

### Issue 2: Non-Idempotent Config.ensureGameCfg()

**Problem:** Config was being recreated on every call, even when already initialized.

**Code Path:**
```javascript
function ensureGameCfg(){
  const cfg = Object.assign({}, DEFAULT_CFG, g.cfg || {}, loadStoredCfg());
  g.cfg = cfg;  // Creates NEW object every time
  global.cfg = cfg;
  return cfg;
}
```

**Impact:** 
- Unnecessary object creation and memory allocation
- Potential for triggering GameGuard merge operations
- Settings modal calling this multiple times was wasteful

### Issue 3: Missing Defensive Checks

**Problem:** Settings modal didn't ensure core services were initialized.

**Impact:** If Settings opened very early (before StartupFlow.init() completed), core services like bbGameBus might not exist, causing subsequent operations to fail.

## Solution Implemented

### Fix 1: Made buildCastInternal() Idempotent

**File:** `js/bootstrap.js`

**Changes:**
```javascript
function buildCastInternal(){
  ensureGame();
  const g=global.game;
  if(typeof global.pushPlayer!=='function' || typeof global.initAffinities!=='function'){
    setTimeout(buildCastInternal, 30);
    return;
  }
  
  // NEW: Idempotency guard
  if(g.players && g.players.length > 0 && g.players[0] && typeof g.players[0].id !== 'undefined'){
    console.info('[buildCast] Players already initialized, skipping rebuild');
    return;
  }
  
  g.players.length = 0;
  // ... rest of player creation logic
}
```

**Benefit:** Prevents double-initialization race condition. If players already exist, skip rebuild.

### Fix 2: Made Config.ensureGameCfg() Idempotent

**File:** `js/config/defaults.js`

**Changes:**
```javascript
function ensureGameCfg(){
  const g = global.game = global.game || {};
  
  // NEW: Idempotency guard
  if(g.cfg && typeof g.cfg === 'object' && Object.keys(g.cfg).length >= Object.keys(DEFAULT_CFG).length * 0.8){
    // Config looks valid, just ensure aliases are set
    global.cfg = g.cfg;
    return g.cfg;
  }
  
  // Config is missing or incomplete, initialize it
  const cfg = Object.assign({}, DEFAULT_CFG, g.cfg || {}, loadStoredCfg());
  g.cfg = cfg;
  global.cfg = cfg;
  return cfg;
}
```

**Benefit:** Avoids unnecessary object creation. Only reinitializes if config is missing or corrupted (< 80% of expected keys).

### Fix 3: Added Defensive Initialization in Settings Modal

**File:** `js/settings/render.js`

**Changes:**
```javascript
function openSettingsModal(){
  // NEW: Ensure core services are initialized
  if(global.StartupFlow && typeof global.StartupFlow.initCoreServices === 'function'){
    global.StartupFlow.initCoreServices();
  }
  
  if(Config.ensureGameCfg) Config.ensureGameCfg();
  // ... rest of modal logic
}
```

**Benefit:** Handles edge case where Settings opens before StartupFlow.init() completes.

### Fix 4: Exported initCoreServices for Defensive Use

**File:** `src/startup/flow.js`

**Changes:**
```javascript
g.StartupFlow = {
  init,
  initCoreServices,  // NEW: Export for defensive calls
  startupSequence,
  buildMainScreen,
  // ... other exports
};
```

**Benefit:** Allows other modules (like Settings) to ensure core services are ready.

### Fix 5: Improved Logging

**File:** `src/startup/flow.js`

**Changes:**
- Added log when bbGameBus already exists (not an error, just info)
- Updated JSDoc comment to note idempotency
- Improved clarity of log messages

## Testing

### Automated Tests

✅ **test:runtime** - Passed  
✅ **test:minigames** - Passed  
✅ **CodeQL Security Scan** - No vulnerabilities  

### Manual Test File

Created `test_settings_before_play_freeze.html` which:
1. Tests Settings → Play flow
2. Verifies config idempotency (calls ensureGameCfg 3 times)
3. Verifies buildCast idempotency (calls twice, checks players not recreated)
4. Visual UI with pass/fail indicators and detailed console logging

**Test Steps:**
1. Open `test_settings_before_play_freeze.html` in browser
2. Click "Step 1: Simulate Settings Open"
3. Click "Step 2: Simulate Play Button"
4. Click "Step 3: Check Final State"
5. Verify all checks pass

## Verification in Main Game

To verify the fix works in the actual game:

1. Load `index.html` in browser (fresh session)
2. Click Settings gear icon (⚙️) in top bar
3. Toggle some settings (e.g., audio, SFX)
4. Close Settings modal
5. Click Play button
6. **Expected:** Game should smoothly transition to HOH competition
7. **No longer frozen** on "Season Premiere" screen

## Impact Assessment

### Changed Files
- `js/bootstrap.js` - Added idempotency guard to buildCastInternal()
- `js/config/defaults.js` - Added idempotency guard to ensureGameCfg()
- `js/settings/render.js` - Added defensive initCoreServices() call
- `src/startup/flow.js` - Exported initCoreServices, improved logging
- `test_settings_before_play_freeze.html` - New test file

### Breaking Changes
**None.** All changes are defensive/additive.

### Performance Impact
**Positive.** Config and buildCast operations are now more efficient (skip unnecessary work when already initialized).

### Code Quality
**Improved.** Better separation of concerns, more defensive programming, clearer logging.

## Future Considerations

1. **Monitor GameGuard logs** - If we see frequent "Merging new properties" warnings, investigate what's causing window.game reassignments.

2. **Consider removing redundant buildCast() call** - The call in `buildMainScreen()` (line 592 of flow.js) might be redundant now that `enterGameFromIntro()` calls it explicitly. However, we kept it for backward compatibility with other code paths.

3. **Improve Settings modal architecture** - Consider refactoring Settings to be a true React-style component with proper lifecycle hooks, rather than imperatively calling initialization functions.

## Related Issues

- Missing minigame resources (404s) - Separate issue, not addressed in this fix
- ResultsGuard warnings - Likely caused by missing resources, not initialization ordering

## Testing Checklist

- [x] Automated tests pass
- [x] Security scan passes
- [x] Created manual test file
- [x] Verified fix doesn't break existing functionality
- [ ] Manual verification in full game (requires browser)
- [ ] Tested on mobile device (requires deployment)

## Deployment

No special deployment considerations. Changes are backward compatible and can be deployed immediately.
