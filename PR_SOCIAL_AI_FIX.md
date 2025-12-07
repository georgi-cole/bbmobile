# PR: Enhanced Social AI Scheduler with Pause/Resume Semantics

## Summary

This PR implements a focused fix to the social AI scheduler to ensure NPC↔NPC and NPC↔Player interactions reliably run during social phases. The changes add robust pause/resume semantics, instrumentation for diagnostics, and a lightweight fallback executor for background interactions.

## Problem Statement

Previously, the social AI scheduler could be stopped prematurely when UI modals opened, causing the tick loop to terminate and preventing NPC interactions from occurring. This resulted in:
- Sparse or missing social interactions during social phases
- Empty Diary Room entries
- Inconsistent AI behavior when modals were opened/closed

## Solution Overview

### 1. Robust Tick Loop with Pause/Resume Semantics

**Changes to `js/social-ai-scheduler.js`:**
- Added `pause()` and `resume()` APIs that suspend work without tearing down the loop
- Implemented dual-mode tick loop: setInterval (800ms heartbeat) + optional RAF pump
- Added debug-gated watchdog timer that restarts stalled loops (>2.5s without tick)
- Preserved `stop()` for final phase termination

**Key Benefits:**
- Loop keeps running when modals open, just pauses work
- Watchdog ensures loop doesn't stall indefinitely
- Debug logging provides visibility into scheduler behavior

### 2. Instrumentation & Diagnostics

**Debug Features (gated by `window.game.cfg.debugSocialAI`):**
- Verbose logging of start/stop/pause/resume calls with reasons
- Tick count tracking and last tick timestamp
- Diagnostics API: `window.__smDebug.getState()` returns full scheduler state
- Enhanced `runAiTickOnce()` helper with state logging

**Usage:**
```javascript
// Enable debug logging
window.game.cfg.debugSocialAI = true;

// Check scheduler state
window.__smDebug.getState();
// Returns: { isRunning, isPaused, tickCount, lastTickTime, totalActions, ... }

// Run single tick manually
window.__smDebug.runAiTickOnce();
```

### 3. SocialActionExecutor Module

**New module: `js/social/socialActionExecutor.js`**

A lightweight background executor that queues and runs NPC interactions when the primary engine is insufficient.

**Features:**
- `queueAction()`: Queue actions for later execution
- `runBackgroundTick()`: Execute lightweight interactions (observe, small_talk) in background
- `flushQueue()`: Process all queued actions (called on modal close or phase end)
- Energy tracking: Respects per-player energy budgets
- Event emission: Emits `social.action:result` and `bond.shift` events for DiaryRoomLogger compatibility

**Configuration:**
```javascript
SocialActionExecutor.init({
  maxFillActionsPerPhase: 3,    // Max fill actions per NPC per phase
  backgroundRate: 0.15,          // Probability of background action per tick
  allowTargetHuman: true,        // Allow NPCs to target human player
  enabled: false                 // Opt-in via config (default disabled)
});
```

**Opt-in Flag:**
```javascript
window.FORCE_SOCIAL_FALLBACK = true;  // Force-enable executor
```

### 4. Modal Integration

**Changes to `js/social-maneuvers.js`:**
- `pausePhaseTimer()` now calls `SocialAIScheduler.pauseAiSocialPhase('modal-open')`
- `resumePhaseTimer()` calls `SocialAIScheduler.resumeAiSocialPhase('modal-closed')` and `SocialActionExecutor.flushQueue()`

**Changes to `js/flow/PauseController.js`:**
- `pauseSocialAI()` calls `pauseAiSocialPhase()` instead of `stop()`
- `resumeSocialAI()` calls `resumeAiSocialPhase()` instead of `start()`
- Maintains backward compatibility with fallback to `stop()`/`start()` if pause/resume not available

**Key Points:**
- Phase-end `stop()` calls remain unchanged
- Only modal-related stops converted to pause/resume
- Changes are minimal and reversible

## Files Changed

### Modified Files (4)
1. **`js/social-ai-scheduler.js`** (+142 lines, -21 lines)
   - Added pause/resume APIs
   - Added robust tick loop with watchdog
   - Added debug logging and diagnostics
   - Updated state tracking

