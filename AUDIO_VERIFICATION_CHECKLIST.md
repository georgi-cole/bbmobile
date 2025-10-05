# Audio Playback Fix - Verification Checklist

## Pre-Test Setup
- [ ] Clear browser console
- [ ] Open Developer Tools (F12)
- [ ] Navigate to `test_audio_playback.html` OR the main `index.html`
- [ ] Check that audio files exist in `/audio/` directory

## Test 1: First User Gesture ✅
**Objective:** Verify music starts on first user interaction

**Steps:**
1. Open fresh page (or refresh)
2. Click Start button (or any play button in test page)
3. Observe console output

**Expected Results:**
- [ ] Console shows: `[audio] created audio element, muted=false`
- [ ] Console shows: `[audio] starting music, muted=false, file=...`
- [ ] Console shows: `[audio] successfully started music, file=...`
- [ ] Audio plays (if not muted)
- [ ] NO AbortError in console
- [ ] NO NotAllowedError (if clicked, not auto-played)

**Pass Criteria:** ✅ Music starts reliably on first click

---

## Test 2: Phase Transitions ✅
**Objective:** Verify music switches on phase changes without overlap

**Steps:**
1. Start with Opening phase (intro.mp3)
2. Wait 2 seconds
3. Skip to Social phase (social.mp3)
4. Wait 2 seconds
5. Skip to HOH phase (competition.mp3)
6. Listen carefully for any overlap

**Expected Results:**
- [ ] Console shows stop for intro.mp3
- [ ] Console shows start for social.mp3
- [ ] Console shows stop for social.mp3
- [ ] Console shows start for competition.mp3
- [ ] NO audio overlap heard
- [ ] NO AbortError in console
- [ ] Each track stops before next starts

**Pass Criteria:** ✅ Clean transitions with no overlap or errors

---

## Test 3: Mute Toggle ✅
**Objective:** Verify mute only affects audio output, not playback state

**Steps:**
1. Start music (any phase)
2. Click mute button (🔊 → 🔇)
3. Observe audio element state in console or test page status
4. Click unmute button (🔇 → 🔊)

**Expected Results:**
- [ ] When muted:
  - [ ] Console shows: `[audio] muted=true`
  - [ ] Audio element still playing (not paused)
  - [ ] No sound heard
  - [ ] Button shows 🔇
- [ ] When unmuted:
  - [ ] Console shows: `[audio] muted=false`
  - [ ] Audio element still playing
  - [ ] Sound heard
  - [ ] Button shows 🔊
- [ ] Refresh page - mute state persists
- [ ] NO pause/resume in console logs

**Pass Criteria:** ✅ Mute affects audio output only, state persists

---

## Test 4: Skip/Fast-Forward ✅
**Objective:** Verify rapid phase changes don't cause errors

**Steps:**
1. Start any phase's music
2. Rapidly click skip/advance button 5-10 times quickly
3. Check console for errors
4. Verify correct music is playing for current phase

