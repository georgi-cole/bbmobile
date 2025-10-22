# Modern Live Vote UI (Live Vote 2.0)

## Overview

The Modern Live Vote UI (internally called "lv2") is a cinematic, broadcast-style visual experience for the eviction phase that replaces the traditional "cards appear in a list" interface with a dynamic versus layout, flip card animations, and smooth meter fills.

## Features

### Visual Design
- **Versus Layout**: Nominees displayed left vs right with large avatars (80px), names, and live vote counts
- **Central Meter**: Animated distribution meter that fills from both sides as votes are revealed
- **Flip Cards**: Each vote appears as a flipping card labeled with the voter's name, then flies to the chosen nominee's lane
- **Glassmorphism**: Semi-transparent panels with subtle borders, neon accents, and soft glows
- **Winner Highlighting**: The leader/winner is highlighted with green glow at sequence end

### Accessibility
- **ARIA Live Regions**: Vote reveals and count updates are announced to screen readers
- **High Contrast Support**: Readable colors that work with colorblind mode
- **Reduced Motion**: Automatically detected via `prefers-reduced-motion` media query
  - When enabled: Cards fade in/out instead of flipping and flying
  - Counts update directly without odometer animation
  - Meter fills without complex transitions

### Technical Implementation
- **No External Dependencies**: Pure vanilla JS with CSS transitions and `requestAnimationFrame`
- **Optional Integration**: Completely optional via settings toggle; falls back to legacy UI when disabled
- **Non-Breaking**: Does not alter existing game logic, timing, or eviction flow

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
// Initialize with two nominees
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

// Check if enabled
console.log(lv2.enabled);  // reads from game.cfg.modernLiveVoteUI

// Check if reduced motion is active
console.log(lv2.reducedMotion);  // true if prefers-reduced-motion is set
```

### 2. Integration in `js/eviction.js`

#### `renderLiveVotePanel()`
- Checks if lv2 should be used (2 nominees + enabled in settings)
- If yes: calls `lv2.init()` with nominee data
- Legacy UI elements (info text, voter list, buttons) remain below the lv2 panel for compatibility

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
- After each vote is resolved and the diary room card is shown, calls `lv2.pushVote()` to mirror the vote visually
- Uses optional chaining to ensure safety if lv2 is not loaded

```javascript
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

#### After sequence completion
- Calls `lv2.finish()` to highlight the winner

```javascript
// Hook: Mark lv2 as finished
if(twoMode && global.lv2?.finish){
  global.lv2.finish();
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

- `.lv2-panel` - Main container with glassmorphic background
- `.lv2-versus` - Grid layout for left/meter/right
- `.lv2-contestant` - Individual contestant card (left/right)
- `.lv2-avatar` - Circular avatar (80px)
- `.lv2-name` - Contestant name
- `.lv2-count` - Vote count with glow effect
- `.lv2-meter` - Central vertical meter
- `.lv2-fill.left` / `.lv2-fill.right` - Meter fill bars
- `.lv2-meter-glow` - Animated glow effect
- `.lv2-reveal` - Container for flip cards
- `.lv2-card` - Individual flip card
- `.lv2-card-inner` - Inner wrapper for 3D transform
- `.lv2-face.front` / `.lv2-face.back` - Card faces
- `.lv2-status` - Status text area
- `.lv2-contestant.winner` - Applied to winning contestant

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
2. Progress to Live Vote phase
3. Observe the modern UI rendering with 2 nominees
4. Watch votes reveal with flip and fly animations
5. Check that legacy buttons and info text still work
6. Verify winner highlighting at the end

### Manual Testing Checklist
- [ ] Modern UI appears for 2-nominee evictions when enabled
- [ ] Legacy UI appears when disabled or with 3+ nominees
- [ ] Flip cards appear and flip on reveal
- [ ] Cards fly to correct side (left or right)
- [ ] Counts increment smoothly
- [ ] Meter fills from both sides
- [ ] Winner is highlighted with green glow
- [ ] Reduced motion mode works (fade instead of fly)
- [ ] ARIA announcements work with screen readers
- [ ] Setting toggle works in Settings modal
- [ ] No console errors
- [ ] No regressions to eviction logic or timing

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
