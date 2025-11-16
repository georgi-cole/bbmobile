# Veto Ceremony Stuck Card Fix - Implementation Summary

## Problem Statement
Ceremony reaction/message cards remained visible after phase transitions, especially when fast-forwarding through the veto ceremony. This caused UI contamination where cards from the previous phase would persist into the next phase (e.g., social_intermission).

## Root Causes
1. **Uncancelled Timeouts**: `setTimeout` callbacks for card auto-dismiss and nominee reactions were not cancelled when phase changed
2. **No Invalidation Mechanism**: `CardManager.clear()` removed visible cards but did not invalidate future scheduled callbacks
3. **Missing Phase Guards**: No phase token system to prevent late callbacks from rebuilding cards post-phase-change
4. **Legacy Fallback Issues**: Code in `veto.js` (e.g., `showNomineeReactionsSimultaneously`) used raw `setTimeout` without CardManager integration

## Solution Architecture

### Multi-Layer Defense Strategy
1. **Phase Token System**: Incremental counter that invalidates all operations from previous phases
2. **Timeout Registry**: Centralized tracking of all scheduled timeouts for bulk cancellation
3. **Phase Change Hooks**: Automatic notification to CardManager on every phase transition
4. **Phase Guards**: Runtime checks to abort operations if phase has changed

## Implementation Details

### 1. CardManager.js - Core Phase Token System
**Added State:**
```javascript
_phaseToken: 0,               // Incremented on each phase change
__pendingTimeouts: [],        // Registry of all scheduled timeouts
```

**Enhanced `show()` Method:**
- Captures phase token before factory execution
- Validates token after card creation (aborts if stale)
- Auto-registers returned timeout with registry
- Cleans up card and timeout if phase changed during creation

**New Methods:**
- `registerTimeout(timeoutId)` - Track a timeout for later cancellation
- `cancelAllTimeouts()` - Clear all registered timeouts
- `onPhaseChange(newPhase)` - Increment token, cancel timeouts, clear cards

**Enhanced `clear()` Method:**
- Now calls `cancelAllTimeouts()` before clearing cards

**Enhanced `getDebugInfo()`:**
- Returns phase token and pending timeout count for diagnostics

### 2. Phase Change Hooks
**In `js/ui.hud-and-router.js` - Main `setPhase()`:**
```javascript
// Notify CardManager of phase change FIRST (before any other cleanup)
if(g.CardManager && typeof g.CardManager.onPhaseChange === 'function'){
  try {
    g.CardManager.onPhaseChange(phase);
    console.info('[phase] CardManager.onPhaseChange() called for phase:', phase);
  } catch(e){
    console.error('[phase] CardManager.onPhaseChange() error:', e);
  }
}
```

**In `js/social.js` - Social Phase Wrapper:**
```javascript
global.setPhase = function wrappedSetPhase(phase, duration, callback){
  // Notify CardManager of phase change BEFORE any other logic
  if(global.CardManager && typeof global.CardManager.onPhaseChange === 'function'){
    try {
      global.CardManager.onPhaseChange(phase);
    } catch(e){
      console.error('[social.js wrapper] CardManager.onPhaseChange failed:', e);
    }
  }
  // ... rest of wrapper logic
}
```

### 3. Legacy Fallback Fix in veto.js
**Enhanced `showNomineeReactionsSimultaneously()`:**

**Phase Guard at Loop Start:**
```javascript
// PHASE GUARD: Abort if phase is no longer veto_ceremony
if(g && g.phase !== 'veto_ceremony'){
  console.log('[veto] Aborting nominee reactions - phase changed to', g.phase);
  return;
}
```

**Tracked Timeout for Delays:**
```javascript
// Small delay between reactions - use tracked timeout if CardManager available
if(global.CardManager && typeof global.CardManager.registerTimeout === 'function'){
  await new Promise(function(resolve){
    // PHASE GUARD: Check again before scheduling delay
    if(g && g.phase !== 'veto_ceremony'){
      resolve();
      return;
    }
    var timeoutId = setTimeout(resolve, 600);
    global.CardManager.registerTimeout(timeoutId);
  });
}
```

### 4. Documentation Update in tv-cards.js
Added clarifying comment that CardManager wrapper automatically handles timeout registration when factory returns `{card, timeout}` object.

### 5. Regression Test
Created `test_veto_ceremony_stuck_card_fix.html`:
- Simulates veto ceremony with nominee reactions
- Triggers phase change mid-ceremony (skip/fast-forward scenario)
- Waits 1 second for any stuck timeouts to potentially fire
- Asserts zero cards remain in DOM after phase change
- Provides detailed pass/fail logging

## Flow Diagram

