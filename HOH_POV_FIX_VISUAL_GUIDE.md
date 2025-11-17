# HOH/POV Instructions Fix - Visual Guide

## Problem: Instructions Card Not Appearing

### Before Fix ❌

```
User Runtime:
┌─────────────────────────────┐
│ Phase: HOH Competition      │
│                             │
│ [TV Screen]                 │
│                             │
│ (Empty - no instructions)   │
│                             │
│ Console:                    │
│ [Competition] renderHOH     │
│ Human ID: null             │
│ ⚠️ Bail out - no profile    │
└─────────────────────────────┘

Issue: renderHOH ran before g.humanId was set
```

### After Fix ✅

```
User Runtime:
┌─────────────────────────────┐
│ Phase: HOH Competition      │
│                             │
│ [TV Screen]                 │
│ ┌─────────────────────────┐ │
│ │ ⚡ HOH Competition      │ │
│ │                         │ │
│ │ Press the target as     │ │
│ │ many times as possible! │ │
│ │                         │ │
│ │   [▶ Play]  [📋 Rules] │ │
│ └─────────────────────────┘ │
│                             │
│ Console:                    │
│ ✓ Human profile ready       │
│ ✓ Container: [data-faux-tv] │
│ ✓ Instructions rendered     │
└─────────────────────────────┘

Solution: Wait for profile with retry + validate container
```

---

## Solution Overview

### 1. Profile Readiness Retry

```
Timeline:
┌─────────────────────────────────────────────────────┐
│ 0ms    renderHOH called                             │
│         ↓                                            │
│ 0ms    Check humanId → null                         │
│         ↓                                            │
│ 0ms    Start waitForHumanReady()                    │
│         ↓                                            │
│ 250ms  Retry #1 → still null                        │
│         ↓ (wait 250ms)                               │
│ 500ms  Retry #2 → profile ready! ✓                  │
│         ↓                                            │
│ 501ms  Proceed with instructions rendering          │
│         ↓                                            │
│ 502ms  Show instructions card in TV                 │
└─────────────────────────────────────────────────────┘

Exponential Backoff: 250ms → 500ms → 750ms → 1000ms
Maximum Wait: 2000ms
```

### 2. Container Validation

```
Priority List:
1. [data-faux-tv]      ← Primary TV container
2. [data-sm-faux-tv]   ← Social Maneuvers TV
3. .tvViewport         ← TV viewport class
4. #tv                 ← TV ID
5. .tv                 ← TV class
6. .faux-tv            ← Faux TV class
7. .tv-screen          ← TV screen class
8. #panel              ← Panel ID
9. document.body       ← Ultimate fallback

Selection Process:
┌────────────────────────────────────────┐
│ Query [data-faux-tv]                   │
│  ↓                                      │
│ Check isConnected                       │
│  ↓                                      │
│ if true → Use this container ✓         │
│  ↓                                      │
│ if false → Try next selector           │
│  ↓                                      │
│ Repeat until attached container found  │
└────────────────────────────────────────┘
```

---

## Flow Comparison

### Before Fix (Race Condition)

```
Game Phase Start
      ↓
  renderHOH()
      ↓
  Check humanId
      ↓
  if (null) ─────────→ ❌ BAIL OUT
      ↓                (No instructions)
  Never reached
```

### After Fix (Retry Loop)

```
Game Phase Start
      ↓
  renderHOH()
      ↓
  waitForHumanReady()
      ↓
  ┌──────────────┐
  │ Retry Loop   │
  │ 0-8 attempts │
  │ max 2 seconds│
  └──────────────┘
      ↓
  if (profile) ──────→ ✅ PROCEED
      ↓               (Render instructions)
  if (timeout) ─────→ ⚠️ ERROR MSG
                      (User-friendly message)
```

---

## Enhanced Diagnostics

### Console Output Format

```
Symbol Legend:
✓  Success / Passed
⚠  Warning / Fallback used
✗  Error / Failed
→  Action / Calling function
←  Callback / Return value
═══ Section header
```

### Example Session

