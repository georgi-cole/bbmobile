# Eviction Visuals - Quick Reference

## What It Does

After the "Evicted" card:
1. **Avatar Animation**: Evicted player's avatar zooms in, turns B&W, fades out (~1.6s)

**Note**: Roster badge feature has been removed. The roster now shows the red X for all evicted players (original behavior).

## Key Files

```
js/eviction-visuals.js         - Core module (TV animation only)
styles.css                     - Animation CSS with mobile centering fixes
test_eviction_visuals.html     - Test page
test_eviction_centering.html   - Centering verification test (with crosshairs)
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
.eviction-visual-avatar          /* Container (centered with vmin sizing) */
.eviction-visual-avatar.zoom-in  /* Phase 1 */
.eviction-visual-avatar.grayscale /* Phase 2 */
.eviction-visual-avatar.fade-out  /* Phase 3 */
.eviction-visual-group           /* Optional: Multi-eviction group layout */
```

**Centering improvements**:
- Uses `transform-origin: center` for proper scaling
- Size based on `vmin` (38vmin) instead of `vw` for better mobile sizing
- Ensures `pointer-events: none` to prevent interaction issues
- TV containers have `position: relative` and `overflow: hidden`

**Removed** (as of selective revert):
- `.finishing-badge` - removed
- `.status-finishing-badge` - removed
- `.avatar-rank-badge` - removed
- `.avatar-bw-dim` - removed
- `body.evict-visual-in-progress` - removed

## TV Container Detection

The module searches for TV containers in this priority order:
1. `[data-faux-tv]` - Data attribute selector
2. `[data-sm-faux-tv]` - Social Maneuvers data attribute
3. `.tvViewport` - Viewport class (preferred)
4. `#tv` - TV ID
5. `.tv` - TV class
6. `.faux-tv` - Alternative class
7. `.tv-screen` - Screen class

Runtime safeguards ensure the container has:
- `position: relative` (for absolute positioning context)
- `overflow: hidden` (to clip animations)

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
| No animation | Check TV container exists (`.tvViewport`, `[data-sm-faux-tv]`, or `#tv`) |
| Runs twice | Check guard: `game.__evictVisualDone[id]` |
| Avatar not centered | Ensure TV container has `position: relative` and `overflow: hidden` |
| Avatar too large on mobile | Updated to use `vmin` instead of `vw` for proper sizing |

## Quick Checklist

- [x] Module loaded: `typeof window.runEvictionVisual === 'function'`
- [x] TV container: `.tvViewport` or `#tv` exists (robust selector chain)
- [x] Guard set: `game.__evictVisualDone[id] === true`
- [x] Positioning: Container has `position: relative` (set at runtime if needed)
- [x] Clipping: Container has `overflow: hidden` (set at runtime if needed)

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
