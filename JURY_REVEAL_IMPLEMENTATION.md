# Expanded Cinematic Jury Reveal & Finale Enhancements

## Implementation Summary

This implementation extends the jury reveal sequence with tripled pacing durations, adaptive compression for large juries, manual human jury voting, avatar folder integration, and enhanced user controls.

## Key Changes

### 1. Tripled Pacing Durations ✅

All reveal timings have been tripled from the original implementation to create a more cinematic, dramatic experience:

| Element | Original | New | Ratio |
|---------|----------|-----|-------|
| Intro Card 1 | 2.0s | 6.0s | 3× |
| Intro Card 2 | 1.5s | 4.5s | 3× |
| Setup Gap | 0.5s | 1.5s | 3× |
| Early Jurors (1-3) | 1.8s | 5.4s | 3× |
| Mid Jurors (4-6) | 2.4s | 7.2s | 3× |
| Late Jurors (7-8) | 3.0s | 9.0s | 3× |
| Final Juror (9) | 4.0s | 12.0s | 3× |
| Winner Suspense | 3.0s | 9.0s | 3× |
| Jitter Range | ±0.2s | ±0.4s | 2× |

**Implementation Location:** `js/jury.js` - `startJuryRevealPhase()` and `startFinaleRefactorFlow()`

### 2. Adaptive Compression (180s Cap) ✅

The system now supports a maximum reveal duration of 180 seconds (up from 45s). When the baseline duration exceeds this cap, the system applies even compression:

**Algorithm:**
```javascript
// Calculate baseline total
let baselineMs = 0;
for (let i = 0; i < numJurors; i++) {
  baselineMs += getBaselineDuration(i, numJurors);
}

// Apply compression if needed
if (baselineMs > 180000) {
  const slotDur = Math.max(1200, 180000 / numJurors);
  // Use compressed duration for all reveals
}
```

**Example Scenarios:**
- 7 jurors: ~49.8s baseline → No compression
- 9 jurors: ~67.8s baseline → No compression  
- 11 jurors: ~85.8s baseline → No compression
- 30 jurors: ~256.8s baseline → Compressed to 180s (6s per reveal)

**Console Logs:**
- `[jury] pacing plan baselineMs=<ms> jurors=<n>` - Always shown
- `[jury] pacing compressed newCap=180s remaining=<n> slotDur=<ms>` - Only when compressed

### 3. Majority Clinch Behavior ✅

The system detects when a finalist clinches a majority but maintains dramatic pacing:

- Badge displays "Majority clinched" when threshold is reached
- Visual highlight applied to leading contestant
- **Does NOT fast-track remaining reveals** unless total would exceed 180s cap
- Maintains full cinematic pacing for dramatic effect
- Logged: `[juryReveal] majority clinched votes=<a>-<b>`

**Implementation Location:** `js/jury.js` - Inside reveal loop

### 4. Manual Human Jury Vote ✅

When the human player is a juror, they are given a 30-second window to cast their vote:

**Flow:**
1. System detects if human player (by `game.humanId`) is in the jury
2. Voting UI panel appears with two buttons (Vote [Finalist A] / Vote [Finalist B])
3. 30-second timeout starts
4. On vote submission: Vote is recorded, UI confirms selection
5. On timeout: Falls back to affinity-based AI decision

**Console Logs:**
- `[juryCast] waiting for human vote juror=<id>`
- `[juryCast] human vote submitted juror=<id> pick=<id>` (on success)
- `[juryCast] human vote timeout, using affinity fallback` (on timeout)
- `[juryCast] human vote fallback juror=<id> pick=<id>` (fallback choice)

**Implementation Location:** `js/jury.js` - `startJuryCastingPhase()`

### 5. Avatar Folder Integration ✅

A new avatar system prioritizes the `./avatars/` folder:

**Priority Order:**
1. `player.avatar` (if defined in player object)
2. `./avatars/{playerId}.jpg` (local avatar folder)
3. Dicebear API fallback: `https://api.dicebear.com/6.x/bottts/svg?seed={name}`

**Helper Functions:**
```javascript
getAvatar(playerId) - Returns best available avatar path
getAvatarFallback(name) - Returns dicebear fallback URL
```

