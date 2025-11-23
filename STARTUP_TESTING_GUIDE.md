# Startup Sequence Testing Guide

This guide helps verify the new startup sequence implementation.

## Prerequisites

- Open `index.html` in a modern browser
- Open browser DevTools console to see log messages
- Clear localStorage/sessionStorage before each test for clean state

## Test Scenarios

### Test 1: Normal Startup (skipIntros=false, First Time)

**Setup:**
1. Clear browser storage (DevTools → Application → Clear storage)
2. Ensure `skipIntros` is false in Settings

**Expected Flow:**
1. ✅ Page loads - NO main game elements visible (no topbar, no .wrap)
2. ✅ Kolequant intro video plays in fullscreen **automatically (muted, no user tap required)**
3. ✅ Console shows: `[intro-outro] Intro video configured for muted autoplay`
4. ✅ Console shows: `[intro-outro] Autoplay started successfully` (or blocked warning with fallback)
5. ✅ Console shows: `[StartupFlow] Preloading intro hub background...`
6. ✅ Video ends - intro hub appears with background already loaded
7. ✅ Buttons and background appear simultaneously (no delayed fade)
8. ✅ Click Play - Rules modal opens (first time users)
9. ✅ Accept rules - Profile modal opens (if needed)
10. ✅ Complete profile - main screen builds
11. ✅ Console shows: `[StartupFlow] Main screen built`
12. ✅ Main game elements appear (.wrap, topbar)
13. ✅ Opening sequence plays (cast animation)

**Console Checks:**
- `[intro-outro] playVideo: assets/videos/intro.mp4` (or intro-mobile.mp4)
- `[intro-outro] Intro video configured for muted autoplay`
- `[intro-outro] Autoplay started successfully` (success case)
- OR `[intro-outro] Autoplay blocked: ...` (blocked case - fallback "Tap to Play" button appears)
- `[StartupFlow] Initializing...`
- `[StartupFlow] Starting startup sequence...`
- `[StartupFlow] Preloading intro hub background...`
- `[StartupFlow] Background preloaded: assets/skins/...`
- `[StartupFlow] Showing intro hub...`
- `[StartupFlow] Play button clicked`
- `[StartupFlow] Gating checks passed, building main screen`
- `[StartupFlow] Building main game screen...`
- `[StartupFlow] Main screen built`

### Test 2: Normal Startup (skipIntros=false, Returning User)

**Setup:**
1. Keep existing storage (rules accepted, profile complete)
2. Reload page

**Expected Flow:**
1. ✅ Video plays
2. ✅ Intro hub appears after video
3. ✅ Click Play - NO modals (gating already satisfied)
4. ✅ Main screen builds immediately
5. ✅ Game starts

### Test 3: Skip Intros (skipIntros=true)

**Setup:**
1. Go to Settings → Visual → Check "Skip Intros"
2. Reload page

**Expected Flow:**
1. ✅ Page loads - NO video plays
2. ✅ Console shows: `[intro-outro] skipIntros enabled`
3. ✅ Intro hub appears immediately with background preloaded
4. ✅ Click Play - follows normal gating
5. ✅ Main screen builds
6. ✅ Game starts

**Console Checks:**
- `[intro-outro] skipIntros enabled, skipping intro video`
- `[StartupFlow] skipIntros enabled, showing intro hub directly`

### Test 4: All Intro Hub Buttons

**For each button, verify it opens the correct modal/screen:**

1. ✅ **Play**: Triggers gating, builds main screen
2. ✅ **Rules**: Opens Rules modal
3. ✅ **Profile**: Opens Profile modal
4. ✅ **Leaderboard**: Opens XP/Leaderboard panel (if implemented)
5. ✅ **Credits**: Opens Credits modal
6. ✅ **Settings** (icon): Opens Settings modal
7. ✅ **Help** (icon): Opens Help/Rules modal
8. ✅ **Music** (icon): Toggles music on/off
9. ✅ **Sound** (icon): Toggles sound on/off
10. ✅ **Daily** (chip): Console logs "not yet implemented"
11. ✅ **News** (chip): Console logs "not yet implemented"

### Test 5: Background Preload

**Expected:**
1. ✅ Background loads before buttons appear
2. ✅ No visible "placeholder → real background" transition
3. ✅ Console shows successful preload message
4. ✅ If preload times out (>1500ms), still shows intro hub

