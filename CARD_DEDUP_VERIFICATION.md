# Card Deduplication Implementation - Manual Verification Guide

## Overview
This document provides steps to manually verify that the duplicate "Challenge completed" popup fix is working correctly.

## Implementation Summary

### Changes Made

1. **js/state.js** - `safeShowCard` deduplication (already implemented):
   - Signature format: `${title}\u0000${lines.join('|')}\u0000${tone}`
   - Uses `global.__cardPendingMap` object to track pending signatures
   - Returns existing timeout ID if duplicate detected
   - Clears signature from map when timeout fires

2. **js/state.js** - `flushAllCards` cleanup:
   - Added clearing of `global.__cardPendingMap` to avoid stuck dedupe state

3. **js/ui.overlay-and-logs.js** - `CardQueue.push` deduplication:
   - Added `pendingSigs` Set to track queued card signatures
   - Signature format matches `safeShowCard` for consistency
   - Skips enqueue if signature already in Set
   - Attaches signature to job as `job.__sig` for cleanup
   - Deletes signature from Set after card is removed (in `next()` function)
   - Also releases signature on error paths

## Manual Verification Steps

### Test 1: HOH Competition - No Duplicate Card
**Goal**: Verify that completing an HOH competition shows "Challenge completed" exactly once.

1. Open `index.html` in a browser
2. Start a new game with default settings
3. Begin Week 1 HOH competition
4. Complete the minigame challenge
5. **VERIFY**: Green "Challenge Complete!" card appears once
6. **VERIFY**: Card does NOT reappear after disappearing
7. **VERIFY**: No console errors related to cards

**Expected Result**: Single "Challenge Complete!" animation, no duplicate.

### Test 2: Veto Competition - No Duplicate Card
**Goal**: Verify that completing a Veto competition shows "Challenge completed" exactly once.

1. Continue from Test 1 or start fresh game
2. Complete HOH and nominations phases
3. Begin Veto competition
4. Complete the minigame challenge
5. **VERIFY**: "Challenge Complete!" appears exactly once
6. **VERIFY**: No duplicate appearance
7. **VERIFY**: No console errors

**Expected Result**: Single completion card, clean animation.

### Test 3: Multiple Different Cards - All Display
**Goal**: Verify that different cards are NOT blocked by deduplication.

1. Open browser console (F12)
2. Run the following commands in console:
```javascript
window.showCard('Card 1', ['First card'], 'neutral', 2000);
window.showCard('Card 2', ['Second card'], 'neutral', 2000);
window.showCard('Card 3', ['Third card'], 'neutral', 2000);
```
3. **VERIFY**: All three cards display in sequence
4. **VERIFY**: No cards are skipped

**Expected Result**: All different cards display normally.

### Test 4: Duplicate Cards - Properly Blocked
**Goal**: Verify that true duplicate cards are blocked.

1. Open browser console (F12)
2. Run the following commands rapidly:
```javascript
window.showCard('Test Duplicate', ['Same content'], 'neutral', 3000);
window.showCard('Test Duplicate', ['Same content'], 'neutral', 3000);
```
3. **VERIFY**: Only one card appears
4. **VERIFY**: Console shows: `[CardQueue] Skipping duplicate card: Test Duplicate`

**Expected Result**: Second identical card is skipped with console log.

### Test 5: Mixed Path Deduplication
**Goal**: Verify deduplication works across both `safeShowCard` and `showCard` paths.

1. Open browser console (F12)
2. Run:
```javascript
window.safeShowCard('Mixed Test', ['Via safeShowCard'], 'neutral', 3000);
setTimeout(() => {
  window.showCard('Mixed Test', ['Via safeShowCard'], 'neutral', 3000);
}, 50);
```
3. **VERIFY**: Only one card appears
4. **VERIFY**: One of the paths detects and skips the duplicate

**Expected Result**: Deduplication works across both code paths.

### Test 6: Flush Clears Pending State
**Goal**: Verify that `flushAllCards` properly clears dedupe state.

1. Open browser console (F12)
2. Run:
```javascript
// Schedule a card
window.safeShowCard('Flush Test', ['Before flush'], 'neutral', 3000);
// Immediately flush
window.flushAllCards('test');
// Try same card again - should NOT be blocked
window.safeShowCard('Flush Test', ['Before flush'], 'neutral', 3000);
```
3. **VERIFY**: Card appears after flush (not blocked as duplicate)
4. **VERIFY**: Console shows flush occurred

**Expected Result**: Same card can be shown after flush.

### Test 7: Other Game Cards - Still Work
**Goal**: Ensure deduplication doesn't break other cards.

1. Play through a full game cycle
2. **VERIFY** the following cards display correctly:
   - Nomination announcements
   - Diary room votes
   - Eviction results
   - Jury votes
   - Twist announcements
   - Social maneuver cards

**Expected Result**: All game cards work normally.

## Console Monitoring

### Expected Console Messages (Good)
- `[CardQueue] Skipping duplicate card: <title>` - When duplicate detected
- `[cards] flushed (reason=...)` - When flush occurs
- `[card] build type=...` - When cards are built

### Unexpected Console Messages (Bad)
- Multiple identical card builds in rapid succession
- Card-related errors
- Undefined signature warnings

## Automated Test

Run the unit test to verify logic:
```bash
node test_card_dedup_logic.mjs
```

All tests should show `✓ PASS`.

## Browser Test Page

Open `test_card_deduplication.html` in browser for interactive testing:
1. Test single cards
2. Test duplicate prevention via `showCard`
3. Test duplicate prevention via `safeShowCard`
4. Test mixed path deduplication
5. Test different cards (all display)
6. Test flush clears state

## Known Edge Cases

1. **Different durations but same content**: Currently treated as duplicates (by design)
2. **Rapid succession different cards**: Should all display
3. **Card with empty/null title**: Signature handles gracefully with empty string
4. **Array vs string lines parameter**: Both normalized to array in signature

## Success Criteria

✅ HOH/Veto completion shows "Challenge completed" exactly once
✅ No duplicate reappearance of the green completion card
✅ Other game cards (nominations, evictions, etc.) display correctly
✅ Console shows deduplication messages when appropriate
✅ No card-related errors in console
✅ Flush properly clears pending dedupe state
✅ All automated tests pass

## Troubleshooting

**If duplicates still appear:**
1. Check console for errors
2. Verify both files (state.js and ui.overlay-and-logs.js) have changes
3. Hard refresh browser (Ctrl+F5) to clear cache
4. Check if duplicate is from different code path (e.g., in-overlay animation vs TV card)

**If legitimate cards are blocked:**
1. Check signature generation - ensure different cards have different signatures
2. Verify cleanup is happening (signatures released after card completes)
3. Check if `flushAllCards` was called unexpectedly

## Files Modified
- `js/state.js` - Added `__cardPendingMap` cleanup in `flushAllCards`
- `js/ui.overlay-and-logs.js` - Added `pendingSigs` Set and deduplication logic in `CardQueue.push` and `next`

## Related Test Files
- `test_card_deduplication.html` - Interactive browser test
- `test_card_dedup_logic.mjs` - Unit tests for deduplication logic
