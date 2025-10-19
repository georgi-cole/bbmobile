# Eviction Visuals - Quick Reference

## What It Does

After the "Evicted" card:
1. **Avatar Animation**: Evicted player's avatar zooms in, turns B&W, fades out (~1.6s)

**Note**: Roster badge feature has been removed. The roster now shows the red X for all evicted players (original behavior).

## Key Files

```
js/eviction-visuals.js       - Core module (TV animation only)
styles.css                   - Animation CSS only
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
```

**Removed** (as of selective revert):
- `.finishing-badge` - removed
- `.status-finishing-badge` - removed
- `.avatar-rank-badge` - removed
- `.avatar-bw-dim` - removed
- `body.evict-visual-in-progress` - removed

## Guards

```javascript
game.__evictVisualDone[evictedId] = true  // Prevent duplicate runs
```

## Roster Display

**No changes**: Roster shows red X for all evicted players (original behavior).

Medal display unchanged:
- 🥇 Winner (1st place)
- 🥈 Runner-up (2nd place)

## Testing

```bash
# Open test page
open test_eviction_visuals.html

# Test steps
1. Click "Setup Game (12 players)"
2. Click "Evict Player 1"
3. Watch animation in TV (roster shows red X only)
```

## Console Logs

```
[eviction-visuals] start id=1 context={"reason":"vote"}
[eviction-visuals] complete id=1
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No animation | Check TV container exists (`#tv`) |
| Runs twice | Check guard: `game.__evictVisualDone[id]` |

## Quick Checklist

- [x] Module loaded: `typeof window.runEvictionVisual === 'function'`
- [x] TV container: `document.getElementById('tv')` exists
- [x] Guard set: `game.__evictVisualDone[id] === true`

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

## Code Size

- **eviction-visuals.js**: ~120 lines (reduced from 289)
- **CSS additions**: ~40 lines (reduced from ~80)
- **Test page**: Updated to test TV animation only

## Removed Features

The following features were part of PRs #317, #320, and #324 but have been selectively reverted:
- Finishing place badges on roster (3rd, 4th, 5th, etc.)
- Avatar grayscale/opacity effects on roster
- Red X suppression for badged players
- `body.evict-visual-in-progress` class
- `notifyEvictedForVisual()` function
- `updateRosterFinishingBadge()` function
- `updateExistingTile()` function

## Dependencies

- `global.getP()` - Get player by ID
- `global.resolveAvatar()` - Get avatar URL
- `global.cardQueueWaitIdle()` - Wait for cards (optional)

**Removed Dependencies**:
- `global.updateHud()` - no longer called by this module

## No Dependencies On

- jQuery
- React
- Vue
- External animation libraries
