# ⚠️ DEPRECATED: Human-HOH Nomination Pick Mode Implementation

## ⚠️ Deprecation Notice

**This document describes the legacy "pick mode" nomination flow that has been REMOVED.**

The roster tile selection mode with confirm bar is no longer used. The codebase now exclusively uses the full-screen grid selector for human HOH nominations.

**Current implementation:** See `js/nominations-grid-fullscreen.js` and `test_nomination_fullscreen_flow.html`

---

## Overview (Historical)

This implementation replaced the legacy below-TV dropdown selectors for human Head of Household nominations with an interactive tap-to-select UX on the top roster. This approach has since been superseded by the full-screen grid selector for better UX and accessibility.

## Visual Flow

1. **Intro Card** - In-TV "Nomination Ceremony" card with NOMINATE button
2. **Pick Mode** - Entire UI dims except roster; tap tiles to select nominees
3. **Confirm Bar** - Floating bar shows "X / N selected" with disabled/enabled Confirm button
4. **Summary Card** - Shows all nominees at once (e.g., "Bob • Carol")
5. **Reactions** - Existing nominee reaction cards
6. **Adjourn** - "This ceremony is adjourned." card → Veto phase

## Key Features

### In-TV Pick Mode
- No legacy dropdowns for human HOH
- "Nomination Ceremony" intro card appears in #tvOverlay
- NOMINATE button styled like HOH/POV challenge cards
- Clicking NOMINATE enters interactive pick mode

### Roster Selection
- Page dims with `body.bb-noms-pick-mode` class
- Roster stays bright and interactive (z-index: 1000)
- Click tiles to toggle selection
- Green selection ring on selected tiles (`.bb-selected`)
- Visual feedback on hover (scale transform)

### Floating Confirm Bar
- Positioned just under roster strip
- Shows live count: "X / N selected"
- Confirm button disabled until exact count reached
- N calculated from twist state: 2 (standard), 3 (double), 4 (triple)
- Keyboard support: Enter/Space activates Confirm

### Safety & Validation
- Escape/Backspace intercepted - cannot exit pick mode
- HOH must complete selection (no cancel)
- Eligibility checks: cannot select HOH, evicted, or duplicates
- Count must be exact (no more, no less)

### Ceremony Sequence
- **Human HOH:**
  1. Summary card (all nominees)
  2. Nominee reactions (existing utility)
  3. Adjourn card
  4. Route to veto

- **AI HOH (unchanged):**
  1. HOH speech
  2. Individual reveals
  3. Nominee reactions
  4. Adjourn card
  5. Route to veto

## Technical Implementation

### Files Modified

**js/nominations.js** (+583, -107 lines)
- Added `injectPickModeStyles()` - CSS injection for pick mode
- Added pick mode state management functions
- Modified `renderNomsPanel()` - intercepts human HOH path
- Split `finalizeNoms()` - separate human/AI ceremony flows

**test_nomination_pick_mode.html** (new, 336 lines)
- Interactive test file
- Tests standard/double/triple scenarios
- Demonstrates full flow

### Code Structure

```javascript
// Pick Mode State
const pickModeState = {
  active: false,
  selectedIds: [],
  required: 0,
  escapeHandler: null,
  clickHandlers: new Map()
};

// Main Functions
injectPickModeStyles()      // Inject CSS
enterPickMode()              // Dim UI, attach handlers, show confirm bar
exitPickMode()               // Remove overlays, handlers, classes
toggleSelection(playerId)    // Handle tile clicks with validation
createConfirmBar()           // Render floating confirm bar
updateConfirmBar()           // Update count and button state
commitNominations()          // Finalize and trigger ceremony
```

### CSS Classes

```css
body.bb-noms-pick-mode        /* Body with dim overlay */
.top-roster-tile.bb-selected  /* Selected tile with green ring */
#bb-noms-confirm-bar          /* Floating confirm bar */
#bb-noms-count-text           /* Live count with aria-live */
#bb-noms-confirm-btn          /* Confirm button */
```

