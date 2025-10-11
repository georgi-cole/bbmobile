# Manual Testing Guide for Video Flow Fixes

## Prerequisites
- Open the game in a browser
- Have developer console open (F12) to see logs
- Clear sessionStorage if testing from scratch: `sessionStorage.clear()`

## Test Scenario 1: First Time User Experience
**Goal:** Verify intro → rules → game flow works correctly on first play

### Steps:
1. Clear sessionStorage: `sessionStorage.clear()` in console
2. Reload page (Ctrl+R or Cmd+R)
3. **Expected:** Intro video starts playing immediately
4. **Verify:** Skip button is visible in top-right corner
5. Click Skip button OR wait for video to finish
6. **Expected:** Rules modal appears after intro ends
7. **Verify:** Rules modal has "Game Rules" title and OK button
8. Click OK button
9. **Expected:** Game opening sequence starts (player cards)
10. **Expected:** Console shows:
   ```
   [intro-outro] bb:intro:finished
   [rules] bb:intro:finished received
   ```

### Success Criteria:
✅ Intro video autoplays on page load  
✅ Skip button visible throughout intro  
✅ Rules modal appears after intro  
✅ Game starts after rules modal dismissed  

---

## Test Scenario 2: New Season (Rules Should NOT Show)
**Goal:** Verify rules modal does NOT appear on subsequent game starts

### Steps:
1. From a running game where rules have been shown
2. Complete game OR click "NEW SEASON" button in finale
3. **Expected:** Intro does NOT play (already played this session)
4. **Expected:** Rules modal does NOT appear
5. **Expected:** Game opening sequence starts directly
6. **Verify:** Console shows:
   ```
   [rules] rules already shown previously — skipping
   ```

### Success Criteria:
✅ No intro video on new season  
✅ No rules modal on new season  
✅ Game starts immediately  

---

## Test Scenario 3: Outro Video - First Play (Auto)
**Goal:** Verify outro plays once automatically, then stops

### Steps:
1. Play game to completion (or use debug commands to reach finale)
2. Game ends, finale triggers
3. **Expected:** Winner modal appears with spinning trophy
4. Wait 8 seconds
5. **Expected:** Outro video starts playing automatically
6. **Verify:** Skip button is visible in top-right corner
7. Click Skip OR wait for outro to finish
8. **Expected:** Winner modal reappears
9. **Expected:** Outro does NOT autoplay again
10. **Verify:** Console shows:
   ```
   [finale] autoplaying outro video (first time only)
   [intro-outro] playVideo: assets/videos/outro.mp4
   [intro-outro] finished: end
   ```

### Success Criteria:
✅ Outro autoplays after 8 seconds  
✅ Skip button visible throughout outro  
✅ Winner modal returns after outro  
✅ Outro does NOT replay automatically  

---

## Test Scenario 4: Outro Video - Manual Replay
**Goal:** Verify CREDITS button allows manual replay

### Steps:
1. From winner modal (after outro has played once)
2. Click "CREDITS" button
3. **Expected:** Outro video plays again
4. **Verify:** Skip button is visible
5. Click Skip OR wait for outro to finish
6. **Expected:** Winner modal reappears
7. Click "CREDITS" button again
8. **Expected:** Outro can be played multiple times manually

### Success Criteria:
✅ CREDITS button triggers outro video  
✅ Outro can be replayed multiple times via CREDITS  
✅ Skip button works on manual replays  

---

## Test Scenario 5: Skip Button Persistence
**Goal:** Verify skip button stays visible during entire video

