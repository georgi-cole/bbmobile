# Timer Hierarchy Fix - Quick Reference

## What Was Fixed

### Issue 1: Info Buttons ℹ️
**Before:** Timer kept running while viewing player profiles  
**After:** Timer pauses automatically when info modal opens

### Issue 2: Vote Timer Conflict ⏳
**Before:** Two timers ran simultaneously (30s main, 90s vote), causing early auto-vote  
**After:** Main timer pauses during voting, vote timer is authoritative

## How It Works

### Simple Timer Hierarchy Rules

1. **Foreground = Active** 
   - The timer you see is the one that matters
   
2. **Background = Paused**
   - All other timers pause automatically
   
3. **Automatic Resume**
   - Timers resume when you close overlays

### Examples

**Opening Info Button:**
```
Main Timer: Running (25s remaining)
  ↓ User presses ℹ️ button
Main Timer: PAUSED (25s stored)
  ↓ User closes info modal
Main Timer: Running (25s remaining)
```

**Live Vote Overlay:**
```
Main Timer: Running (30s remaining)
  ↓ Vote overlay opens
Main Timer: PAUSED (30s stored)
Vote Timer: RUNNING (90s)
  ↓ User casts vote
Main Timer: RESUMED (30s remaining)
Vote Timer: STOPPED
```

**Nested (Info During Vote):**
```
Main Timer: PAUSED
Vote Timer: Running
  ↓ User presses ℹ️ button
Main Timer: PAUSED
Vote Timer: PAUSED
  ↓ User closes info modal
Main Timer: PAUSED (still paused)
Vote Timer: RESUMED
  ↓ User casts vote
Main Timer: RESUMED
```

## For Users

### What You'll Notice

✅ **No more surprise timeouts** - Timer pauses when you're reading info  
✅ **Consistent voting time** - You get the full 90 seconds shown in UI  
✅ **Predictable behavior** - Timers work as you expect

### Where It Works

- ℹ️ Info buttons in live vote screen
- ℹ️ Info buttons in veto ceremony
- ℹ️ Info buttons in nomination ceremony
- ℹ️ Info buttons in TV panels
- ⏳ Live vote eviction overlay

## For Developers

### Testing

**Quick Test:**
1. Open `test_timer_hierarchy.html`
2. Click "Start Main Timer (30s)"
3. Click "Open Info Modal"
4. Verify timer pauses (turns red)
5. Close modal
6. Verify timer resumes

**Full Test:**
See TIMER_HIERARCHY_FIX_SUMMARY.md for complete test scenarios

### Key Files

- `js/houseguest-profile.js` - Info modal integration
- `js/livevote-fullscreen.js` - Vote overlay integration  
- `js/flow/PauseController.js` - Timer pause system (existing)

### Integration Points

```javascript
// Pause main timer
if (PauseController?.pause) {
  PauseController.pause('your-reason');
}

// Resume main timer
if (PauseController?.resume) {
  PauseController.resume();
}

// Check pause state
if (PauseController?.isPaused()) {
  // Timer is paused
}
```

### Console Logging

Look for these messages:
- `[houseguest-profile] Paused main game timer via PauseController`
- `[livevote-fs] Paused main game phase timer during voting`
- `[PauseController] ⏸ Pausing game (reason: ...)`
- `[PauseController] ▶ Resuming game`

## Technical Details

### Architecture

```
PauseController (existing)
    ↓ integrates with
houseguest-profile.js (info modal)
livevote-fullscreen.js (vote overlay)
```

### State Management

**Main Timer:**
- `game.timerPaused` - Boolean pause flag
- `game.pausedTimeRemaining` - Stored time when paused
- `game.endAt` / `game.phaseEndsAt` - Timer end timestamps

**PauseController:**
- `isPaused()` - Check pause state
- `getState()` - Get details (reason, refCount)
- Ref counting for nested pauses

### Backward Compatibility

✅ Checks for `PauseController` availability  
✅ Gracefully degrades if not present  
✅ No breaking changes to existing code  
✅ Existing callback pattern preserved

## Security

✅ **CodeQL scan passed** - 0 security alerts  
✅ No user input handling  
✅ No external API calls  
✅ Simple flag-based logic

## Performance

- **Impact:** Negligible
- **Memory:** +1 helper function, no new global state
- **CPU:** User-triggered only, no tight loops
- **DOM:** No additional manipulation overhead

## Support

**Issues?** Check console logs for pause/resume messages

**Questions?** See full documentation in:
- `TIMER_HIERARCHY_FIX_SUMMARY.md` - Complete technical details
- `test_timer_hierarchy.html` - Interactive test suite

---

**Status:** ✅ Complete - Ready for Production  
**Version:** 1.0  
**Date:** 2026-02-01
