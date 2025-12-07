# Diary Room Logger - Troubleshooting & QA Guide

## Overview

The Diary Room (DR) Logger system captures and displays AI-driven social interactions, bond shifts, and game events in story format. This guide covers troubleshooting, debug enabling, and QA artifact capture.

## System Architecture

### Components

1. **SocialActionExecutor** (`js/social/socialActionExecutor.js`)
   - Background NPC interactions during social modal open
   - Queues heavy actions, flushes on modal close
   - Emits `social.action:result` and `bond.shift` events

2. **DiaryRoomLogger** (`js/dr/diaryRoomLogger.js`)
   - Listens to social events and creates DR entries
   - Determines severity (dramatic/high/neutral)
   - Emits `dr:alert` for button blink

3. **DiaryUI** (`js/dr/diaryUI.js`)
   - Controls DR button blink animation
   - Listens to `dr:alert` events
   - Manages button state

4. **Social Modal** (`js/socialize-mobile.js`)
   - On open: Pause AI scheduler, start background executor
   - On close: Flush queue, stop executor, resume scheduler

## Enabling Debug Mode

### Method 1: Console (Temporary)
```javascript
// Enable debug logging for social AI and executor
window.game.cfg.debugSocialAI = true;
window.game.cfg.aiSocialVerbose = true;

// Check executor state
window.__smDebug.executor.getState();

// Check scheduler state
window.__smDebug.getState();
```

### Method 2: Settings Modal (Persistent)
1. Open Settings modal
2. Go to Features tab
3. Enable "Debug Social AI"
4. Restart game for full effect

### Method 3: Force Enable (For Testing)
```javascript
// Force-enable executor (bypasses config)
window.FORCE_SOCIAL_FALLBACK = true;

// Reinitialize executor
window.SocialActionExecutor.init({
  enabled: true,
  maxFillActionsPerPhase: 3,
  backgroundRate: 0.15,
  allowTargetHuman: true
});
```

## DR Button Blink Policy

The DR button will blink when:

1. **Action Type Trigger**: Action is `backstab`, `insult`, or `gossip`
2. **Magnitude Trigger**: Affinity/bond change magnitude >= 0.06
3. **Dramatic Events**: Jury returns, critical outcomes

### Blink Severity Levels

- **Dramatic (Red)**: Major game-changing events, severe betrayals
- **High (Orange)**: Backstab/insult/gossip, significant bond shifts (>= 0.06)
- **Neutral**: No blink, standard interactions

## Troubleshooting Guide

### Issue: DR entries not appearing

**Symptoms:**
- Social phase completes but DR shows no entries
- Modal works but nothing logged

**Diagnostic Steps:**
1. Check if DiaryRoomLogger is initialized:
   ```javascript
   console.log(window.DiaryRoomLogger);
   ```

2. Check event listeners:
   ```javascript
   // Should show listeners for social.action:result, etc.
   window.game.bus._events || window.game.bus;
   ```

3. Check if events are emitted:
   ```javascript
   // Listen manually
   window.game.bus.on('social.action:result', (e) => {
     console.log('Action result:', e);
   });
   ```

4. Verify SocialActionExecutor is enabled:
   ```javascript
   const state = window.__smDebug.executor.getState();
   console.log('Executor enabled:', state.config.enabled);
   console.log('Executor active:', state.isActive);
   ```

**Solutions:**
- Ensure debug mode is enabled (see above)
- Check browser console for errors
- Verify modal open/close cycle triggers executor
- Confirm SocialActionExecutor.init() was called

### Issue: DR button not blinking

**Symptoms:**
- Entries appear in DR but button doesn't blink
- No visual feedback for dramatic events

**Diagnostic Steps:**
1. Check if DiaryUI is initialized:
   ```javascript
   console.log(window.DiaryUI);
   console.log(window.DiaryUI.isBlinking());
   ```

2. Verify dr:alert events are emitted:
   ```javascript
   window.game.bus.on('dr:alert', (e) => {
     console.log('DR Alert:', e);
   });
   ```

3. Check button element exists:
   ```javascript
   const btn = document.querySelector('#btnDiaryRoom');
   console.log('Button found:', !!btn);
   console.log('Has blink class:', btn?.classList.contains('dr-blink'));
   ```

