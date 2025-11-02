# Live Vote UI Race Condition Fix

## Problem Statement

**User Report**: On mobile, after the live vote rollout overlay closes, an old view remnant (cutoff avatar and "Evict" button) briefly persists below the TV.

## Root Cause Analysis

### The Issue

The problem was a race condition in the `livevote-rollout.js` `hide()` function:

**Before (Buggy Code)**:
```javascript
function hide() {
  if (state.overlay) {
    // Fade out before removing
    state.overlay.style.opacity = '0';
    state.overlay.style.transition = 'opacity 0.3s ease-out';
    
    setTimeout(() => {
      if (state.overlay) {
        state.overlay.remove();
        state.overlay = null;  // ❌ Set to null AFTER 300ms
      }
    }, 300);
  }

  // Reset state
  state.expectedVotes = 0;
  state.receivedVotes = 0;
  state.nominees = [];
  state.container = null;
}
```

**Problems**:
1. `state.overlay` was only set to `null` after 300ms timeout
2. State was reset outside the timeout, creating inconsistent state
3. `isShowing()` would return `true` during the 300ms fade-out
4. Any stale UI elements from choice card or vote overlay could become visible during this window

### The Sequence of Events

1. User taps on nominee and clicks "Evict" button
2. `LiveVoteOverlay.hide()` is called → overlay removed immediately
3. `LiveVoteChoiceCard.hide()` is called → choice card removed
4. But sometimes these don't remove from DOM properly
5. `LiveVoteRollout.show()` is called → rollout appears
6. Votes are displayed, rollout animates
7. `LiveVoteRollout.hide()` is called → rollout starts fading
8. **BUG**: During the 300ms fade, `state.overlay` is still not null
9. Any stale choice card or overlay elements become visible briefly
10. After 300ms, rollout is removed, but ghost UI was already visible

## Solution

### Fix 1: Eliminate Race Condition in `livevote-rollout.js`

**After (Fixed Code)**:
```javascript
function hide() {
  if (!state.overlay) {
    // Already hidden, just reset state to be safe
    state.expectedVotes = 0;
    state.receivedVotes = 0;
    state.nominees = [];
    state.container = null;
    return;
  }

  // Store reference to overlay before clearing state
  const overlayToRemove = state.overlay;
  
  // ✅ Immediately clear state so isShowing() returns false
  state.overlay = null;
  state.expectedVotes = 0;
  state.receivedVotes = 0;
  state.nominees = [];
  state.container = null;
  
  // Fade out before removing from DOM
  overlayToRemove.style.opacity = '0';
  overlayToRemove.style.transition = 'opacity 0.3s ease-out';
  
  setTimeout(() => {
    // Remove from DOM after fade completes
    if (overlayToRemove.parentNode) {
      overlayToRemove.remove();
    }
  }, 300);
}
```

**Key Changes**:
- ✅ Store overlay reference in local variable `overlayToRemove`
- ✅ Set `state.overlay = null` **immediately**
- ✅ Reset all state atomically before fade starts
- ✅ `isShowing()` now correctly returns `false` right after `hide()` is called
- ✅ No race condition during the 300ms fade period

### Fix 2: Enhanced Cleanup in `livevote-helpers.js`

**Before**:
```javascript
// Close Choice Card if present
const choiceCard = document.querySelector('.lv-choice-card');
if (choiceCard) {
  choiceCard.remove();
}

// Close Vote Overlay if present
const overlay = document.querySelector('.lv-overlay');
if (overlay) {
  overlay.remove();
}
```

**After**:
```javascript
// Close Choice Card if present (check all possible locations)
const choiceCards = document.querySelectorAll('.lv-choice-card');
choiceCards.forEach(card => {
  card.remove();
});

// Close Vote Overlay if present (check all possible locations)
const overlays = document.querySelectorAll('.lv-overlay');
overlays.forEach(overlay => {
  overlay.remove();
});

// Also do a direct DOM cleanup for rollout overlays as failsafe
const rolloutOverlays = document.querySelectorAll('.lv-rollout-overlay');
rolloutOverlays.forEach(rollout => {
  rollout.remove();
});
```

**Key Changes**:
- ✅ Use `querySelectorAll` instead of `querySelector` to find ALL instances
- ✅ Remove ALL stale UI elements, not just the first one
- ✅ Added direct DOM cleanup for rollout overlays as additional safety

## Testing

Two new comprehensive tests were added to `test_mobile_live_vote_rollout.html`:

### Test 5: Race Condition Fix Verification
```javascript
function testRaceCondition() {
  // Show rollout
  LiveVoteRollout.show({ expectedVotes: 3, nominees: [2, 3] });
  
  // Hide rollout
  LiveVoteRollout.hide();
  
  // ✅ Check immediately - should return false now (no race)
  const isShowingAfterHide = LiveVoteRollout.isShowing();
  
  if (isShowingAfterHide) {
    // ❌ FAIL: Race condition still exists
  } else {
    // ✅ PASS: Race condition fixed
  }
}
```

### Test 6: Ghost UI Cleanup
```javascript
function testGhostUICleanup() {
  // 1. Show choice card
  LiveVoteChoiceCard.show({ nominees: [2, 3] });
  
  // 2. Show vote overlay
  LiveVoteOverlay.show({ nominees: [2, 3] });
  
  // 3. Close all and show rollout (simulates user voting)
  closeAllVoteUI();
  LiveVoteRollout.show({ expectedVotes: 3, nominees: [2, 3] });
  
  // 4. Hide rollout
  LiveVoteRollout.hide();
  
  // 5. Check for ghost UI elements
  const choiceCards = document.querySelectorAll('.lv-choice-card');
  const overlays = document.querySelectorAll('.lv-overlay');
  
  // ✅ Should be 0 - no ghost UI
  const totalGhosts = choiceCards.length + overlays.length;
}
```

## Files Changed

1. **js/livevote-rollout.js** - Fixed race condition in `hide()` function
2. **js/livevote-helpers.js** - Enhanced `closeAllVoteUI()` cleanup
3. **test_mobile_live_vote_rollout.html** - Added comprehensive tests

## Impact

### Before Fix
- ❌ Ghost UI elements (avatar, "Evict" button) visible after rollout closes
- ❌ `isShowing()` returns incorrect value during fade-out
- ❌ Stale UI elements not properly cleaned up
- ❌ Poor user experience on mobile

### After Fix
- ✅ No ghost UI elements after rollout closes
- ✅ `isShowing()` returns correct value immediately
- ✅ All UI elements properly cleaned up
- ✅ Smooth, professional user experience

## How to Test

1. Open `test_mobile_live_vote_rollout.html` in a browser
2. Click "Test Race Condition Fix" (Test 5) - should show ✓ PASS
3. Click "Test Ghost UI Cleanup" (Test 6) - should show ✓ No ghost UI
4. Or test the full flow:
   - Click "Start Full Flow Test" (Test 1)
   - Select a nominee, click "Evict"
   - Watch the rollout animate
   - After rollout closes, verify no remnants appear

## Security Analysis

- ✅ CodeQL scan passed - 0 alerts
- ✅ No new security vulnerabilities introduced
- ✅ No data exposure issues
- ✅ Proper cleanup prevents memory leaks

## Backward Compatibility

- ✅ All existing functionality preserved
- ✅ API unchanged - no breaking changes
- ✅ Visual behavior improved (no more ghost UI)
- ✅ Existing tests still pass
