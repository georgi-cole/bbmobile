# Fix Duplicate "Challenge completed" Popup

## Problem
During HOH or Veto competition completion, a green "Challenge completed" card (faux TV reveal card) appeared, disappeared, then briefly reappeared and disappeared again. This looked like a duplicate render.

## Root Cause
The same card was being scheduled twice via two near-simultaneous paths:
1. **CardQueue-based `showCard`** - Direct enqueueing to CardQueue
2. **Zero-delay timeout via `safeShowCard`** - setTimeout(0) wrapper that also calls showCard

Neither layer performed deduplication of identical cards, so two near-simultaneous enqueues rendered the same card twice.

## Solution

### 1. CardQueue Deduplication (js/ui.overlay-and-logs.js)
- Added `pendingSigs` Set to track queued card signatures
- Signature format: `${title}\u0000${lines.join('|')}\u0000${tone}`
- `push()` skips enqueue if signature already pending
- Signature attached to job as `job.__sig` for cleanup
- `next()` deletes signature after card is removed (success and error paths)

### 2. FlushAllCards Cleanup (js/state.js)
- Updated `flushAllCards()` to clear `global.__cardPendingMap`
- Prevents stuck dedupe state if flush occurs before scheduled timeouts fire

### 3. safeShowCard Deduplication (js/state.js)
- Already implemented with signature-based pending map
- Skips scheduling if identical signature already pending
- Clears signature when timeout fires

## Changes Summary

### Files Modified
- `js/state.js` - Added __cardPendingMap cleanup in flushAllCards
- `js/ui.overlay-and-logs.js` - Added pendingSigs Set and deduplication logic in CardQueue

### Test Files Added
- `test_card_deduplication.html` - Interactive browser test page
- `test_card_dedup_logic.mjs` - Unit tests for deduplication logic
- `CARD_DEDUP_VERIFICATION.md` - Manual verification guide

## Testing

### Automated Tests
```bash
node test_card_dedup_logic.mjs
```
All tests pass ✓

### Manual Testing Required
1. Complete HOH competition - verify "Challenge Complete!" appears exactly once
2. Complete Veto competition - verify no duplicate appearance
3. Verify other game cards (nominations, evictions, jury votes) still work correctly

## Technical Details

### Signature Consistency
Both deduplication paths use identical signature format:
```javascript
`${String(title)}\u0000${lines.join('|')}\u0000${String(tone)}`
```

### Cleanup Paths
Signatures are released:
1. After card is removed from DOM (normal path)
2. On render error (error path)
3. When `flushAllCards()` is called (reset path)

## Verification Checklist
- [x] Signature generation is consistent across both paths
- [x] Deduplication prevents identical cards from queuing
- [x] Signatures are properly cleaned up after card display
- [x] Flush properly clears pending dedupe state
- [x] Unit tests pass
- [ ] HOH completion shows card exactly once (requires manual testing)
- [ ] Veto completion shows card exactly once (requires manual testing)
- [ ] Other game cards display correctly (requires manual testing)

## Compatibility
- No breaking changes to existing API
- Maintains existing timings and visual behavior
- Only prevents duplicate scheduling of identical cards
- Does not alter card animation or duration