```
Phase Transition Flow:
┌─────────────────────────────────────────┐
│ User triggers phase change              │
│ (e.g., skip/fast-forward)               │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ setPhase() called                       │
│ (in ui.hud-and-router.js or social.js) │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ CardManager.onPhaseChange(newPhase)     │
│ - Increment _phaseToken                 │
│ - Cancel all pending timeouts           │
│ - Clear current card                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Any in-flight card operations:          │
│ - Factory validates phase token         │
│ - If token changed, abort & cleanup     │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Any scheduled timeouts:                 │
│ - Already cleared by cancelAllTimeouts()│
│ - Cannot fire to show new cards         │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Phase guards in veto.js:                │
│ - Check if phase still veto_ceremony    │
│ - Abort reaction loops if phase changed │
└─────────────────────────────────────────┘
                 │
                 ▼
        ✅ Clean phase transition
        (no stuck cards)
```

## Testing

### Automated Tests
- All existing tests pass: `npm run test:all` ✅
  - `test:minigames` - PASS
  - `test:runtime-helpers` - PASS
  - `test:e2e` - PASS
  - `test:social` - PASS
  - `test:pov-carousel` - PASS

### New Regression Test
- `test_veto_ceremony_stuck_card_fix.html`
  - Tests skip mid-ceremony scenario
  - Validates no cards persist after phase change
  - Provides detailed logging and pass/fail indicators

### Manual Testing Checklist
- [ ] Start veto ceremony
- [ ] Fast-forward during nominee reaction sequence
- [ ] Verify no cards remain in next phase
- [ ] Check console for phase token increments
- [ ] Verify timeout cancellation logs
- [ ] Test with multiple phase transitions

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `js/ui/CardManager.js` | Phase token system, timeout registry, onPhaseChange method | +80 |
| `js/ui/tv-cards.js` | Documentation comment | +3 |
| `js/social.js` | CardManager.onPhaseChange() call in wrapper | +9 |
| `js/ui.hud-and-router.js` | CardManager.onPhaseChange() call in setPhase | +10 |
| `js/veto.js` | Phase guards and tracked timeouts in nominee reactions | +21 |
| `test_veto_ceremony_stuck_card_fix.html` | New regression test | +315 (new) |
| **Total** | | **+438 lines** |

## Code Quality

### ESLint
- No new linting errors introduced
- All warnings are pre-existing in the codebase
- New code follows existing patterns and style

### Backwards Compatibility
- CardManager gracefully handles missing methods
- Fallback behavior preserved when CardManager unavailable
- No breaking changes to existing APIs
- All existing test suites pass

### Performance
- Minimal overhead: array operations on small timeout registry
- Phase token comparison is O(1)
- No new timers or intervals added
- Cleanup reduces memory leaks

## Security
- No security vulnerabilities introduced
- Defensive timeout cancellation prevents resource leaks
- Phase token prevents stale operations from executing
- No new external dependencies
- No sensitive data handling

## Edge Cases Handled

1. **Phase change during card factory execution**: Token validation aborts operation
2. **Multiple rapid phase changes**: Each change increments token and cancels timeouts
3. **Timeout already cleared**: Error handling in cancelAllTimeouts ignores failures
4. **CardManager not loaded**: Fallback behavior preserved with raw setTimeout
5. **Empty timeout registry**: cancelAllTimeouts handles gracefully
6. **Concurrent card shows**: Existing isShowing flag prevents race conditions

## Benefits

1. **Eliminates Stuck Cards**: Primary issue resolved - no cards persist across phases
2. **Resource Leak Prevention**: Timeout registry prevents accumulation of uncancelled timers
3. **Improved UX**: Clean phase transitions without UI contamination
4. **Better Debugging**: Phase token in logs helps trace timing issues
5. **Defensive Design**: Multiple layers ensure robustness
6. **Maintainability**: Clear, documented code with consistent patterns

## Future Enhancements (Optional)

1. **Telemetry**: Track how often phase guards prevent stuck cards
2. **Unit Tests**: Add programmatic tests for phase token system
3. **Visualization**: Dev tools to show pending timeouts and phase token state
4. **Generalization**: Apply similar pattern to other UI systems
5. **Performance Metrics**: Monitor timeout cancellation performance

## Acceptance Criteria Status

✅ No ceremony/reaction card remains visible after phase change to `social_intermission` or any other phase when fast forwarding

✅ No reappearance of cleared cards due to late timeout firing

✅ SkipController drain loop remains stable (no indefinite passes caused by token logic)

✅ No console errors introduced

✅ All existing tests continue to pass

✅ Regression test created and passing

## References

- **Original Issue**: Bug report describing stuck veto ceremony cards
- **CardManager Module**: `js/ui/CardManager.js`
- **TV Cards Module**: `js/ui/tv-cards.js`
- **Veto Ceremony Logic**: `js/veto.js`
- **Phase Management**: `js/ui.hud-and-router.js`
- **Social Phase Wrapper**: `js/social.js`
- **Regression Test**: `test_veto_ceremony_stuck_card_fix.html`
