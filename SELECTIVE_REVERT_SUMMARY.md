# Selective Revert Summary: Keep Faux TV Animation Only

## What Was Done

This PR implements a selective revert of eviction visual features from PRs #317, #320, and #324. The goal was to keep only the faux TV animation while removing all roster-related visual changes.

## Changes Made

### 1. Code Modifications (11 files, -363 lines net)

#### js/eviction-visuals.js (190 lines → 118 lines)
**Removed**:
- `ordinal()` helper function
- `updateRosterFinishingBadge()` function
- `updateExistingTile()` function
- `notifyEvictedForVisual()` function
- Try/finally block that managed body class
- All roster manipulation logic

**Kept**:
- `runEvictionVisual()` - main entry point
- `animateEvictedAvatar()` - TV animation sequence
- Idempotent guard (`__evictVisualDone`)
- Card queue wait integration

#### styles.css (~80 lines removed)
**Removed**:
- `.avatar-rank-badge` and `.avatar-rank-badge.center`
- `.finishing-badge` and `.status-finishing-badge`
- `.avatar-bw-dim`
- `body.evict-visual-in-progress` suppression styles
- Red X hiding rules for badged players

**Kept**:
- `.eviction-visual-avatar` and animation phases
- `.eviction-visual-avatar.zoom-in`
- `.eviction-visual-avatar.grayscale`
- `.eviction-visual-avatar.fade-out`

#### js/ui.hud-and-router.js
**Removed**:
- Badge rendering block (lines 661-680)
- `showFinishingBadge` conditional check
- Grayscale/opacity application to avatars

**Result**: Red X now displays for all evicted players (original behavior restored)

#### Integration Point Cleanup
**Files modified**:
- js/eviction.js - Removed 2 `notifyEvictedForVisual()` calls
- js/veto.js - Removed Final 4 notification call
- js/competitions.js - Removed Final 3 notification call
- js/self-eviction.js - Removed self-eviction notification call

### 2. Test Updates

#### test_eviction_visuals.html
- Added note that roster badges have been removed
- Updated roster rendering to always show red X
- Removed badge verification from status checks

#### test_eviction_visual_refinements.html
- Updated title to reflect "Faux TV Animation Only"
- Removed `showFinishingBadge` property from player setup
- Removed badge rendering logic from roster
- Removed badge verification from test assertions

### 3. Documentation Updates

#### EVICTION_VISUALS_README.md
- Updated overview to clarify only TV animation is included
- Added note about removed features
- Removed badge-related sections
- Updated CSS classes list
- Added "Removed Features" section

#### EVICTION_VISUALS_QUICKREF.md
- Updated "What It Does" to mention only TV animation
- Removed roster badge logic section
- Removed badge-related CSS classes
- Updated troubleshooting and checklist
- Removed badge calculation section
- Added "Removed Features" section

## What Users Will See

### Before (PRs #317, #320, #324)
1. ✅ Faux TV animation after "Evicted" card
2. ❌ Finishing place badges (3rd, 4th, etc.) on roster
3. ❌ Avatar grayscale/opacity effects
4. ❌ Red X hidden for players with badges

### After (This PR)
1. ✅ Faux TV animation after "Evicted" card (unchanged)
2. ✅ Red X displayed for all evicted players (restored)
3. ✅ No roster badges or overlays
4. ✅ No avatar grayscale/opacity changes

## Testing Checklist

### Automated Tests
- [x] All existing tests pass (`npm run test:all`)
- [x] No console errors in test files

### Manual Testing Required

#### Standard Eviction Flow
- [ ] Start new game with 12 players
- [ ] Progress through HOH → Nominations → Veto → Eviction
- [ ] Verify "Evicted" card displays
- [ ] Verify faux TV animation plays (zoom → B&W → fade)
- [ ] Verify roster shows red X for evicted player
- [ ] Verify no badges appear on roster
- [ ] Verify avatar remains in color (no grayscale)

#### Final 4 Eviction
- [ ] Get to Final 4
- [ ] POV holder makes eviction decision
- [ ] Verify TV animation plays
- [ ] Verify roster shows red X (not "4th" badge)

#### Final 3 Eviction
- [ ] Get to Final 3
- [ ] Final HOH makes decision
- [ ] Verify TV animation plays
- [ ] Verify roster shows red X (not "3rd" badge)

#### Self-Eviction
- [ ] Use self-eviction dropdown
- [ ] Verify TV animation plays
- [ ] Verify roster shows red X

#### Multi-Eviction
- [ ] Trigger double/triple eviction
- [ ] Verify TV animation plays for each player
- [ ] Verify roster shows red X for all evicted

### Edge Cases
- [ ] TV container missing - animation skips gracefully
- [ ] Multiple evictions in quick succession
- [ ] Roster updates after eviction
- [ ] No JavaScript errors in console

## Verification Commands

```bash
# Check for removed references
grep -r "showFinishingBadge" js/*.js
# Should return: (empty)

grep -r "notifyEvictedForVisual" js/*.js
# Should return: (empty)

grep -r "avatar-rank-badge\|avatar-bw-dim\|body.evict-visual-in-progress" styles.css
# Should return: (empty)

# Check faux TV animation is present
grep -A 2 "eviction-visual-avatar" styles.css
# Should return: animation CSS

# Verify function is exported
grep "global.runEvictionVisual" js/eviction-visuals.js
# Should return: global.runEvictionVisual = runEvictionVisual;
```

## Files Changed

```
Modified:
  js/eviction-visuals.js
  js/ui.hud-and-router.js
  js/eviction.js
  js/veto.js
  js/competitions.js
  js/self-eviction.js
  styles.css
  test_eviction_visuals.html
  test_eviction_visual_refinements.html
  EVICTION_VISUALS_README.md
  EVICTION_VISUALS_QUICKREF.md

Added:
  SELECTIVE_REVERT_SUMMARY.md (this file)
```

## Stats

- **Total lines changed**: 549 (93 additions, 456 deletions)
- **Net reduction**: 363 lines
- **Files modified**: 11
- **Functions removed**: 4 (ordinal, updateRosterFinishingBadge, updateExistingTile, notifyEvictedForVisual)
- **CSS rules removed**: ~15
- **Test updates**: 2 files

## Migration Notes

No migration needed - this is a revert. All game state and data structures remain unchanged. The `finalRank` property is still set on players during eviction, but it's no longer used for visual display.

## Rollback Plan

If issues arise, the previous implementation is preserved in git history. To rollback:

```bash
git revert HEAD~3..HEAD
```

This will restore PRs #317, #320, and #324 features.

## Future Considerations

If roster badges are needed in the future, they should be implemented as:
1. A separate opt-in feature flag
2. Without suppressing the red X (show both)
3. Without grayscale/opacity changes to avatars
4. Without body-level classes that affect other UI

## Questions?

See the updated documentation:
- EVICTION_VISUALS_README.md - Detailed implementation guide
- EVICTION_VISUALS_QUICKREF.md - Quick reference for developers
