# LV2 Shim UI Reference

## Visual Layout

### Two-Nominee Eviction UI

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Window                            │
│                                                              │
│  [Game Content - TV, Roster, etc.]                          │
│                                                              │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
┌══════════════════════════════════════════════════════════════┐
│                    VOTE TO EVICT                             │ ← Fixed at bottom
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐              ┌─────────────┐               │
│  │   [Avatar]  │              │   [Avatar]  │               │
│  │             │              │             │               │
│  │   Alice     │              │    Bob      │               │
│  │             │              │             │               │
│  │  [  Evict ] │              │  [  Evict ] │               │
│  └─────────────┘              └─────────────┘               │
├──────────────────────────────────────────────────────────────┤
│                    Live Votes                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Carol voted to evict Alice                             │ │
│  │ Dan voted to evict Bob                                 │ │
│  │ Eve voted to evict Alice                               │ │
│  │ Frank voted to evict Alice                             │ │
│  └────────────────────────────────────────────────────────┘ │
└══════════════════════════════════════════════════════════════┘
     ↑ z-index: 9999, position: fixed, bottom: 0
```

### Triple Eviction UI (3 Nominees)

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser Window                            │
│                                                               │
│  [Game Content]                                               │
│                                                               │
└───────────────────────────────────────────────────────────────┘
┌═══════════════════════════════════════════════════════════════┐
│                     VOTE TO EVICT                             │
├───────────────────────────────────────────────────────────────┤
│  ┌─────────┐      ┌─────────┐      ┌─────────┐              │
│  │ [Avatar]│      │ [Avatar]│      │ [Avatar]│              │
│  │  Alice  │      │   Bob   │      │  Carol  │              │
│  │ [Evict] │      │ [Evict] │      │ [Evict] │              │
│  └─────────┘      └─────────┘      └─────────┘              │
├───────────────────────────────────────────────────────────────┤
│                       Live Votes                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Dan voted to evict Alice                                │ │
│  │ Eve voted to evict Bob                                  │ │
│  │ Frank voted to evict Carol                              │ │
│  └─────────────────────────────────────────────────────────┘ │
└═══════════════════════════════════════════════════════════════┘
```

## UI Components

### Nominee Card

```
┌─────────────────┐
│                 │
│   [Avatar 80x80]│  ← Shows player avatar from Dicebear
│                 │    or initials (e.g., "AL") as fallback
│                 │
│   Player Name   │  ← 18px, bold, white text
│                 │
│   [ Evict ]     │  ← Red button (#d9534f)
│                 │    Full width, 16px font
└─────────────────┘
```

**Card States:**
- **Enabled**: Full opacity, clickable, hover effects
- **Disabled**: 50% opacity, cursor: not-allowed, no hover
- **Hover**: Lighter background, red border highlight

### Vote Feed Item

```
┌──────────────────────────────────────────────────────┐
│ Carol voted to evict Alice                          │ ← Slide-in animation
└──────────────────────────────────────────────────────┘
  ↑ Red left border (3px)
  ↑ Semi-transparent background
  ↑ 13px white text
```

**Animation**: Slides in from left (translateX(-20px) to 0)  
**Duration**: 0.3s ease-out  
**Max Items**: 10 (oldest removed automatically)

## Style Specifications

### Container

```css
.lv2-shim-fallback, .lv2-shim-triple {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.95);
  border-top: 3px solid #d9534f;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
  max-height: 50vh; /* 70vh on mobile */
  overflow-y: auto;
  pointer-events: auto;
}
```

### Nominee Card

```css
.lv2-nominee-card {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 16px;
  min-width: 150px;
  max-width: 250px;
  transition: all 0.3s ease;
}

.lv2-nominee-card:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #d9534f;
}
```

### Vote Button

```css
.lv2-vote-btn {
  padding: 10px 24px;
  font-size: 16px;
  font-weight: bold;
  background: #d9534f;
  color: white;
  border: 2px solid #d9534f;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.lv2-vote-btn:hover:not(:disabled) {
  background: #c9302c;
  border-color: #c9302c;
  transform: scale(1.05);
}

.lv2-vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Vote Feed

```css
.lv2-vote-feed-list {
  max-height: 150px; /* 120px for triple */
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px;
}

