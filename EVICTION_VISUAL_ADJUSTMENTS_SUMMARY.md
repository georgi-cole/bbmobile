# Eviction Visual Adjustments - Implementation Summary

## Overview
This implementation adjusts the eviction visuals to match the user's exact requirements:
1. Show "Evicted" results card
2. Play faux TV big-avatar animation (zoom-in → B&W → fade out)
3. After animation completes, update roster avatar with centered ordinal badge

## Visual Changes

### Before (Old Style)
- Red X overlay on avatar
- Ordinal badge at bottom-right of avatar
- Normal avatar appearance
- Name potentially replaced with ordinal

### After (New Style)
- ✅ Ordinal badge centered INSIDE avatar (e.g., "12th")
- ✅ Avatar becomes grayscale (100%) + semi-transparent (60% opacity)
- ✅ Player name remains unchanged below avatar
- ✅ No red X shown when badge is displayed
- ✅ For ranks 1-2: existing medal/award visuals preserved (no ordinal)

## Files Modified

### 1. js/eviction-visuals.js
**Purpose:** Handles the eviction animation sequence and initial roster updates

**Changes:**
- Updated `updateRosterFinishingBadge()` comments to reflect centered positioning
- Modified `updateExistingTile()` to:
  - Check for both `.evicted-cross` and `.redx` elements when hiding red X
  - Apply `avatar-bw-dim` class to avatar image for grayscale + opacity
  - Create badge as `<span class="avatar-rank-badge center">` (not `<div>`)
  - Updated console logs to reflect "centered" badge

**Key code:**
```javascript
// Apply grayscale + opacity to avatar image AFTER animation completes
const avatarImg = avatarContainer.querySelector('img') || avatarContainer.querySelector('.top-tile-avatar');
if(avatarImg){
  avatarImg.classList.add('avatar-bw-dim');
}

// Create avatar rank badge (positioned centered inside avatar)
const badge = document.createElement('span');
badge.className = 'avatar-rank-badge center';
```

### 2. js/ui.hud-and-router.js
**Purpose:** Main HUD rendering logic that renders the roster

**Changes:**
- Modified evicted cross rendering (lines 636-653):
  - Skip red X if player has finishing badge (rank ≥ 3)
  - Condition: `if(p.evicted && !(p.showFinishingBadge && p.finalRank && p.finalRank >= 3))`
  
- Modified finishing badge rendering (lines 661-679):
  - Changed badge element from `<div>` to `<span>`
  - Changed class from `avatar-rank-badge` to `avatar-rank-badge center`
  - Added `avatar-bw-dim` class to avatar image when badge is shown
  - Updated comment to reflect centered positioning

**Key code:**
```javascript
// Skip red X if player has finishing badge (ranks ≥ 3)
if(p.evicted && !(p.showFinishingBadge && p.finalRank && p.finalRank >= 3)){
  // ... render red X ...
}

// Badge is centered inside avatar, avatar becomes grayscale + semi-transparent
const badge = document.createElement('span');
badge.className = 'avatar-rank-badge center';
// ...
img.classList.add('avatar-bw-dim');
```

### 3. styles.css
**Purpose:** Visual styling for badges and eviction states

**Changes:**
- Updated `.avatar-rank-badge` comment (line 1628)
- Added `.avatar-rank-badge.center` (lines 1651-1663):
  - Centered positioning: `top: 50%; left: 50%; transform: translate(-50%, -50%)`
  - Larger size: 1.1rem font, 6px/12px padding
  - Darker gradient: `linear-gradient(135deg, #444, #666)`
  - Thicker border: 3px solid rgba(255,255,255,0.5)
  - Stronger shadow: 0 3px 10px rgba(0,0,0,0.7)

- Added `.avatar-bw-dim` styles (lines 1665-1672):
  - Applies to img elements and their parents
  - `filter: grayscale(100%) !important`
  - `opacity: 0.6 !important`
  - Smooth transition: 0.4s ease-out

- Added hide red X when badge present (lines 1674-1678):
  - Uses `:has()` selector to hide `.evicted-cross` and `.redx` when `.avatar-rank-badge` exists

- Updated suppression during animation (lines 1681-1684):
  - Now suppresses both `.evicted-cross` and `.redx` when `body.evict-visual-in-progress`

**Key CSS:**
```css
/* Centered variant - for eviction ordinal overlay */
.avatar-rank-badge.center{
  top:50%;
  left:50%;
  transform:translate(-50%, -50%);
  font-size:1.1rem;
  padding:6px 12px;
}

/* Avatar grayscale + semi-transparent after eviction animation completes */
.avatar-bw-dim,
.avatar-bw-dim img,
img.avatar-bw-dim{
  filter:grayscale(100%) !important;
  opacity:0.6 !important;
}

/* Hide red X when rank badge is shown */
.top-tile-avatar-wrap:has(.avatar-rank-badge) .evicted-cross,
.top-tile-avatar-wrap:has(.avatar-rank-badge) .redx{
  display:none !important;
}
```

## Sequence Flow

1. **Eviction occurs** → `notifyEvictedForVisual(evictedId)` is called
2. **Body class added** → `body.evict-visual-in-progress` suppresses interim roster effects
3. **Results card shown** → Existing "Evicted" card displays
4. **Faux TV animation runs** → ~1.6s animation (zoom → grayscale → fade)
5. **Animation completes** → `updateRosterFinishingBadge(evictedId)` is called
6. **Roster updated**:
   - Avatar gets `avatar-bw-dim` class (grayscale + opacity)
   - Centered badge added: `<span class="avatar-rank-badge center">12th</span>`
   - Red X is NOT rendered (skipped in rendering logic)
   - Player name stays unchanged
7. **Body class removed** → `evict-visual-in-progress` class removed, normal roster behavior restored

## Testing

Tested with:
- `test_eviction_visuals.html` - Basic eviction visual test
- Console logs confirm correct execution:
  - "avatar grayscale+opacity applied"
  - "centered avatar rank badge added"
  - "HUD updated, roster re-rendered with badge"

## Edge Cases Handled

1. **Ranks 1-2**: No ordinal badge shown, existing medal visuals preserved
2. **Missing TV container**: Animation skips gracefully, roster updates immediately
3. **Idempotency**: Guards prevent duplicate badge additions
4. **Re-rendering**: HUD updates properly integrate the badge in the rendering logic
5. **Multiple selectors**: Code is resilient to different DOM structures (`.evicted-cross`, `.redx`, etc.)

## Browser Compatibility

- `:has()` selector used for hiding red X (supported in modern browsers)
- CSS `filter` and `opacity` widely supported
- Transform centering is standard
- Fallback selectors for resilience

## Visual Demo

See `test_eviction_visual_demo.html` for a side-by-side comparison of before/after styles.

## Summary

All requirements from the problem statement have been met:
✅ Ordinal centered INSIDE avatar (not bottom-right)
✅ Avatar grayscale + semi-transparent after animation
✅ Player name kept unchanged
✅ No red X shown
✅ Sequence: Card → Animation → Badge
✅ Ranks 1-2 keep medals (no ordinal)
✅ Idempotent and non-breaking with guards
✅ Resilient to missing containers