2. **`js/flow/PauseController.js`** (+18 lines, -8 lines)
   - Updated `pauseSocialAI()` to call `pauseAiSocialPhase()`
   - Updated `resumeSocialAI()` to call `resumeAiSocialPhase()`
   - Added backward compatibility fallbacks

3. **`js/social-maneuvers.js`** (+10 lines, -0 lines)
   - Added scheduler pause call in `pausePhaseTimer()`
   - Added scheduler resume + executor flush in `resumePhaseTimer()`

4. **`index.html`** (+1 line, -0 lines)
   - Added `<script>` tag to load `js/social/socialActionExecutor.js`

### New Files (3)
1. **`js/social/socialActionExecutor.js`** (363 lines)
   - Complete implementation of background executor
   - Event emission for DiaryRoomLogger integration
   - Energy tracking and budget management

2. **`devtools/social-ai-debug.html`** (486 lines)
   - Interactive test harness for debugging scheduler
   - Visual status display and controls
   - Mock game environment for isolated testing

3. **`test_social_ai_enhanced.mjs`** (231 lines)
   - Verification test suite (43 checks)
   - Validates all new APIs and integrations

### Documentation Updates (1)
1. **`docs/diary-room-logger.md`** (+137 lines)
   - Added troubleshooting section
   - Documented debug flags and diagnostics
   - Added configuration examples
   - Included devtools harness usage guide

## Testing

### Automated Tests
- ✅ All existing tests pass (`npm run test:social`, `npm run test:pause-integration`)
- ✅ New verification test passes (43/43 checks)
- ✅ ESLint passes (minor warnings fixed)

### Manual Testing Steps

1. **Enable debug logging:**
   ```javascript
   window.game.cfg.debugSocialAI = true;
   ```

2. **Start a social phase** and verify:
   - Scheduler starts automatically
   - Tick logs appear in console
   - NPCs generate interactions

3. **Open a modal** (settings, diary room, etc.) and verify:
   - Scheduler pauses (log: "⏸️ Pausing AI social phase")
   - Tick loop continues but skips work
   - No errors in console

4. **Close the modal** and verify:
   - Scheduler resumes (log: "▶️ Resuming AI social phase")
   - Ticks resume immediately
   - Queued actions flush

5. **Check diagnostics:**
   ```javascript
   window.__smDebug.getState();
   // Should show: isRunning=true, isPaused=false, tickCount>0
   ```

### Devtools Harness

Open `devtools/social-ai-debug.html` in a browser to:
- Test start/stop/pause/resume behavior
- Simulate modal open/close events
- Monitor scheduler state in real-time
- Queue and flush executor actions
- View event logs

## Safety & Reversibility

### Non-Destructive Changes
- ✅ All changes are minimal and focused
- ✅ `stop()` semantics unchanged (still used for phase end)
- ✅ Backward compatibility maintained (fallback to `stop()`/`start()`)
- ✅ New executor disabled by default (opt-in via config)
- ✅ Debug logging gated by config flag

### Opt-Out / Revert
If issues arise, users can:
1. Disable debug logging: `window.game.cfg.debugSocialAI = false`
2. Disable executor: `window.FORCE_SOCIAL_FALLBACK = false`
3. System falls back to legacy behavior if new APIs unavailable

## Configuration Reference

### Scheduler Debug Logging
```javascript
window.game.cfg.debugSocialAI = true;   // Enable verbose logging + watchdog
```

### Executor Configuration
```javascript
// Initialize with custom config
window.SocialActionExecutor.init({
  maxFillActionsPerPhase: 3,    // Max actions per NPC per phase
  backgroundRate: 0.15,          // 15% chance of action per tick
  allowTargetHuman: true,        // NPCs can target human
  lightActionCost: 1,            // Energy cost for light actions
  heavyActionCost: 2,            // Energy cost for heavy actions
  conservativeSuccess: 0.7,      // 70% success rate heuristic
  enabled: false                 // Master switch (opt-in)
});

// Force-enable for testing
window.FORCE_SOCIAL_FALLBACK = true;
```

## Diagnostics API

### Scheduler State
```javascript
window.__smDebug.getState()
// Returns:
// {
//   isRunning: true,
//   isPaused: false,
//   isActive: true,
//   tickCount: 42,
//   lastTickTime: 1701962400000,
//   timeSinceLastTick: 234,
//   idlePassCount: 0,
//   actionCounts: { 1: 3, 2: 2, 3: 4 },
//   totalActions: 9,
//   recentPairings: ['1-2', '3-4'],
//   config: { ... }
// }
```