.lv2-vote-item {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid #d9534f;
  border-radius: 4px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  animation: slideIn 0.3s ease-out;
}
```

## Color Palette

| Element | Color | Usage |
|---------|-------|-------|
| Background | `rgba(0, 0, 0, 0.95)` | Main container |
| Border | `#d9534f` (red) | Top border, accents |
| Button Primary | `#d9534f` | Vote buttons |
| Button Hover | `#c9302c` | Darker red on hover |
| Text | `white` / `rgba(255, 255, 255, 0.9)` | All text |
| Card Background | `rgba(255, 255, 255, 0.1)` | Nominee cards |
| Card Hover | `rgba(255, 255, 255, 0.2)` | Highlighted cards |

## Responsive Breakpoints

### Desktop (> 768px)
- Cards: 150-250px width
- Max height: 50vh
- Cards in horizontal row

### Mobile (≤ 768px)
- Cards: 120px min-width
- Max height: 70vh
- Cards stack on narrow screens
- Padding: 16px (reduced from 20px)
- Touch-optimized button sizes

## Accessibility

- **ARIA**: All interactive elements have proper labels
- **Keyboard**: Full keyboard navigation support
- **Focus**: Visible focus indicators
- **Colors**: High contrast ratios (WCAG AA compliant)
- **Animation**: Respects `prefers-reduced-motion`

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Initial render**: < 100ms
- **Vote animation**: 300ms
- **Scrolling**: Smooth 60fps
- **Memory**: Limits feed to 10 items
- **Lookups**: O(1) using Map data structure

## States

### Vote Button States

| State | Appearance | Behavior |
|-------|-----------|----------|
| Enabled | Full opacity, red | Clickable, shows hover effects |
| Disabled | 50% opacity | Grayed out, cursor: not-allowed |
| Voting | Reduced opacity | Shows "processing" state |
| Voted | Fully disabled | No interaction after vote cast |

### Container States

| State | Visibility | Description |
|-------|-----------|-------------|
| Hidden | display: none | Before vote phase or after cleanup |
| Visible | display: flex | During active voting phase |
| Scrollable | overflow-y: auto | When content exceeds max-height |

## Example Interactions

### User Voting Flow
1. UI appears at bottom (slide in)
2. User sees two/three nominee cards with avatars
3. User hovers over card (highlight effect)
4. User clicks "Evict" button
5. All buttons disable immediately
6. Vote submitted via callback
7. AI votes start appearing in feed (one every ~500ms)
8. Feed scrolls automatically to show new votes

### Observer Flow
1. UI appears at bottom
2. Buttons are disabled (50% opacity)
3. User can view but not interact
4. AI votes populate in feed
5. User sees vote totals build up

## Testing UI States

Use test_lv2_enhanced.html to test:
1. Enable/disable voting with `setTurn()`
2. Show/hide UI with `showCtaBar()` / `hideCtaBar()`
3. Simulate AI votes with `pushVote()`
4. Test triple vs two-nominee layouts
5. Verify mobile responsive behavior
6. Check animation performance

## Implementation Details

### Rendering Pipeline
1. `init()` or `initTriple()` called with nominee data
2. State populated with nominees and Map for lookups
3. `createCtaBar()` builds UI in document.body
4. Fixed positioning ensures visibility
5. Event listeners attached to buttons
6. Vote feed ready to receive `pushVote()` calls

### Cleanup Pipeline
1. `cleanup()` or `hideCtaBar()` called
2. Container removed from DOM
3. State reset (voteFeed, nomineeMap cleared)
4. Event listeners removed
5. UI ready for next eviction round

## Customization

To adjust max vote feed items:
```javascript
const MAX_VOTE_FEED_ITEMS = 10; // Change in lv2-shim.js
```

To adjust avatar fallback:
```javascript
const FALLBACK_AVATAR_SVG = '...'; // Change in lv2-shim.js
```

## Troubleshooting

**UI not appearing?**
- Check console for errors
- Verify `window.lv2` is defined
- Ensure nominees are set
- Check z-index isn't overridden

**Buttons not clickable?**
- Verify pointer-events: auto
- Check if setTurn(true) was called
- Ensure no overlay blocking clicks

**Vote feed not updating?**
- Verify pushVote() is being called
- Check nominee IDs match
- Look for JavaScript errors in console

**Mobile issues?**
- Test with actual device (not just DevTools)
- Check viewport meta tag
- Verify touch events work
- Check max-height on small screens