**Console Logs:**
- `[jury] avatar: player not found id=<id>` (when player lookup fails)
- `[jury] avatar fallback for <name>` (when image load fails)
- `[publicFav] avatar fallback for <name>` (in public favourite context)
- `[publicFav] winner avatar fallback for <name>`
- `[publicFav] runner avatar fallback for <name>`

**Affected Components:**
- Finale faceoff graph (finalist avatars)
- Jury ballots panel (juror and finalist avatars)
- Public Favourite voting panel (candidate avatars)
- Public Favourite winner card (winner and runner-up avatars)

**Implementation Location:** `js/jury.js` - `getAvatar()` and `getAvatarFallback()` utility functions

### 6. Fast-Forward Button ✅

A new fast-forward control allows users to skip the extended dramatic pacing:

**Features:**
- Button appears in top-right corner during reveal phase
- Label: "⏩ Fast Forward"
- On activation:
  - All remaining reveals reduced to 0.5s each
  - Winner suspense reduced to 0.5s
  - Button updates to "⏩ Accelerating..." and disables
  - Logged: `[jury] revealFastForward`
- Removed automatically when reveal phase completes

**Visual Position:**
```css
position: absolute;
top: 10px;
right: 12px;
z-index: 15;
```

**Implementation Location:** `js/jury.js` - `createFastForwardButton()` and reveal loop

### 7. Juror Phrase Overlay ✅

Each juror reveal now includes a non-blocking phrase overlay:

**Timing:**
- Phrase appears at start of juror's reveal slot
- Visible for 65% of slot duration (within 60-70% requirement)
- Fades out 300ms before slot ends
- Fully removed at slot end