```
[Competition] ═══ renderHOH called ═══
[Competition] Week: 2, Phase: hoh, Human ID: null
[Competition] ✓ Minigame system is ready
[Competition] → Starting waitForHumanReady...
[Competition]   Attempt 1: Waiting for profile... (humanId=null)
[Competition]   Attempt 2: Waiting for profile... (humanId=0)
[Competition] ✓ Human profile ready after 2 attempt(s), 501ms
[Competition] Human player: Alex(0), evicted=false
[Competition] Alive players: 12, Blocked player: 3
[Competition] Quick eligibility check: alreadySubmitted=false
[Competition] ✓ Human is eligible for HOH competition
[Competition] ✓ Selected minigame: quickTap
[Competition] → runHumanMinigameWithGuards called: week=2, phase=hoh, mg=quickTap, player=Alex(0)
[Competition] ✓ Replay-lock check passed
[Competition] ✓ Using CompetitionFlow (new flow)
[Competition] Waiting for TV viewport readiness...
[Competition] ✓ Using attached container: [data-faux-tv]
[Competition] ✓ TV viewport ready after 1 attempt(s)
[Competition] ✓ Container validated and ready for instructions
[Competition] ✓ AntiCheat session started: session_abc123
[CompetitionFlow] ═══ runCompetitionFlow called ═══
[CompetitionFlow] Game: quickTap, Options: {}
[CompetitionFlow] ✓ Container validated for competition flow
[CompetitionFlow] Step 1: Showing instructions in TV
[CompetitionFlow] ✓ Instructions card rendered and appended to container
[CompetitionFlow] Container details: tagName=DIV, className=tvViewport, id=, isConnected=true
```

---

## Error Scenarios (Graceful Handling)

### Scenario 1: Profile Never Appears

```
[Competition] ═══ renderHOH called ═══
[Competition] Week: 2, Phase: hoh, Human ID: null
[Competition] ✓ Minigame system is ready
[Competition] → Starting waitForHumanReady...
[Competition]   Attempt 1: Waiting for profile... (humanId=null)
[Competition]   Attempt 2: Waiting for profile... (humanId=null)
[Competition]   Attempt 3: Waiting for profile... (humanId=null)
[Competition]   Attempt 4: Waiting for profile... (humanId=null)
[Competition]   Attempt 5: Waiting for profile... (humanId=null)
[Competition] ⚠ Human profile not ready after 2000ms, 5 attempts
[Competition] ✗ Human profile not available after waiting

User sees: "Error: Player profile not loaded. Please refresh the page."
```

### Scenario 2: Detached Container

```
[CompetitionFlow] → showInstructionsInTV called: gameKey=quickTap
[CompetitionFlow] ⚠ Container is detached or null, finding fallback
[CompetitionFlow] ⚠ Selector failed: [data-faux-tv] (not found)
[CompetitionFlow] ⚠ Selector failed: [data-sm-faux-tv] (not found)
[CompetitionFlow] ✓ Using fallback attached container: .tvViewport
[CompetitionFlow] ✓ Container validated and ready for instructions
[CompetitionFlow] ✓ Instructions card rendered and appended to container
```

---

## Test Coverage

### 1. Normal Case (Immediate Ready)
```
Test: testNormalCase()
Setup: humanId=0, profile exists
Expected: ✓ Profile found immediately
Result: PASS ✅
```

### 2. Delayed Profile (500ms)
```
Test: testDelayedProfile()
Setup: humanId=null, profile appears after 500ms
Expected: ✓ Profile found after 2 retries
Result: PASS ✅
```

### 3. Missing Profile (Timeout)
```
Test: testMissingProfile()
Setup: humanId=null, profile never appears
Expected: ⚠ Timeout after 2000ms with graceful error
Result: PASS ✅
```

### 4. Detached Container
```
Test: testDetachedContainer()
Setup: Container not in DOM (isConnected=false)
Expected: ✓ Fallback to attached container
Result: PASS ✅
```

---

## Performance Impact

### Best Case (Profile Ready Immediately)
```
Timeline:
0ms    renderHOH called
1ms    Check humanId → success
2ms    Render instructions
3ms    User sees Play button

Delay: ~3ms (negligible)
```

### Typical Case (1 Retry)
```
Timeline:
0ms    renderHOH called
1ms    Check humanId → null
2ms    Wait 250ms
252ms  Check humanId → success
253ms  Render instructions
254ms  User sees Play button

Delay: ~254ms (barely noticeable)
```

