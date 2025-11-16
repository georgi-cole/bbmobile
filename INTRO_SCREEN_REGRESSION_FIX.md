# IntroScreen Blank Screen Regression Fix

## Summary
This fix addresses a critical regression where the Intro Hub shows a blank dark screen on browser refresh or when using the in-game Restart feature. The issue was caused by improper timing of the `__bbHubShown` global flag and missing reset logic in the `hide()` method.

## Problem Statement

### Symptoms
- First load often works correctly
- Subsequent refresh or restart yields a blank screen
- No `[IntroScreen]` logs appear on failed runs
- `document.getElementById('introScreen')` returns null when blank occurs
- CSS continues to hide main screen (`body:not(.main-screen-built)`) because hub never renders

### Root Causes
1. **Early Flag Setting**: In `src/ui/IntroScreen.js`, `window.__bbHubShown = true` was set at the start of `showWithPreload()` and `show()`, before DOM was actually mounted. If a duplicate call or early return occurred, later attempts would skip hub creation due to this flag already being true.

2. **Missing Flag Reset**: The `hide()` method did not reset the global flag to false, so any re-entry to the hub on a soft restart was blocked.

3. **Conditional Initialization**: In `src/startup/flow.js`, IntroScreen initialization was gated by checking for the presence of `show()` method. Since the API exposed `show`, `init()` might never be invoked even though it is safe and idempotent.

## Solution

### Changes Made

#### 1. src/ui/IntroScreen.js

**Flag Timing Fix (show method)**:
```javascript
// BEFORE: Flag set too early
function show() {
  g.__bbHubShown = true; // ❌ Set before DOM mount
  
  // ... DOM building and mounting ...
  
  container.classList.add('intro-screen--visible');
  isVisible = true;
}

// AFTER: Flag set after DOM is visible
function show() {
  // ... DOM building and mounting ...
  
  container.classList.add('intro-screen--visible');
  isVisible = true;
  
  g.__bbHubShown = true; // ✅ Set AFTER DOM is visible
  console.info('[IntroScreen] Shown');
}
```

**Flag Reset on Hide**:
```javascript
// BEFORE: Flag never reset
function hide() {
  container.classList.remove('intro-screen--visible');
  setTimeout(() => {
    container.style.display = 'none';
    isVisible = false;
  }, 400);
}

// AFTER: Flag reset for restart capability
function hide() {
  if (!isVisible || !container) {
    console.info('[IntroScreen] Already hidden or not initialized, ignoring hide() call');
    return;
  }
  
  console.info('[IntroScreen] Hiding...');
  container.classList.remove('intro-screen--visible');
  
  setTimeout(() => {
    if (container) {
      container.style.display = 'none';
    }
    isVisible = false;
    
    // CRITICAL: Reset flag so hub can be shown again
    g.__bbHubShown = false;
    
    console.info('[IntroScreen] Hidden');
  }, 400);
}
```

**New reset() Method**:
```javascript
/**
 * Reset the intro screen state for hard restarts.
 * Removes container, resets flags, and prepares for fresh initialization.
 */
function reset() {
  console.info('[IntroScreen] Resetting state...');
  
  // Hide first if visible
  if (isVisible && container) {
    container.classList.remove('intro-screen--visible');
    container.style.display = 'none';
  }
  
  // Remove container from DOM
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
  
  // Reset state
  container = null;
  isVisible = false;
  currentBgLayer = 'current';
  playButtonClicked = false;
  g.__bbHubShown = false;
  
  console.info('[IntroScreen] Reset complete');
}
```

**Backward Compatibility**:
```javascript
// Export API
if (!g.IntroScreen) {
  g.IntroScreen = {
    init,
    show,
    showWithPreload,
    hide,
    reset,
    preloadBackground
  };
}

// Backward compatibility alias
if (!g.introScreen) {
  g.introScreen = g.IntroScreen;
}
```

#### 2. src/startup/flow.js