**To Test Slow Networks:**
1. Open DevTools → Network → Throttle to "Slow 3G"
2. Reload page
3. ✅ Background should still appear with buttons (may be timeout fallback)

### Test 6: No Main Screen Flicker

**Expected:**
1. ✅ Before clicking Play, inspect DOM:
   - `body` should NOT have `main-screen-built` class
   - `.wrap` should be `display: none`
   - `.topbar` should be `display: none`
2. ✅ After clicking Play and gating passes:
   - `body` should have `main-screen-built` class
   - `.wrap` should be visible
   - `.topbar` should be visible
3. ✅ No flicker of main screen at any point before Play

### Test 7: Guest Placeholder Avatars

**Expected:**
1. ✅ Before clicking Play: NO placeholder avatar tiles visible
2. ✅ After clicking Play: Roster placeholders may briefly appear
3. ✅ After cast animation: Real player avatars replace placeholders

### Test 8: Error Handling

**Test Video Failure:**
1. Temporarily rename `assets/videos/intro.mp4`
2. Reload page
3. ✅ Console shows video fetch failed
4. ✅ Intro hub still appears (graceful fallback)
5. ✅ No app crash

**Test Missing Functions:**
1. Check console for any `function not available` warnings
2. ✅ App should continue working with fallbacks

### Test 9: Multiple Play Clicks

**Expected:**
1. Click Play button rapidly multiple times
2. ✅ Console shows: `Main screen already built, skipping`
3. ✅ buildCast() only called once
4. ✅ No duplicate cast creation

### Test 10: Background Theme Changes

**Expected:**
1. At intro hub, wait for time-of-day or weather changes
2. ✅ Background should crossfade smoothly
3. ✅ First display is immediate (no fade)
4. ✅ Subsequent changes use crossfade animation

## Common Issues & Solutions

### Issue: Main screen flashes before intro hub
**Solution:** 
- Check `body` does NOT have `main-screen-built` class initially
- Verify CSS in `css/intro.css` is loaded

### Issue: Buttons appear before background
**Solution:**
- Check console for preload success/failure
- Verify `IntroScreen.show()` waits for preload
- Check network throttling isn't too extreme

### Issue: Video plays when skipIntros=true
**Solution:**
- Check Settings → Visual → "Skip Intros" is checked
- Check localStorage: `bb_cfg_v2` or `bb_settings_modular` has `skipIntros: true`
- Reload page after changing setting

### Issue: Play button doesn't work
**Solution:**
- Check console for `StartupFlow` initialization
- Check `intro:play` event is emitted (DevTools → Sources → Event Listeners)
- Verify gating checks aren't blocking (rules/profile)

## Browser Compatibility

Test on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ✅ Mobile browsers (portrait/landscape)

## Performance Checks

1. ✅ Background preload completes in <1500ms on normal networks
2. ✅ Intro hub display is instant after video
3. ✅ No long pauses or delays
4. ✅ Reduced motion users get instant transitions (no animations)

## Accessibility Checks

1. ✅ Tab navigation works through all buttons
2. ✅ Focus indicators visible
3. ✅ Screen reader announces buttons correctly
4. ✅ ARIA labels present on all interactive elements

## Sign-Off Checklist

- [ ] Test 1: Normal startup (first time) - PASS
- [ ] Test 2: Normal startup (returning user) - PASS
- [ ] Test 3: Skip intros - PASS
- [ ] Test 4: All buttons work - PASS
- [ ] Test 5: Background preload - PASS
- [ ] Test 6: No main screen flicker - PASS
- [ ] Test 7: No placeholder avatars before Play - PASS
- [ ] Test 8: Error handling - PASS
- [ ] Test 9: Multiple Play clicks - PASS
- [ ] Test 10: Background theme changes - PASS
- [ ] All automated tests passing
- [ ] Zero CodeQL vulnerabilities
- [ ] Documentation complete

## Notes

- The intro hub background uses the BackgroundTheme service, which selects based on:
  - Holiday period (Dec 20–Jan 1): Christmas themes
  - Current weather (if geolocation enabled): Rain/snow
  - Season: Autumn rain chance, winter snow at night
  - Time of day: Sunrise, day, sunset, night

- The `skipIntros` setting affects ONLY the video, not the intro hub itself.
  Users must still press Play to start the game.

- Guest placeholder avatars are now deferred until main screen builds,
  so they won't appear prematurely during intro sequence.