### Worst Case (Timeout)
```
Timeline:
0ms    renderHOH called
1ms    Check humanId → null
2ms    Wait 250ms
252ms  Retry 1 → null, wait 500ms
752ms  Retry 2 → null, wait 750ms
1502ms Retry 3 → null, wait 1000ms
2502ms Timeout
2503ms Show error message

Delay: ~2.5s (user sees error message)
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Game Phase System                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Phase: HOH Competition Start                         │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ↓                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ renderHOH() (competitions.js)                        │  │
│  │                                                       │  │
│  │  1. Check Minigame System Ready                      │  │
│  │     ↓                                                 │  │
│  │  2. waitForHumanReady() ←─────┐                     │  │
│  │     ↓                          │ Retry               │  │
│  │  3. Check Profile Available    │ (exponential)       │  │
│  │     ↓                          │                      │  │
│  │  4. If null → Wait & Retry ────┘                     │  │
│  │     ↓                                                 │  │
│  │  5. Check Eligibility                                │  │
│  │     ↓                                                 │  │
│  │  6. Select Minigame                                  │  │
│  │     ↓                                                 │  │
│  │  7. runHumanMinigameWithGuards()                     │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ↓                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ runHumanMinigameWithGuards()                         │  │
│  │                                                       │  │
│  │  1. Check Replay Lock (CompLocks)                    │  │
│  │     ↓                                                 │  │
│  │  2. waitForTvViewportReady() ←──┐                   │  │
│  │     ↓                            │ Retry             │  │
│  │  3. getTvInstructionsContainer() │ (container)       │  │
│  │     ↓                            │                    │  │
│  │  4. If detached → Try Next ─────┘                    │  │
│  │     ↓                                                 │  │
│  │  5. Start AntiCheat Session                          │  │
│  │     ↓                                                 │  │
│  │  6. CompetitionFlow.runCompetitionFlow()             │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ↓                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ CompetitionFlow.runCompetitionFlow()                 │  │
│  │                                                       │  │
│  │  1. ensureAttachedContainer()                        │  │
│  │     ↓                                                 │  │
│  │  2. showInstructionsInTV()                           │  │
│  │     ↓                                                 │  │
│  │  3. User Clicks Play Button                          │  │
│  │     ↓                                                 │  │
│  │  4. launchFullscreenMinigame()                       │  │
│  │     ↓                                                 │  │
│  │  5. User Completes Game                              │  │
│  │     ↓                                                 │  │
│  │  6. Submit Score & Close Overlay                     │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ↓                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ finishCompPhase()                                    │  │
│  │                                                       │  │
│  │  1. Collect All Scores                               │  │
│  │     ↓                                                 │  │
│  │  2. Show Results Card                                │  │
│  │     ↓                                                 │  │
│  │  3. Determine Winner                                 │  │
│  │     ↓                                                 │  │
│  │  4. Update Player Stats                              │  │
│  │     ↓                                                 │  │
│  │  5. Proceed to Next Phase                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

### What Was Fixed
- ✅ Race condition between phase start and profile readiness
- ✅ Instructions rendering into detached DOM containers
- ✅ Missing diagnostic logging for troubleshooting

### How It Was Fixed
- ✅ Exponential backoff retry for profile readiness (max 2s)
- ✅ Priority-based container selection with attachment validation
- ✅ Comprehensive logging with symbols for easy scanning

### Impact
- ✅ HOH/POV instructions now appear reliably at phase start
- ✅ Better error messages for users if issues occur
- ✅ Easier debugging for developers with enhanced logs
- ✅ Minimal performance impact (<250ms typical case)

---

## Files Changed

```
js/competitions.js
  ├─ Added waitForHumanReady()
  ├─ Added getTvInstructionsContainer()
  ├─ Added waitForTvViewportReady()
  ├─ Modified renderHOH() with retry
  └─ Enhanced logging

js/veto.js
  ├─ Added waitForHumanReadyVeto()
  ├─ Modified startVetoComp() with retry
  ├─ Added AI fallback
  └─ Enhanced logging

js/competitions-flow.js
  ├─ Exposed ensureAttachedContainer()
  └─ Added resolveAttachedTvContainer() alias

test_competition_flow_improvements.html
  ├─ Added testContainerValidation()
  ├─ Added testDetachedContainer()
  └─ Added runAllTests()

test_hoh_pov_readiness.html (new)
  ├─ testNormalCase()
  ├─ testDelayedProfile()
  ├─ testMissingProfile()
  └─ testDetachedContainer()

HOH_POV_FIX_SUMMARY.md (new)
  └─ Complete technical documentation
```
