# Public's Favourite Player - Enhanced Flow Diagram

## Visual Flow Timeline

```
FINALE PHASE START
     │
     ├─► PHASE 1: Anonymous Jury Casting
     │   ├─ Jurors cast blind votes (no names shown)
     │   ├─ Only banter displayed
     │   └─ Console: [juryCast] start → complete
     │
     ├─► PHASE 2: Public's Favourite (NEW ENHANCED VERSION)
     │   │
     │   ├─ Toggle Check
     │   │  └─ If cfg.enablePublicFav === false
     │   │     └─ Console: [publicFav] skipped (toggle false)
     │   │     └─ SKIP TO PHASE 3
     │   │
     │   ├─ Candidate Selection
     │   │  ├─ Select up to 5 from FULL cast (evicted + remaining)
     │   │  ├─ Random shuffle
     │   │  └─ Minimum 2 required
     │   │
     │   ├─ Intro Card (3000ms)
     │   │  ├─ Title: "Audience Spotlight"
     │   │  └─ Text: "Before we reveal the jury votes and crown
     │   │           the winner. Let's see who you voted as
     │   │           your favourite!"
     │   │
     │   ├─ Voting Panel Display
     │   │  ├─ Grid: .pfGrid5
     │   │  ├─ Cells: up to 5 × .pfCell
     │   │  ├─ Each cell:
     │   │  │  ├─ Avatar image (56×56px)
     │   │  │  ├─ Player name
     │   │  │  ├─ Progress bar (.pfBarOuter + .pfBarFill)
     │   │  │  └─ Percentage label (0% → final%)
     │   │  │
     │   │  └─ Panel: 700px wide, centered, dark gradient
     │   │
     │   ├─ Bar Animation (5000ms or 2000ms if reduced-motion)
     │   │  ├─ All bars: 0% → normalized final %
     │   │  ├─ Percentages count up smoothly
     │   │  └─ Total always sums to 100%
     │   │
     │   ├─ Elimination Sequence
     │   │  ├─ Sort candidates ascending by percentage
     │   │  ├─ For each (lowest to 2nd-highest):
     │   │  │  ├─ Apply .pfElim class (fade + shrink)
     │   │  │  ├─ Wait 800ms
     │   │  │  ├─ Console: eliminate player=Name pct=X% remaining=Y
     │   │  │  └─ Live region: "Name eliminated with X%. Y remaining."
     │   │  └─ Continue until only 1 remains
     │   │
     │   ├─ Winner Enlargement
     │   │  ├─ Hide all eliminated tiles (display: none)
     │   │  ├─ Apply .pfWinnerBig to winner tile
     │   │  │  ├─ Scale: 1.5× (or 1.2× if reduced-motion)
     │   │  │  ├─ Outline: 3px solid cyan (#6fd7ff)
     │   │  │  └─ Box-shadow: glowing effect
     │   │  ├─ Wait 1200ms for animation
     │   │  └─ Console: [publicFav] done
     │   │
     │   ├─ Final Announcement Card (4000ms)
     │   │  ├─ Title: "Fan Favourite"
     │   │  ├─ Line 1: "The Public has chosen [Name] for their
     │   │  │          Favourite player!"
     │   │  └─ Line 2: "Now let's see who is the Jury's favorite
     │   │             houseguest!"
     │   │
     │   └─ Panel Cleanup
     │      ├─ Remove panel from DOM
     │      └─ Set finale.publicFavDone = true
     │
     ├─► PHASE 3: Jury Reveal
     │   ├─ Show each juror's vote sequentially
     │   ├─ Update vote tally live
     │   ├─ Declare winner
     │   └─ Console: [juryReveal] winner=X votes=A-B
     │
     └─► WINNER ANNOUNCEMENT
         ├─ Show winner banner
         ├─ Spawn confetti (winner only, NOT Public Favourite)
         ├─ Play victory music
         └─ Proceed to credits
```

## State Guards & Flags

```
game.finale.publicFavDone (boolean)
  ├─ false: Segment has not run yet
  ├─ true: Segment already completed
  └─ Prevents duplicate runs

game.cfg.enablePublicFav (boolean)
  ├─ false (default): Feature disabled
  ├─ true: Feature enabled
  └─ Toggle in Settings → Gameplay

game.__publicFavouriteCompleted (boolean)
  ├─ Legacy guard from old finale.js implementation
  └─ Used by debug helper for reset
```

## Console Markers Reference

| Marker | Condition | Meaning |
|--------|-----------|---------|
| `[publicFav] start (pre-jury)` | Toggle ON, ≥2 players | Segment begins |
| `[publicFav] skipped (toggle false)` | Toggle OFF | Feature disabled |
| `[publicFav] skipped (already completed)` | publicFavDone=true | Already ran |
| `[publicFav] skipped (insufficient players N=X)` | <2 players | Not enough candidates |
| `[publicFav] eliminate player=Name pct=X% remaining=Y` | During eliminations | Each candidate eliminated |
| `[publicFav] done` | After winner enlargement | Segment complete |
| `[publicFav] error` | Exception caught | Error occurred |

