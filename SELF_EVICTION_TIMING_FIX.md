# Self-Eviction Event Overlap Fix - Summary

## Issue Description

The self-eviction feature had timing issues where the self-eviction events overlapped with the new week modal and HOH competition:

1. **Card Title Issue**: Self-eviction message showed "Week X - Strategizing" instead of a clear self-eviction title
2. **Animation Overlap**: Avatar fade animation and self-eviction messages appeared DURING the HOH competition phase
3. **Flow Issue**: Self-eviction didn't complete before the new week modal appeared

### Visual Timeline (BEFORE Fix)

```
┌─────────────────────────────────────────────────────────────┐
│ Week 2 - Strategizing                                       │  ← Wrong title
│ Rae has decided to self-evict from the Big Brother house.  │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ Get Ready for Week 3!                                       │  ← Week modal shows
│ The HOH competition is about to begin                       │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ HOH Competition                                             │
│ [Avatar fades out and goes gray]                            │  ← Animation overlaps!
│ Self-Evicted: Rae                                           │  ← Redundant message
└─────────────────────────────────────────────────────────────┘
```

## Root Cause Analysis

The issue was in the asynchronous flow of self-eviction processing:

1. `tryMaybeAutoSelfEvict()` was called during `decideForWeek()` in the intermission phase
2. The self-eviction handler called `runEvictionVisual()` which is async but wasn't awaited
3. Game flow continued immediately to show week intro modal and start HOH
4. Self-eviction animations ran AFTER the new week had already started

### Code Flow (BEFORE Fix)

```javascript
function decideForWeek() {
  // ...
  tryMaybeAutoSelfEvict();  // ❌ Not awaited
  // Continues immediately...
}

function tryMaybeAutoSelfEvict() {
  // ...
  global.selfEviction.handle(victim.id, 'ai');  // ❌ Not awaited
}

async function handleSelfEviction() {
  // Show card
  showCard('Breaking News', ...);  // ❌ Generic title
  // ...
  await runEvictionVisual();  // ✅ Awaited internally, but caller doesn't wait
}
```

## Solution Implemented

### 1. Fixed Card Title

Changed the self-eviction card title from generic "Breaking News" to a more expressive title:

```javascript
// BEFORE
showCard('Breaking News', [...], 'warn', 4000, true);

// AFTER
showCard("I've had it 😤", [...], 'warn', 4000, true);
```

### 2. Converted to Async/Await Chain

Updated the entire call chain to properly await self-eviction completion:

```javascript
// tryMaybeAutoSelfEvict() → async
async function tryMaybeAutoSelfEvict() {
  // ...
  await global.selfEviction.handle(victim.id, 'ai');
  
  // Wait for all card animations to complete
  if (typeof global.cardQueueWaitIdle === 'function') {
    await global.cardQueueWaitIdle();
  }
}

// decideForWeek() → async
async function decideForWeek() {
  // ...
  await tryMaybeAutoSelfEvict();  // ✅ Now awaited
  // ...
}

// setPhase() → async
async function setPhase(phase, seconds, onTimeout) {
  // ...
  if (phase === 'intermission') {
    await g.twists?.decideForWeek?.();  // ✅ Now awaited
  }
  // ...
}

// proceedNextWeek() → async
async function proceedNextWeek() {
  // ...
  await global.setPhase('intermission', 4, () => global.startHOH?.());
  // ...
}

// postEvictionRouting() → async
async function postEvictionRouting() {
  // ...
  await proceedNextWeek();
  // ...
}

// endWeekAndProceed() → async (in self-eviction.js)
async function endWeekAndProceed() {
  // ...
  await global.postEvictionRouting();
  // ...
}
```

### 3. Added Card Queue Wait

Ensured all card animations complete before proceeding:

```javascript
// In tryMaybeAutoSelfEvict()
if (typeof global.cardQueueWaitIdle === 'function') {
  await global.cardQueueWaitIdle();
}
```

## Visual Timeline (AFTER Fix)

