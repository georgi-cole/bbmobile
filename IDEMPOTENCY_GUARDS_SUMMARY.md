# Idempotency Guards Implementation Summary

## Overview
This document summarizes the implementation of idempotency guards in the startup flow to prevent duplicate initialization and cascading state issues.

## Problem Statement
After introducing the Intro Hub, duplicate initialization and duplicate show/start calls were occurring, causing:
- Repeated console messages (init duplicate, show duplicate, etc.)
- Multiple attempts to show the hub and start game
- Re-entrant `enterGame()` attempts
- Repeated lobby music playback
- Inconsistent state across the game

## Solution
Implemented centralized state tracking objects with robust guards in both `flow.js` and `IntroScreen.js` to ensure idempotent operations.

---

## Changes in `src/startup/flow.js`

### Added `flowState` Object
```javascript
const flowState = {
  initialized: false,        // Has startup flow basic init run?
  coreServicesReady: false,  // Have core services been initialized?
  introHubShown: false,      // Has Intro Hub been shown once?
  gameStarted: false         // Has enterGame() already executed?
};
```

### Function Guards

#### 1. `initializeCoreServices()`
- **Guard**: Checks `flowState.coreServicesReady`
- **Behavior**: Returns early if already initialized
- **Telemetry**: Emits `startup_init_core_services_duplicate` on duplicate attempts
- **Flag Set**: Sets `flowState.coreServicesReady = true` after successful initialization

#### 2. `showIntroHub()`
- **Guard**: Checks `flowState.introHubShown`
- **Behavior**: Returns early if hub already shown
- **Telemetry**: Emits `startup_show_hub_duplicate` on duplicate attempts
- **Flag Set**: Sets `flowState.introHubShown = true` after successful show

#### 3. `enterGame()`
- **Guard**: Checks `flowState.gameStarted` **immediately** at function start
- **Behavior**: Returns early if game already started
- **Telemetry**: Emits `startup_enter_game_duplicate` on duplicate attempts
- **Flag Set**: Sets `flowState.gameStarted = true` **before** any game start logic (prevents race conditions)
- **Legacy Support**: Also checks `DeferredGuards.isGameStarted()` for backward compatibility

#### 4. `init()`
- **Guard**: Checks both `flowState.initialized` and `handlersWired`
- **Behavior**: Returns early if already initialized
- **Telemetry**: Emits `startup_init_duplicate` on duplicate attempts
- **Flag Set**: Sets `flowState.initialized = true` after wiring handlers

#### 5. `restartToHub()`
- **Reset**: Resets `flowState.introHubShown` and `flowState.gameStarted` to allow re-showing hub and re-entering game
- **Preserves**: Keeps `coreServicesReady` and `initialized` as core services don't need re-initialization

### Idempotent Helpers
- `closeAllModals()`: Already idempotent, added documentation comment
- `removeRosterPlaceholders()`: Already idempotent, added documentation comment

---

## Changes in `src/ui/IntroScreen.js`

### Added `introScreenState` Object
```javascript
const introScreenState = {
  initialized: false,  // Has init() been called successfully?
  visible: false,      // Is the intro screen currently visible?
  animating: false     // Is a show/hide animation in progress?
};
```

### Function Guards

#### 1. `init()`
- **Guard**: Checks both `introScreenState.initialized` and `bus`
- **Behavior**: Returns early if already initialized, returns API object
- **Telemetry**: Emits `intro_init_duplicate` on duplicate attempts
- **Flag Set**: Sets `introScreenState.initialized = true` after successful initialization

#### 2. `showWithPreload()`
- **Guard 1**: Checks `introScreenState.visible` or `isVisible`
- **Guard 2**: Checks `introScreenState.animating` to prevent re-entrant calls
- **Behavior**: Returns early if visible or animating
- **Telemetry**: 
  - Emits `intro_show_with_preload_duplicate` if already visible
  - Emits `intro_show_with_preload_animating` if animation in progress
- **Flag Set**: 
  - Sets `introScreenState.animating = true` before starting
  - Sets `introScreenState.visible = true` after successful show
  - Clears `introScreenState.animating = false` after completion

#### 3. `show()`
- **Guard**: Checks both `introScreenState.visible` and `isVisible`
- **Behavior**: Returns early if already visible
- **Telemetry**: Emits `intro_show_duplicate` on duplicate attempts
- **Flag Set**: Sets both `isVisible = true` and `introScreenState.visible = true`

#### 4. `hide()`
- **Guard**: Checks if already hidden (`!introScreenState.visible && !isVisible`)
- **Behavior**: Returns early if already hidden (idempotent)
- **Telemetry**: Emits `intro_hide` with wasVisible flag
- **Flag Set**: Clears `introScreenState.visible = false` immediately

