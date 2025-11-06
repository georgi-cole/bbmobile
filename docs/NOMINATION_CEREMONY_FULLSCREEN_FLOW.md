# Nomination Ceremony Fullscreen Flow

## Overview

The fullscreen nomination ceremony provides an enhanced UX for human HOH players during the nomination phase. It consists of three main stages:
1. **Intro Card** - Ceremony introduction in TV overlay
2. **Fullscreen Selector** - Interactive grid for selecting nominees
3. **Summary Ceremony** - Post-selection presentation with summary → reactions → adjournment

This system is implemented as an **interceptor** that wraps the existing `renderNomsPanel` function, ensuring fail-safe fallback to the legacy UI if any step fails.

## Architecture

### Module: `js/nominations-grid-fullscreen.js`

The interceptor module is loaded after `nominations.js` and wraps `global.renderNomsPanel`:

```javascript
// Original flow (preserved for AI HOH and fallback)
global.renderNomsPanel() 
  → Shows AI ceremony or legacy panel

// Intercepted flow (human HOH only)
interceptedRenderNomsPanel()
  → Intro card → Fullscreen selector → Commit → (finalizeNoms handles ceremony)
  → If any step fails: call original renderNomsPanel
```

### Integration with nominations.js

The interceptor sets `game.__nomsFromFullscreenSelector = true` before calling `finalizeNoms()`. This flag prevents duplicate ceremony cards in `nominations.js`:

```javascript
// In nominations.js finalizeNoms() ceremony block:
if(g.__nomsFromFullscreenSelector){
  // Skip ceremony - already shown by interceptor
  // Just update badges and proceed to veto
  return;
}
```

## Flow Details

### 1. Trigger Point

**Conditions for activation:**
- `game.phase === 'nominations'`
- Human is HOH (`hoh.human === true`)
- Nominations not locked (`!game.nomsLocked`)
- Nominations not in progress (`!game.__nomsCommitInProgress`)

**When NOT activated (calls original):**
- AI is HOH
- Nominations already locked/committed
- Any mounting step fails

### 2. Intro Card

Displayed in `#tvOverlay` with centered layout:

**Content:**
- Title: "Nomination Ceremony"
- Body: "{HOH name}, as Head of Household, you must nominate {count} houseguests for eviction."
- Button: "NOMINATE" (primary style)

**Behavior:**
- Clicking NOMINATE clears card and opens fullscreen selector
- If card fails to mount → fallback to original renderNomsPanel

### 3. Fullscreen Selector

**Visual Structure:**
```
┌─────────────────────────────────────────┐
│         [Count Display]                 │  ← Fixed header
│          0 / 2 selected                 │
├─────────────────────────────────────────┤
│                                         │
│   ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  │
│   │ 👤│  │ 👤│  │ 👤│  │ 👤│  │ 👤│  │  ← Grid tiles
│   └───┘  └───┘  └───┘  └───┘  └───┘  │    (responsive)
│                                         │
│   ┌───┐  ┌───┐  ┌───┐                │
│   │ 👤│  │ 👤│  │ 👤│                │
│   └───┘  └───┘  └───┘                │
│                                         │
├─────────────────────────────────────────┤
│     [CONFIRM NOMINATIONS]              │  ← Fixed button
│         (disabled until exact count)    │
└─────────────────────────────────────────┘
```

**Eligible Players:**
- All alive players (from `global.alivePlayers()`)
- Excluding HOH
- Excluding evicted/jury members

**Selection Rules:**
- Exact count required (2, 3, or 4 based on twist)
- Click/tap to toggle selection
- Selected tiles show:
  - Green border (`border-color: var(--ok)`)
  - Glow effect (`box-shadow`)
  - Checkmark indicator (✓)
  - `aria-pressed="true"`

**Count Display:**
- Shows "X / N selected"
- Updates on each toggle
- Has `aria-live="polite"` and `aria-atomic="true"` for screen readers

**Confirm Button:**
- Disabled until `selectedIds.length === required`
- Fixed to bottom of viewport
- Enter/Space also triggers when enabled and focused

### 4. Keyboard Accessibility

**Tile Navigation:**
- Arrow keys cycle focus among tiles with wrap-around
- Enter/Space toggles selection on focused tile
- Tiles are `tabindex="0"` and `role="button"`

**Blocked Keys:**
- Escape and Backspace are intercepted and prevented
- User must complete selection (no cancel option)

**Focus Management:**
- First tile receives focus on selector open
- Focus ring visible on active tile (`:focus` outline)

### 5. Selection Count Logic

**Twist Mode Detection:**
```javascript
function getRequiredSlots() {
  // Priority 1: Explicit __twistNomSlots
  if (game.__twistNomSlots) return Math.max(2, Math.min(4, game.__twistNomSlots));
  
  // Priority 2: __twistMode
  if (game.__twistMode === 'double') return 3;
  if (game.__twistMode === 'triple') return 4;
  
  // Default
  return 2;
}
```