**Unconditional Initialization**:
```javascript
// BEFORE: Conditional init
if (g.IntroScreen && typeof g.IntroScreen.init === 'function') {
  // Only init if show doesn't exist
  if (!g.IntroScreen.show) {
    g.IntroScreen.init({ bus });
  }
}

// AFTER: Unconditional init (idempotent)
if (g.IntroScreen && typeof g.IntroScreen.init === 'function') {
  g.IntroScreen.init({ bus });
  console.info('[StartupFlow] IntroScreen initialized');
} else {
  console.warn('[StartupFlow] IntroScreen not available or missing init method');
}
```

#### 3. test_intro_screen_regression_fix.html (New)

Created comprehensive test file with 7 test scenarios:
1. **Global Flag Timing**: Verify flag is false before show, true after
2. **Flag Reset on Hide**: Verify flag transitions from true to false
3. **Idempotent Init**: Multiple init() calls handled safely
4. **Reset Method**: Verify state clearing and container removal
5. **Show After Hide**: No blank screen on re-show
6. **Backward Compatibility**: Alias exists and points correctly
7. **Flow.js Unconditional Init**: Verify implementation

## Verification

### Automated Tests
All existing tests pass:
- ✅ validate:minigames
- ✅ test:runtime-helpers
- ✅ test:e2e
- ✅ test:social
- ✅ test:pov-carousel

### Linting
- ✅ ESLint: No errors or warnings

### Security
- ✅ CodeQL: No security vulnerabilities detected

### Console Test Script
Users can verify the fix manually:
```javascript
console.log('flag before:', window.__bbHubShown);
window.game.IntroScreen.hide();
console.log('flag after hide:', window.__bbHubShown); // Should be false
window.game.IntroScreen.show();
console.log('flag after show:', window.__bbHubShown); // Should be true
```

### Expected Behavior
1. ✅ Hard refresh (F5/Ctrl+R) shows hub consistently
2. ✅ Multiple hard refreshes work every time
3. ✅ In-game Restart shows hub again
4. ✅ Console shows proper log sequence:
   - `[IntroScreen] Initialized` (once)
   - `[IntroScreen] Preloading background:` (on each show)
   - `[IntroScreen] Shown` (on each show)
   - `[IntroScreen] Hiding...` (on hide)
   - `[IntroScreen] Hidden` (after animation)
5. ✅ `__bbHubShown` is true only when hub is visible
6. ✅ No duplicate DOM nodes created

## Key Implementation Details

### Flag State Transitions
```
Initial State:
  __bbHubShown = false (or undefined)
  isVisible = false
  container = null

After show():
  __bbHubShown = true  ← Set AFTER classList.add('intro-screen--visible')
  isVisible = true
  container = <DOM element>

After hide():
  __bbHubShown = false  ← Reset after 400ms animation
  isVisible = false
  container = <DOM element> (kept for reuse)

After reset():
  __bbHubShown = false
  isVisible = false
  container = null  ← Removed from DOM
```

### Idempotence Guarantees
- **show()**: Checks `isVisible` flag, returns early if already visible
- **hide()**: Checks `isVisible` and `container`, returns early if already hidden
- **init()**: Checks `bus` variable, returns early if already initialized
- **reset()**: Safe to call multiple times, defensive checks on all operations

## Files Changed
1. `src/ui/IntroScreen.js` - 625 lines changed (flag timing, reset logic, new method)
2. `src/startup/flow.js` - 4 lines changed (unconditional init)
3. `test_intro_screen_regression_fix.html` - 16706 lines (new test file)

## Commits
1. `35b340a` - Fix IntroScreen blank screen regression - defer flag setting, reset on hide, idempotent init
2. `adce87b` - Add reset to init() return value for consistency

## Security Summary
No security vulnerabilities introduced or detected by CodeQL analysis.

## Future Considerations
- Consider adding telemetry/metrics to track hub show/hide cycles
- May want to add more defensive logging for production debugging
- Could add an explicit `isInitialized()` method for external checks
