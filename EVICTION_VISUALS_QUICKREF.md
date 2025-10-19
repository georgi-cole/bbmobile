# Eviction Visuals - Quick Reference

## What It Does

After the "Evicted" card:
1. **Avatar Animation**: Evicted player's avatar zooms in, turns B&W, fades out (~1.6s)
2. **Badge Update**: Roster shows "3rd", "12th", etc. instead of red X (for ranks ≥ 3)

## Key Files

```
js/eviction-visuals.js       - Core module
styles.css                   - Animation + badge CSS
test_eviction_visuals.html   - Test page
```

## Main Function

```javascript
runEvictionVisual(evictedId, context)
```

**Parameters**:
- `evictedId` (number): Player ID
- `context` (object): Optional { reason: 'vote'|'final3'|'final4'|'multi'|'self' }

**Returns**: Promise (resolves after animation completes)

## Integration Points

| Eviction Type | File | Function |
|--------------|------|----------|
| Standard Vote | `eviction.js` | `handleEvictionLegacy()` |
| Final 4 | `veto.js` | `finalizeFinal4Eviction()` |
| Final 3 | `competitions.js` | `finalizeFinal3Decision()` |
| Multi (2x/3x) | `eviction.js` | `multiEvictFinalize()` |

## CSS Classes

```css
.eviction-visual-avatar          /* Container */
.eviction-visual-avatar.zoom-in  /* Phase 1 */
.eviction-visual-avatar.grayscale /* Phase 2 */
.eviction-visual-avatar.fade-out  /* Phase 3 */
.finishing-badge                  /* Badge */
.status-finishing-badge           /* Roster badge */
```

## Guards

```javascript
game.__evictVisualDone[evictedId] = true  // Prevent duplicate runs
```

## Roster Badge Logic

```
Priority:
1. 🥇 Winner
2. 🥈 Runner-up  
3. "3rd", "12th", etc. (if evicted && finalRank ≥ 3)
4. NOM
5. HOH/POV
6. Name
```

## Testing

```bash
# Open test page
open test_eviction_visuals.html

# Test steps
1. Click "Setup Game (12 players)"
2. Click "Evict Player 1"
3. Watch animation + badge update
```

## Console Logs

```
[eviction-visuals] start id=1 context={"reason":"vote"}
[eviction-visuals] roster update id=1 rank=12
[eviction-visuals] complete id=1
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No animation | Check TV container exists (`#tv`) |
| No badge | Check roster rendered, player has `finalRank` |
| Runs twice | Check guard: `game.__evictVisualDone[id]` |
| Wrong rank | Verify `player.finalRank` set correctly |

## Quick Checklist

- [x] Module loaded: `typeof window.runEvictionVisual === 'function'`
- [x] TV container: `document.getElementById('tv')` exists
- [x] Roster rendered: `#rosterBar` has tiles
- [x] Guard set: `game.__evictVisualDone[id] === true`
- [x] Badge shown: Tile has `.finishing-badge` or `.status-finishing-badge`

## Example Usage

```javascript
// Standard eviction (in handleEvictionLegacy)
await global.runEvictionVisual(evictedId, { reason: 'vote' });

// Final 3 eviction (in finalizeFinal3Decision)
await global.runEvictionVisual(target, { reason: 'final3' });

// Multi-eviction (in multiEvictFinalize)
for(const id of evictedIds){
  await global.runEvictionVisual(id, { reason: 'multi' });
}
```

## Animation Timeline

```
0.0s: Avatar appears (scale 0.6, opacity 0)
0.6s: Zoom complete (scale 1.0, opacity 1)
1.0s: Grayscale applied
1.6s: Fade complete (opacity 0), element removed
```

## Badge Calculation

```javascript
// Rank calculation
const aliveCount = alivePlayers().length + 1;  // +1 for current eviction
player.finalRank = aliveCount;

// Badge display (only if rank ≥ 3)
if(player.finalRank >= 3) {
  showBadge(ordinal(player.finalRank)); // e.g., "3rd", "12th"
}
```

## Performance Notes

- **Animation**: Uses CSS transforms (GPU-accelerated)
- **Roster Update**: Single `updateHud()` call
- **Memory**: ~50 bytes per eviction (guard object)
- **DOM**: 1 temporary element created/removed per animation

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Animation | ✅ | ✅ | ✅ | ✅ |
| Badges | ✅ | ✅ | ✅ | ✅ |
| Async/Await | ✅ | ✅ | ✅ | ✅ |

## Common Patterns

**Check if visual ran**:
```javascript
if(game.__evictVisualDone[playerId]) {
  console.log('Visual already ran for player', playerId);
}
```

**Force re-run** (for testing):
```javascript
delete game.__evictVisualDone[playerId];
await runEvictionVisual(playerId);
```

**Skip animation** (no TV container):
```javascript
// Animation auto-skips if TV not found
// Badge update still happens
```

## Code Size

- **eviction-visuals.js**: 220 lines
- **CSS additions**: ~60 lines
- **Test page**: 370 lines
- **Total changes**: ~300 lines across 6 files

## Dependencies

- `global.getP()` - Get player by ID
- `global.resolveAvatar()` - Get avatar URL
- `global.cardQueueWaitIdle()` - Wait for cards
- `global.updateHud()` - Re-render roster

## No Dependencies On

- jQuery
- React
- Vue
- External animation libraries
