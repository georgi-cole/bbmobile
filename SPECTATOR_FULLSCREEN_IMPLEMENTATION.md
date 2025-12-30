# Spectator Mode Fullscreen Implementation

## Overview
This document describes the implementation of fullscreen spectator mode for Final 3 competitions, replacing the previous panel-based approach with an immersive fullscreen overlay.

## Problem Statement
Previously, spectator mode rendered inside the `#panel` element below the TV viewport, causing:
- Awkward scrolling experience
- Limited visual impact
- Poor use of screen space
- Robohash avatars instead of real player photos
- Static, less engaging display

## Solution
Transformed spectator mode into a fullscreen overlay with enhanced visual features:

### 1. Fullscreen Overlay
- Mounts directly to `document.body` instead of `#panel`
- Uses `position: fixed; inset: 0` for full viewport coverage
- High z-index (10000) ensures visibility above all content
- Dark backdrop with blur effect for focus

### 2. Enhanced Visuals
- **Competitor Cards**: Larger, more prominent with shimmer effects
- **Avatars**: 100px (up from 80px) with glowing golden borders
- **Dynamic Scores**: Live-updating scores with flash animations
- **Progress Bar**: Enhanced with glow effects and smooth transitions
- **Typography**: Larger fonts with text shadows for readability

### 3. Real Player Photos
- Integrated with `global.resolveAvatar()` system
- Properly loads player photos via `player.photo`, `player.img`, or `player.avatar`
- Falls back to Dicebear only if no photo available

### 4. Competition Simulation
- Scores update every 3-5 seconds with random increments
- Dynamic messages with player name substitution
- Animated score changes with color flash
- Progress messages and commentary phrases

## Technical Implementation

### JavaScript Changes (`js/spectator-view.js`)

```javascript
// OLD: Rendered in panel
container = document.getElementById('panel')

// NEW: Fullscreen overlay
view.style.cssText = `
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: linear-gradient(135deg, rgba(10,15,25,0.98) 0%, rgba(15,20,35,0.98) 100%);
  backdrop-filter: blur(12px);
  ...
`;
document.body.appendChild(view);
```

### Avatar Loading
```javascript
// OLD: Always used Dicebear
avatar.src = getDicebearUrl(player.avatar || player.name);

// NEW: Use real photos via resolveAvatar
const avatarUrl = global.resolveAvatar?.(player) || getDicebearUrl(player.avatar || player.name);
avatar.src = avatarUrl;
```

### Dynamic Scores
```javascript
// Added score simulation
const scoreElements = document.querySelectorAll('.competitor-score');
let currentScores = competitorIds.map(() => 0);

progressInterval = setInterval(() => {
  // Update scores with random increments
  scoreElements.forEach((el, idx) => {
    const increment = Math.floor(Math.random() * 150) + 50;
    currentScores[idx] += increment;
    el.textContent = currentScores[idx].toString();
    
    // Flash animation
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'scoreFlash 0.5s ease';
  });
}, 3000 + Math.random() * 2000);
```

### CSS Changes (`styles.css`)

```css
/* Fullscreen overlay */
.spectator-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: linear-gradient(135deg, rgba(10,15,25,0.98) 0%, rgba(15,20,35,0.98) 100%);
  backdrop-filter: blur(12px);
}

/* Enhanced competitor cards */
.spectator-competitor {
  border: 3px solid #6b7a99;
  border-radius: 16px;
  padding: 24px;
  min-width: 180px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 64px rgba(107,122,153,0.2);
}

/* Score flash animation */
@keyframes scoreFlash {
  0%, 100% {
    color: #83bfff;
    transform: scale(1);
  }
  50% {
    color: #ffdc8b;
    transform: scale(1.15);
  }
}
```

## Usage

Spectator mode is automatically shown during Final 3 competitions when:
1. Human player won Part 1 and watches Part 2
2. Human player lost both parts and watches Part 3
3. Human player is in jury and watches finale

Example call from `competitions.js`:
```javascript
global.SpectatorView.show({
  competitorIds: [playerId1, playerId2],
  gameType: 'memory',
  phase: 'Final 3 — Part 2',
  onSkip: () => {
    // Skip to results
    g.__skipRequested = true;
  }
});
```

## Testing

### Manual Testing
1. Open `test_spectator_fullscreen.html` in browser
2. Click "Test Final 3 - Part 2" to see spectator mode
3. Observe:
   - Fullscreen overlay
   - Dynamic score updates
   - Animated progress messages
   - Flash effects on score changes
   - Skip button functionality

### Automated Testing
```bash
npm run test:minigames  # Validates no regressions
```

## Benefits

1. **Better UX**: Immersive fullscreen experience
2. **Visual Polish**: Enhanced animations and effects
3. **Realism**: Real player photos and dynamic scores
4. **Engagement**: More interesting to watch AI competitions
5. **Accessibility**: Larger text and better contrast
6. **Mobile-Friendly**: Responsive design adapts to screen size

## Backwards Compatibility

- Maintains existing API (no breaking changes)
- Works with existing competition flow in `competitions.js`
- Falls back gracefully if photos unavailable
- Compatible with jury spectator mode
- No changes required in calling code

## Future Enhancements

Possible improvements:
1. Add actual minigame visualization (not just scores)
2. Show real-time progress indicators per player
3. Add sound effects for score changes
4. Implement replay system to show highlights
5. Add more detailed competition statistics
6. Support for more than 2 competitors

## Related Files

- `js/spectator-view.js` - Main implementation
- `styles.css` - Spectator styling (lines 9588-9800)
- `js/competitions.js` - Integration points (lines 1857, 2029)
- `test_spectator_fullscreen.html` - Manual test file

## References

- Issue: "Spectator mode during final week not on full screen"
- Pattern: Other fullscreen overlays in codebase (modals, finale)
- Avatar System: `js/avatar.js` for photo resolution
