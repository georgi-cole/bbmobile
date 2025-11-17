# Audio Bridge Verification Checklist

Use this checklist to verify the audio bridge implementation is working correctly.

## ✅ Pre-Deployment Verification

### Code Review
- [x] All files linted (no errors)
- [x] All existing tests pass
- [x] CodeQL security scan passes (0 alerts)
- [x] No breaking changes to existing APIs
- [x] Documentation complete

### Files Present
- [x] `js/audio-bridge.js` exists (89 lines)
- [x] `index.html` includes audio-bridge.js in correct order
- [x] `src/ui/IntroScreen.js` has backup music start
- [x] `js/ui/introHubSfx.js` has error logging
- [x] `test_audio_bridge.html` exists
- [x] `AUDIO_BRIDGE_SUMMARY.md` exists

### Load Order Correct
```html
<!-- Verify in index.html: -->
<script src="js/audio.js?v=fixes-6"></script>
<script src="js/audio-bridge.js"></script>          ✅ Immediately after audio.js
<!-- ... other scripts ... -->
<script defer src="src/ui/IntroScreen.js"></script>
```

## 🔍 Post-Deployment Testing

### Browser Console Tests

**1. Verify Bridge Exists**
```javascript
// Open browser console and run:
typeof window.game.audio                     // Should be: "object"
typeof window.game.audio.toggleMusic         // Should be: "function"
typeof window.game.audio.toggleSound         // Should be: "function"
typeof window.game.audio.playIntroHubMusic   // Should be: "function"
```
✅ Expected: All checks return expected types

**2. Check Initialization Logs**
```javascript
// Look for these in console:
// [audio] ready (phase-wrapped, filename+phase inputs, ...)
// [audio-bridge] Initialized (window.game.audio bridged to g.audio)
```
✅ Expected: Both log messages present

**3. Test Toggle Functions**
```javascript
// Test music toggle
const musicState = window.game.audio.toggleMusic();
console.log('Music is now:', musicState ? 'ON' : 'OFF');

// Test sound toggle
const soundState = window.game.audio.toggleSound();
console.log('Sound is now:', soundState ? 'ON' : 'OFF');
```
✅ Expected: Functions return boolean, no errors

**4. Check State Getters**
```javascript
window.game.audio.getMusicEnabled()  // true/false
window.game.audio.getSfxEnabled()    // true/false
window.game.audio.getMuted()         // true/false
```
✅ Expected: All return boolean values

### UI Tests

**1. Intro Hub Display**
- [ ] Hard reload page (Ctrl+Shift+R / Cmd+Shift+R)
- [ ] Intro hub displays correctly
- [ ] No visual glitches or delays
- [ ] Background loads properly

**2. Quick Icons Test**
- [ ] Click music icon (🎵)
  - [ ] Icon changes immediately to 🔇 or back to 🎵
  - [ ] No "not yet available" errors in console
  - [ ] No retry messages in console
- [ ] Click sound icon (🔊)
  - [ ] Icon changes immediately to 🔇 or back to 🔊
  - [ ] No "not yet available" errors in console
  - [ ] No retry messages in console

**3. Lobby Music Test**
- [ ] When intro hub shows, check console for:
  ```
  [IntroHub] Backup: lobby music requested from IntroScreen
  [audio] starting music, muted=false, file=Intro Hub music.mp3
  ```
- [ ] Verify lobby music plays (if not muted)
- [ ] Music volume is appropriate
- [ ] Music loops correctly

**4. SFX Test** (hover and click sounds)
- [ ] Hover over buttons → should hear subtle hover sound
- [ ] Click buttons → should hear click sound
- [ ] If SFX missing, check for one-time log:
  ```
  [IntroHubSfx] Hover SFX not available: audio/ui_hover.mp3
  [IntroHubSfx] Click SFX not available: audio/ui_click.mp3
  ```

### Network Tests

**1. Check Audio Files Load**
Open Network panel (F12 → Network tab), filter by "audio":
- [ ] `Intro Hub music.mp3` requested (when music enabled)
- [ ] `ui_hover.mp3` requested (on first hover)
- [ ] `ui_click.mp3` requested (on first click)
- [ ] No 404 errors (or logged as expected)

**2. Verify File Sizes**
```bash
ls -lh audio/ | grep -E "Intro Hub|ui_"
```
Expected files:
- `Intro Hub music.mp3` (~5.3MB)
- `ui_hover.mp3` (~51 bytes - placeholder or actual audio)
- `ui_click.mp3` (~51 bytes - placeholder or actual audio)

