# Social AI Hotfix - QA Testing Guide

## Overview
This document provides comprehensive QA steps for validating the social AI hotfix that addresses console flooding and missing Diary Room entries.

## Changes Summary
1. **Phase-aware scheduler**: Only runs during social phases (`intermission` or `social_intermission`)
2. **Compact logging**: Reduces console spam with periodic summaries (default: every 10 ticks)
3. **Enhanced DR adapter**: Maps AI interactions to rich Diary Room events
4. **Debug gating**: All features are debug-gated for safe production deployment

---

## Pre-requisites
- Staging or local development environment
- Browser console access (F12)
- Understanding of Big Brother game phases

---

## Test 1: Configuration & Debug Gates

### Enable Debug Mode
```javascript
// Open browser console and run:
window.game.cfg.debugSocialAI = true;
window.game.cfg.aiSocialEmitDrEvents = true;
```

### Expected Results
- Console should show: `[sm-to-dr-adapter] ✓ Installed (debug gate enabled)`
- If flags are not set, adapter should show: `[sm-to-dr-adapter] Skipped (gate=false)`

### Test Compact Logging Config
```javascript
// Enable compact logs (default)
window.game.cfg.aiSocialCompactLogs = true;
window.game.cfg.aiSocialCompactLogInterval = 10;  // Summary every 10 ticks

// Disable for verbose mode
window.game.cfg.aiSocialCompactLogs = false;
```

### Expected Results
- With compact logs enabled: Console shows periodic summaries only
- With compact logs disabled: Console shows every action

---

## Test 2: Phase Detection & Lifecycle

### Test Phase Names
```javascript
// Test 'intermission' phase name
window.game.phase = 'intermission';
// Scheduler should start

// Test 'social_intermission' phase name  
window.game.phase = 'social_intermission';
// Scheduler should also start

// Test non-social phase
window.game.phase = 'hoh';
// Scheduler should NOT start or should stop
```

### Expected Results
- Both `intermission` and `social_intermission` are accepted as valid social phases
- Scheduler only runs during social phases
- Scheduler stops automatically when leaving social phase

### Test Phase Transitions
1. Start a new game or navigate to lobby
2. Progress to social phase (intermission)
3. Open console and look for:
   ```
   [social-ai-autostart] 🎬 Detected social phase (autostart)
   [social-ai-autostart] Starting SocialAIScheduler and auto-driver
   [ai-scheduler] ▶️ Starting AI social phase
   ```
4. Leave social phase (e.g., move to HOH)
5. Look for stop messages:
   ```
   [social-ai-autostart] 🛑 Leaving social phase - stopping auto-driver and scheduler
   [ai-scheduler] ◼️ Stopping AI social phase
   ```

---

## Test 3: Compact Logging

### Enable Compact Logs (Default)
```javascript
window.game.cfg.aiSocialCompactLogs = true;
window.game.cfg.aiSocialCompactLogInterval = 10;
```

### Start Social Phase and Monitor Console
1. Navigate to social phase
2. Observe console output
3. Should see periodic summaries only:
   ```
   [ai-scheduler] 📊 Tick 10: 5 total actions (3 active players)
   [ai-scheduler] 📊 Tick 20: 12 total actions (3 active players)
   ```

### Disable Compact Logs
```javascript
window.game.cfg.aiSocialCompactLogs = false;
```

### Monitor Console Again
1. Console should now show every individual action:
   ```
   [ai-scheduler] Player 2 → small talk → Player 3: success
   [ai-scheduler] Player 4 → compliment → Player 1: success
   ```

### Expected Results
- **Compact mode**: ~1 log per 10 ticks (configurable)
- **Verbose mode**: ~2-4 logs per tick
- **Reduction**: ~95% fewer console logs in compact mode

---

## Test 4: Event Emission & Adapter

### Check Adapter Installation
```javascript
// Check if adapter is installed
console.log('Adapter installed:', window.__smToDrAdapterInstalled);

// Should be true if debug gates are enabled
```

### Test Event Emission
```javascript
// Listen for adapter events
window.addEventListener('social.action:result', (e) => {
  console.log('social.action:result:', e.detail);
});

window.addEventListener('bond.shift', (e) => {
  console.log('bond.shift:', e.detail);
});

window.addEventListener('player.relations:updated', (e) => {
  console.log('player.relations:updated:', e.detail);
});

window.addEventListener('social.entry:story', (e) => {
  console.log('social.entry:story:', e.detail);
});
```

### Trigger AI Interaction
1. Navigate to social phase
2. Let scheduler run for a few ticks
3. Check console for emitted events