### Manual Tick Execution
```javascript
window.__smDebug.runAiTickOnce()
// Executes a single interaction with verbose logging
```

### Executor State
```javascript
window.__smDebug.executor.getState()
// Returns:
// {
//   config: { ... },
//   isActive: true,
//   queueLength: 2,
//   phaseActionCounts: { 1: 1, 2: 2 },
//   totalActions: 3,
//   ephemeralBonds: { '1-2': 1.2, '3-4': -0.8 }
// }
```

## Integration Points

### Event Bus Events

**Emitted by Scheduler:**
- `sm-ai-interaction` - AI action executed
- `social:ai-phase-complete` - Phase completed (no more actions)

**Emitted by Executor:**
- `social.action:result` - Action result (DiaryRoomLogger compatible)
- `bond.shift` - Bond change between players

**Listened by Scheduler:**
- `social.phase:start` - Start scheduler automatically
- `social.phase:end` - Stop scheduler

**Listened by Executor:**
- `social.phase:start` - Activate executor
- `social.phase:end` - Flush queue and deactivate

### Modal Events

**Pause triggers:**
- `PauseController.pauseSocialAI()` - Called on game pause
- `pausePhaseTimer()` in social-maneuvers - Called on modal open

**Resume triggers:**
- `PauseController.resumeSocialAI()` - Called on game resume
- `resumePhaseTimer()` in social-maneuvers - Called on modal close

## Future Enhancements (Out of Scope)

- Integration with SocialEngine budget system
- Dynamic adjustment of `backgroundRate` based on phase energy
- Persistent executor state across page reloads
- Analytics/telemetry for scheduler performance
- UI indicators for scheduler/executor status

## Acceptance Criteria

- ✅ Scheduler supports pause/resume without stopping tick loop
- ✅ Watchdog restarts stalled loops (debug-gated)
- ✅ Debug logging provides visibility (gated by config flag)
- ✅ Diagnostics API exposes scheduler state
- ✅ SocialActionExecutor queues and flushes actions
- ✅ Executor emits DiaryRoomLogger-compatible events
- ✅ Modal open/close triggers pause/resume
- ✅ Phase end still calls stop() (unchanged)
- ✅ Devtools harness demonstrates behavior
- ✅ Documentation includes troubleshooting guide
- ✅ All tests pass
- ✅ Changes are minimal and reversible

## Screenshots

### Devtools Test Harness
The interactive test harness (`devtools/social-ai-debug.html`) provides:
- Real-time scheduler status display
- Start/stop/pause/resume controls
- Modal simulation buttons
- Executor queue management
- Live event log

## Review Checklist

- [ ] Code follows existing patterns and conventions
- [ ] All automated tests pass
- [ ] Manual testing completed successfully
- [ ] Documentation is clear and comprehensive
- [ ] Changes are minimal and focused
- [ ] Backward compatibility maintained
- [ ] No breaking changes to existing APIs
- [ ] Debug features properly gated
- [ ] Performance impact minimal

## Related Issues

This PR addresses issues with:
- NPCs not generating interactions during social phases
- Empty or sparse Diary Room entries
- Scheduler stopping when modals open
- Lack of visibility into scheduler behavior

## Migration Notes

**No migration required.** Changes are backward compatible and opt-in.

To enable new features:
1. Debug logging: Set `window.game.cfg.debugSocialAI = true`
2. Executor: Set `window.FORCE_SOCIAL_FALLBACK = true` (testing only)

## Deployment Notes

1. Standard deployment - no special steps required
2. Monitor console logs for scheduler/executor activity
3. Use devtools harness for testing in non-production environments
4. Recommended: Enable `debugSocialAI` flag initially to monitor behavior

## Questions / Discussion

- Should executor be enabled by default in future release?
- Should watchdog be always-on (not debug-gated)?
- Should we add UI indicators for pause state?

---

**Branch:** `feature/dr-social-ai-fix`  
**Author:** GitHub Copilot  
**Date:** 2025-12-07  
**Commits:** 3  
**Files Changed:** 8 (4 modified, 3 new, 1 updated)  
**Lines Changed:** +1,286 / -29
