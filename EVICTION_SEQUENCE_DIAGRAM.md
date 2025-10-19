# Eviction Sequence Swap - Visual Diagram

## Timeline Comparison

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OLD SEQUENCE                                │
└─────────────────────────────────────────────────────────────────────┘

  ┌───────────────┐
  │ Announcement  │   "Player 3, you have been evicted."
  │     Card      │
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │  Red X Shows  │   ❌ PROBLEM: Shows too early!
  │   on Roster   │   Player 3's avatar gets red X immediately
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │  TV Animation │   Big avatar: zoom-in → B&W → fade
  │     Plays     │   (1.6 seconds)
  └───────────────┘



┌─────────────────────────────────────────────────────────────────────┐
│                         NEW SEQUENCE                                │
└─────────────────────────────────────────────────────────────────────┘

  ┌───────────────┐
  │ Announcement  │   "Player 3, you have been evicted."
  │     Card      │
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │  TV Animation │   ✓ PLAYS FIRST: Big avatar animation
  │     Plays     │   zoom-in → B&W → fade (1.6 seconds)
  └───────┬───────┘   
          │           During this time:
          │           - Red X is SUPPRESSED
          │           - __pendingEvictionVisuals contains Player 3
          │           - __suppressEvictedHudUntilVisualDone = true
          │
          ▼
  ┌───────────────┐
  │  Red X Shows  │   ✓ SHOWS AFTER: Red X appears on roster
  │   on Roster   │   Player 3's avatar gets red X
  └───────────────┘   - Suppression flag cleared
                      - updateHud() triggered
```

## State Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│  handleEvictionLegacy(evictedId)                               │
└────────────────────────────────────────────────────────────────┘
         │
         │  1. Mark player as evicted
         │  2. Show announcement card
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  notifyEvictedForVisual(evictedId)                             │
│                                                                 │
│  Sets:                                                          │
│  • __pendingEvictionVisuals.add(evictedId)                     │
│  • __suppressEvictedHudUntilVisualDone = true                  │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  await runEvictionVisual(evictedId)                            │
│                                                                 │
│  Animation sequence:                                            │
│  1. Wait for card queue idle                                   │
│  2. Create avatar element in TV                                │
│  3. Zoom in (0.6s)                                             │
│  4. Apply grayscale (0.4s)                                     │
│  5. Fade out (0.6s)                                            │
│  6. Remove element                                             │
│                                                                 │
│  DURING THIS TIME: renderTopRoster() skips red X               │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  Animation Complete                                            │
│                                                                 │
│  Clear suppression:                                            │
│  • __suppressEvictedHudUntilVisualDone = false                 │
│                                                                 │
│  Trigger HUD update:                                           │
│  • updateHud()                                                 │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  renderTopRoster()                                             │
│                                                                 │
│  For each player:                                              │
│    if (p.evicted) {                                            │
│      isSuppressed = game.__suppressEvictedHudUntilVisualDone   │
│                     && pendingSet.has(p.id)                    │
│      if (!isSuppressed) {                                      │
│        ✓ RENDER RED X                                          │
│      }                                                          │
│    }                                                            │
└────────────────────────────────────────────────────────────────┘
```

## Multi-Eviction Flow

```
Double Eviction (Players 2 and 3)

┌─────────────────────────────────────────────────────────────┐
│  multiEvictFinalize([2, 3], ...)                            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Notify for ALL evicted:                                    │
│  • notifyEvictedForVisual(2)                                │
│  • notifyEvictedForVisual(3)                                │
│                                                              │
│  Result:                                                     │
│  __pendingEvictionVisuals = Set {2, 3}                      │
│  __suppressEvictedHudUntilVisualDone = true                 │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Sequential Animations:                                     │
│                                                              │
│  for id in [2, 3]:                                          │
│    await runEvictionVisual(id, {reason: 'multi'})           │
│                                                              │
│  BOTH red X suppressed during ALL animations               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  ALL Animations Complete                                    │
│                                                              │
│  • __suppressEvictedHudUntilVisualDone = false              │
│  • updateHud()                                              │
│                                                              │
│  BOTH red X now appear together                            │
└─────────────────────────────────────────────────────────────┘
```

## Suppression Check Logic

```javascript
// In renderTopRoster() for each player tile:

if (p.evicted) {
  // Check if THIS specific player should be suppressed
  const isSuppressed = 
    game.__suppressEvictedHudUntilVisualDone &&  // Global flag
    game.__pendingEvictionVisuals?.has(p.id);    // Player in pending set
  
  if (!isSuppressed) {
    // ✓ Render red X
    createEvictedCross();
  } else {
    // ⏸ Skip red X (animation in progress)
  }
}
```

## Key Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `__pendingEvictionVisuals` | `Set<number>` | IDs of players with pending visual animations |
| `__suppressEvictedHudUntilVisualDone` | `boolean` | Global flag to enable suppression check |
| `__evictVisualDone` | `Object` | Track which players have completed visual (prevents re-run) |

## Edge Cases Handled

1. **Non-evicted players**: Check `p.evicted` first, never suppressed
2. **Other evicted players**: Only suppress if `pendingSet.has(p.id)`
3. **Multiple HUD renders**: Set-based check works on every render
4. **Animation failure**: Try-catch ensures suppression cleared
5. **Idempotent updates**: Can call `updateHud()` multiple times safely