**Examples:**
- Standard week: 2 nominees
- Double eviction week: 3 nominees
- Triple eviction week: 4 nominees

### 6. Commit Phase

**Atomic Commit:**
Once Confirm is clicked, selections are committed via the following priority:

1. **Preferred:** Set `game._pendingNoms` and call `global.finalizeNoms()`
2. **Fallback 1:** Set `game._pendingNoms` and call `global.lockNominationsAndProceed()`
3. **Fallback 2:** Manual commit (set nominees, apply side effects, sync badges, show ceremony)

**Ceremony Responsibility:**
- If using `finalizeNoms()` or `lockNominationsAndProceed()`, the interceptor sets `__nomsFromFullscreenSelector = true`
- This flag tells `nominations.js` to skip its own ceremony (avoiding duplicates)
- The interceptor does NOT show ceremony cards itself when using these methods
- If using manual commit, interceptor shows summary → reactions → adjourn

### 7. Summary-First Ceremony (Manual Commit Path)

When manual commit is used, the interceptor shows:

**a) Summary Card**
- Title: "Nominations"
- Body: Nominee names joined with " • " (e.g., "Alice • Bob • Carol")
- Duration: ~2.2s

**b) Nominee Reactions**
- Calls `global.showNomineeReactionsSimultaneously(nomineeIds)` if available
- Falls back to showing nothing if function not available
- Each nominee gets a reaction card with quote

**c) Adjourn Card**
- Title: "Nomination Ceremony"
- Body: "This ceremony is adjourned."
- Duration: 2s
- Clears overlay and calls `startVetoComp()` after delay

### 8. Fallback Safety

**Failure Points → Fallback Actions:**

| Failure Point | Action |
|--------------|--------|
| No game object | Call original `renderNomsPanel` |
| Not human HOH | Call original `renderNomsPanel` |
| Noms already locked | Call original `renderNomsPanel` |
| Intro card mount fails | Call original `renderNomsPanel` |
| Selector mount fails | Call original `renderNomsPanel` |
| No eligible players | Call original `renderNomsPanel` |

**Original Function:**
```javascript
let originalRenderNomsPanel = global.renderNomsPanel;
// Store before wrapping, call on any failure
```

## Accessibility Features

### Screen Reader Support
- Count display: `aria-live="polite"` announces selection changes
- Tiles: `role="button"` and `aria-pressed` state
- Grid: `role="group"` with `aria-label="Nomination candidates"`
- Confirm button: Proper `aria-label` and disabled state

### Keyboard Navigation
- Full keyboard access (no mouse required)
- Arrow keys for tile navigation
- Enter/Space for activation
- Focus indicators (high-contrast outline)

