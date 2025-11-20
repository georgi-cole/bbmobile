# Idempotency Guards - Visual Flow Diagram

## Before (Problem State)

```
User Action: Click Play Button
         │
         ↓
    enterGame() ────→ [No Guard] ────→ Executes
         │                                │
         ↓                                ↓
    (Click again)                    buildMainScreen()
         │                                │
         ↓                                ↓
    enterGame() ────→ [No Guard] ────→ Executes AGAIN! ❌
         │                                │
         ↓                                ↓
    Result: Double initialization!   Cast built twice
            Music plays twice         Main screen flickers
            Inconsistent state        Roster placeholders + real players
```

## After (Fixed State)

```
User Action: Click Play Button
         │
         ↓
    enterGame()
         │
         ├─ Check: flowState.gameStarted? ──→ [No] ────┐
         │                                               │
         │                                               ↓
         ├─ Set: flowState.gameStarted = true    [Allow Execution]
         │                                               │
         ↓                                               ↓
    (Click again)                                  buildMainScreen()
         │                                               │
         ↓                                               ↓
    enterGame()                                    Game starts once ✅
         │
         ├─ Check: flowState.gameStarted? ──→ [Yes] ───┐
         │                                              │
         │                                              ↓
         │                                        [Block & Log]
         │                                              │
         │                                              ↓
         └──────────────────────────────────→  Emit telemetry
                                                 Return early ✅
```

---

## State Tracking Flow

### StartupFlow States

```
                    ┌─────────────────────────────────┐
                    │       flowState Object          │
                    │                                 │
                    │  initialized: false → true      │
                    │  coreServicesReady: false → true│
                    │  introHubShown: false → true    │
                    │  gameStarted: false → true      │
                    └─────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ↓              ↓              ↓
           init()    initializeCoreServices()  showIntroHub()
           Guards    Guards                    Guards
                                               
                               ↓
                          enterGame()
                          Guards (immediate)
```

### IntroScreen States

```
                    ┌─────────────────────────────────┐
                    │   introScreenState Object       │
                    │                                 │
                    │  initialized: false → true      │
                    │  visible: false → true → false  │
                    │  animating: false → true → false│
                    └─────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ↓              ↓              ↓
           init()      showWithPreload()    show()
           Guards      Guards (+ animating)  Guards
                               │
                               ↓
                           hide()
                           Guards
```

---

## Telemetry Event Flow

### Normal Flow (No Duplicates)

```
Page Load
    ↓
startup_init_start
    ↓
startup_init_done
    ↓
intro_init_start
    ↓
intro_init_done
    ↓
startup_show_hub_start
    ↓
intro_show_with_preload_start
    ↓
intro_show_with_preload_done
    ↓
startup_show_hub_done
    ↓
[User clicks Play]
    ↓
startup_enter_game
    ↓
Game Starts ✅
```

### With Duplicates (Now Guarded)

```
Page Load
    ↓
startup_init_start
    ↓
startup_init_done
    ↓
init() called again
    ↓
startup_init_duplicate ⚠️
    ↓
[Blocked - Early Return] ✅
    ↓
intro_init_start
    ↓
intro_init_done
    ↓
init() called again
    ↓
intro_init_duplicate ⚠️
    ↓
[Blocked - Early Return] ✅
    ↓
startup_show_hub_start
    ↓
showIntroHub() called again
    ↓
startup_show_hub_duplicate ⚠️
    ↓
[Blocked - Early Return] ✅
    ↓
[User clicks Play multiple times]
    ↓
enterGame() #1
    ↓
startup_enter_game
    ↓
enterGame() #2
    ↓
startup_enter_game_duplicate ⚠️
    ↓
[Blocked - Early Return] ✅
    ↓
Game Starts Once ✅
```

---

## Guard Check Logic

### Pattern 1: Simple Flag Check
```javascript
function someFunction() {
  // Guard at the very start
  if (state.alreadyDone) {
    console.warn('[Module] Already done, ignoring duplicate call');
    emitTelemetry('duplicate_event');
    return; // Early exit ✅
  }
  
  // ... do work ...
  
  // Set flag after success
  state.alreadyDone = true;
}
```

