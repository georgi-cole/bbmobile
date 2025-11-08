# Nominations Resilient Interceptor Flow Diagram

## Initial Module Load Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Loads Scripts                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  1. nominations.js loads                                        │
│     - Defines window.renderNomsPanel (original)                 │
│     - Defines window.startNominations                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. nominations-grid-fullscreen.js loads                        │
│     - Waits 100ms for DOM ready                                 │
│     - Calls retryInstallInterceptor()                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. installInterceptor() executes                               │
│     - Stores original: originalRenderNomsPanel = window.renderNomsPanel │
│     - Replaces: window.renderNomsPanel = interceptedRenderNomsPanel     │
│     - Marks: window.renderNomsPanel.__nfsWrapped = true        │
│     - Sets: window.__nomsFsInstalled = true                     │
│     LOG: "[noms-fs] ✓ Interceptor installed successfully"      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. hookStartNominations() executes                             │
│     - Stores original: originalStartNominations = window.startNominations │
│     - Wraps: window.startNominations = wrapper                  │
│     LOG: "[noms-fs] ✓ Hooked into startNominations"            │
└─────────────────────────────────────────────────────────────────┘
```

## Phase Entry Flow (When Nominations Begin)

```
┌─────────────────────────────────────────────────────────────────┐
│  Game advances to nominations phase                             │
│  window.startNominations() is called                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Wrapped startNominations() intercepted                         │
│     LOG: "[noms-fs] Entering nominations phase"                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
┌──────────────────────┐                  ┌──────────────────────┐
│  verifyWrapper()     │                  │  Original            │
│  called immediately  │                  │  startNominations()  │
│                      │                  │  continues           │
└──────────────────────┘                  └──────────────────────┘
        ↓                                           ↓
┌──────────────────────┐                  ┌──────────────────────┐
│  Check sentinel:     │                  │  Calls               │
│  __nfsWrapped exists?│                  │  renderNomsPanel()   │
└──────────────────────┘                  └──────────────────────┘
        ↓
  YES ──┴── NO
   ↓         ↓
   │    ┌──────────────────────┐
   │    │ Re-wrap function:    │
   │    │ - Store new original │
   │    │ - Replace with       │
   │    │   interceptor        │
   │    │ - Add sentinel       │
   │    │ LOG: "re-wrapped     │
   │    │  renderNomsPanel"    │
   │    └──────────────────────┘
   │         ↓
   └─────────┴──────────────────────────────────────┐
                                                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  startVerificationPolling() begins                              │
│  - Poll every 100ms, 200ms, 400ms, ..., 2000ms                 │
│  - Max 10 attempts (~10 seconds)                                │
│  - Each poll calls verifyWrapper()                              │
│  - Stops when: max attempts OR phase changes                    │
│  LOG: "[noms-fs] Started verification polling"                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Safety microtask (50ms delay)                                  │
│  - Re-invokes renderNomsPanel() if phase still nominations     │
│  - Ensures interceptor has chance to mount                      │
│  LOG: "[noms-fs] Safety microtask: re-invoking renderNomsPanel"│
└─────────────────────────────────────────────────────────────────┘
```

## Interceptor Decision Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  interceptedRenderNomsPanel() called                            │
│  LOG: "[noms-fs] Interceptor called"                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Collect diagnostics:                                           │
│  - nomsLocked, __nomsCommitInProgress, __nomsCommitted          │
│  - nomineesLength, hohId, hohHuman                              │
│  LOG: "[noms-fs] intercept check {diagnostics}"                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Check: game.nomsLocked || __nomsCommitInProgress || __nomsCommitted? │
└─────────────────────────────────────────────────────────────────┘
                    ↓                    ↓
                   YES                  NO
                    ↓                    ↓
    ┌──────────────────────────┐  ┌──────────────────────────┐
    │ LOG: "Interceptor        │  │ Check: Human is HOH?     │
    │  declined: nominations   │  └──────────────────────────┘
    │  already locked"         │              ↓
    │ Call originalRenderNomsPanel() │  YES ──┴── NO
    │ RETURN                   │      ↓         ↓
    └──────────────────────────┘      │    ┌──────────────────────────┐
                                      │    │ LOG: "Interceptor        │
                                      │    │  declined: not human HOH"│
                                      │    │ Call originalRenderNomsPanel() │
                                      │    │ RETURN                   │
                                      │    └──────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────┐
│  LOG: "[noms-fs] Human HOH detected, attempting fullscreen flow"│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  1. Show intro card                                             │
│     - Centered in TV overlay                                    │
│     - "NOMINATE" button                                         │
│     LOG: "[noms-fs] Showing intro card"                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Success? YES ──┐
                              NO   │
                               ↓   │
    ┌──────────────────────────┐   │
    │ LOG: "Intro card failed" │   │
    │ Call originalRenderNomsPanel() │   │
    │ RETURN                   │   │
    └──────────────────────────┘   │
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Show fullscreen selector                                    │
│     - Grid of eligible players                                  │
│     - Ally/enemy indicators                                     │
│     - Dynamic sizing based on player count                      │
│     LOG: "[noms-fs] Opening fullscreen selector"                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Selections made? YES ──┐
                              NO           │
                               ↓           │
    ┌──────────────────────────┐           │
    │ LOG: "Selector failed"   │           │
    │ Call originalRenderNomsPanel()       │
    │ RETURN                   │           │
    └──────────────────────────┘           │
                                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Commit nominations                                          │
│     - Set game._pendingNoms                                     │
│     - Set game.__nomsFromFullscreenSelector = true              │
│     - Call finalizeNoms()                                       │
│     LOG: "[noms-fs] Nominations committed successfully"         │
└─────────────────────────────────────────────────────────────────┘
```

