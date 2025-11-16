# IntroScreen Regression Fix - Visual Summary

## Before Fix (Broken Behavior)

```
┌─────────────────────────────────────────────────┐
│          FIRST LOAD (Usually Works)             │
└─────────────────────────────────────────────────┘

1. Page loads
2. StartupFlow.initCoreServices() runs
3. IntroScreen.init() might not be called (conditional)
4. showWithPreload() called
5. __bbHubShown = true ← SET TOO EARLY (before DOM)
6. show() called
7. DOM built and appended
8. Hub visible ✓

┌─────────────────────────────────────────────────┐
│       REFRESH or RESTART (Blank Screen!)        │
└─────────────────────────────────────────────────┘

1. Page loads or restart triggered
2. StartupFlow.initCoreServices() runs
3. IntroScreen.init() might be skipped (conditional)
4. showWithPreload() called
5. Check: __bbHubShown === true ← STILL TRUE FROM BEFORE!
6. Early return, skip show() ✗
7. No DOM created
8. Blank dark screen ✗

PROBLEM: Flag never reset, blocks re-entry
```

## After Fix (Working Behavior)

```
┌─────────────────────────────────────────────────┐
│           FIRST LOAD (Works Correctly)          │
└─────────────────────────────────────────────────┘

1. Page loads
2. StartupFlow.initCoreServices() runs
3. IntroScreen.init() ALWAYS called ✓
4. showWithPreload() called
5. Check: __bbHubShown === false ✓
6. Preload background
7. show() called
8. DOM built and appended
9. classList.add('intro-screen--visible')
10. __bbHubShown = true ← SET AFTER VISIBLE ✓
11. Hub visible ✓

┌─────────────────────────────────────────────────┐
│      USER PRESSES PLAY (Transition to Game)     │
└─────────────────────────────────────────────────┘

1. Play button clicked
2. hide() called
3. Remove 'intro-screen--visible' class
4. Wait 400ms for animation
5. __bbHubShown = false ← RESET FOR RESTART ✓
6. isVisible = false
7. Main game screen builds ✓

┌─────────────────────────────────────────────────┐
│     REFRESH or RESTART (Works Correctly!)       │
└─────────────────────────────────────────────────┘

1. Page loads or restart triggered
2. StartupFlow.initCoreServices() runs
3. IntroScreen.init() ALWAYS called ✓
4. showWithPreload() called
5. Check: __bbHubShown === false ✓ (was reset!)
6. Preload background
7. show() called
8. DOM built (reuses existing or creates new)
9. classList.add('intro-screen--visible')
10. __bbHubShown = true ✓
11. Hub visible ✓ NO BLANK SCREEN!
```

## Flag State Timeline

### Before Fix (Broken)
```
Time     Event                    __bbHubShown    isVisible    Result
─────────────────────────────────────────────────────────────────────
T0       Initial load             undefined       false        
T1       showWithPreload()        true ← EARLY!   false        
T2       show()                   true            true         Hub shown ✓
T3       Play pressed             true ← STUCK!   true         
T4       hide()                   true ← NEVER    false        Hub hidden
                                       RESET!
T5       Refresh/restart          true ← BLOCKS   false        
T6       showWithPreload()        true            false        Early return!
T7       show() SKIPPED           true            false        BLANK SCREEN ✗
```

### After Fix (Working)
```
Time     Event                    __bbHubShown    isVisible    Result
─────────────────────────────────────────────────────────────────────
T0       Initial load             false           false        
T1       init() called            false           false        Initialized ✓
T2       showWithPreload()        false           false        
T3       show() - DOM mount       false           false        
T4       classList.add            false           true         
T5       Flag set                 true ← AFTER    true         Hub shown ✓
T6       Play pressed             true            true         
T7       hide() called            true            true         
T8       Animation complete       false ← RESET   false        Ready for next
T9       Refresh/restart          false           false        
T10      init() called            false           false        Re-initialized ✓
T11      showWithPreload()        false           false        Proceeds ✓
T12      show() - DOM mount       false           false        
T13      classList.add            false           true         
T14      Flag set                 true ← AFTER    true         Hub shown ✓
```

## Code Changes Visualization

### 1. Flag Timing Fix (show method)

```javascript
// BEFORE (BROKEN)
function show() {
  g.__bbHubShown = true;  // ❌ Set TOO EARLY
  
  if (!container) {
    container = buildDOM();
    document.body.appendChild(container);  // DOM mount happens AFTER flag set
  }
  
  container.style.display = 'flex';
  void container.offsetWidth;
  container.classList.add('intro-screen--visible');
  isVisible = true;
}

// AFTER (FIXED)
function show() {
  if (!container) {
    container = buildDOM();
    document.body.appendChild(container);  // DOM mount happens first
  }
  
  container.style.display = 'flex';
  void container.offsetWidth;
  container.classList.add('intro-screen--visible');
  isVisible = true;
  
  g.__bbHubShown = true;  // ✅ Set AFTER DOM is visible
}
```