### Expected Events Per Interaction
1. **1x** `social.action:result` - Rich payload with narrative, bond shifts, actor/targets
2. **Nx** `bond.shift` - One per target (N = number of targets)
3. **Mx** `player.relations:updated` - One per affected player (M = actor + targets)
4. **1x** `social.entry:story` - Direct DR consumption

### Verify Event Payloads

#### social.action:result Payload
```javascript
{
  actor: { id: 2, name: "Player 2" },
  target: { id: 3, name: "Player 3" },
  targets: [{ id: 3, name: "Player 3" }],
  action: "small_talk",
  actionLabel: "small talk",
  success: true,
  narrative: "Player 2 small talk with Player 3 (succeeded)",
  bondShifts: [
    {
      targetId: 3,
      targetName: "Player 3",
      bondBefore: 0,
      bondAfter: 0.05,
      delta: 0.05
    }
  ],
  // ... more fields
}
```

#### social.entry:story Payload
```javascript
{
  id: "story-...",
  timestamp: 1234567890,
  type: "social_action",
  category: "social",
  severity: "neutral",
  title: "Player 2 → small talk",
  text: "Player 2 small talk with Player 3 (succeeded)",
  bondShifts: [...],
  actor: { id: 2, name: "Player 2" },
  targets: [{ id: 3, name: "Player 3" }],
  action: "small_talk"
}
```

---

## Test 5: Diary Room Integration

### Check DiaryRoomLogger Entries
```javascript
// Check if entries array exists
console.log('DR Entries:', window.DiaryRoomLogger?._entries);

// Get entry count
const count = window.DiaryRoomLogger?._entries?.length || 0;
console.log('Entry count:', count);

// Show recent entries
const entries = window.DiaryRoomLogger?._entries || [];
entries.slice(-5).forEach(entry => {
  console.log(`- ${entry.text || entry.title}`);
});
```

### Manual Verification
1. Open Diary Room modal in the game UI
2. Navigate to Social tab
3. Verify entries appear with:
   - Narrative text (e.g., "Player 2 small talk with Player 3 (succeeded)")
   - Bond shifts inline (e.g., "[Player 3: ↑ 0.05]")
   - Timestamp
   - Correct category (social)

### Expected Results
- DR entries are created for each AI interaction
- Entries include narrative and bond changes
- Entries appear immediately in Social tab
- No duplicate entries (idempotency working)

---

## Test 6: Idempotency

### Test Duplicate Prevention
```javascript
// Emit same event twice
const testEvent = new CustomEvent('sm-ai-interaction', {
  detail: {
    actorId: 2,
    targetIds: [3],
    actionId: 'compliment',
    success: true,
    outcome: { type: 'success' },
    pairwise: { 3: { affinity: 0.03 } }
  }
});

let receivedCount = 0;
window.addEventListener('social.action:result', () => {
  receivedCount++;
});

window.dispatchEvent(testEvent);
window.dispatchEvent(testEvent);  // Duplicate

setTimeout(() => {
  console.log('Received count:', receivedCount);  // Should be 1
}, 100);
```

### Expected Results
- Duplicate events are blocked
- Only 1 `social.action:result` event is emitted
- Console log confirms idempotency

---

## Test 7: Scheduler State & Diagnostics

### Get Scheduler State
```javascript
// Get current state
const state = window.__smDebug?.getState();
console.log('Scheduler state:', state);

/* Expected output:
{
  isRunning: true,
  isPaused: false,
  isActive: true,
  tickCount: 45,
  totalActions: 23,
  timeSinceLastTick: 234,
  actionCounts: { 2: 8, 3: 7, 4: 8 },
  // ... more fields
}
*/
```

### Run Manual Tick
```javascript
// Run a single tick manually
window.__smDebug?.runAiTickOnce();
```

### Expected Results
- State shows correct running status
- Tick count increments
- Action counts track per-player actions
- Manual tick executes successfully

---

## Test 8: Performance & Resource Usage

### Monitor Console Performance
1. Open browser console
2. Navigate to social phase with compact logs enabled
3. Let run for 50+ ticks
4. Count console logs

### Expected Results
- **Compact mode**: ~5 logs per 50 ticks (1 per 10 ticks)
- **Verbose mode**: ~100-150 logs per 50 ticks
- **Performance**: No lag or slowdown
- **Memory**: No memory leaks (check DevTools Memory tab)

---

## Test 9: Rollback & Safety

### Disable Features
```javascript
// Disable all debug features
window.game.cfg.debugSocialAI = false;
window.game.cfg.aiSocialEmitDrEvents = false;
```

### Reload Page
1. Reload the page (F5)
2. Check console

### Expected Results
- Adapter should NOT install: `[sm-to-dr-adapter] Skipped (gate=false)`
- No DR events are emitted
- No extra console logs
- Game functions normally without hotfix features