```
┌─────────────────────────────────────────────────────────────┐
│ I've had it 😤                                              │  ✅ Clear title with emoji
│ Rae has decided to self-evict from the Big Brother house.  │
└─────────────────────────────────────────────────────────────┘
                    ↓
         [Avatar fades out and goes gray]                        ✅ Animation completes
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ Get Ready for Week 3!                                       │  ✅ Shows AFTER animation
│ The HOH competition is about to begin                       │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ HOH Competition                                             │  ✅ Clean start
└─────────────────────────────────────────────────────────────┘
```

## Files Modified

1. **js/self-eviction.js**
   - Updated card title from "Breaking News" to "I've had it 😤"
   - Made `endWeekAndProceed()` async

2. **js/twists.js**
   - Made `tryMaybeAutoSelfEvict()` async with await
   - Made `decideForWeek()` async with await
   - Added `cardQueueWaitIdle()` calls

3. **js/ui.hud-and-router.js**
   - Made `setPhase()` async
   - Updated call to `decideForWeek()` with await

4. **js/eviction.js**
   - Made `proceedNextWeek()` async with await
   - Made `postEvictionRouting()` async with await

5. **test_self_eviction_timing.html** (NEW)
   - Created test suite to validate timing fix

## Testing

### Automated Tests

Created `test_self_eviction_timing.html` with three test suites:

1. **Card Title Test**: Validates the title is "I've had it 😤"
2. **Async Flow Test**: Validates event order is correct
3. **Timing Test**: Validates no overlaps in the complete flow

### Expected Behavior

When a player self-evicts during intermission:

1. ✅ Card shows with title "I've had it 😤"
2. ✅ Avatar fade animation plays and completes
3. ✅ All card animations finish
4. ✅ Week intro modal appears ("Get Ready for Week X!")
5. ✅ HOH competition starts cleanly with no overlapping messages

### Manual Testing Steps

To manually test the fix:

1. Start a new game with at least 4 players
2. Enable self-eviction in settings (set `selfEvictChance` > 0)
3. Play through to intermission phase
4. Wait for AI self-eviction to trigger (or manually trigger)
5. Verify:
   - Card title shows "I've had it 😤"
   - Avatar animation completes before week modal
   - No redundant messages during HOH phase

## Impact Assessment

### Positive Changes

✅ **User Experience**: Clear, emoji-enhanced messaging for self-evictions  
✅ **Visual Flow**: No more overlapping animations  
✅ **Code Quality**: Proper async/await chain prevents race conditions  
✅ **Maintainability**: Easier to follow the flow of events  

### Backward Compatibility

✅ **Fully Compatible**: All changes are internal timing improvements  
✅ **No Breaking Changes**: Public API remains the same  
✅ **Game Save Compatible**: No changes to save data structure  

### Performance

✅ **Negligible Impact**: Only adds small async delays where needed  
✅ **Better UX**: Smoother transitions outweigh minimal delay  

## Edge Cases Handled

1. **Multiple Self-Evictions**: Guard flag prevents duplicate processing
2. **AI vs Manual**: Both origins properly await completion
3. **Phase Transitions**: Self-eviction blocks further phases until complete
4. **Card Queue**: Explicitly waits for all animations to finish

## Future Considerations

- Consider adding a configurable delay between self-eviction and week modal
- Add telemetry to track self-eviction timing in production
- Consider adding a "farewell" animation sequence for self-evicted players

## Verification Checklist

- [x] Card title changed to "I've had it 😤"
- [x] Async/await chain implemented correctly
- [x] All affected functions converted to async
- [x] Card queue wait added
- [x] Test suite created
- [x] Edge cases handled
- [x] Backward compatibility maintained
- [x] Documentation updated

## Related Issues

- Fixes: Self-eviction event overlaps with other events
- Related: Eviction visual enhancements (eviction-visuals.js)
- Related: Week intro modal system (ui.week-intro.js)

## Credits

Implemented by: GitHub Copilot  
Issue reported by: georgi-cole  
Review: Automated tests + manual verification needed
