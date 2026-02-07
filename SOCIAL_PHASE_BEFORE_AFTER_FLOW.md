# Social Phase Flow - Before vs After

## Before: Race Conditions and Duplicate Timers

```
┌────────────────────────────────────────────────────────────────┐
│                    SOCIAL PHASE STARTED                         │
└────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                     ↓                     ↓
  [Phase Timer]      [AI Scheduler]        [Auto-Driver]
  (setPhase)         (startAiSocialPhase)  (handlePhaseStart)
        ↓                     ↓                     ↓
    Running            Running                  Running
                           ↓
                   ┌───────┴────────┐
                   ↓                ↓
            [Scheduler Tick]   [Watchdog]
                Running         Running
                                   ↓
                          Checks every 3s
                          Can restart scheduler!

┌────────────────────────────────────────────────────────────────┐
│              TIMER EXPIRES → GENERATE SUMMARY                   │
└────────────────────────────────────────────────────────────────┘
        ↓
    ❌ PROBLEM: Multiple competing sources
        ↓
    [onDone callback]
        ↓
    Generate summary once → Cache it
        ↓
    Show summary modal
        ↓
    ⏸️ Pause phase timer (but timer handle still exists)
        ↓
    ❌ Scheduler still running (not stopped)
    ❌ Watchdog still running (can restart scheduler)
    ❌ Auto-driver still running
        ↓
┌────────────────────────────────────────────────────────────────┐
│                    USER CLICKS OK                               │
└────────────────────────────────────────────────────────────────┘
        ↓
    ❌ Timer resumes (pause released)
    ❌ Scheduler continues ticking
    ❌ Watchdog detects activity, keeps running
        ↓
    Call advance callback
        ↓
    ❌ Callback may fire while timers still active
        ↓
    Start animation to remove modal
        ↓
    ❌ RACE: Timer expires again during animation
    ❌ RACE: Cached summary returned, blocks advance
    ❌ RACE: Watchdog restarts scheduler
        ↓
    🛑 GAME HALTS - Cannot advance to next phase
```

## After: Single Controller, Deterministic Flow

```
┌────────────────────────────────────────────────────────────────┐
│              SOCIAL PHASE STARTED (via controller)              │
└────────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────────────────┐
              │  SocialPhaseController    │
              │  State: idle → running    │
              └───────────────────────────┘
                              ↓
                  Single ownership of:
                  • Phase timer
                  • AI scheduler timer
                  • RAF pump
                  • Watchdog timer
                  • Fast-advance timer
                  • Advance callback
                              ↓
┌────────────────────────────────────────────────────────────────┐
│         TIMER EXPIRES → CONTROLLER GENERATES SUMMARY            │
└────────────────────────────────────────────────────────────────┘
        ↓
    [onDone callback]
        ↓
    Controller checks state: running? ✅
        ↓
    Generate summary (checks controller state)
        ↓
┌────────────────────────────────────────────────────────────────┐
│          SHOW SUMMARY → CONTROLLER TRANSITIONS                  │
│          State: running → summarizing                           │
└────────────────────────────────────────────────────────────────┘
        ↓
    ✅ Controller.beginSummarizing() called
        ↓
    ✅ ALL timers cancelled atomically:
        • Phase timer → cleared
        • Scheduler timer → cleared  
        • RAF pump → cancelled
        • Watchdog → cleared
        • Fast-advance → cleared
        ↓
    ✅ AI scheduler stopped via API
        ↓
    ✅ State = summarizing (blocks future starts)
        ↓
    Show summary modal
        ↓
┌────────────────────────────────────────────────────────────────┐
│                    USER CLICKS OK                               │
└────────────────────────────────────────────────────────────────┘
        ↓
    ✅ Controller.advancePhase() called
        ↓
    ✅ State check: summarizing? ✅
        ↓
    ✅ Transition: summarizing → advanced
        ↓
    ✅ Cancel all timers (idempotent - already done)
        ↓
    ✅ Call advance callback immediately
        ↓
    ✅ Clear callback reference
        ↓
    ✅ Start animation to remove modal (non-blocking)
        ↓
    ✅ Advance to nominations phase
        ↓
    ✅ Game continues normally
```

## Key Differences

| Aspect | Before (Broken) | After (Fixed) |
|--------|----------------|---------------|
| **Ownership** | Multiple competing owners | Single controller owns lifecycle |
| **Timers** | 5+ timers from different sources | Controller owns all timer handles |
| **Summary** | Can show twice, cached reuse | Generated once, controller enforces |
| **OK Button** | Resumes timer, race conditions | Cancels all timers, immediate advance |
| **Scheduler** | Continues during summary | Stopped when summary shown |
| **Watchdog** | Can restart during summary | Blocked by controller state |
| **State** | Implicit flags, no coordination | Explicit state machine |
| **Race Conditions** | Many (timer vs callback vs cache) | None (atomic state transitions) |
| **Advancement** | Stuck after OK click | Immediate, deterministic |

## State Machine Diagram

```
                    ┌──────┐
                    │ idle │
                    └──┬───┘
                       │ startPhase()
                       ↓
                  ┌─────────┐
                  │ running │ ← Normal phase operation
                  └────┬────┘   Timers active
                       │
                       │ beginSummarizing()
                       ↓
               ┌────────────────┐
               │  summarizing   │ ← Summary modal shown
               └────────┬───────┘   ALL timers cancelled
                        │            Scheduler blocked
                        │
                        │ advancePhase()
                        ↓
                  ┌──────────┐
                  │ advanced │ ← Phase completed
                  └────┬─────┘   Callback executed
                       │
                       │ reset()
                       ↓
                    ┌──────┐
                    │ idle │ ← Ready for next phase
                    └──────┘
```

## Guard Logic

### Before (Scattered)
```javascript
// Multiple places checking different flags
if (game.__socialSummaryGenerated) return; // In generateSummary
if (socialSummaryOpen) return;             // In showSummary
if (game.__socialPhaseAdvanced) return;   // In OK handler
if (isRunning) return;                     // In scheduler start
// → No coordination, race conditions
```

### After (Centralized)
```javascript
// Single source of truth
controller.shouldBlockSchedulerStart()
// Returns: state === 'summarizing' || state === 'advanced'

controller.beginSummarizing()
// Enforces: can only transition from 'running' state
// Side effect: cancels ALL timers atomically

controller.advancePhase()
// Enforces: can only advance once
// Side effect: calls callback, clears it, blocks future calls
```

## Console Log Pattern Changes

### Before (Problematic)
```
[social-ai-autostart] Already running - ignoring duplicate start ❌
[ai-scheduler] Not in social phase - stopping ❌
[social-maneuvers] Summary already generated - returning cached ❌
[social.js] Phase already advanced - ignoring duplicate call ❌
```

### After (Clean)
```
[SocialPhaseController] ▶️ Starting phase (idle -> running) ✅
[social.js] ✓ Phase advancement callback stored in controller ✅
[SocialPhaseController] 📊 Begin summarizing (running -> summarizing) ✅
[SocialPhaseController] ❌ Canceling all timers ✅
[SocialPhaseController] ✅ Advancing phase (summarizing -> advanced) ✅
```

## Performance Impact

**Before:**
- Multiple timer loops running simultaneously
- Redundant scheduler starts/stops
- Cache checks on every summary call
- Flag checks scattered across modules

**After:**
- Single timer ownership
- One scheduler lifecycle
- State machine: O(1) transitions
- Centralized guard: O(1) checks
- **Net Result:** Lower CPU usage, no redundant work
