# Finale Outro Flow Fix Summary

## Overview
Fixed the finale outro flow to improve user experience by reducing the autoplay delay and providing clearer feedback when browser blocks autoplay with sound.

## Changes Made

### 1. js/finale.js (Line 160)
**Changed:** Reduced outro autoplay delay from 8 seconds to 5 seconds

```javascript
// BEFORE:
}, 8000);

// AFTER:
}, 5000);
```

**Impact:** 
- Winner modal now triggers outro video 3 seconds earlier (5s instead of 8s)
- Provides a more immediate transition to credits
- Comment updated to reflect "after 5 seconds"

### 2. js/intro-outro-video.js (Lines 110-114)
**Added:** Context-aware tap button text for outro videos

```javascript
// ADDED:
// Customize tap button text based on video type
const isOutro = url.includes('outro');
if (isOutro) {
  tap.textContent = 'Tap to play credits with sound';
}
```

**Impact:**
- When browser blocks autoplay-with-sound, users see "Tap to play credits with sound" instead of generic "Tap to Play"
- Clearer user guidance specific to the finale credits context
- Only affects outro videos; intro videos retain original "Tap to Play" text

## Behavior Preserved

### ✓ Unmuted First Play
- First autoplay attempt remains unmuted (`vid.muted = false` at line 77)
- Maintains prior behavior of attempting autoplay with sound

### ✓ Guard Logic Intact
- `__outroStarted` flag prevents duplicate outro triggers
- `__outroAutoPlayed` flag ensures autoplay only happens once
- Prevents re-autoplay when returning to winner modal

### ✓ CREDITS Button Behavior
- Clicking CREDITS replays outro unmuted every time
- Passes `true` to `playOutroVideo(isManualReplay)` to indicate manual replay
- Resets `__outroStarted` flag before playing to allow replay

### ✓ Return to Winner Modal
- After outro ends or is skipped, returns to winner modal
- Uses `g.__lastWinnerId` to restore the correct winner display
- 100ms delay ensures smooth transition

## User Flow

### Scenario 1: Autoplay Succeeds
1. Winner modal appears
2. After **5 seconds** (previously 8s), outro video plays unmuted automatically
3. User can skip or watch to completion
4. Returns to winner modal

### Scenario 2: Autoplay Blocked by Browser
1. Winner modal appears
2. After **5 seconds** (previously 8s), browser blocks unmuted autoplay
3. User sees full-screen prompt: **"Tap to play credits with sound"**
4. User taps button → outro plays unmuted
5. User can skip or watch to completion
6. Returns to winner modal

### Scenario 3: Manual Credits Replay
1. From winner modal, user clicks **CREDITS** button
2. Outro video plays unmuted immediately (no 5s delay)
3. User can skip or watch to completion
4. Returns to winner modal

## Testing

Created `test_finale_outro_flow.html` to validate:
- ✓ 5000ms delay present in finale.js
- ✓ 8000ms delay removed from finale.js
- ✓ "Tap to play credits with sound" text present
- ✓ Outro detection logic (`url.includes('outro')`)
- ✓ Video unmuted by default (`vid.muted = false`)
- ✓ Autoplay enabled (`vid.autoplay = true`)

## Technical Details

### Files Modified
1. `js/finale.js` - 1 line changed (delay value)
2. `js/intro-outro-video.js` - 5 lines added (tap button customization)

### Files Added
1. `test_finale_outro_flow.html` - Test validation suite

### Minimal Changes
- Only changed what was necessary per requirements
- Preserved all existing guard logic and flags
- No breaking changes to API or behavior
- Backward compatible with existing code

## Verification Checklist
- [x] Syntax validated with Node.js
- [x] Git diff reviewed for minimal changes
- [x] Comments updated to reflect new timing
- [x] Test file created and structured
- [x] All guard flags preserved
- [x] Return-to-modal logic intact
- [x] CREDITS button replay unchanged