---

## Test 10: Edge Cases

### Test with Insufficient AI Players
```javascript
// Evict players until only 1 AI remains
window.game.players.forEach((p, i) => {
  if (i > 1) p.evicted = true;
});
```

### Expected Results
- Scheduler stops gracefully with message: "Not enough AI players for interactions (need 2+)"
- No errors in console

### Test Phase Change During Tick
1. Start scheduler in social phase
2. Wait for a few ticks
3. Manually change phase: `window.game.phase = 'hoh'`

### Expected Results
- Scheduler detects phase change and stops
- Console shows: "⚠️ Not in social phase - stopping scheduler"
- No errors or stuck timers

---

## Automated Test Suite

### Run HTML Test Suite
1. Open `test_social_ai_hotfix.html` in browser
2. Follow on-screen instructions:
   - Enable Debug Mode
   - Test Phase Detection
   - Test Event Emission
   - Check DR Entries
   - Test Scheduler

### Run Existing Test Suite
```bash
npm run test:social
npm run test:all
```

### Expected Results
- All existing tests pass
- No regressions introduced
- New functionality works as expected

---

## Success Criteria

### Must Pass
- ✅ Scheduler only runs during social phases
- ✅ Both 'intermission' and 'social_intermission' are accepted
- ✅ Scheduler stops when leaving social phase
- ✅ Compact logging reduces console spam by ~95%
- ✅ DR entries are created with narratives and bond shifts
- ✅ Events are emitted correctly (social.action:result, bond.shift, etc.)
- ✅ Idempotency prevents duplicate events
- ✅ Debug gates work correctly (features disabled when gates are off)
- ✅ No regressions in existing tests
- ✅ No errors or warnings in console (except expected warnings)

### Nice to Have
- ✅ Profile UI updates with player.relations:updated events
- ✅ DR Social tab updates in real-time
- ✅ Performance monitoring shows no degradation
- ✅ Memory usage remains stable

---

## Troubleshooting

### Issue: Adapter Not Installing
**Symptom**: `[sm-to-dr-adapter] Skipped (gate=false)`
**Solution**: Enable debug gates:
```javascript
window.game.cfg.debugSocialAI = true;
window.game.cfg.aiSocialEmitDrEvents = true;
```
Then reload the page.

### Issue: Scheduler Not Starting
**Symptom**: No scheduler logs in console
**Solution**: 
1. Verify you're in a social phase: `console.log(window.game.phase)`
2. Check if scheduler is available: `console.log(window.SocialAIScheduler)`
3. Manually start: `window.SocialAIScheduler.startAiSocialPhase({}, 'manual')`

### Issue: No DR Entries
**Symptom**: `DiaryRoomLogger._entries` is empty
**Solution**:
1. Verify adapter is installed: `console.log(window.__smToDrAdapterInstalled)`
2. Check if DiaryRoomLogger exists: `console.log(window.DiaryRoomLogger)`
3. Listen for events manually to verify they're being emitted

### Issue: Too Many Console Logs
**Symptom**: Console is still flooded
**Solution**: Enable compact logs:
```javascript
window.game.cfg.aiSocialCompactLogs = true;
window.game.cfg.aiSocialCompactLogInterval = 10;
```

---

## Reporting Issues

When reporting issues, please include:
1. Browser and version
2. Console logs (screenshots or text)
3. Current game state (phase, week, player count)
4. Configuration flags used
5. Steps to reproduce
6. Expected vs actual behavior

---

## Approval Checklist

Before approving this PR, verify:
- [ ] All automated tests pass (`npm run test:social`, `npm run test:all`)
- [ ] Manual testing completed for all test cases above
- [ ] Console spam is reduced (compact logging works)
- [ ] DR entries appear correctly
- [ ] Phase guards prevent scheduler from running outside social phases
- [ ] Debug gates work (features can be disabled)
- [ ] No regressions in existing functionality
- [ ] Performance is acceptable (no lag or memory leaks)
- [ ] Code review completed
- [ ] Documentation is clear and complete

---

## Rollback Plan

If critical issues are discovered after deployment:

1. **Immediate Mitigation** (no code changes):
   ```javascript
   window.game.cfg.debugSocialAI = false;
   window.game.cfg.aiSocialEmitDrEvents = false;
   ```
   Users reload page, adapter won't install.

2. **Full Rollback** (revert PR):
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Partial Rollback** (disable specific features):
   - Disable compact logs: `cfg.aiSocialCompactLogs = false`
   - Disable adapter: `cfg.aiSocialEmitDrEvents = false`
   - Disable scheduler: `cfg.aiSocialEnabled = false`

---

## Contact

For questions or issues with this QA guide, contact the development team.