4. Verify severity determination:
   ```javascript
   // Check if actions meet blink criteria
   // Should be 'high' or 'dramatic' for blink
   ```

**Solutions:**
- Verify CSS is loaded (`css/dr/diary.css`)
- Check for action types: backstab, insult, gossip
- Verify magnitude >= 0.06 for bond shifts
- Test manually: `window.DiaryUI.startBlinking('high')`

### Issue: Executor not running during modal open

**Symptoms:**
- Modal opens but no background NPC interactions
- Console shows "executor not active"

**Diagnostic Steps:**
1. Check executor state when modal is open:
   ```javascript
   const state = window.__smDebug.executor.getState();
   console.log('Active:', state.isActive);
   console.log('Queue length:', state.queueLength);
   ```

2. Check if scheduler is paused:
   ```javascript
   const schedState = window.__smDebug.getState();
   console.log('Paused:', schedState.isPaused);
   ```

3. Verify modal open handler runs:
   ```javascript
   // Open socialize modal and watch console
   // Should see: "Background executor started (modal opened)"
   ```

**Solutions:**
- Force-enable executor (see debug methods)
- Check console for initialization errors
- Verify `startBackgroundTicks()` method exists
- Manually trigger: `window.SocialActionExecutor.startBackgroundTicks()`

### Issue: Queue not flushing on modal close

**Symptoms:**
- Actions queued but never executed
- Queue length increases but never resets

**Diagnostic Steps:**
1. Check queue before close:
   ```javascript
   const state = window.__smDebug.executor.getState();
   console.log('Queue before close:', state.queueLength);
   ```

2. Close modal and check again:
   ```javascript
   // After closing modal
   const state = window.__smDebug.executor.getState();
   console.log('Queue after close:', state.queueLength); // Should be 0
   ```

3. Manually flush:
   ```javascript
   window.SocialActionExecutor.flushQueue();
   ```

**Solutions:**
- Verify modal close handler calls `flushQueue()`
- Check for errors in modal close function
- Ensure no exceptions interrupt close sequence

## QA Verification Script

### Full QA Flow

```javascript
// ============================================================================
// STEP 1: Enable Debug Mode
// ============================================================================
window.game.cfg.debugSocialAI = true;
window.game.cfg.aiSocialVerbose = true;
window.FORCE_SOCIAL_FALLBACK = true;

// Reinitialize executor
window.SocialActionExecutor.init({
  enabled: true,
  maxFillActionsPerPhase: 3,
  backgroundRate: 0.15,
  allowTargetHuman: true
});

console.log('✅ Debug mode enabled');

// ============================================================================
// STEP 2: Enter Social Phase (if not already in)
// ============================================================================
// Navigate to social_intermission phase using game controls
// OR use fast-forward if available

// Verify phase:
console.log('Current phase:', window.game.phase);
// Should be 'social' or 'social_intermission'

// ============================================================================
// STEP 3: Open Social Modal
// ============================================================================
// Click "Socialize" button in UI
// OR manually: (if exposed)
// window.openSocializeModal?.();

// Verify executor started:
setTimeout(() => {
  const state = window.__smDebug.executor.getState();
  console.log('Executor active:', state.isActive);
  console.log('Background interactions should occur every ~2s');
}, 1000);

// ============================================================================
// STEP 4: Wait for Background Interactions
// ============================================================================
// Watch console for:
// "[socialActionExecutor] Player X → action → Player Y: success (Δ1.2)"

// Wait 10-15 seconds to accumulate interactions
setTimeout(() => {
  const state = window.__smDebug.executor.getState();
  console.log('Total actions so far:', state.totalActions);
  console.log('Queue length:', state.queueLength);
}, 15000);

// ============================================================================
// STEP 5: Close Modal (Flush Queue)
// ============================================================================
// Click X button or backdrop to close modal
// OR manually: window.closeSocializeModal?.();

// Verify flush occurred:
setTimeout(() => {
  const state = window.__smDebug.executor.getState();
  console.log('Queue after flush:', state.queueLength); // Should be 0
  console.log('Total actions executed:', state.totalActions);
}, 1000);

// ============================================================================
// STEP 6: Check DR Entries
// ============================================================================
// Open Diary Room modal (click 🚪 DR button)
// OR check programmatically:
const entries = window.DiaryRoomLogger?.getEntries?.() || 
                window.__drBridge?.getEntries?.() || [];
console.log('DR entries:', entries.length);
entries.slice(-5).forEach(e => {
  console.log(`[${e.severity}] ${e.text}`);
});

// ============================================================================
// STEP 7: Verify Button Blink
// ============================================================================
// Check if button blinked (should have for high-severity actions):
const btn = document.querySelector('#btnDiaryRoom');
console.log('Button has blink class:', btn?.classList.contains('dr-blink'));
console.log('Button severity:', btn?.getAttribute('data-severity'));

// Check blink log:
console.log('Blink currently active:', window.DiaryUI?.isBlinking?.());

// ============================================================================
// STEP 8: Capture Evidence
// ============================================================================
// See "Capturing QA Artifacts" section below
```

