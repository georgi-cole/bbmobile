# Eviction Visuals: Before vs After

## Visual Comparison

### BEFORE (v1.0)
```
Timeline:
0s ──────────────> 3.6s ───────────> 5.2s ──────────────> ∞

┌────────────────┐
│ EVICTED CARD   │
│  Player Name   │
└────────────────┘
                  ┌────────────────┐
                  │ ROSTER UPDATE  │  ← INTERIM (pale-out + red X)
                  │   ❌ Player 1  │
                  │   ⚪ Player 2  │
                  └────────────────┘
                                     ┌────────────────┐
                                     │ TV ANIMATION   │
                                     │  (zoom/b&w)    │
                                     └────────────────┘
                                                        ┌────────────────┐
                                                        │ FINAL ROSTER   │
                                                        │     12th       │ ← Badge replaces name
                                                        │   ❌ (hidden)  │
                                                        └────────────────┘

Problems:
• Interim roster update creates visual "flash"
• Red X appears, then disappears
• Name is replaced by badge (identity lost)
• Disorienting sequence
```

### AFTER (v2.0)
```
Timeline:
0s ──────────────> 3.6s ───────────> 5.2s ──────────────> ∞

┌────────────────┐
│ EVICTED CARD   │
│  Player Name   │
└────────────────┘
  ↓ body class added (suppress interim visuals)
                  ┌────────────────┐
                  │ TV ANIMATION   │  ← Direct to animation
                  │  (zoom/b&w)    │     NO interim roster!
                  └────────────────┘
  ↓ body class removed
                                     ┌────────────────┐
                                     │ FINAL ROSTER   │
                                     │  ┌──────┐      │
                                     │  │  👤  │      │
                                     │  │   12th│ ← Badge inside
                                     │  └──────┘      │
                                     │ Player Name    │ ← Name visible!
                                     └────────────────┘

Improvements:
✓ Smooth transition: card → animation → final state
✓ No interim "flash" or visual jank
✓ Red X completely suppressed during animation
✓ Badge positioned inside avatar (professional)
✓ Name remains visible (identity preserved)
```

## Roster Tile Comparison

### BEFORE (v1.0)
```
┌──────────────────┐
│  ┌────────────┐  │
│  │   Avatar   │  │
│  │   Image    │  │ ← Red X visible
│  │     ❌     │  │
│  └────────────┘  │
│                  │
│      12th        │ ← Badge replaces name
└──────────────────┘

Issues:
• Red X clutters avatar
• Badge replaces name (identity lost)
• Two competing visual indicators
```

### AFTER (v2.0)
```
┌──────────────────┐
│  ┌────────────┐  │
│  │   Avatar   │  │
│  │   Image    │  │ ← Clean avatar (no X)
│  │        12th│  │ ← Badge in corner
│  └────────────┘  │
│                  │
│   Player Name    │ ← Name preserved!
└──────────────────┘

Improvements:
• Clean avatar (no red X clutter)
• Badge inside avatar (subtle, professional)
• Name visible (identity preserved)
• Single clear visual indicator
```

## Medal/Award System (Unchanged)

### 1st Place (Winner)
```
┌──────────────────┐
│  ┌────────────┐  │
│  │   Avatar   │  │
│  │   Image    │  │
│  │            │  │
│  └────────────┘  │
│                  │
│       🥇         │ ← Gold medal
└──────────────────┘
```

### 2nd Place (Runner-Up)
```
┌──────────────────┐
│  ┌────────────┐  │
│  │   Avatar   │  │
│  │   Image    │  │
│  │            │  │
│  └────────────┘  │
│                  │
│       🥈         │ ← Silver medal
└──────────────────┘
```

### 3rd Place (Bronze Medalist)
```
┌──────────────────┐
│  ┌────────────┐  │
│  │   Avatar   │  │
│  │   Image    │  │ ← No medal emoji
│  │         3rd│  │ ← Ordinal badge
│  └────────────┘  │
│                  │
│   Player Name    │ ← Name visible
└──────────────────┘
```

## Animation Suppression

### During Animation (body.evict-visual-in-progress)
```css
/* Red X is hidden */
body.evict-visual-in-progress .evicted-cross {
  display: none !important;
}

/* Avatar stays colorful (no grayscale) */
body.evict-visual-in-progress .top-tile-avatar.grayed {
  filter: none !important;
  opacity: 1 !important;
}
```

### Visual Result
```
WITHOUT body class:          WITH body class:
(visible red X)              (clean avatar)

┌────────────┐              ┌────────────┐
│   Avatar   │              │   Avatar   │
│     ❌     │              │            │ ← No interim visuals!
│  (pale)    │              │  (color)   │
└────────────┘              └────────────┘
```

## Code Flow Comparison

### BEFORE (v1.0)
```javascript
// 1. Show card
global.showCard('Evicted', [player.name], 'evict', 3600);

// 2. Roster auto-updates (pale-out + red X appear)
//    ← PROBLEM: This happens immediately!

// 3. Wait for card queue
await global.cardQueueWaitIdle();

// 4. Run animation
await animateEvictedAvatar(evictedId);

// 5. Update roster (badge replaces name)
updateRosterFinishingBadge(evictedId);
```

### AFTER (v2.0)
```javascript
// 1. NOTIFY (suppress interim visuals)
global.notifyEvictedForVisual(evictedId, 'vote');
//    ↑ Adds body class immediately

// 2. Show card
global.showCard('Evicted', [player.name], 'evict', 3600);

// 3. Roster updates are suppressed (body class override)
//    ← SOLUTION: No interim red X or pale-out!

// 4. Wait for card queue
await global.cardQueueWaitIdle();

// 5. Run animation
await animateEvictedAvatar(evictedId);

// 6. Update roster (badge inside avatar, name visible)
updateRosterFinishingBadge(evictedId);

// 7. Remove body class (show final state)
//    ↑ Finally block ensures cleanup
```

## User Experience Impact

### BEFORE
1. See "Evicted" card
2. **Brief flash of red X and pale-out** ← Jarring!
3. TV animation plays
4. Badge appears (replaces name)

**Issue**: The interim visual creates a "double take" effect that's disorienting and unprofessional.

### AFTER
1. See "Evicted" card
2. **Direct to TV animation** ← Smooth!
3. Final roster with badge in avatar
4. Name remains visible

**Improvement**: Smooth, professional sequence that matches broadcast TV standards. No jarring interim visuals.

## Technical Benefits

### Performance
- **No extra DOM updates**: Body class prevents wasteful interim rendering
- **Single paint**: Final roster state painted once after animation
- **Hardware accelerated**: CSS-only suppression (no JS polling)

### Maintainability
- **Declarative**: CSS controls visual suppression
- **Centralized**: One body class for all suppression logic
- **Testable**: Easy to verify body class presence/absence

### Resilience
- **Graceful degradation**: Works even if functions don't exist
- **Idempotent**: Body class cleanup guaranteed by finally block
- **Non-breaking**: Additive changes only

## Summary

The refinements transform the eviction sequence from a **jarring, multi-step visual** to a **smooth, professional experience** that:

1. ✅ Eliminates interim roster "flash"
2. ✅ Positions badge inside avatar (professional)
3. ✅ Preserves houseguest identity (name visible)
4. ✅ Suppresses red X during animation
5. ✅ Maintains medal system for finalists
6. ✅ Works across all eviction types

**Result**: A polished, broadcast-quality eviction sequence that feels intentional and professional rather than accidental and janky.