### Steps:
1. Trigger intro or outro video
2. **Verify:** Skip button appears immediately
3. Watch video for several seconds
4. **Verify:** Skip button remains visible (doesn't fade or disappear)
5. Move mouse around screen
6. **Verify:** Skip button still visible and clickable
7. Click Skip button
8. **Expected:** Video ends immediately

### Success Criteria:
✅ Skip button visible from start to end  
✅ Skip button does not fade or hide  
✅ Skip button is clickable throughout  
✅ Clicking skip immediately ends video  

---

## Test Scenario 6: Session Persistence
**Goal:** Verify flags persist correctly in sessionStorage

### Steps:
1. Play intro and dismiss rules modal
2. Check sessionStorage in console:
   ```javascript
   console.log('Intro played:', sessionStorage.getItem('bb.introPlayed'));
   console.log('Rules shown:', sessionStorage.getItem('bb.rulesShown'));
   ```
3. **Expected Output:**
   ```
   Intro played: 1
   Rules shown: 1
   ```
4. Reload page (Ctrl+R)
5. **Expected:** No intro plays, no rules modal
6. Check sessionStorage again (should still be '1')
7. Clear sessionStorage: `sessionStorage.clear()`
8. Reload page
9. **Expected:** Intro plays again, rules modal shows again

### Success Criteria:
✅ Flags persist across page reloads  
✅ Flags prevent re-showing intro/rules  
✅ Clearing sessionStorage resets behavior  

---

## Debug Commands

### Force Clear All Flags
```javascript
sessionStorage.clear();
window.__bbIntroPlayed = false;
window.__bbRulesShown = false;
window.__outroStarted = false;
window.__outroAutoPlayed = false;
location.reload();
```

### Check Flag States
```javascript
console.log({
  introPlayed: sessionStorage.getItem('bb.introPlayed'),
  rulesShown: sessionStorage.getItem('bb.rulesShown'),
  outroStarted: window.__outroStarted,
  outroAutoPlayed: window.__outroAutoPlayed
});
```

### Manually Trigger Components
```javascript
// Show rules modal manually
showRulesModal();

// Play outro manually
playOutroVideo(true);

// Show winner modal
showFinaleCinematic(0);
```

---

## Common Issues to Watch For

### ❌ Skip Button Disappearing
- **Symptom:** Skip button appears briefly then vanishes
- **Root Cause:** CSS or JS removing/hiding the button
- **Fix Applied:** Added explicit z-index:10, opacity:1, pointer-events:auto

### ❌ Rules Modal Showing on New Season
- **Symptom:** Rules modal appears every time you start a new season
- **Root Cause:** Rules flag not persisting across game resets
- **Fix Applied:** Added sessionStorage persistence with 'bb.rulesShown' key

### ❌ Outro Replay Loop
- **Symptom:** Outro plays, winner modal appears, then outro plays again infinitely
- **Root Cause:** onEnd callback resets flags, triggering autoplay logic again
- **Fix Applied:** Added __outroAutoPlayed flag and isManualReplay parameter

### ❌ Game UI Visible During Intro
- **Symptom:** Can see game dashboard/buttons behind intro video
- **Root Cause:** Video overlay z-index too low
- **Status:** Already fixed (z-index: 9999)

---

## Expected Console Output

### First Play Session:
```
[intro-outro] hook loaded
[intro-outro] playVideo: assets/videos/intro.mp4
[intro-outro] finished: end
[intro-outro] dispatched bb:intro:finished
[rules] bb:intro:finished received
[rules] dispatched bb:rules:acknowledged
```

### New Season (Same Session):
```
[rules] rules already shown previously — skipping
```

### Game End (First Outro):
```
[finale] showingCinematic
[finale] autoplaying outro video (first time only)
[intro-outro] playVideo: assets/videos/outro.mp4
[intro-outro] finished: end
```

### Manual Replay (CREDITS):
```
[finale] credits button clicked, playing outro
[intro-outro] playVideo: assets/videos/outro.mp4
[intro-outro] finished: skip
```

---

## Sign-off Checklist

- [ ] Intro video autoplays on first page load
- [ ] Skip button visible and functional on intro
- [ ] Rules modal shows after intro (first time only)
- [ ] Rules modal does NOT show on new season
- [ ] Outro autoplays once after game ends
- [ ] Skip button visible and functional on outro
- [ ] Outro does NOT replay after finishing
- [ ] CREDITS button allows manual replay
- [ ] All flags persist in sessionStorage correctly
- [ ] No console errors during any flow