### Pattern 2: Immediate Flag Set (for async/race prevention)
```javascript
async function asyncFunction() {
  // Guard at the very start
  if (state.inProgress) {
    console.warn('[Module] Already in progress, ignoring duplicate call');
    emitTelemetry('duplicate_event');
    return; // Early exit ✅
  }
  
  // Set flag IMMEDIATELY to prevent race conditions
  state.inProgress = true;
  
  // ... do async work ...
  await someAsyncOperation();
  
  // Clear or update flag after completion
  state.inProgress = false;
  state.completed = true;
}
```

### Pattern 3: Multi-State Guard (like showWithPreload)
```javascript
async function complexFunction() {
  // Guard 1: Already visible?
  if (state.visible) {
    console.info('[Module] Already visible, ignoring duplicate call');
    emitTelemetry('duplicate_visible');
    return; // Early exit ✅
  }
  
  // Guard 2: Already animating?
  if (state.animating) {
    console.warn('[Module] Animation in progress, ignoring duplicate call');
    emitTelemetry('duplicate_animating');
    return; // Early exit ✅
  }
  
  // Set animating flag immediately
  state.animating = true;
  
  // ... do animation work ...
  await animate();
  
  // Update flags after completion
  state.visible = true;
  state.animating = false;
}
```

---

## Race Condition Prevention

### Problem: Rapid Clicks
```
Time: 0ms    enterGame() #1 starts
              ├─ Check: gameStarted? → false ✅
              └─ ... async work begins ...
                  
Time: 50ms   enterGame() #2 called
              ├─ Check: gameStarted? → false ❌ (if flag not set yet)
              └─ ... starts duplicate work! ❌
```

### Solution: Immediate Flag Set
```
Time: 0ms    enterGame() #1 starts
              ├─ Check: gameStarted? → false ✅
              ├─ Set: gameStarted = true (IMMEDIATELY) ✅
              └─ ... async work begins ...
                  
Time: 50ms   enterGame() #2 called
              ├─ Check: gameStarted? → true ✅
              ├─ Log: duplicate attempt
              └─ Return early ✅ (no duplicate work!)
```

---

## Key Design Principles

1. **Guard at the Top**: Always check state at the very beginning of the function
2. **Set Flags Immediately**: For async operations, set flags before starting work
3. **Emit Telemetry**: Log all duplicate attempts for monitoring
4. **Early Return**: Exit immediately when guard condition is met
5. **Reset on Restart**: Allow operations to repeat after intentional resets
6. **Preserve Legacy**: Keep backward compatibility checks where needed

---

## Testing Matrix

| Test Scenario | Expected Behavior | Verified |
|--------------|-------------------|----------|
| Single init() | Initializes once | ✅ |
| Multiple init() | Blocks duplicates | ✅ |
| Single showIntroHub() | Shows once | ✅ |
| Multiple showIntroHub() | Blocks duplicates | ✅ |
| Single enterGame() | Starts once | ✅ |
| Multiple enterGame() | Blocks duplicates | ✅ |
| Rapid Play clicks | Only first starts game | ✅ |
| Normal flow (skipIntros=false) | No duplicates | ✅ |
| Fast flow (skipIntros=true) | No duplicates | ✅ |
| restartToHub() | Allows re-show/re-enter | ✅ |
| IntroScreen.init() x3 | Only first inits | ✅ |
| IntroScreen.showWithPreload() x3 | Only first shows | ✅ |
| IntroScreen.hide() x3 | Safe (idempotent) | ✅ |
| Animation in progress | Blocks concurrent calls | ✅ |

---

## Summary

**Before**: No guards → duplicate executions → inconsistent state ❌

**After**: Centralized guards → idempotent operations → consistent state ✅

**Result**: 
- ✅ No duplicate initializations
- ✅ No duplicate renders
- ✅ No race conditions
- ✅ Clean telemetry tracking
- ✅ Safe restart flows
- ✅ Backward compatible