## Fallback Flow (nominations.js)

```
┌─────────────────────────────────────────────────────────────────┐
│  renderNomsPanel() called (original, if interceptor bypassed)   │
│  LOG: "[noms] Human HOH detected - checking for NomsFS"         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Check: window.NomsFS && NomsFS.showIntro exists?               │
└─────────────────────────────────────────────────────────────────┘
                    ↓                    ↓
                   YES                  NO
                    ↓                    ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│ LOG: "NomsFS available - │  │ LOG: "NomsFS not         │
│  delegating to           │  │  available - showing     │
│  NomsFS.showIntro()"     │  │  fallback intro card"    │
│                          │  └──────────────────────────┘
│ Call NomsFS.showIntro()  │              ↓
└──────────────────────────┘  ┌──────────────────────────┐
             ↓                │ Show non-interactive     │
    ┌────────┴────────┐       │ fallback card with       │
    ↓                 ↓       │ NOMINATE button          │
  Success?          Fail      │                          │
    ↓                 ↓       │ Button tries to call     │
┌──────────────┐  ┌──────────────┐  │ NomsFS.open() or shows   │
│ Call         │  │ Show         │  │ alert if not available   │
│ NomsFS.open()│  │ fallback     │  └──────────────────────────┘
│              │  │ card         │
│ Commit       │  └──────────────┘
│ selections   │
└──────────────┘
```

## Verification Polling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  startVerificationPolling() called on phase entry               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Initialize: attempt = 0, maxAttempts = 10, delay = 100ms      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↑
┌─────────────────────────────────────────────────────────────────┐
│  Timer fires after delay                                        │
│  attempt++                                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Call verifyWrapper()                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                  ┌───────────┴───────────┐
                  ↓                       ↓
        Wrapper active?                Overwritten?
              YES                           NO
               ↓                            ↓
         (continue)              ┌──────────────────────┐
                                │ Re-wrap function     │
                                │ LOG: "re-wrapped     │
                                │  renderNomsPanel"    │
                                └──────────────────────┘
                                         ↓
                    ┌────────────────────┴────────────────────┐
                    ↓                                         ↓
┌─────────────────────────────────────────┐  ┌─────────────────────────┐
│  Check stop conditions:                 │  │  Increase delay         │
│  - attempt >= maxAttempts (10)?         │  │  delay = min(2000,      │
│  - game.phase !== 'nominations'?        │  │    delay * 2)           │
└─────────────────────────────────────────┘  │  Re-schedule timer      │
                    ↓                         └─────────────────────────┘
              YES ──┴── NO                              ↑
               ↓         ↓                              │
┌──────────────────────┐ │                              │
│ clearInterval(timer) │ └──────────────────────────────┘
│ verificationTimer=null│
│ LOG: "Verification   │
│  polling stopped"    │
└──────────────────────┘
```

## Re-wrapping Detection Timeline

```
Time  Event
────────────────────────────────────────────────────────────────
T+0s   Module loads, interceptor installs
       ✓ window.renderNomsPanel.__nfsWrapped = true