## CSS Class Reference

### Grid & Layout
- `.pfGrid5` - Container grid for up to 5 candidates
- `.pfCell` - Individual candidate tile (120px × auto)

### Progress Bars
- `.pfBarOuter` - Bar background (10px height, dark blue)
- `.pfBarFill` - Animated fill (gradient cyan→green)

### States
- `.pfElim` - Eliminated state (opacity: 0, scale: 0.85)
- `.pfWinnerBig` - Enlarged winner (scale: 1.5, outline, glow)

### Accessibility
- `.sr-only` - Screen reader only content
- `#publicFavLive` - Live region for announcements

## Animation Timings

| Event | Duration | Notes |
|-------|----------|-------|
| Intro card display | 3000ms | "Audience Spotlight" |
| Bar animation | 5000ms | 2000ms if reduced-motion |
| Elimination stagger | 800ms | Between each elimination |
| Winner enlargement | 1200ms | Wait for scale animation |
| Final card display | 4000ms | "Fan Favourite" announcement |
| Total (5 candidates) | ~9-10s | From intro to jury reveal |

## Reduced Motion Support

When `prefers-reduced-motion: reduce` is detected:
- Bar animation: 5000ms → 2000ms
- Winner scale: 1.5× → 1.2×
- All CSS transitions: disabled
- No pulsing or wobbling effects

## Integration Points

### Entry Points
1. **Automatic:** Called in `startFinaleRefactorFlow()` between Phase 1 and Phase 3
2. **Manual:** `game.maybeRunPublicFavouriteBeforeJury()` for explicit invocation
3. **Debug:** `game.__debugRunPublicFavOnce()` for testing

### Exit Points
- Panel removed from DOM after completion
- `finale.publicFavDone` set to true
- Flow continues to Phase 3 (jury reveal)

### No Breaking Changes
- Old `finale.js` implementation deprecated but functional
- Legacy CSS classes (.pfv-*) retained for compatibility
- Existing confetti logic unchanged

## Example Console Output (5 candidates)

```
[juryCast] start
[juryCast] vote juror=P1 stored
[juryCast] vote juror=P2 stored
[juryCast] vote juror=P3 stored
[juryCast] complete
[publicFav] start (pre-jury)
[publicFav] eliminate player=Alice pct=12% remaining=4
[publicFav] eliminate player=Bob pct=18% remaining=3
[publicFav] eliminate player=Charlie pct=22% remaining=2
[publicFav] eliminate player=Diana pct=23% remaining=1
[publicFav] done
[juryReveal] start
[juryReveal] show juror=P1 vote=F1
[juryReveal] show juror=P2 vote=F2
[juryReveal] show juror=P3 vote=F1
[juryReveal] winner=F1 votes=2-1
```

## Accessibility Features

### Screen Reader Announcements
1. Dialog opens: "Public's Favourite Player voting, dialog"
2. After bars animate: "Vote tallies revealed"
3. Each elimination: "Name eliminated with X%. Y remaining."
4. Winner declared: "Name wins with X%!"

### ARIA Attributes
- `role="dialog"` on panel
- `aria-label="Public's Favourite Player voting"` on panel
- `role="status"` on live region
- `aria-live="polite"` on live region
- `role="progressbar"` on each bar
- `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` on bars
- `aria-label` with player name on each bar
- `alt` text on avatar images

## Files Modified

1. **js/jury.js** - Enhanced `runPublicFavouriteSegment()`, added integration helper
2. **js/finale.js** - Deprecated old implementation, updated debug helper
3. **styles.css** - Added new CSS classes, retained legacy classes
4. **IMPLEMENTATION_SUMMARY.md** - Documented new feature
5. **VERIFICATION_CHECKLIST.md** - Updated acceptance criteria
6. **MANUAL_TEST_GUIDE.md** - Comprehensive testing scenarios

## Quick Testing Commands

```javascript
// Enable toggle
game.cfg.enablePublicFav = true;

// Reset for re-run
game.finale.publicFavDone = false;
game.__publicFavouriteCompleted = false;

// Run manually
game.__debugRunPublicFavOnce();

// Check state
console.log('Toggle:', game.cfg.enablePublicFav);
console.log('Done:', game.finale?.publicFavDone);
console.log('Phase:', game.phase);
```

---

**Feature Version:** Enhanced Pre-Jury Flow (5 Candidates, Elimination, Winner Enlargement)  
**Last Updated:** 2024  
**Status:** ✅ Complete - Ready for Manual Testing
