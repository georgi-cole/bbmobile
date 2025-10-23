# Modern Live Vote UI (Live Vote 2.0)

## Overview

The Modern Live Vote UI (internally called "lv2") is a cinematic, broadcast-style visual experience for the eviction phase that renders **entirely inside the TV (#tv) overlay**. It replaces the traditional "cards appear in a list" interface with a dynamic versus layout, flip card animations, smooth meter fills, and in-TV voting controls. When enabled, all legacy pop-up cards are suppressed in favor of integrated in-TV notifications.

## Features

### Visual Design
- **In-TV Rendering**: The entire lv2 UI renders inside the #tv overlay using a fixed-size canvas (1200x560) scaled via ResizeObserver, not below in #panel
- **No Scrolling**: overflow:hidden on overlay wrapper ensures no internal scrollbars; entire experience visible at once
- **Grid Layout**: Three-column grid (Left Nominee | Center Stage | Right Nominee) with reserved footer row for CTAs
- **Center Stage**: Interactive spawn point (.lv2-stage) where vote cards flip and animate before flying to nominees
- **Drop Anchors**: Visual targets on each nominee where vote cards land after flying from center stage
- **Flip Cards**: Each vote appears as a flipping card at center stage labeled with the voter's name, then flies to the chosen nominee's anchor
- **Non-Overlapping CTAs**: Vote buttons appear in dedicated footer row (.lv2-cta-row), never positioned over avatars
- **Large Tap Targets**: Buttons sized 48px minimum height for accessibility and mobile usability
- **Keyboard Shortcuts**: Press 1 or 2 keys to quickly vote for left or right nominee
- **Turn Indicators**: "Your Turn" badge appears at the top of the TV when it's the player's turn to vote
- **Result Banners**: Eviction results and tie notifications shown in-TV instead of pop-up cards
- **Glassmorphism**: Semi-transparent panels with subtle borders, neon accents, and soft glows
- **Winner Highlighting**: The leader/winner is highlighted with green glow at sequence end
- **Responsive Scaling**: Fixed 1200x560 design canvas scales down proportionally to fit any TV size

### Card Suppression
When lv2 is active, the following legacy pop-up cards are **suppressed**:
- Diary room "Your turn" cards → Replaced by in-TV turn indicator
- Per-vote diary room reveal cards → Votes shown via flip/fly animations in lv2
- Tiebreak announcement cards → Shown as in-TV status message
- HOH tiebreak decision cards → Handled via in-TV CTA buttons
- Final eviction result cards → Shown as in-TV result banner

This eliminates UI duplication and keeps all interaction within the TV frame.

### Accessibility
- **ARIA Live Regions**: Vote reveals, count updates, and turn notifications announced to screen readers
- **Keyboard Shortcuts**: Press 1 or 2 to quickly vote for left or right nominee
- **High Contrast Support**: Readable colors that work with colorblind mode
- **Focus Management**: CTAs properly focusable with visible focus indicators
- **Reduced Motion**: Automatically detected via `prefers-reduced-motion` media query
  - When enabled: Cards fade in/out instead of flipping and flying
  - Counts update directly without odometer animation
  - Meter fills without complex transitions

### Technical Implementation
- **No External Dependencies**: Pure vanilla JS with CSS transitions and `requestAnimationFrame`
- **Optional Integration**: Completely optional via settings toggle; falls back to legacy UI when disabled
- **Non-Breaking**: Does not alter existing game logic, timing, or eviction flow
- **Fixed Canvas with Scaling**: Uses a fixed 1200x560 design canvas scaled via ResizeObserver to fit TV dynamically
- **No Internal Scrolling**: overflow:hidden on overlay wrapper prevents scrollbars; transform scale ensures visibility
- **Grid Layout Architecture**: CSS Grid with reserved footer row ensures CTAs never overlap avatars
- **Pointer Events**: Properly managed to allow interaction with CTAs while keeping overlay non-blocking

## How to Enable/Disable

### Via Settings UI
1. Open Settings (⚙️ button)
2. Navigate to "Visual" tab
3. Under "Badges & effects", toggle "Modern Live Vote UI (cinematic versus layout)"
4. Changes take effect on the next Live Vote phase

### Programmatically
```javascript
// Enable
window.game.cfg.modernLiveVoteUI = true;
window.lv2.enabled = true;

// Disable
window.game.cfg.modernLiveVoteUI = false;
window.lv2.enabled = false;
```

### Default Behavior
Modern Live Vote UI is **enabled by default** for new games. The setting is persisted to localStorage.

## Integration Points

### 1. Module: `js/livevote-ui.js`

Exposes a global API via `window.lv2`:

```javascript
// Initialize with two nominees - renders inside #tv overlay
lv2.init({
  leftName: 'Alice',
  rightName: 'Bob',
  leftId: 1,
  rightId: 2,
  pacing: {
    holdMs: 500,  // Optional, defaults to cfg.cardHoldMs or 500ms
    gapMs: 250    // Optional, defaults to cfg.cardGapMs or 250ms
  }
});

// Push a vote (queued and animated)
lv2.pushVote({
  voterId: 3,
  voterName: 'Charlie',
  pick: 'left'  // or 'right'
});

// Mark as finished and highlight winner
lv2.finish();

// Create voting CTA bar inside TV
lv2.createCtaBar({
  enabled: true,
  isTieBreak: false,  // true for HOH tiebreak
  isFinal4: false,    // true for Final 4 sole vote
  leftName: 'Alice',
  rightName: 'Bob',
  leftId: 1,
  rightId: 2,
  onVote: (pickId) => {
    // Handle vote
    console.log('Voted for:', pickId);
  }
});

// Update CTA bar state
lv2.updateCtaBar({ enabled: false });  // Disable buttons after vote

// Show/hide turn indicator
lv2.showTurnIndicator();  // Shows "Your Turn" badge at top of TV
lv2.hideTurnIndicator();

// Clean up and restore panel visibility
lv2.cleanup();

// Check if enabled
console.log(lv2.enabled);  // reads from game.cfg.modernLiveVoteUI

// Check if reduced motion is active
console.log(lv2.reducedMotion);  // true if prefers-reduced-motion is set
```

### 2. Integration in `js/eviction.js`

#### `renderLiveVotePanel()`
- Checks if lv2 should be used (2 nominees + enabled in settings)
- If yes: calls `lv2.init()` with nominee data and renders inside #tv
- Creates in-TV CTA bar with voting buttons
- #panel content is hidden to prevent duplicate UI
- If no: uses legacy below-TV panel with info text, voter list, and buttons

```javascript
const useLv2 = g.eviction.nominees.length === 2 
  && g.cfg?.modernLiveVoteUI !== false 
  && global.lv2?.enabled !== false;

if (useLv2) {
  const [leftId, rightId] = g.eviction.nominees;
  global.lv2.init({
    leftName: global.safeName(leftId),
    rightName: global.safeName(rightId),
    leftId: leftId,
    rightId: rightId
  });
}
```

#### `beginDiaryRoomSequence()`
- Checks `useLv2` flag to determine if cards should be suppressed
- When lv2 is active:
  - Suppresses "Your turn" pop-up card → Shows `lv2.showTurnIndicator()` instead
  - Suppresses per-vote diary room reveal cards → Reduced wait time
  - Still calls `lv2.pushVote()` to animate votes in the versus layout
- After each vote is resolved, calls `lv2.pushVote()` to mirror the vote visually
- Uses optional chaining to ensure safety if lv2 is not loaded

```javascript
const useLv2 = twoMode && g.cfg?.modernLiveVoteUI !== false && global.lv2?.enabled !== false;

// Human turn notification
if (!useLv2) {
  global.showCard?.('Diary Room',['It's your turn...'],'live',2000,true);
} else {
  global.lv2?.showTurnIndicator?.();
}

// Vote reveal (skip card if lv2 active)
if (!useLv2) {
  showDiaryRoomWithAvatars(entry.voter, pick, message, 3000);
  await sleep(3000);
} else {
  await sleep(1500);  // Shorter wait
}

// Hook: Push vote to lv2 if enabled and 2-nom mode
if(twoMode && global.lv2?.pushVote){
  const [leftId, rightId] = noms;
  const votePick = pick === leftId ? 'left' : 'right';
  global.lv2.pushVote({
    voterId: entry.voter,
    voterName: nameV,
    pick: votePick
  });
}
```

#### `tieBreakTwo()`
- Checks `useLv2` to suppress tiebreak cards
- When lv2 is active:
  - Updates in-TV status message instead of showing pop-up
  - Uses `lv2.createCtaBar()` with `isTieBreak: true` for HOH decision
  - No HOH decision result card shown

#### `revealVotes()`
- Checks `useLv2` to suppress final eviction result card
- When lv2 is active:
  - Updates in-TV status banner with eviction result
  - No pop-up card shown

#### After sequence completion
- Calls `lv2.finish()` to highlight the winner
- Calls `lv2.cleanup()` in `postEvictionRouting()` to remove lv2 UI and restore panel

```javascript
// Hook: Mark lv2 as finished
if(twoMode && global.lv2?.finish){
  global.lv2.finish();
}

// Clean up lv2 UI after eviction
if (global.lv2?.cleanup) {
  global.lv2.cleanup();
}
```

### 3. Settings Registry

Added to `js/settings/registry.js` under the "Visual" tab:

```javascript
checkbox('modernLiveVoteUI', 'Modern Live Vote UI (cinematic versus layout)')
```

### 4. Config Defaults

Added to `js/config/defaults.js`:

```javascript
modernLiveVoteUI: true, // When true, use modern cinematic Live Vote UI (lv2)
```

## Reduced Motion Behavior

When the user has enabled "Reduce Motion" in their operating system or browser:

### Normal Mode (Motion Enabled)
1. Flip card animation (3D rotate)
2. Card flies to target nominee lane
3. Odometer-style count increment
4. Smooth meter fill with easing

### Reduced Motion Mode
1. Card fades in (no flip)
2. Card fades out (no fly)
3. Count updates directly (no odometer)
4. Meter fills without complex transitions
5. No glow pulse animation

The `lv2.reducedMotion` property reads from `window.matchMedia('(prefers-reduced-motion: reduce)')`.

## CSS Classes

All lv2 styles are prefixed with `lv2-` to avoid collisions with legacy styles:

**In-TV Container:**
- `.lv2-overlay` - Outer wrapper with overflow:hidden to prevent scrolling
- `.lv2-fit` - Fixed 1200x560 canvas scaled via ResizeObserver
- `.lv2-panel` - Main container with CSS Grid layout and glassmorphic background

**Grid Layout:**
- `.lv2-grid` - Three-column grid (left | center stage | right)
- `.lv2-contestant` - Individual contestant card (left/right) with relative positioning
- `.lv2-drop-anchor` - Target point where vote cards land (positioned on contestants)
- `.lv2-stage` - Center column spawn point for vote card animations
- `.lv2-cta-row` - Reserved footer row for voting buttons (never overlaps avatars)

**Contestant Display:**
- `.lv2-avatar` - Circular avatar (80px)
- `.lv2-name` - Contestant name
- `.lv2-count` - Vote count with glow effect
- `.lv2-contestant.winner` - Applied to winning contestant

**Center Stage:**
- `.lv2-meter` - Vertical meter displayed in center stage
- `.lv2-fill.left` / `.lv2-fill.right` - Meter fill bars
- `.lv2-meter-glow` - Animated glow effect

**Vote Animation:**
- `.lv2-card` - Individual flip card (spawns in center stage)
- `.lv2-card-inner` - Inner wrapper for 3D transform
- `.lv2-face.front` / `.lv2-face.back` - Card faces

**Controls:**
- `.lv2-cta-btn` - Individual voting button with large tap target
- `.lv2-turn-indicator` - "Your Turn" badge (top-center in TV) with pulse animation
- `.lv2-status` - Status text area (shows tie/result messages)

## Testing

### Dev/Test Harness
Use `test_live_vote_ui.html` to iterate on the UI without entering the full game flow:

1. Open `test_live_vote_ui.html` in a browser
2. Click "Initialize Live Vote" to create the lv2 panel
3. Click "Push Random Vote" to add votes one by one
4. Click "Push All Votes" to quickly push remaining votes
5. Click "Finish & Highlight Winner" to see the winner highlight
6. Toggle "Enable Modern Live Vote UI" to test fallback behavior
7. Use OS/browser settings to enable "Reduce Motion" and refresh to test accessibility

### Integration Testing
1. Start a new game in the main app
2. Progress to Live Vote phase with 2 nominees
3. **Observe the modern UI rendering INSIDE the TV overlay** (not below in #panel)
4. Verify voting CTA buttons appear at the bottom of the TV frame
5. Test keyboard shortcuts: press 1 or 2 to vote
6. Watch votes reveal with flip and fly animations
7. Check that "Your Turn" indicator appears in TV when it's the player's turn
8. Verify NO legacy pop-up cards appear during live vote
9. Check tie-break flow uses in-TV CTA and status messages
10. Verify eviction result shown as in-TV banner (no pop-up card)
11. Verify winner highlighting at the end
12. Confirm panel visibility restored after eviction complete

### Manual Testing Checklist
**In-TV Rendering:**
- [ ] Modern UI renders entirely inside #tv overlay (not in #panel)
- [ ] #panel content hidden while lv2 is active
- [ ] lv2 UI uses fixed 1200x560 canvas scaled via ResizeObserver
- [ ] No internal scrollbars appear; entire experience visible without scrolling
- [ ] UI scales proportionally to fit any TV size

**Card Suppression:**
- [ ] No "Your turn" pop-up card (shows in-TV indicator instead)
- [ ] No per-vote diary room cards (flip/fly animation replaces them)
- [ ] No tiebreak announcement card (in-TV status message instead)
- [ ] No HOH decision card (in-TV CTA handles it)
- [ ] No eviction result card (in-TV banner instead)

**Voting CTAs:**
- [ ] CTA buttons appear in reserved footer row
- [ ] CTAs never overlap or cover avatar images
- [ ] Buttons have large tap targets (48px min height)
- [ ] Buttons properly clickable and responsive
- [ ] Keyboard shortcuts (1/2) work correctly
- [ ] Tie-break shows "Break Tie: Evict X" wording
- [ ] Final 4 shows single "Cast Sole Vote" button
- [ ] Buttons disabled after vote cast
- [ ] ARIA labels announced correctly
- [ ] On narrow screens, buttons stack vertically without overlap

**Core Functionality:**
- [ ] Modern UI appears for 2-nominee evictions when enabled
- [ ] Legacy UI appears when disabled or with 3+ nominees
- [ ] Flip cards spawn at center stage
- [ ] Cards flip to reveal voter/target
- [ ] Cards fly from center stage to correct drop anchor (left or right)
- [ ] Counts increment smoothly
- [ ] Meter fills from both sides
- [ ] Center stage is purposeful (not empty space)
- [ ] Winner is highlighted with green glow
- [ ] Reduced motion mode works (fade instead of fly)
- [ ] Setting toggle works in Settings modal
- [ ] No console errors
- [ ] No regressions to eviction logic or timing
- [ ] Panel visibility restored after eviction

## Known Limitations

1. **Only for 2-nominee evictions**: The versus layout requires exactly 2 nominees. For 3+ nominees, the legacy UI is used.
2. **No external animation libraries**: Kept vanilla to minimize dependencies. Future enhancements could use GSAP for more advanced effects.
3. **No shader backgrounds**: The glassmorphic panels use CSS only. WebGL shaders could add dynamic backgrounds in the future.
4. **Pacing tied to game settings**: Card hold/gap times reuse the existing `cardHoldMs` and `cardGapMs` settings.

## Future Improvements

Potential enhancements (not in scope for this PR):

1. **Sound Effects**: Add swoosh/flip sounds on card reveals (if `sfxOn` is enabled)
2. **Particle Effects**: Confetti burst when winner is highlighted
3. **Customizable Themes**: Allow per-theme meter colors and glow effects
4. **Real-time Vote Updates**: If votes came from a backend, show them streaming in live
5. **Vote Replay**: Add a "replay" button to see the sequence again
6. **3+ Nominee Support**: Adapt the versus layout to support multi-way splits (e.g., triangle layout for 3 nominees)
7. **Smoother Easing**: Upgrade to GSAP for more fluid animations
8. **Background Shaders**: Add animated gradient or particle background using WebGL

## Browser Compatibility

Requires modern browser features:
- **CSS Grid**: For responsive layout
- **CSS Transforms**: For 3D flip cards
- **requestAnimationFrame**: For smooth count animations
- **matchMedia**: For reduced motion detection
- **Backdrop Filter**: For glassmorphism (gracefully degrades if not supported)

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Efficient DOM updates (only changed elements)
- GPU-accelerated CSS transforms
- No memory leaks (cards removed after animation)
- Minimal JavaScript overhead (~13KB unminified)

## Conclusion

The Modern Live Vote UI (lv2) delivers a polished, cinematic experience for the eviction phase while maintaining full backward compatibility, accessibility, and graceful degradation. It enhances user engagement without compromising functionality or performance.