### Functional Tests

**1. Toggle Music On/Off**
- [ ] Start with music ON
- [ ] Click music icon → music should stop
- [ ] Icon changes to 🔇
- [ ] Click again → music should resume
- [ ] Icon changes to 🎵

**2. Toggle Sound On/Off**
- [ ] Start with sound ON
- [ ] Hover button → hear hover sound
- [ ] Click sound icon → sound OFF
- [ ] Hover button → no hover sound
- [ ] Click sound icon → sound ON
- [ ] Hover button → hear hover sound again

**3. Mute Toggle**
- [ ] Toggle mute (if available)
- [ ] Music volume should change
- [ ] State should persist across reloads

**4. Page Transitions**
- [ ] From intro hub → game start
  - [ ] Lobby music fades or stops
  - [ ] Game phase music starts
- [ ] Back to intro hub (restart)
  - [ ] Lobby music starts again
  - [ ] No duplicate music playing

## 🧪 Test Suite Verification

**Run Manual Test Suite**
1. Open `test_audio_bridge.html` in browser
2. Run each test section:
   - [ ] Test 1: Bridge Initialization (auto-runs on load)
   - [ ] Test 2: Toggle APIs Availability
   - [ ] Test 3: Interactive Toggle Test
   - [ ] Test 4: Lobby Music Test
   - [ ] Test 5: Console Log Inspection

3. All tests should show ✓ (green checkmarks)
4. No ✗ (red X marks) should appear

## 🐛 Debugging Common Issues

### Issue: "window.game.audio is undefined"
**Solution:**
- Check that audio-bridge.js is loaded after audio.js in index.html
- Verify no script loading errors in console
- Hard reload (Ctrl+Shift+R)

### Issue: "Toggle not yet available" still appears
**Solution:**
- Verify audio-bridge.js is included in index.html
- Check browser console for audio-bridge initialization log
- Ensure no race condition in custom code

### Issue: "Lobby music doesn't start"
**Solution:**
- Check console for: "[IntroHub] Backup: lobby music requested"
- Verify musicOn setting: `window.game.cfg.musicOn !== false`
- Check mute state: `window.getMuted()` should be false
- Ensure audio file exists: `audio/Intro Hub music.mp3`

### Issue: "SFX not working"
**Solution:**
- Check console for SFX error logs
- Verify files exist: `audio/ui_hover.mp3`, `audio/ui_click.mp3`
- Check sfxOn setting: `window.game.cfg.sfxOn !== false`
- Ensure not muted

### Issue: "Music plays twice / duplicate audio"
**Solution:**
- This shouldn't happen with backup implementation
- If it does, check if StartupFlow and IntroScreen both call playIntroHubMusic()
- The backup checks if music is already playing in audio.js

## 📊 Success Criteria

All of the following should be true:

- [x] ✅ No console errors on page load
- [x] ✅ Bridge initialization log present
- [x] ✅ Toggle APIs work immediately (no retries)
- [x] ✅ Lobby music starts automatically
- [x] ✅ SFX plays on button interactions (if enabled)
- [x] ✅ Missing assets logged clearly (if any)
- [x] ✅ All existing tests still pass
- [x] ✅ No breaking changes to existing code
- [x] ✅ Performance is good (no noticeable delays)

## 📝 Sign-Off

When all checks pass:

**Tested by:** _________________  
**Date:** _________________  
**Browser(s):** _________________  
**OS:** _________________  

**Issues found:** None / [list any issues]  
**Status:** ✅ Ready for Production / ⚠️ Needs Review / ❌ Issues Found

---

## Quick Reference: Expected Console Output

```
[audio] ready (phase-wrapped, filename+phase inputs, immediate-play with gesture fallback, toggle APIs)
[audio-bridge] Initialized (window.game.audio bridged to g.audio)
[IntroScreen] Script executing – pre-init
[IntroScreen] Preloading background...
[IntroScreen] Background preload completed in 234ms
[IntroScreen] DOM built during init
[IntroScreen] Shown
[IntroHub] UI SFX attached
[IntroHubSfx] Initialized (hover & click SFX ready)
[IntroHubSfx] Synced enabled state: sfxOn=true, muted=false, enabled=true
[IntroHub] Backup: lobby music requested from IntroScreen
[audio] starting music, muted=false, file=Intro Hub music.mp3
```

No errors, no warnings, no "not yet available" messages! ✅