#### 5. `reset()`
- **Reset**: Resets all three state flags:
  - `introScreenState.initialized = false`
  - `introScreenState.visible = false`
  - `introScreenState.animating = false`
- **Purpose**: Allows fresh initialization after restart

---

## New Telemetry Events

### Startup Flow Events (Duplicates)
- `startup_init_duplicate` - Duplicate `init()` call
- `startup_init_core_services_duplicate` - Duplicate `initializeCoreServices()` call
- `startup_show_hub_duplicate` - Duplicate `showIntroHub()` call
- `startup_enter_game_duplicate` - Duplicate `enterGame()` call

### IntroScreen Events (Duplicates)
- `intro_init_duplicate` - Duplicate `init()` call
- `intro_show_with_preload_duplicate` - Duplicate `showWithPreload()` call
- `intro_show_with_preload_animating` - `showWithPreload()` called while animating
- `intro_show_duplicate` - Duplicate `show()` call

---

## Testing

### Automated Tests
Created `test_startup_idempotency.html` with 6 test cases:
1. StartupFlow.initializeCoreServices() idempotency (via init())
2. StartupFlow.showIntroHub() idempotency
3. StartupFlow.enterGame() idempotency
4. IntroScreen.init() idempotency
5. IntroScreen.showWithPreload() idempotency
6. IntroScreen.hide() idempotency

### Manual Testing Guide
Created `test_manual_idempotency_verification.md` with 10 test scenarios:
1. Multiple init() calls
2. Multiple showIntroHub() calls
3. Multiple enterGame() calls
4. Multiple IntroScreen.init() calls
5. Multiple IntroScreen.showWithPreload() calls
6. Multiple IntroScreen.hide() calls
7. Normal flow (no duplicates)
8. skipIntros=true flow
9. Rapid double-click on Play button
10. restartToHub() flow

---

## Acceptance Criteria ✅

- [x] Multiple calls to `StartupFlow.initializeCoreServices()` do not double-initialize anything
- [x] Multiple calls to `showIntroHub()` while hub is visible do not produce additional renders or music restarts
- [x] Multiple calls to `enterGame()` result in only the first one proceeding to start
- [x] Multiple calls to `IntroScreen.init()` log the duplicate and do nothing
- [x] Multiple calls to `IntroScreen.showWithPreload()` while already visible log the duplicate and do nothing
- [x] All guards emit telemetry events for monitoring
- [x] No regressions in normal flow with skipIntros both true and false
- [x] Idempotent functions are safe to call multiple times
- [x] Race conditions prevented by setting flags immediately before async operations

---

## Implementation Notes

### Design Decisions

1. **State Tracking Objects**: Used dedicated state objects (`flowState`, `introScreenState`) rather than scattered flags for better organization and maintainability.

2. **Early Guards**: All guards check state flags at the **very beginning** of functions before any side effects.

3. **Immediate Flag Setting**: For async operations like `enterGame()` and `showWithPreload()`, flags are set **immediately** to prevent race conditions from concurrent calls.

4. **Telemetry Integration**: All duplicate attempts are logged via telemetry for monitoring and debugging.

5. **Backward Compatibility**: Legacy checks (like `DeferredGuards.isGameStarted()`) are preserved for compatibility.

6. **Idempotent Design**: Functions like `hide()`, `closeAllModals()`, and `removeRosterPlaceholders()` are designed to be safely called multiple times.

### Future Improvements

1. **State Observers**: Could add observers/listeners for state changes if more components need to react to these flags.

2. **Debug Mode**: Could add a debug mode that logs all state transitions for easier troubleshooting.

3. **Metrics Dashboard**: Telemetry events could feed into a dashboard showing how often duplicate calls occur in production.

---

## Security Review

✅ **CodeQL Analysis**: No security vulnerabilities detected
✅ **Linting**: No ESLint errors
✅ **Code Review**: Changes are minimal, focused, and surgical

---

## Files Modified

1. `src/startup/flow.js` - Added `flowState` and guards
2. `src/ui/IntroScreen.js` - Added `introScreenState` and guards
3. `test_startup_idempotency.html` - New automated test file
4. `test_manual_idempotency_verification.md` - New manual testing guide
5. `IDEMPOTENCY_GUARDS_SUMMARY.md` - This document

---

## Deployment Notes

- **No Breaking Changes**: All changes are additive (guards added, no logic removed)
- **Backward Compatible**: Legacy flags and checks are preserved
- **Safe Rollout**: Can be deployed to production with confidence
- **Monitoring**: Watch for new telemetry events to catch any edge cases

---

## Related Documentation

- Original issue: Duplicate initialization and re-entrant calls in startup flow
- Related modules: `flow.js`, `IntroScreen.js`, `intro-outro-video.js`, `bootstrap.js`
- Test files: `test_startup_flow.html`, `test_intro_screen.html`, `test_startup_idempotency.html`
