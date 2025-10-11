# Quick Reference: Video Flow & Rules Modal Fixes

## TL;DR
Fixed 4 critical issues:
1. ✅ Skip button now visible for entire video duration
2. ✅ Intro autoplays with no UI visible (already working)
3. ✅ Rules modal shows only once, not on every new season
4. ✅ Outro plays once, no infinite loop

## Key Changes

### sessionStorage Flags
```javascript
'bb.introPlayed'  // Existing - marks intro as played
'bb.rulesShown'   // New - marks rules as shown
```

### Runtime Flags
```javascript
window.__outroStarted     // Prevents concurrent outro plays
window.__outroAutoPlayed  // Prevents outro autoplay loop
```

## API Changes

### playOutroVideo(isManualReplay)
```javascript
// New signature - now accepts boolean parameter
playOutroVideo(false)  // Automatic first play - keeps flags set
playOutroVideo(true)   // Manual replay - resets flags
```

**Breaking?** No - parameter is optional, defaults to undefined (treated as falsy)

## Testing Quick Commands

### Reset Everything
```javascript
sessionStorage.clear();
window.__outroStarted = false;
window.__outroAutoPlayed = false;
location.reload();
```

### Check Current State
```javascript
console.table({
  'Intro Played': sessionStorage.getItem('bb.introPlayed'),
  'Rules Shown': sessionStorage.getItem('bb.rulesShown'),
  'Outro Started': window.__outroStarted,
  'Outro AutoPlayed': window.__outroAutoPlayed
});
```

### Manual Triggers
```javascript
showRulesModal();              // Show rules manually
playOutroVideo(true);          // Play outro manually
showFinaleCinematic(0);        // Show winner modal
```

## Expected Flows

### First Time User
```
Page Load → Intro Video → Rules Modal → Game Opening → ... → Game End
→ Winner Modal → [8s] → Outro Video → Winner Modal (stays)
```

### Subsequent Sessions (Same Browser)
```
Page Load → Game Opening → ... → Game End → Winner Modal (no outro autoplay)
```

### CREDITS Button
```
Winner Modal → Click CREDITS → Outro Video → Winner Modal (repeatable)
```

## Console Log Patterns

### Successful First Play
```
[intro-outro] playVideo: assets/videos/intro.mp4
[intro-outro] finished: end
[intro-outro] dispatched bb:intro:finished
[rules] bb:intro:finished received
[rules] dispatched bb:rules:acknowledged
```

### New Season (Rules Skipped)
```
[rules] rules already shown previously — skipping
```

### Outro First Play
```
[finale] autoplaying outro video (first time only)
[intro-outro] playVideo: assets/videos/outro.mp4
[intro-outro] finished: end
```

### Manual Replay
```
[finale] credits button clicked, playing outro
[intro-outro] playVideo: assets/videos/outro.mp4
```

## Troubleshooting

### Rules Keep Showing
**Cause:** sessionStorage flag not persisting  
**Fix:** Check browser privacy settings, ensure sessionStorage is enabled

### Outro Loops
**Cause:** Flags not being set correctly  
**Fix:** Check console for `__outroAutoPlayed` being set to `true`

### Skip Button Invisible
**Cause:** CSS override or z-index conflict  
**Fix:** Check element has `z-index: 10`, `opacity: 1`, `pointer-events: auto`

## Files Modified

```
js/intro-outro-video.js  ← Skip button, outro replay logic
js/rules.js              ← Persistent rules flag
js/finale.js             ← Outro autoplay once logic
```

## Rollback

```bash
git revert HEAD~6..HEAD  # Revert all 6 commits in this PR
sessionStorage.clear()    # Clear flags in browser
```

## Documentation

- **VIDEO_FLOW_FIX_SUMMARY.md** - Technical details
- **TESTING_GUIDE_VIDEO_FLOW.md** - Manual test scenarios  
- **VIDEO_FLOW_DIAGRAMS.md** - Visual flow diagrams
- **PR_SUMMARY_VIDEO_FIXES.md** - Complete PR overview

## Questions?

Check the full documentation files or contact the PR author.

---

**Last Updated:** 2025-10-11  
**PR Branch:** copilot/fix-intro-outro-modal-behavior  
**Status:** ✅ Ready for Review
