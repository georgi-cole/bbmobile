# Double Summary Card Bug - Visual Flow Diagram

## Before Fix (BUG) - Two Summary Cards

```
Player Actions:
├─ Open social modal
├─ Spend all energy (energy = 0)
└─ Close modal
    │
    ├─ [Path A: Fast-advance] ──────────────────┐
    │  checkEnergyDepletionAndAdvance()          │
    │  └─> scheduleFastAdvanceFallback(800ms)   │
    │      └─> setTimeout(..., 800ms)            │
    │          ├─> onSocialPhaseEnd()            │
    │          ├─> generatePhaseSummary()        │
    │          └─> showSummaryPanel() ──> 📋 SUMMARY #1
    │              └─> User clicks OK
    │                  └─> Phase advances
    │
    └─ [Path B: Timer] ─────────────────────────┐
       setPhase('social_intermission', 30s, onDone)
       └─> Timer still running! ⚠️
           └─> After 30 seconds...
               └─> onDone() fires
                   ├─> onSocialPhaseEnd()
                   ├─> generatePhaseSummary()
                   └─> showSummaryPanel() ──> 📋 SUMMARY #2 ❌ BUG!
```

**Problem:** Both Path A and Path B show summaries independently!

---

## After Fix (CORRECT) - One Summary Card

```
Player Actions:
├─ Open social modal
├─ Spend all energy (energy = 0)
└─ Close modal
    │
    ├─ [Path A: Fast-advance - NEW] ────────────┐
    │  checkEnergyDepletionAndAdvance()          │
    │  └─> scheduleFastAdvanceFallback(800ms)   │
    │      └─> setTimeout(..., 800ms)            │
    │          ├─> g.endAt = now + 100           │
    │          ├─> g.phaseEndsAt = now + 100     │
    │          └─> checkPhaseTimer() ───────┐    │
    │                                        │    │
    │  NO SUMMARY SHOWN HERE ✅             │    │
    │  Just shortens timer ──────────────────┘    │
    │                                              │
    └─ [Path B: Timer - SOLE AUTHORITY] ─────────┘
       setPhase('social_intermission', 30s, onDone)
       └─> Timer expires in ~900ms (800 + 100)
           └─> onDone() fires ──> ONLY PLACE
               ├─> Store __socialPhaseAdvanceCallback
               ├─> onSocialPhaseEnd() (cleanup only, no summary)
               ├─> generatePhaseSummary()
               └─> showSummaryPanel() ──> 📋 SUMMARY #1 ✅
                   └─> User clicks OK
                       └─> callback() fires
                           └─> Phase advances
```

**Solution:** Only Path B (onDone) shows the summary!

---

## Code Changes Summary

### 1. `scheduleFastAdvanceFallback()` - Rewritten

**Before (85 lines):**
```javascript
function scheduleFastAdvanceFallback(delayMs = 800) {
  // ... complex logic ...
  setTimeout(async () => {
    await global.cardQueueWaitIdle?.();
    
    // Define phase advancement
    const advanceToNextPhase = () => {
      onSocialPhaseEnd();        // ← Called here
      global.startNominations(); // ← Advanced here
    };
    
    // Store callback
    g.__socialPhaseAdvanceCallback = advanceToNextPhase;
    
    // Show summary
    showSummaryPanel(generatePhaseSummary()); // ← Summary shown here ❌
    
  }, delayMs);
}
```

**After (19 lines):**
```javascript
function scheduleFastAdvanceFallback(delayMs = 800) {
  setTimeout(() => {
    console.info('[social-maneuvers] ⏩ Fast-advance: forcing phase timer to expire');
    
    // Force the phase timer to expire almost immediately
    const now = Date.now();
    g.endAt = now + 100;
    g.phaseEndsAt = now + 100;
    
    // Trigger manual timer check
    global.checkPhaseTimer();
    
    // NO SUMMARY - onDone() will handle everything ✅
  }, delayMs);
}
```

### 2. `onSocialPhaseEnd()` - Updated

**Before:**
```javascript
function onSocialPhaseEnd() {
  // ... cleanup logic ...
  const summary = generatePhaseSummary();
  exportSessionLog(summary);
  logToConsole(summary);
  
  showSummaryPanel(summary); // ← Called here ❌
}
```

**After:**
```javascript
function onSocialPhaseEnd() {
  // ... cleanup logic ...
  const summary = generatePhaseSummary();
  exportSessionLog(summary);
  logToConsole(summary);
  
  // NOTE: showSummaryPanel is NOT called here anymore. ✅
  // Summary display is now the sole responsibility of onDone() in social.js
}
```

### 3. `onDone()` in social.js - Unchanged (Already Correct)

```javascript
const onDone = async () => {
  // Store callback first
  g.__socialPhaseAdvanceCallback = advanceToNextPhase;
  
  // Call cleanup (no summary)
  global.SocialManeuvers.onSocialPhaseEnd();
  
  // Generate and show summary - ONLY PLACE ✅
  const summary = global.SocialManeuvers.generatePhaseSummary();
  global.SocialManeuvers.showSummaryPanel(summary);
  
  // Phase advances when user clicks OK
};
```

---

## Timeline Comparison

### Before Fix
```
t=0s      Player spends all energy
t=0.8s    scheduleFastAdvanceFallback fires
          └─> Shows summary #1 ✅
          └─> User clicks OK
          └─> Phase advances
t=30s     Timer expires, onDone fires
          └─> Shows summary #2 ❌ BUG
```

### After Fix
```
t=0s      Player spends all energy
t=0.8s    scheduleFastAdvanceFallback fires
          └─> Shortens timer to 100ms
t=0.9s    Timer expires, onDone fires
          └─> Shows summary #1 ✅
          └─> User clicks OK
          └─> Phase advances
(No second summary!)
```

---

## Key Insights

1. **Single Authority Principle**: Only one code path (`onDone()`) should be responsible for showing the summary and advancing the phase.

2. **Timer Management**: Instead of trying to show a summary immediately when energy is depleted, we shorten the existing phase timer so it expires quickly and triggers `onDone()` naturally.

3. **Idempotency**: The `showSummaryPanel()` function already has a guard (`socialSummaryOpen` flag) to prevent duplicate summaries, but fixing the root cause is better than relying on guards.

4. **Separation of Concerns**:
   - `scheduleFastAdvanceFallback()`: Timer management only
   - `onSocialPhaseEnd()`: Cleanup, logging, data generation only
   - `onDone()`: Summary display and phase advancement only

---

## Testing Checklist

- [x] Player can spend all energy and see exactly ONE summary
- [x] Summary appears promptly (within ~1 second of energy depletion)
- [x] Clicking OK advances to next phase immediately
- [x] No second summary appears after 30 seconds
- [x] All automated tests pass
- [x] No security vulnerabilities introduced
- [x] ESLint clean (no new errors or warnings)

---

## Files Modified

1. `js/social-maneuvers.js`
   - `scheduleFastAdvanceFallback()` - Lines 1817-1848 (66 lines removed)
   - `onSocialPhaseEnd()` - Lines 3270-3281 (1 line removed, comment added)

2. `test_double_summary_fix.html` - New test documentation
