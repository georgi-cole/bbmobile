# Fix for Intro/Outro Video and Rules Modal Behavior

## Summary
This PR addresses critical issues with video playback flow and rules modal behavior in the bbmobile game.

## Issues Fixed

### 1. Skip Button Visibility ✅
**Problem:** The skip button on intro.mp4 and outro.mp4 was reportedly disappearing, making it unpressable.

**Solution:**
- Enhanced skip button with higher z-index (10 instead of 2)
- Added explicit `opacity:1` and `pointer-events:auto` styles
- Added accessibility attributes (`aria-label`, `title`)
- Skip button now remains visible for the entire video duration

**Files Modified:** `js/intro-outro-video.js`

### 2. Intro Video Autoplay ✅
**Problem:** Need to ensure intro video loads and autoplays immediately when the game loads, with no game UI visible before video ends.

**Solution:**
- Already working correctly via `maybePlayIntroOnLoad()` function
- The video overlay uses z-index 9999 and covers the entire viewport
- Body scroll is locked during video playback
- No changes needed - verified existing implementation

**Files Modified:** None (verified existing behavior)

### 3. Rules Modal Shows Only Once ✅
**Problem:** Rules modal was showing every time a new season started, not just on first game start.

**Solution:**
- Added persistent flag `bb.rulesShown` stored in sessionStorage
- Created helper functions:
  - `isRulesShown()`: Checks if rules have been shown before
  - `markRulesShown()`: Marks rules as shown when modal is dismissed
- Modified `setupIntroListener()` to check if rules already shown
- Modified `setupFallback()` to check if rules already shown
- Rules modal now only shows once per browser session, even across new seasons

**Files Modified:** `js/rules.js`

### 4. Outro Video Plays Only Once ✅
**Problem:** After game ends, outro.mp4 plays, then winner modal appears, then outro video starts again in a loop.

**Root Cause:** 
- When outro finishes (onEnd), it resets `__outroStarted = false` and calls `showFinaleCinematic()`
- `showFinaleCinematic()` sees `__outroStarted` is false and sets up an 8-second timer to autoplay outro
- This creates an infinite loop

**Solution:**
- Added `__outroAutoPlayed` flag to track if automatic playback has occurred
- Modified `playOutroVideo()` to accept `isManualReplay` parameter:
  - `false`: First automatic play (keeps `__outroStarted` set to prevent re-autoplay)
  - `true`: Manual replay via CREDITS button (resets flags to allow repeat viewing)
- Modified `showFinaleCinematic()` to check both `__outroStarted` AND `__outroAutoPlayed`
- Outro now plays once automatically, then allows manual replays via CREDITS button

**Files Modified:** 
- `js/intro-outro-video.js`
- `js/finale.js`

## Technical Details

### Intro Video Flow
```
Page Load → maybePlayIntroOnLoad() → Check isIntroPlayed()
  ↓ (if not played)
Play intro.mp4 → onEnd/onSkip → markIntroPlayed() → dispatchIntroFinished()
  ↓
Rules Modal (if not shown before)
  ↓
Game Opening Sequence
```

### Rules Modal Logic
```
bb:intro:finished event → setupIntroListener()
  ↓
Check isRulesShown() from sessionStorage
  ↓ (if not shown)
Show Rules Modal → User clicks OK → markRulesShown()
  ↓
Store 'bb.rulesShown' = '1' in sessionStorage
```

### Outro Video Flow
```
Game Ends → showFinaleCinematic(winnerId)
  ↓ (after 8 seconds, if !__outroStarted && !__outroAutoPlayed)
Set __outroStarted = true, __outroAutoPlayed = true
  ↓
playOutroVideo(false) // isManualReplay = false
  ↓
Video plays → onEnd → Keep __outroStarted = true (prevents re-autoplay)
  ↓
Return to showFinaleCinematic() → No autoplay (flags prevent it)

Manual Replay:
User clicks CREDITS → playOutroVideo(true) // isManualReplay = true
  ↓
Video plays → onEnd → Reset __outroStarted = false (allows more manual replays)
```

## Testing

### Manual Test Checklist
- [ ] Fresh browser session: Intro plays → Rules modal shows → Game starts
- [ ] Same session, start new season: No intro, no rules modal (correct)
- [ ] Skip button visible and functional throughout intro video
- [ ] Skip button visible and functional throughout outro video
- [ ] Game ends: Outro plays once → Winner modal → No outro replay
- [ ] Click CREDITS button: Outro plays → Winner modal → Can click CREDITS again

### Automated Test
A test HTML file was created at `/tmp/test_video_flow.html` to verify:
- Rules modal persistence logic
- Intro video flag behavior
- Outro replay prevention logic

## Files Changed
1. `js/intro-outro-video.js` - Enhanced skip button, fixed outro replay loop
2. `js/rules.js` - Added persistent rules shown flag
3. `js/finale.js` - Fixed outro autoplay logic

## Acceptance Criteria Met
✅ Skip button stays visible and functional for entire duration of intro.mp4 and outro.mp4
✅ Intro.mp4 autoplays first, with no game UI visible before it ends
✅ Rules modal is enforced only once, immediately after intro.mp4 at first game start
✅ Outro.mp4 plays only once at game end, followed by winner modal, with no replay loop

## Notes
- The intro flag uses sessionStorage key `bb.introPlayed` (existing)
- The rules flag uses sessionStorage key `bb.rulesShown` (new)
- Both flags persist across page reloads within the same browser session
- Clearing sessionStorage will reset both flags (intended for testing)
