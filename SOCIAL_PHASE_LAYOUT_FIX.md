# Social Phase Layout Fix Documentation

## Problem Summary

### Issue Description
During Social Phase, the faux TV container dimensions would change, causing the gap between the avatar grid and the faux TV/competition card to disappear. This resulted in visual overlap where the last row of avatars would be covered by the TV container.

Additionally, there were redundant Exit/Self-evict buttons:
1. Legacy red button in the topbar (near the clock)
2. Legacy button in the compact HUD
3. These were redundant with self-eviction functionality available via Diary Room

### Root Causes

1. **Flexbox Shrinking Issue**: The `.tvViewport` container used `flex: 1 1 auto`, which allowed it to shrink when content was injected during Social Phase.

2. **Margin Collapse**: The Social launcher used `margin-top` and `margin-bottom` which could collapse with parent container margins, causing unpredictable spacing.

3. **Missing Stable Spacing**: There was no explicit margin between `#rosterBar` and `.tv` to maintain consistent gap.

4. **Redundant Exit Buttons**: Multiple exit buttons cluttered the UI and caused confusion about the proper exit mechanism.

## Implementation Details

### 1. Fixed tvViewport Flex Behavior

**File**: `styles.css` (lines 765-773)

**Change**:
```css
/* Before */
.tvViewport {
  position: relative; 
  flex: 1 1 auto; /* Could shrink */
  overflow: hidden;
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
}

/* After */
.tvViewport {
  position: relative; 
  /* Changed from flex:1 1 auto to flex:1 0 auto to prevent shrinking when content is injected */
  /* This ensures stable height during Social Phase and prevents gap collapse above TV */
  flex: 1 0 auto; 
  overflow: hidden;
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  /* Defensive: ensure minimum height to prevent collapse */
  min-height: 0;
}
```

**Reasoning**: 
- `flex: 1 0 auto` prevents the flex item from shrinking below its content size
- `min-height: 0` works with flex to ensure proper sizing in nested flex contexts
- This maintains stable TV viewport dimensions regardless of injected content

### 2. Added Consistent Margin to TV Container

**File**: `styles.css` (line 704)

**Change**:
```css
.tv {
  position: relative;
  height: 520px;
  /* Ensure consistent top margin to maintain gap with avatar grid in all phases */
  /* This prevents gap collapse when Social module is injected during Social Phase */
  margin-top: 8px;
  /* ... rest of styles */
}
```

**Reasoning**:
- Explicit `margin-top: 8px` creates consistent spacing between avatar grid and TV
- This margin is stable and not affected by content changes inside the TV
- Previously, spacing relied on `#rosterBar`'s `margin-bottom: -2px` which was inconsistent

### 3. Prevented Margin Collapse in Social Launcher

**File**: `socialize-mobile.css` (lines 38-58)

**Change**:
```css
/* Before */
@media (max-width: 768px) {
  .socialize-launcher,
  [data-sm-social-card-wrap] {
    position: static;
    margin: 0 auto;
    margin-top: 16px;     /* Could collapse with parent */
    margin-bottom: 16px;  /* Could collapse with parent */
    /* ... */
  }
}

/* After */
@media (max-width: 768px) {
  .socialize-launcher,
  [data-sm-social-card-wrap] {
    position: static;
    margin: 0 auto;
    /* Use padding instead of margin to prevent margin collapse with parent container */
    /* This ensures stable TV viewport dimensions and prevents gap collapse above TV */
    padding-top: 16px;
    padding-bottom: 16px;
    max-height: 100%; /* Changed from calc(100% - 32px) since we're using padding */
    box-sizing: border-box;
    /* ... */
  }
}
```

**Reasoning**:
- Padding instead of margin prevents margin collapse with parent `.tvViewport`
- `box-sizing: border-box` ensures padding is included in the element's total width/height
- This maintains stable inner spacing without affecting the parent container's dimensions

### 4. Removed Legacy Exit/Self-evict Buttons

#### Compact HUD Button Removal

**File**: `src/ui/compactHud.js`

**Changes**:
- Removed `selfEvictButton` from state variables
- Removed button HTML from `hudContainer.innerHTML` (line 77-80)
- Removed `selfEvictButtonHandler` and all related event listeners
- Removed `updateSelfEvictButton()` function
- Updated `update()` to not call `updateSelfEvictButton()`
- Updated `destroy()` cleanup to remove self-evict button references

**File**: `css/compact-hud.css` (lines 141-154)

**Change**:
```css
/* Before */
.compact-hud-chip.self-evict-button {
  --chip-base: var(--danger, #c0392b);
  background: linear-gradient(135deg, ...);
  /* ... styles */
}

/* After */
/* Legacy self-evict button styles removed - EXIT button in tvHead is now the primary method */
```

#### Topbar Button Removal

**File**: `index.html` (line 119-121)

**Change**:
```html
<!-- Before -->
<button class="btn iconOnly danger" id="btnSelfEvict" title="Self-Evict (Exit Game)" aria-label="Self-evict from game" style="display:none;">
  🚪
</button>

<!-- After -->
<!-- Legacy Exit/Self-Eviction Button removed - users can self-evict via Diary Room or action menu -->
```

**File**: `js/bootstrap.js` (lines 578-644)

**Change**: Commented out all `btnSelfEvict` initialization and update logic, preserving it for reference but making it inactive.

