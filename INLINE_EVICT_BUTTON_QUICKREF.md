# Inline Evict Button Quick Reference

## Overview

The **Inline Eviction Controller** (`InlineEvictController`) is a modern, self-contained module for handling 2-nominee live vote evictions in Big Brother. It provides a clean, accessible voting experience with inline result rendering inside the faux TV viewport.

## Key Features

- **Two-Phase Activation**: Name button transforms into evict button (select → confirm)
- **Dynamic Instructions**: Context-aware text that updates throughout the voting lifecycle
- **Inline Results**: Eviction results render directly inside the TV viewport (no modal/popup)
- **Full Accessibility**: Semantic HTML, ARIA labels, live regions, keyboard shortcuts
- **Reduced Motion**: Respects user motion preferences
- **Clean Architecture**: Isolated module with no legacy dependencies

---

## Architecture

### Module: `js/inline-evict-controller.js`

**Class**: `InlineEvictController`

**Public API**:
```javascript
class InlineEvictController {
  // Initialize controller with nominee data and callbacks
  init(config: {
    leftId: string,
    rightId: string,
    leftName: string,
    rightName: string,
    flags: { tieBreak: boolean, final4: boolean },
    onVote: (votedId: string) => void,
    onResult?: (evictedId: string, survivorId: string) => void
  }): boolean

  // Enable voting controls
  enableVoting(): void

  // Disable voting controls
  disableVoting(): void

  // Cast vote (internal - called after second activation)
  castVote(votedId: string): void

  // Render inline result inside faux TV
  renderInlineResult(
    evictedId: string,
    survivorId: string,
    meta: { voteCounts?: object }
  ): void

  // Check if inline rendering is supported (always true)
  supportsInlineRender(): boolean

  // Clean up controller and reset state
  cleanup(): void
}
```

---

## Interaction Lifecycle

### Phase 1: INIT
**State**: Avatars + name buttons rendered. Each name button displays nominee name.

```
[Avatar: Alice]    [Avatar: Bob]
   [Alice]            [Bob]
   
Instructions: "Select a nominee to evict."
```

---

### Phase 2: FIRST ACTIVATION
**Trigger**: User clicks/taps name button OR presses `1`/`2` key OR Enter/Space on focused button

**Action**: Selected nominee button transforms into red CTA with contextual wording:
- **Normal eviction**: `Evict <Name>`
- **Tie-break**: `Break Tie: Evict <Name>`
- **Final 4**: `Cast Sole Vote: Evict <Name>`

**Instructions Update**: `You are about to evict <Name>. Click again to confirm.`

```
[Avatar: Alice]    [Avatar: Bob]
 [Evict Alice]        [Bob]
   (red button)    (normal state)
   
Instructions: "You are about to evict Alice. Click again to confirm."
```

---

### Phase 3: SECOND ACTIVATION
**Trigger**: User clicks selected button again OR presses same key/Enter/Space again

**Action**:
1. Vote locked (`voteLocked = true`)
2. All buttons disabled
3. Instructions: `Your vote has been cast.`
4. Controller invokes `onVote(votedId)` callback

```
[Avatar: Alice]    [Avatar: Bob]
 [Evict Alice]        [Bob]
  (disabled)       (disabled)
   
Instructions: "Your vote has been cast."
```

---

### Phase 4: RESULT RENDER
**Trigger**: `renderInlineResult()` called from eviction.js after vote tally

**Action**:
1. Grid fades out (opacity: 0)
2. Result container inserted with two cards (evicted + survivor)
3. **Evicted nominee**: Red outline, grayscale avatar, "EVICTED" label
4. **Survivor nominee**: Green outline, color avatar, "SURVIVES" label
5. Summary text: `<Evicted> has been evicted. <Survivor> remains in the game.`
6. Live region announces: `You voted to evict <Evicted>. <Survivor> remains.`
7. Focus moves to result container

```
        Eviction Result
        
[Avatar: Alice]    [Avatar: Bob]
 (grayscale)       (color, green)
   Alice              Bob
  EVICTED          SURVIVES
  2 votes          3 votes
  
"Alice has been evicted. Bob remains in the game."
```

---

### Phase 5: CLEANUP
**Trigger**: Phase transition (e.g., end of live vote phase)

**Action**:
1. Remove root element from DOM
2. Reset all state variables
3. Remove keyboard event listeners
4. Nullify element references

---

## Keyboard Shortcuts