T+1s   Some other code overwrites renderNomsPanel
       ✗ window.renderNomsPanel.__nfsWrapped = undefined

T+1.1s startNominations() called → onEnterNominationsPhase()
       → verifyWrapper() detects missing sentinel
       ✓ Re-wraps: window.renderNomsPanel.__nfsWrapped = true
       LOG: "[noms-fs] re-wrapped renderNomsPanel (was overwritten)"

T+1.2s startVerificationPolling() begins
       Poll #1 (100ms): ✓ Sentinel present
       
T+1.3s Poll #2 (200ms): ✓ Sentinel present

T+1.5s Some code overwrites again
       ✗ window.renderNomsPanel.__nfsWrapped = undefined

T+1.7s Poll #3 (400ms): ✗ Sentinel missing
       ✓ Re-wraps again
       LOG: "[noms-fs] re-wrapped renderNomsPanel (was overwritten)"

T+2.1s Poll #4 (800ms): ✓ Sentinel present
       ...continues until 10 attempts or phase changes
```

## Debug API Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer calls: window.NomsFS.debug()                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Check: window.renderNomsPanel.__nfsWrapped                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Return diagnostic object:                                      │
│  {                                                              │
│    installed: true/false,        // __nomsFsInstalled flag     │
│    wrapped: true/false,          // Sentinel present?          │
│    selectorActive: true/false,   // Selector currently open?   │
│    selectedCount: N,             // # selections made          │
│    requiredCount: N,             // # selections needed        │
│    game: {                       // Game state                 │
│      phase: "nominations",                                      │
│      nomsLocked: false,                                         │
│      __nomsCommitInProgress: false,                             │
│      __nomsCommitted: false,                                    │
│      nominees: 0,                                               │
│      hohId: 1,                                                  │
│      hohHuman: true                                             │
│    },                                                           │
│    eligible: 3,                  // # eligible nominees        │
│    requiredSlots: 2,             // # slots (twist-aware)      │
│    centerBias: "20px",           // TV centering bias          │
│    forceExactCenter: false       // Override flag              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Error Recovery Scenarios

### Scenario 1: Module Loads Before nominations.js

```
Problem: renderNomsPanel doesn't exist yet
Solution: retryInstallInterceptor() with exponential backoff
         Tries: 100ms, 200ms, 400ms, 800ms, 1600ms (max 5 attempts)
Result:  ✓ Eventually finds renderNomsPanel and installs
```

### Scenario 2: renderNomsPanel Overwritten During Phase Entry

```
Problem: Another module redefines renderNomsPanel
Solution: startNominations hook calls verifyWrapper() immediately
Result:  ✓ Detects missing sentinel and re-wraps before render
```

### Scenario 3: renderNomsPanel Overwritten After Phase Entry

```
Problem: Overwrite happens 500ms into nominations phase
Solution: Verification polling (active for ~10 seconds)
         Poll at 100ms intervals (expanding to 2s)
Result:  ✓ Next poll detects and re-wraps automatically
```

### Scenario 4: Interceptor Bypassed, NomsFS Available

```
Problem: Interceptor never activated (race condition)
Solution: Fallback in nominations.js checks for NomsFS.showIntro()
Result:  ✓ Delegates to NomsFS instead of showing stuck fallback
```

### Scenario 5: Everything Fails

```
Problem: NomsFS not available, interceptor failed
Solution: Show fallback card with NOMINATE button
         Button attempts NomsFS.open() or shows alert
Result:  User sees error message explaining the issue
```

## Performance Characteristics

- **Initial Load**: +1 timer (100ms delay)
- **Phase Entry**: +1 verification call (instant)
- **During Phase**: +10 verification calls max (over ~10 seconds)
- **Memory**: 1 timer handle, cleared automatically
- **Network**: 0 additional requests
- **CPU**: Negligible (sentinel check is O(1))

## Key Benefits

1. **Automatic Recovery**: Re-wraps if overwritten, no user action needed
2. **Comprehensive Diagnostics**: Always logs why interceptor activates/declines
3. **Minimal Overhead**: Exponential backoff reduces polling frequency
4. **Fail-Safe**: Multiple fallback layers (polling → fallback → NomsFS → alert)
5. **Debuggable**: Exposed API for manual verification and diagnostics