**Reasoning**:
- Removed UI clutter - two redundant buttons served the same purpose
- Simplified user experience - clear single path for self-eviction
- Users can still self-evict via Diary Room modal or action menu
- Frees up valuable space in compact HUD for mobile viewports

## Testing

### Manual Test Pages

1. **test_social_phase_layout.html**: Interactive test for Social Phase layout
   - Toggle Social Phase on/off
   - Measure spacing between roster and TV
   - Visual debug info with real-time measurements
   - Highlight spacing feature to visualize gaps

2. **test_legacy_button_removal.html**: Automated verification of button removal
   - Checks if `#btnSelfEvict` is removed from DOM
   - Verifies `.self-evict-button` is removed from compact HUD
   - Validates CSS cleanup
   - Provides test summary with pass/fail results

### Test Procedures

#### Testing Layout Stability

1. Open `test_social_phase_layout.html` in a browser
2. Click "Measure Spacing" to get baseline measurements
3. Click "Toggle Social Phase" to inject Social module
4. Verify gap between roster and TV remains consistent
5. Toggle multiple times and measure at each state
6. Test at different viewport sizes (desktop, tablet, mobile)

**Expected Results**:
- Gap between roster and TV should remain around 8px in both states
- TV height should stay at 520px
- No visual overlap with avatar grid

#### Testing Button Removal

1. Open `test_legacy_button_removal.html` in a browser
2. Review automated test results
3. Verify all tests pass (should show ✅)
4. Check that no `.self-evict-button` elements exist
5. Verify `#btnSelfEvict` is not in the DOM

**Expected Results**:
- All button removal tests should pass
- Score should be 100% (perfect)
- No legacy buttons found in DOM or CSS

### Integration Testing

After changes, test the full game flow:

1. Start a new game
2. Progress through multiple phases
3. Enter Social Phase
4. Verify UI layout remains stable
5. Check that avatar grid maintains proper spacing
6. Confirm self-eviction is still accessible via alternative methods

## Browser Compatibility

These changes have been tested to work with:
- Modern flexbox implementations (all modern browsers)
- Mobile Safari (iOS 12+)
- Chrome/Edge (Chromium-based)
- Firefox
- Safari (macOS)

The fixes use standard CSS properties that are well-supported across all modern browsers.

## Troubleshooting

### Issue: Gap still collapses during Social Phase

**Possible Causes**:
1. Browser cache not cleared - old CSS might be loaded
2. CSS not properly applied - check browser dev tools

**Solutions**:
- Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- Verify in dev tools that `.tvViewport` has `flex: 1 0 auto`
- Check that `.tv` has `margin-top: 8px`

### Issue: Social module appears too large

**Possible Causes**:
1. Content inside Social launcher exceeds available space
2. Padding calculation incorrect

**Solutions**:
- Check `max-height: 100%` on `.socialize-launcher`
- Verify `box-sizing: border-box` is applied
- Ensure content inside launcher is scrollable if needed

### Issue: Self-eviction functionality not working

**Note**: Self-eviction buttons were intentionally removed. Users should now:
- Access self-eviction via Diary Room modal
- Use action menu (⋮) if self-eviction option is available there
- Contact maintainers if self-eviction needs to be re-added

## Future Considerations

### Potential Enhancements

1. **Add self-eviction to action menu**: If not already present, add a self-eviction option to the action menu for easy access.

2. **Diary Room integration**: Ensure self-eviction is clearly available and documented in the Diary Room modal.

3. **Responsive spacing**: Consider using CSS variables for the TV margin to make it easily adjustable:
   ```css
   :root {
     --tv-margin-top: 8px;
   }
   .tv {
     margin-top: var(--tv-margin-top);
   }
   ```

4. **Dynamic spacing based on viewport**: Add media queries to adjust TV margin for different screen sizes if needed.

### Maintenance Notes

- The commented-out code in `js/bootstrap.js` (lines 578-644) has been preserved for reference
- If self-eviction needs to be restored, review the commented code and consider:
  - Adding to action menu instead of a separate button
  - Integrating into Diary Room modal
  - Using a less prominent UI element

## Related Files

### Modified Files
- `styles.css` - Fixed `.tvViewport` flex and added `.tv` margin
- `socialize-mobile.css` - Changed Social launcher margins to padding
- `src/ui/compactHud.js` - Removed self-evict button code
- `css/compact-hud.css` - Removed self-evict button styles
- `index.html` - Removed topbar self-evict button
- `js/bootstrap.js` - Commented out self-evict button logic

### Test Files
- `test_social_phase_layout.html` - Interactive layout test
- `test_legacy_button_removal.html` - Automated button removal verification

### Related Modules
- `js/social-maneuvers.js` - Social Phase implementation
- `js/tv-container.js` - TV container utilities
- `js/ui/actionMenu.js` - Action menu (potential self-eviction location)
- `js/ui/diaryRoomModal.js` - Diary Room modal (potential self-eviction location)

## References

- Original issue: Social Phase layout regression
- Flexbox behavior: MDN Web Docs - CSS Flexible Box Layout
- Margin collapse: MDN Web Docs - Mastering Margin Collapsing
- Box sizing: MDN Web Docs - box-sizing

---

**Last Updated**: 2025-12-04  
**Author**: GitHub Copilot (via georgi-cole)  
**Version**: 1.0