### Twist Integration

```javascript
function requiredSlots() {
  return Math.max(2, Math.min(4, global.game?.__twistNomSlots || 2));
}

// Calculates based on:
// - game.__twistNomSlots (if set)
// - game.__twistMode: 'double' → 3, 'triple' → 4, default → 2
```

## Accessibility

- **aria-live="polite"** on count text announces changes
- **aria-atomic="true"** ensures full count is announced
- Confirm button supports keyboard (Enter/Space)
- Escape/Backspace intercepted with explanation
- Reduced motion: honors `prefers-reduced-motion: reduce`

## Browser Compatibility

- Modern browsers (ES6+ required)
- Mobile: iOS Safari, Chrome, Firefox
- Desktop: Chrome, Firefox, Safari, Edge
- Responsive: 375px mobile to 1920px desktop

## Testing

### Automated Tests
- ✅ 40/40 tests pass
- Minigame validation
- Legacy map validation
- Runtime helpers
- E2E competitions
- Social maneuvers
- POV carousel

### Manual Tests (test_nomination_pick_mode.html)
- ✅ Standard week (2 nominees)
- ✅ Selection count updates live
- ✅ Confirm enables at exact count
- ✅ Ceremony sequence complete
- ⏳ Double eviction (3 nominees) - TODO
- ⏳ Triple eviction (4 nominees) - TODO
- ⏳ Deselection and re-enable - TODO
- ⏳ Escape key interception - TODO

### Security
- ✅ CodeQL scan: **0 vulnerabilities**
- No XSS risks
- No injection vulnerabilities
- Proper input validation
- Safe event handler cleanup

## Performance

- Minimal DOM manipulation
- Event delegation for tile clicks
- CSS-only animations
- No memory leaks (handlers cleaned up on exit)
- Reduced motion support

## Error Handling

All optional features wrapped in try-catch:
- `global.addLog` - logging is optional
- `global.cardQueueWaitIdle` - card queue is optional
- `showNomineeReactionsSimultaneously` - reactions are optional

Errors logged to console but don't break flow.

## Migration Guide

### For Developers

**No breaking changes:**
- AI HOH flow completely unchanged
- Existing saves compatible
- POV ceremony unchanged

**To use:**
1. Ensure player has `human: true` property
2. Set `game.hohId` to player ID
3. Call `startNominations()` during nominations phase
4. New UX automatically activates for human HOH

**To revert:**
In `renderNomsPanel()`, change:
```javascript
if(hoh && hoh.human){
  // NEW FLOW
}
```
Back to:
```javascript
if(hoh && hoh.human){
  // OLD DROPDOWN FLOW
}
```

### For Players

No action required. Human HOH nominations now use tap-to-select instead of dropdowns.

## Known Limitations

1. **Single human HOH only** - Multi-player not supported (out of scope)
2. **No cancel** - Must complete selection (intentional safety feature)
3. **Desktop avatars** - External avatar URLs may be blocked (fallback in place)
4. **Test coverage** - Double/triple scenarios need manual testing

## Future Enhancements

- Add "Undo Last Selection" button
- Show nominee portraits in confirm bar
- Animate selection rings (entrance)
- Add sound effects (optional)
- Multi-select drag gesture on mobile
- Nominee preview on hover

## References

- **NOMINATION_CEREMONY_REFACTOR_SUMMARY.md** - Nominee reactions system
- **CARD_REFACTOR_SUMMARY.md** - Card styling (.revealCard.diaryRoomCard)
- **VETO_CEREMONY_MODERNIZATION_SUMMARY.md** - POV ceremony (out of scope)
- **POPUP_REMOVAL_SUMMARY.md** - TV card migration pattern

## Credits

Implementation: GitHub Copilot AI Agent
Repository: georgi-cole/bbmobile
Date: November 2024