**Expected Results:**
- [ ] Console shows multiple start/stop messages
- [ ] NO AbortError: play() interrupted by pause()
- [ ] NO uncaught exceptions
- [ ] Final phase's music plays
- [ ] Previous phases' music fully stopped
- [ ] May see "Stop already pending, skipping" (that's OK)

**Pass Criteria:** ✅ No AbortError, final phase music plays correctly

---

## Test 5: Same Track Protection ✅
**Objective:** Verify playing same track twice doesn't restart it

**Steps:**
1. Play HOH phase (competition.mp3)
2. Wait 2 seconds
3. Click HOH again (or call playMusicForPhase('hoh'))
4. Check console output
5. Listen to audio (should not restart/glitch)

**Expected Results:**
- [ ] First play: "starting music... successfully started"
- [ ] Second play: "already playing file=competition.mp3"
- [ ] Audio does NOT restart (no glitch/skip)
- [ ] Current playback position maintained
- [ ] NO stop/start for second call

**Pass Criteria:** ✅ Same track detected, no restart occurs

---

## Test 6: Music During Muted State ✅
**Objective:** Verify music plays when muted (just inaudible)

**Steps:**
1. Start page with muted state (localStorage has bb_soundMuted='1')
   OR click mute button
2. Click Start or any play button
3. Check audio element state

**Expected Results:**
- [ ] Console shows: `[audio] starting music, muted=true, file=...`
- [ ] Console shows: `[audio] successfully started music...`
- [ ] Audio element exists and is playing (!paused)
- [ ] Audio element muted property is true
- [ ] NO sound heard
- [ ] Music continues through phase changes (just muted)

**Pass Criteria:** ✅ Music plays when muted, just inaudible

---

## Test 7: Intermission Phase ✅
**Objective:** Verify phases with null mapping stop music

**Steps:**
1. Play any phase with music
2. Trigger intermission phase (mapped to null)
3. Check audio state

**Expected Results:**
- [ ] Console shows: "stopped music"
- [ ] Audio element paused or no src
- [ ] NO music playing
- [ ] NO errors

**Pass Criteria:** ✅ Music stops cleanly for null-mapped phases

---

## Test 8: Error Handling ✅
**Objective:** Verify graceful handling of missing files

**Steps:**
1. Try to play phase mapped to missing file (e.g., veto.mp3 if missing)
2. Check console for error handling

**Expected Results:**
- [ ] Console shows warning about missing file
- [ ] For veto.mp3: Falls back to competition.mp3
- [ ] NO uncaught exceptions
- [ ] App continues functioning

**Pass Criteria:** ✅ Errors handled gracefully, fallbacks work

---

## Test 9: localStorage Persistence ✅
**Objective:** Verify mute state persists across page reloads

**Steps:**
1. Set mute to ON
2. Refresh page
3. Check mute state
4. Set mute to OFF
5. Refresh page
6. Check mute state

**Expected Results:**
- [ ] Step 3: Mute still ON after refresh
- [ ] Step 6: Mute still OFF after refresh
- [ ] localStorage shows 'bb_soundMuted' key
- [ ] Audio element initialized with correct mute state

**Pass Criteria:** ✅ Mute state persists correctly

---

## Test 10: Console Logging ✅
**Objective:** Verify comprehensive logging for debugging

**Steps:**
1. Perform any play/stop/mute operations
2. Review console output

**Expected Results:**
- [ ] "created audio element" logged on first creation
- [ ] "starting music" logged for every play
- [ ] "successfully started music" logged on successful play
- [ ] "stopped music" logged for every stop
- [ ] "already playing" logged when same track played
- [ ] "muted=true/false" logged on mute toggle
- [ ] All logs prefixed with "[audio]"
- [ ] Warnings for any errors

**Pass Criteria:** ✅ All operations logged clearly

---

## Browser Compatibility Testing

Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Edge

**Expected:** All tests pass in all browsers

---

## Regression Testing

Verify existing functionality still works:
- [ ] Special events still trigger correct music (eviction, twist, etc.)
- [ ] Card reveals still trigger music cues
- [ ] Volume control (setMusicVolume) still works
- [ ] Fade out (fadeOutMusic) still works
- [ ] Cheer SFX (playCheerSfx) still works
- [ ] All public APIs still available and functional

---

## Performance Testing

- [ ] No noticeable lag when switching tracks
- [ ] CPU usage remains reasonable (check DevTools Performance tab)
- [ ] Memory doesn't leak (play/stop many times, check memory)
- [ ] 10ms delay in stopMusic is imperceptible

---

## Final Acceptance Criteria

All of the following must be true:

✅ Music starts reliably on first user gesture
✅ Only one phase's music plays at a time (no overlap)
✅ Skipping/fast-forwarding switches music instantly without errors
✅ NO AbortError in console during any operations
✅ Mute toggle works correctly (audio.muted property only)
✅ Console logs all starts/stops/errors clearly
✅ Mute state persists across page reloads
✅ Audio continues playing when muted (just inaudible)
✅ Same track protection prevents unnecessary restarts
✅ All existing functionality still works

---

## Sign-Off

Tested by: ________________  
Date: ________________  
Browser(s): ________________  
Result: PASS / FAIL  
Notes: ________________