### 2. Reset on Hide

```javascript
// BEFORE (BROKEN)
function hide() {
  if (!isVisible || !container) return;
  
  container.classList.remove('intro-screen--visible');
  setTimeout(() => {
    container.style.display = 'none';
    isVisible = false;
    // ❌ Flag NEVER reset - blocks restart!
  }, 400);
}

// AFTER (FIXED)
function hide() {
  if (!isVisible || !container) return;
  
  container.classList.remove('intro-screen--visible');
  setTimeout(() => {
    container.style.display = 'none';
    isVisible = false;
    g.__bbHubShown = false;  // ✅ Reset flag for restart
  }, 400);
}
```

### 3. Unconditional Init

```javascript
// BEFORE (BROKEN)
if (g.IntroScreen && typeof g.IntroScreen.init === 'function') {
  // Only init if show doesn't exist
  if (!g.IntroScreen.show) {  // ❌ Might skip init!
    g.IntroScreen.init({ bus });
  }
}

// AFTER (FIXED)
if (g.IntroScreen && typeof g.IntroScreen.init === 'function') {
  g.IntroScreen.init({ bus });  // ✅ Always call (idempotent)
  console.info('[StartupFlow] IntroScreen initialized');
}
```

## Test Scenarios

### Scenario 1: Normal First Load
```
Action: Open page for first time
Expected: Hub appears with background
Result: ✅ Works (before and after fix)
```

### Scenario 2: Browser Refresh (F5)
```
Action: Press F5 to reload page
Expected: Hub appears again
Result: ❌ Blank screen (before) → ✅ Hub appears (after)
```

### Scenario 3: Hard Refresh (Ctrl+Shift+R)
```
Action: Clear cache and reload
Expected: Hub appears again
Expected: ❌ Blank screen (before) → ✅ Hub appears (after)
```

### Scenario 4: In-Game Restart
```
Action: Click Restart button in game
Expected: Hub appears for new game
Result: ❌ Blank screen (before) → ✅ Hub appears (after)
```

### Scenario 5: Multiple Refreshes
```
Action: Refresh 5 times in a row
Expected: Hub appears every time
Result: ❌ Blank after 1st (before) → ✅ Works every time (after)
```

### Scenario 6: Play → Restart → Play
```
Action: Enter game, restart, enter again
Expected: Hub shows both times
Result: ❌ Blank on 2nd (before) → ✅ Works both times (after)
```

## Console Log Comparison

### Before Fix (Broken Refresh)
```
# First Load - Works
[StartupFlow] Initializing core services...
[StartupFlow] IntroScreen init called  (maybe - conditional)
[IntroScreen] Preloading background: assets/skins/daily-background.png
[IntroScreen] Shown

# Refresh - FAILS (blank screen)
[StartupFlow] Initializing core services...
(init might be skipped)
[IntroScreen] Already visible (global flag), ignoring duplicate showWithPreload() call
(No "[IntroScreen] Shown" log!)
(Blank screen!)
```

### After Fix (Working Refresh)
```
# First Load - Works
[StartupFlow] Initializing core services...
[StartupFlow] IntroScreen initialized
[IntroScreen] Preloading background: assets/skins/daily-background.png
[IntroScreen] Shown

# User Plays
[StartupFlow] Play button clicked
[IntroScreen] Hiding...
[IntroScreen] Hidden

# Refresh - WORKS!
[StartupFlow] Initializing core services...
[StartupFlow] IntroScreen initialized
[IntroScreen] Preloading background: assets/skins/daily-background.png
[IntroScreen] Shown
```

## Summary of Changes

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| Flag timing | Set before DOM mount | Set after visible class | Ensures DOM exists when flag is true |
| Flag on hide | Never reset | Reset to false | Allows re-showing after restart |
| Initialization | Conditional (might skip) | Unconditional (always) | Ensures module is ready |
| Idempotence | Partial (show only) | Complete (all methods) | Safe to call multiple times |
| Logging | Minimal | Defensive | Easier debugging |
| Reset capability | None | Full reset() method | Hard restart support |
| Backward compat | IntroScreen only | + introScreen alias | Legacy code support |

## Testing Coverage

✅ **Automated Tests**
- All existing tests pass
- New regression test file covers 7 scenarios
- No test failures introduced

✅ **Manual Verification**
- Hard refresh × multiple times
- In-game restart
- Console flag transitions
- No duplicate DOM nodes

✅ **Code Quality**
- ESLint clean
- CodeQL security scan passed
- Minimal surgical changes only
