# Video Flow Diagrams

## Before Fix: Outro Replay Loop Issue 🔴

```
Game Ends
    ↓
showFinaleCinematic(winnerId)
    ↓
[8 seconds pass]
    ↓
__outroStarted = true
    ↓
playOutroVideo() ──────────┐
    ↓                       │
Video plays                 │
    ↓                       │
onEnd callback              │
    ↓                       │
__outroStarted = false ←────┘ (PROBLEM: Resets flag)
    ↓
showFinaleCinematic(winnerId)
    ↓
[8 seconds pass]
    ↓
__outroStarted is false → Autoplay triggers again!
    ↓
INFINITE LOOP! ♾️
```

## After Fix: Outro Plays Once ✅

```
Game Ends
    ↓
showFinaleCinematic(winnerId)
    ↓
[8 seconds pass]
    ↓
__outroStarted = true
__outroAutoPlayed = true
    ↓
playOutroVideo(false) ← isManualReplay = false
    ↓
Video plays
    ↓
onEnd callback
    ↓
__outroStarted stays true ✓ (Kept set to prevent re-autoplay)
    ↓
showFinaleCinematic(winnerId)
    ↓
[8 seconds pass]
    ↓
Check: __outroStarted && __outroAutoPlayed both true
    ↓
NO AUTOPLAY ✓
    ↓
Winner modal stays visible
```

## Manual Replay via CREDITS Button ✅

```
User clicks CREDITS button
    ↓
__outroStarted = false (Reset for this replay)
    ↓
__outroStarted = true
    ↓
playOutroVideo(true) ← isManualReplay = true
    ↓
Video plays
    ↓
onEnd callback
    ↓
__outroStarted = false ✓ (Reset to allow more manual replays)
    ↓
showFinaleCinematic(winnerId)
    ↓
User can click CREDITS again to replay
```

---

## Rules Modal Flow

### Before Fix: Shows Every New Season 🔴

```
Session Start
    ↓
Intro plays → bb:intro:finished event
    ↓
setupIntroListener() receives event
    ↓
modalShown = true (in-memory variable)
    ↓
Show rules modal
    ↓
User starts NEW SEASON
    ↓
Page logic resets/game restarts
    ↓
modalShown = false ← (PROBLEM: Variable resets)
    ↓
setupIntroListener() triggers again
    ↓
Show rules modal AGAIN ❌
```

### After Fix: Shows Only Once Ever ✅

```
Session Start (First Time)
    ↓
Intro plays → bb:intro:finished event
    ↓
setupIntroListener() receives event
    ↓
Check isRulesShown() → false
    ↓
Show rules modal
    ↓
User clicks OK
    ↓
markRulesShown() → sessionStorage.setItem('bb.rulesShown', '1')
    ↓
User starts NEW SEASON
    ↓
setupIntroListener() checks isRulesShown() → true ✓
    ↓
NO MODAL ✓ → Game starts directly
```

---

## Complete First-Time User Flow ✅

```
┌─────────────────────────────────────────────────────────────┐
│ User opens game for first time in browser                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. Intro Video (intro.mp4)                                  │
│    • Full-screen overlay (z-index: 9999)                    │
│    • Skip button visible (top-right)                        │
│    • No game UI visible                                     │
│    • Can skip or wait to finish                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
          onEnd/onSkip → markIntroPlayed()
          sessionStorage.setItem('bb.introPlayed', '1')
                           ↓
          dispatchIntroFinished() → 'bb:intro:finished' event
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Rules Modal                                               │
│    • Shows game rules                                        │
│    • OK button to dismiss                                   │
│    • ESC key to dismiss                                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
          User clicks OK → markRulesShown()
          sessionStorage.setItem('bb.rulesShown', '1')
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Game Opening Sequence                                     │
│    • Player intro cards                                      │
│    • Music plays                                            │
│    • Skip button available                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Main Game Loop                                            │
│    • HOH, Nominations, Veto, Evictions...                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Game Ends → showFinaleCinematic()                        │
│    • Winner name and trophy displayed                        │
│    • Stats, buttons (NEW SEASON, CREDITS, EXIT)            │
└─────────────────────────────────────────────────────────────┘
                           ↓
                  [8 seconds pass]
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Outro Video (outro.mp4) - AUTOMATIC ONCE                │
│    • Full-screen overlay                                     │
│    • Skip button visible (top-right)                        │
│    • Plays ONCE automatically                               │
│    • __outroAutoPlayed flag set                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
          onEnd/onSkip (isManualReplay = false)
          __outroStarted stays true
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Back to Winner Modal                                      │
│    • No autoplay (flags prevent it)                         │
│    • User can click CREDITS to replay manually              │
└─────────────────────────────────────────────────────────────┘
```

---

## New Season Flow (Same Browser Session) ✅

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "NEW SEASON" or "Start New Season"              │
└─────────────────────────────────────────────────────────────┘
                           ↓
          Check sessionStorage flags:
          • bb.introPlayed = '1' ✓
          • bb.rulesShown = '1' ✓
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Skip Intro (already played)                                  │
│ Skip Rules (already shown)                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Game Opening Sequence starts directly                        │
│    • Player intro cards                                      │
│    • Music plays                                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
                   Main game...
```

---

## Key Improvements Summary

### 1. Skip Button Enhancement
```
Before: z-index: 2
After:  z-index: 10, opacity: 1, pointer-events: auto
Result: Always visible and clickable ✓
```

### 2. Rules Modal Persistence
```
Before: In-memory variable (resets on new season)
After:  sessionStorage.setItem('bb.rulesShown', '1')
Result: Shows only once per browser session ✓
```

### 3. Outro Replay Prevention
```
Before: Single flag (__outroStarted) that gets reset
After:  Two flags (__outroStarted + __outroAutoPlayed)
Result: Autoplays once, manual replays still work ✓
```

### 4. Intro Video Autoplay
```
Status: Already working correctly
Method: maybePlayIntroOnLoad() + full-screen overlay
Result: No UI visible during intro ✓
```

---

## Testing Quick Reference

### Reset Everything
```javascript
sessionStorage.clear();
location.reload();
```

### Check Current State
```javascript
console.log({
  intro: sessionStorage.getItem('bb.introPlayed'),
  rules: sessionStorage.getItem('bb.rulesShown'),
  outroStarted: window.__outroStarted,
  outroAutoPlayed: window.__outroAutoPlayed
});
```

### Manual Triggers
```javascript
// Show rules
showRulesModal();

// Play outro (manual)
playOutroVideo(true);

// Show winner modal
showFinaleCinematic(0);
```