### Reduced Motion
Media query disables animations when user prefers reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  .noms-fs-tile { transition: none; }
  .noms-fs-tile:hover { transform: none; }
  /* etc. */
}
```

### High Contrast
Extra visible focus rings and borders in high contrast mode:
```css
@media (prefers-contrast: high) {
  .noms-fs-tile:focus { outline-width: 4px; }
  .noms-fs-tile.selected { border-width: 4px; }
}
```

## CSS Architecture

### Injection Strategy
All styles are injected inline via `<style>` tag in `<head>`:
- No external stylesheet dependencies
- Guaranteed to load before selector opens
- Uses CSS custom properties for theming (e.g., `var(--ok)`, `var(--card)`)

### Key Classes
- `.noms-fs-overlay` - Fullscreen backdrop
- `.noms-fs-header` - Fixed count display
- `.noms-fs-grid` - Responsive tile grid
- `.noms-fs-tile` - Individual houseguest tile
- `.noms-fs-tile.selected` - Selected state
- `.noms-fs-confirm` - Fixed confirm button

### Responsive Breakpoints
- Desktop: 5 columns, larger avatars (80px)
- Mobile (≤768px): 3 columns, smaller avatars (64px)

## Logging

All logs use the prefix `[noms-fs]` for easy filtering:

**Key Checkpoints:**
```
[noms-fs] Interceptor called
[noms-fs] Human HOH detected, attempting fullscreen flow
[noms-fs] Showing intro card
[noms-fs] ✓ Intro card mounted successfully
[noms-fs] NOMINATE button clicked
[noms-fs] Opening fullscreen selector
[noms-fs] Eligible players: X Required: N
[noms-fs] Selected: {name} - now X / N
[noms-fs] Deselected: {name} - now X / N
[noms-fs] Confirming selections: [id1, id2, ...]
[noms-fs] Set _pendingNoms: [...]
[noms-fs] Calling finalizeNoms()
[noms-fs] ✓ Nominations committed successfully
```

**Fallback Logs:**
```
[noms-fs] Not human HOH, calling original
[noms-fs] Intro card failed, falling back to original
[noms-fs] Selector failed or cancelled, falling back to original
```

**Error Logs:**
```
[noms-fs] Error mounting intro card: {error}
[noms-fs] Error opening fullscreen selector: {error}
[noms-fs] Error committing nominations: {error}
```

## Testing Checklist

### Human HOH Flow
- [ ] Intro card displays with correct count (2/3/4 based on twist)
- [ ] NOMINATE button opens fullscreen selector
- [ ] Selector shows only eligible players (no HOH, no evicted)
- [ ] Count display updates as tiles are toggled
- [ ] Confirm button disabled until exact count selected
- [ ] Confirm button activates with click/Enter/Space when enabled
- [ ] Selections commit and set `game.nominees`
- [ ] Badges update immediately (NOM badges visible on roster)
- [ ] No duplicate ceremony cards shown
- [ ] Logs visible with `[noms-fs]` prefix

### Keyboard Navigation
- [ ] Arrow keys cycle focus among tiles
- [ ] Enter/Space toggles tile selection
- [ ] Tab reaches Confirm button
- [ ] Escape/Backspace blocked (do nothing)

### Selection Rules
- [ ] Can select up to exact count
- [ ] Cannot select more than required
- [ ] Deselect by clicking/tapping again
- [ ] HOH never appears in selector
- [ ] Evicted players never appear in selector

### Accessibility
- [ ] Count display announces to screen readers on change
- [ ] Tiles have proper `aria-pressed` state
- [ ] Focus rings visible on keyboard focus
- [ ] Reduced motion respected (no transform on hover if enabled)

### AI HOH Flow (Unchanged)
- [ ] AI HOH continues to auto-nominate
- [ ] AI ceremony shows existing flow (no fullscreen selector)
- [ ] No regression in AI behavior

### Fallback Safety
- [ ] Force intro card error → legacy panel displays
- [ ] Force selector error → legacy panel displays
- [ ] Locked nominations → shows locked message
- [ ] All error paths call original `renderNomsPanel`

### Edge Cases
- [ ] Standard week (2 nominees)
- [ ] Double eviction week (3 nominees)
- [ ] Triple eviction week (4 nominees)
- [ ] Minimal houseguests (exactly 2 eligible)
- [ ] Many houseguests (12+ eligible)

## Common Issues & Solutions

### Issue: Ceremony cards duplicate
**Cause:** `finalizeNoms()` in nominations.js shows ceremony AND interceptor shows ceremony  
**Solution:** Interceptor sets `__nomsFromFullscreenSelector` flag, which tells finalizeNoms to skip ceremony

### Issue: Selector doesn't open
**Cause:** Intro card failed to mount  
**Solution:** Check browser console for `[noms-fs]` errors; should fallback to original panel

### Issue: Confirm button stays disabled
**Cause:** Selected count doesn't match required count  
**Solution:** Check selection count logic; ensure `getRequiredSlots()` returns correct value

### Issue: Styles not applied
**Cause:** CSS injection didn't complete  
**Solution:** Ensure `injectFullscreenSelectorStyles()` runs before selector opens

### Issue: HOH appears in selector
**Cause:** Eligibility filter not excluding HOH  
**Solution:** Check `getEligiblePlayerIds()` implementation

## Maintenance Notes

### Adding New Twist Modes
If adding a new twist that changes nominee count:
1. Set `game.__twistNomSlots` to desired count (2-4)
2. OR set `game.__twistMode` to recognized value and update `getRequiredSlots()`

### Modifying Ceremony Flow
To change post-selection ceremony:
- Edit `showSummaryCard()`, `showAdjournCard()` in interceptor
- OR update `finalizeNoms()` ceremony block in nominations.js (if using that path)

### Debugging
Enable verbose logging by opening browser console and filtering for `[noms-fs]`

All state is stored in `selectorState` object - inspect with:
```javascript
window.NomsFullscreenInterceptor // Debug API
```

## Browser Compatibility

Tested and supported on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

Requires:
- ES6 (async/await, arrow functions, template strings)
- CSS Grid
- CSS Custom Properties

Note: The enhancer module (`nominations-enhancer.js`) uses IntersectionObserver for progressive enhancement of nominee speech animations on mobile devices, but this is separate from the fullscreen selector functionality and not required for the core nomination flow.

## Performance Considerations

- CSS injected once per page load (cached after first inject)
- Selector overlay uses CSS Grid for efficient layout
- Event handlers cleaned up on selector close
- No DOM manipulation during scroll/resize
- Animations use transform/opacity (GPU accelerated)

## Future Enhancements

Potential improvements (not currently implemented):
- [ ] Animations for tile selection/deselection
- [ ] Sound effects on selection/confirm
- [ ] Touch gestures (swipe to deselect)
- [ ] Undo button (before confirm)
- [ ] Preview selected players (avatars in header)
- [ ] Filter/search by name (for large casts)

---

**Last Updated:** 2024-11-06  
**Module Version:** 1.0.0  
**Maintained By:** BBMobile Development Team