## Capturing QA Artifacts

### Console Logs

1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter by `[socialActionExecutor]`, `[DiaryRoomLogger]`, `[socialize-mobile]`
4. Right-click in console → Save as... → `qa_console_logs.txt`

### Screenshots

**Required screenshots (minimum 3):**

#### 1. Modal Open with Background Activity
- Open social modal
- Wait for 10-15 seconds
- Console shows background executor activity
- **Filename**: `qa_01_modal_open_executor_active.png`

#### 2. DR Entries After Phase
- Close modal
- Open Diary Room
- Show entries with various severities
- **Filename**: `qa_02_dr_entries_populated.png`

#### 3. Button Blink State
- After closing modal
- Before opening DR
- Button should have blink animation (if high-severity actions occurred)
- Use browser inspector to show `dr-blink` class
- **Filename**: `qa_03_button_blink_state.png`

**Optional screenshots:**

#### 4. Executor State During Modal
- Console showing `__smDebug.executor.getState()`
- **Filename**: `qa_04_executor_state.png`

#### 5. Scheduler Pause State
- Console showing `__smDebug.getState()`
- Shows `isPaused: true` during modal open
- **Filename**: `qa_05_scheduler_paused.png`

### Screen Recording

For comprehensive evidence, record the entire flow:

1. Start recording
2. Enable debug mode
3. Enter social phase
4. Open modal → wait → close modal
5. Check DR button blink
6. Open DR → verify entries
7. Stop recording

**Tools:**
- Windows: Xbox Game Bar (Win + G)
- Mac: QuickTime Player → New Screen Recording
- Browser: Chrome DevTools → Performance → Record

**Filename**: `qa_full_flow_recording.mp4`

## Expected Behavior Summary

### During Modal Open:
- ✅ AI scheduler paused
- ✅ Background executor started
- ✅ Lightweight NPC interactions every ~2s
- ✅ Heavy actions queued (not executed immediately)
- ✅ Console logs show activity

### On Modal Close:
- ✅ Queued heavy actions flushed
- ✅ Background executor stopped
- ✅ AI scheduler resumed
- ✅ Phase timer resumed
- ✅ Actions emitted to DR logger

### After Phase End:
- ✅ DR populated with story-formatted entries
- ✅ Button blinks if backstab/insult/gossip OR magnitude >= 0.06
- ✅ Entries have correct severity (dramatic/high/neutral)
- ✅ No duplicate actions (engine vs executor)

## Common Pitfalls

1. **Debug mode not enabled**: Most features are silent without `debugSocialAI`
2. **Modal not fully mounted**: Wait for modal DOM to be ready before checks
3. **Phase not social**: Executor only active during `social` or `social_intermission`
4. **Energy exhausted**: No actions if all NPCs have 0 energy
5. **Insufficient players**: Need at least 2 NPCs for interactions

## Performance Considerations

- Background rate default: 0.15 (15% chance per tick)
- Tick interval: ~2 seconds
- Max actions per phase: 3 per NPC (configurable)
- Queue is bounded to prevent memory issues

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Console logs (filtered for relevant modules)
3. Screenshots showing problem state
4. Steps to reproduce
5. Executor and scheduler state JSON
6. Expected vs actual behavior

## References

- [Diary Room Logger Docs](./diary-room-logger.md)
- [Social Maneuvers Feature](../SOCIAL_MANEUVERS_COMPLETE.md)
- [AI Scheduler Docs](../AI_SOCIAL_SUMMARY.md)
- [Phase Terminator Docs](../PHASE_TRANSITION_IMPLEMENTATION_SUMMARY.md)