| Key | Action | Conditions |
|-----|--------|-----------|
| `1` | Select/vote for left nominee | Voting enabled, not locked |
| `2` | Select/vote for right nominee | Voting enabled, not locked |
| `Enter` / `Space` | Activate focused button | When button is focused |
| `Escape` | Clear selection | Before vote is confirmed |

**Note**: Keyboard shortcuts are ignored when `voteLocked` or `!votingEnabled`.

---

## Accessibility Features

### Semantic HTML
- Name buttons are native `<button>` elements
- Result container uses `role="region"`
- Instructions use `role="status"` with `aria-live="polite"`

### ARIA Labels
Buttons cycle through three states:

1. **Initial**: `Select <Name> for eviction`
2. **Selected (confirm stage)**: `Confirm eviction of <Name>`
   - Tie-break: `Break tie by evicting <Name>`
   - Final 4: `Cast sole vote to evict <Name>`
3. **After vote**: `Vote recorded for <Name>` (disabled)

### Live Regions
- Instructions element announces state changes
- Result container includes hidden live region for screen reader announcement
- Vote completion triggers accessible status update

### Focus Management
- After selection: Focus moves to selected button
- After result render: Focus moves to result container (tabIndex=-1)
- Visible focus indicators on all interactive elements

### High Contrast
- All states remain perceivable with high contrast
- Outline colors use sufficient contrast ratios
- Text overlays on gradients use accessible color combinations

---

## Styles (`.ievc-*` Namespace)

### Key Classes

| Class | Purpose |
|-------|---------|
| `.ievc-root` | Root container (fills TV viewport) |
| `.ievc-grid` | 2-column grid for nominees |
| `.ievc-nominee` | Individual nominee card |
| `.ievc-avatar` | Avatar wrapper with gradient ring |
| `.ievc-btn` | Name button (normal state) |
| `.ievc-btn.selected` | Transformed evict button (confirm state) |
| `.ievc-btn.voted` | Post-vote disabled state |
| `.ievc-instructions` | Dynamic instruction text |
| `.ievc-result` | Result container |
| `.ievc-result-card` | Individual result card |
| `.ievc-result-card.evicted` | Evicted nominee styling |
| `.ievc-result-card.survivor` | Survivor nominee styling |

### Responsive Breakpoints

**Desktop/Wide (> 820px)**:
- 2-column grid, side-by-side layout
- 180px avatars
- Full button text

**Mobile/Narrow (≤ 820px)**:
- 2-column grid maintained, smaller spacing
- 140px avatars
- Scaled button text

**Portrait Mobile (≤ 600px portrait)**:
- 1-column stacked layout
- 160px avatars
- Vertical arrangement for better thumb reach

### Reduced Motion
- All transitions disabled or shortened (150ms linear)
- Transforms removed from hover states
- Fade animations simplified

---

## Integration with eviction.js

### Initialization
```javascript
// In renderLiveVotePanel()
const twoMode = g.eviction.nominees.length === 2;
const useInlineEvict = twoMode 
  && g.cfg?.modernLiveVoteUI !== false 
  && typeof global.InlineEvictController !== 'undefined';

if (useInlineEvict) {
  const controller = new global.InlineEvictController();
  g.eviction.__inlineController = controller;
  
  controller.init({
    leftId, rightId,
    leftName, rightName,
    flags: { tieBreak: false, final4: isFinal4 },
    onVote: (pickId) => {
      lockHumanVote(pickId);
      controller.disableVoting();
    }
  });
  
  if (humanIsVoter && !hasVoted) {
    controller.enableVoting();
  }
}
```

### Result Rendering
```javascript
// In revealVotes() after tally
const inlineController = g.eviction.__inlineController;
const useInlineController = inlineController && !inlineController.state.resultShown;

if (useInlineController) {
  const survivorId = evId === a ? b : a;
  const voteCounts = { [a]: finalA, [b]: finalB };
  
  inlineController.renderInlineResult(evId, survivorId, { voteCounts });
  await sleep(3600); // Wait for user to read result
}
```

### Tie-Break Flow
```javascript
// In tieBreakTwo()
if (useInlineController) {
  inlineController.state.flags.tieBreak = true;
  inlineController._updateInstructions('Tie! HOH must break it.');
  // ... wait for HOH vote using inlineController
}
```

---

## Guard Flags

### Duplicate Prevention
**Flag**: `controller.state.resultShown`
- Set to `true` when `renderInlineResult()` is called
- Checked before rendering to prevent duplicates
- Separate from `g.eviction.__resultCardShown` (legacy guard)