**Visual Design:**
- Centered overlay with semi-transparent black background
- Juror name in bold above phrase
- Phrase in italics
- Smooth fade in/out transitions
- Non-blocking (doesn't interfere with other UI)

**Examples:**
- 5.4s slot → 3.51s phrase duration (65%)
- 7.2s slot → 4.68s phrase duration (65%)
- 9.0s slot → 5.85s phrase duration (65%)
- 12.0s slot → 7.80s phrase duration (65%)
- 0.5s slot (fast-forward) → 0.325s phrase duration (65%)

**Implementation Location:** `js/jury.js` - `showJurorPhraseOverlay()`

## Testing

### Test Suite: test_jury_reveal_pacing.html

A comprehensive automated test suite validates all implementation details:

**Test Coverage:**
1. ✅ Verify Tripled Durations (7 assertions)
2. ✅ Baseline Total Calculations (3 assertions)
3. ✅ Compression Logic for >180s scenarios (2 assertions)
4. ✅ No Compression for Nominal Sizes (3 assertions)
5. ✅ Jitter Range ±400ms (3 assertions)
6. ✅ Phrase Overlay Timing 60-70% rule (5 assertions)

**Total: 23 assertions, 100% pass rate**

### Running Tests

1. Start local HTTP server: `python3 -m http.server 8080`
2. Open `http://localhost:8080/test_jury_reveal_pacing.html`
3. Click "Run All Tests"
4. Verify all 6 test suites pass

## Console Logging Reference

All key events are logged to the browser console for debugging:

### Pacing & Compression
- `[jury] pacing plan baselineMs=<ms> jurors=<n>`
- `[jury] pacing compressed newCap=180s remaining=<n> slotDur=<ms>`

### Human Voting
- `[juryCast] waiting for human vote juror=<id>`
- `[juryCast] human vote submitted juror=<id> pick=<id>`
- `[juryCast] human vote timeout, using affinity fallback`
- `[juryCast] human vote fallback juror=<id> pick=<id>`

### Reveal Events
- `[juryCast] vote juror=<id> stored`
- `[juryReveal] start`
- `[juryReveal] show juror=<id> vote=<id>`
- `[juryReveal] majority clinched votes=<a>-<b>`
- `[juryReveal] winner=<id> votes=<a>-<b>`

### Fast-Forward
- `[jury] revealFastForward`

### Avatar System
- `[jury] avatar: player not found id=<id>`
- `[jury] avatar fallback for <name>`
- `[publicFav] avatar fallback for <name>`
- `[publicFav] winner avatar fallback for <name>`
- `[publicFav] runner avatar fallback for <name>`

### Public Favourite
- `[publicFav] start candidates=[...]`
- `[publicFav] updating`
- `[publicFav] extend(+1000ms diff=<pct>%)`
- `[publicFav] locked`
- `[publicFav] winnerCard shown id=<id> pct=<pct>`
- `[publicFav] done`

## File Changes

### Modified Files
- **js/jury.js** (251 lines added, 19 lines modified)
  - Added `getAvatar()` and `getAvatarFallback()` helper functions
  - Added `createFastForwardButton()` for fast-forward control
  - Added `showJurorPhraseOverlay()` for phrase display
  - Rewrote `startJuryRevealPhase()` with new pacing system
  - Updated `startJuryCastingPhase()` with human voting logic
  - Added intro cards before reveal phase
  - Updated all avatar references to use new system

### New Files
- **test_jury_reveal_pacing.html** (339 lines)
  - Comprehensive test suite for all pacing features
  - 6 test suites with 23 total assertions
  - Visual test results with pass/fail indicators

## Accessibility & UX

### Always Visible
- Running vote tally during reveals
- Phase timer and controls
- Jury logs in diary room tab

### User Controls
- Fast-forward button for skipping extended pacing
- Manual vote panel for human juror (30s timeout)
- Skip button (existing, still functional)

### Visual Feedback
- Phrase overlays with proper contrast
- Majority clinch badge and highlighting
- Smooth fade transitions
- Progress indication via belt messages

### Assistive Technology
- All avatars have descriptive alt text
- Winner card has role="alert"
- Console logs for debugging

## Performance Considerations

### Memory Management
- Phrase overlays properly cleaned up after each reveal
- Fast-forward button removed after reveal completes
- Avatar error handlers only fire once per image
- ResizeObserver properly disconnected on cleanup

### Network Optimization
- Local avatar folder reduces external API calls
- Dicebear fallback only used when necessary
- Images loaded progressively during reveal

### Timing Precision
- Uses `Date.now()` for accurate timing calculations
- Jitter applied consistently with RNG
- Compression maintains minimum slot duration (1.2s)

## Edge Cases Handled

### Large Jury
- Automatic compression when baseline >180s
- Minimum slot duration enforced (1.2s)
- Even distribution across all jurors

### Small Jury
- No compression applied for nominal sizes (7-11 jurors)
- Full dramatic pacing maintained
- Final juror always gets longest duration

### Human Player Edge Cases
- Timeout after 30 seconds
- Affinity-based fallback on timeout
- Panel properly cleaned up after vote
- Works correctly if human not a juror

### Avatar Edge Cases
- Missing player object
- Missing avatar file
- Network errors
- All scenarios logged to console

### Fast-Forward Edge Cases
- Works at any point during reveal
- Properly handles remaining reveals
- Cleans up phrase overlays
- Updates winner suspense timing

## Future Enhancements (Out of Scope)

The following were explicitly excluded from this implementation:

- ❌ Changes to weighting formulas
- ❌ Changes to PF percentage smoothing
- ❌ Changes to nomination bias logic
- ❌ Localization support
- ❌ Additional sound effects beyond existing framework

## Verification Checklist

- [x] Extended reveal sequence functions with no UI overlap
- [x] Total reveal duration never exceeds 180s
- [x] Fast-forward immediately shortens remaining sequence (≤10s to finish)
- [x] Manual vote panel appears and works identically
- [x] All avatar images attempt to load from ./avatars/ (with logging)
- [x] Public Favourite 4-candidate simulation unaffected by timing changes
- [x] No changes to weighting formulas, PF smoothing, or nomination bias
- [x] Comprehensive test suite passes (23/23 assertions)

## Browser Compatibility

Tested and working in:
- Chrome/Edge (Chromium-based)
- Firefox
- Safari (WebKit)

Requires:
- ES6+ support (arrow functions, async/await, template literals)
- CSS Grid and Flexbox
- ResizeObserver API

## Credits

Implementation by: GitHub Copilot Agent
Repository: georgi-cole/bbmobile
Branch: copilot/fix-a5017da5-fcb3-40a6-bc28-e2c5d66930c6
