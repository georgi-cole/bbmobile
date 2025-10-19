# Eviction Visuals - Quick Reference v2

## Quick Start

### Test the Refinements
Open `test_eviction_visual_refinements.html` in a browser and click through the test scenarios.

### Key Changes from v1
1. **No interim roster update**: Red X and pale-out are suppressed during animation
2. **Badge inside avatar**: Finishing badge renders in avatar corner, not as name replacement
3. **Name stays visible**: Houseguest name remains below avatar
4. **Body class suppression**: `evict-visual-in-progress` class controls interim visual hiding

## Visual Sequence

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EVICTED CARD                                             │
│    "Evicted: [Player Name]"                                 │
│    Duration: ~3.6s                                          │
│    Body class added: evict-visual-in-progress               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FAUX TV ANIMATION                                        │
│    • Zoom in (0.6s)                                         │
│    • Grayscale (0.4s)                                       │
│    • Fade out (0.6s)                                        │
│    Total: ~1.6s                                             │
│                                                             │
│    During this time:                                        │
│    ❌ Red X is hidden (body class override)                 │
│    ❌ Grayscale is suppressed (body class override)         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. FINAL ROSTER STATE                                       │
│    Body class removed: evict-visual-in-progress             │
│                                                             │
│    ┌───────────────┐                                       │
│    │   Avatar      │  ← Badge inside (bottom-right)        │
│    │    Image      │                                       │
│    │           12th│                                       │
│    └───────────────┘                                       │
│      Player Name    ← Name visible                         │
│                                                             │
│    Red X: hidden/removed                                   │
│    Grayscale: applied                                      │
└─────────────────────────────────────────────────────────────┘
```

## Function Reference

### Main Functions

#### `notifyEvictedForVisual(evictedId, source)`
**Purpose**: Signal that an eviction visual is pending  
**When**: Called BEFORE showing the Evicted card  
**Effect**: Adds `evict-visual-in-progress` body class  
**Source**: `'vote'` | `'self'` | `'final4'` | `'final3'` | `'multi'`

```javascript
// Example usage
if(typeof window.notifyEvictedForVisual === 'function') {
  window.notifyEvictedForVisual(evictedId, 'vote');
}
```

#### `runEvictionVisual(evictedId, context)`
**Purpose**: Execute the full visual sequence  
**When**: Called AFTER the Evicted card is shown  
**Effect**: 
- Waits for card queue
- Plays faux TV animation
- Updates roster with badge
- Removes body class in finally block

```javascript
// Example usage
if(typeof window.runEvictionVisual === 'function') {
  await window.runEvictionVisual(evictedId, { reason: 'vote' });
}
```

### Integration Points

| File | Function | When to Notify | When to Run Visual |
|------|----------|----------------|-------------------|
| `eviction.js` | `handleEvictionLegacy()` | Before showCard | After showCard |
| `eviction.js` | `multiEvictFinalize()` | Before showCard | After showCard (per player) |
| `competitions.js` | `finalizeFinal3Decision()` | Before decision card | After "Third Place" card |
| `veto.js` | `finalizeFinal4Eviction()` | Before eviction card | After showCard |
| `self-eviction.js` | `processEviction()` | In processEviction | In processEviction |

## CSS Classes

### `.avatar-rank-badge`
Position: Inside avatar container (bottom-right)  
Display: Ordinal text (e.g., "3rd", "12th")  
Ranks: 3rd place and below only  
Z-index: 5 (above avatar, below modals)

```css
.avatar-rank-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  /* ... styling ... */
}
```

### `body.evict-visual-in-progress`
**Purpose**: Suppress interim visuals during animation

**Overrides**:
```css
/* Hide red X */
body.evict-visual-in-progress .evicted-cross {
  display: none !important;
}

/* Prevent grayscale during animation */
body.evict-visual-in-progress .top-tile-avatar.grayed {
  filter: none !important;
  opacity: 1 !important;
}
```

## Roster Rendering Logic

### Label Precedence (No Change)
1. 🥇 WINNER (1st place)
2. 🥈 RUNNER-UP (2nd place)
3. NOM (nominated)
4. HOH (Head of Household)
5. POV (Power of Veto)
6. Player Name (default)

### Badge Rendering (New)
- **Ranks 1-2**: No badge, medals shown as label
- **Ranks 3+**: Badge inside avatar, name shown as label

```javascript
// Badge is added inside avatar wrap
if(p.evicted && p.showFinishingBadge && p.finalRank >= 3) {
  const badge = document.createElement('div');
  badge.className = 'avatar-rank-badge';
  badge.textContent = ordinal(p.finalRank);
  wrap.appendChild(badge);
}
```

## Troubleshooting

### Issue: Red X still appears during animation
**Check**: Body class is being added in `notifyEvictedForVisual()`  
**Fix**: Ensure notification is called BEFORE showCard

### Issue: Badge replaces name
**Check**: Roster rendering logic in `ui.hud-and-router.js`  
**Fix**: Badge should be in avatar wrap, not name div

### Issue: Badge not inside avatar
**Check**: Avatar wrap has `position: relative`  
**Fix**: Set `wrap.style.position = 'relative'` in roster renderer

### Issue: Animation doesn't remove body class
**Check**: `runEvictionVisual()` has try/finally block  
**Fix**: Ensure finally block removes class

## Testing Checklist

- [ ] Standard eviction: badge inside avatar, name visible
- [ ] Final 4: 4th place badge appears correctly
- [ ] Final 3: 3rd place badge appears, finalists show medals
- [ ] Self-eviction: same sequence, no duplicate animation
- [ ] Multi-eviction: each player gets animation sequentially
- [ ] Body class added before card
- [ ] Body class removed after animation
- [ ] Red X hidden during animation
- [ ] Red X removed after animation completes
- [ ] No interim grayscale during animation

## Performance Notes

- **Animation duration**: ~1.6 seconds
- **Memory overhead**: Minimal (one flag per evicted player)
- **DOM updates**: 1 per eviction (badge insertion)
- **CSS**: Hardware accelerated transforms
- **Idempotent**: Runs only once per eviction

## API Stability

All functions are exported to `window` global scope for compatibility:
- `window.runEvictionVisual`
- `window.notifyEvictedForVisual`

Check for existence before calling:
```javascript
if(typeof window.runEvictionVisual === 'function') {
  await window.runEvictionVisual(evictedId, context);
}
```

## Related Documentation

- **Full Implementation**: `EVICTION_VISUAL_REFINEMENTS_SUMMARY.md`
- **Original Feature**: `EVICTION_VISUALS_README.md`
- **Test Page**: `test_eviction_visual_refinements.html`
- **Source Code**: `js/eviction-visuals.js`

## Version History

- **v2.0** (2025-10-19): Refinements per user feedback
  - Body class suppression of interim visuals
  - Badge positioning inside avatar
  - Name label remains visible
  - Red X hidden when badge shown

- **v1.0** (2025-10-19): Initial implementation
  - Faux TV animation
  - Finishing badges for 3rd+
  - Integration with all eviction types