### Vote Lock
**Flag**: `controller.state.voteLocked`
- Set to `true` when vote is cast
- Prevents further vote changes
- Disables all buttons

### Voting Enabled
**Flag**: `controller.state.votingEnabled`
- Controlled by `enableVoting()` / `disableVoting()`
- Determines if user can interact with buttons
- Separate from vote lock (allows pre-enabling)

---

## Fallback Chain

The eviction.js module attempts UI systems in this priority:

1. **InlineEvictController** (NEW) - If `InlineEvictController` class is available and 2-nominee mode
2. **LiveVote UI (lv2)** - If `lv2.init` is available and 2-nominee mode
3. **LiveVoteOverlay** - If 3+ nominees or lv2 unavailable
4. **Legacy Panel UI** - Final fallback

This ensures backwards compatibility while preferring the new inline controller.

---

## Testing Scenarios

### Normal Eviction
- 2 nominees, standard voting
- Button wording: `Evict <Name>`
- Result shows vote counts (e.g., "Alice 3 — Bob 2")

### Tie-Break
- 2 nominees, tied vote (e.g., 2-2)
- HOH breaks tie
- Button wording changes to: `Break Tie: Evict <Name>`
- Instructions update to reflect tie-break context

### Final 4
- 4 players alive, POV winner casts sole vote
- Button wording: `Cast Sole Vote: Evict <Name>`
- Only 1 vote recorded (winner's vote)

### Keyboard Navigation
- Tab through nominees and buttons
- Press `1` or `2` to select/vote
- Press `Escape` to clear selection
- Verify focus indicators visible
- Verify screen reader announcements

### Reduced Motion
- Enable system reduced motion preference
- Verify no dizzy-inducing animations
- Transitions should be instant or ≤150ms

### Multiple Viewports
Test on:
- Desktop (1440px, 1366px, 1280px, 1024px)
- Tablet (820px landscape, 768px portrait)
- Mobile (414px, 375px, 360px)

---

## Common Issues & Solutions

### Issue: Duplicate Results
**Cause**: `renderInlineResult()` called multiple times
**Solution**: Check `controller.state.resultShown` guard before calling

### Issue: Buttons Not Responding
**Cause**: `votingEnabled` is false or `voteLocked` is true
**Solution**: Call `controller.enableVoting()` after init

### Issue: Tie-Break Not Working
**Cause**: Tie-break flag not set
**Solution**: Set `controller.state.flags.tieBreak = true` before awaiting HOH vote

### Issue: Instructions Not Updating
**Cause**: Instructions element not found
**Solution**: Verify `controller.elements.instructions` is set during init

### Issue: Legacy LV2 UI Showing Instead
**Cause**: InlineEvictController not loaded or feature flag disabled
**Solution**: Check `typeof global.InlineEvictController !== 'undefined'` and `g.cfg.modernLiveVoteUI !== false`

---

## Performance Considerations

### Minimal DOM Reflow
- Grid built once, classes toggled rather than rebuilding
- Buttons reused, only text/attributes change
- Result container inserted after fade (no layout thrashing)

### Efficient Event Listeners
- One keyboard listener on document (not per button)
- Button clicks handled by direct event listener (not delegation)
- Cleanup removes all listeners to prevent memory leaks

### Lazy Loading
- Avatars loaded with `loading="lazy"` attribute
- Avatar URLs resolved via existing `resolveAvatar` helper (already cached)

### Reduced Motion
- All transitions can be disabled via media query
- No forced layout reads (e.g., `offsetWidth`) in hot paths

---

## Future Enhancements

Potential improvements for future versions:

1. **Animation Library**: GSAP integration for more sophisticated transitions
2. **Vote Queue**: Show real-time vote feed during diary room sequence
3. **Multiple Evictions**: Extend to support double/triple eviction results
4. **Custom Themes**: Allow per-season color schemes
5. **Sound Effects**: Add audio feedback for button clicks and result reveal
6. **Analytics**: Track interaction metrics (time to vote, keyboard vs mouse usage)

---

## Changelog

### v1.0.0 (Initial Release)
- Complete rewrite of 2-nominee eviction UI
- Inline result rendering inside TV viewport
- Full keyboard accessibility
- Reduced motion support
- Tie-break and Final 4 special modes
- Clean `.ievc-*` namespace to avoid collisions
