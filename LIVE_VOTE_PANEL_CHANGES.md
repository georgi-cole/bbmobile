# Live Vote Panel - Embedded in TV Viewport

## Summary
Successfully refactored the live vote panel to render inside the TV viewport instead of outside the main TV area.

## Changes Made

### 1. JavaScript Changes (`js/eviction.js`)
- Modified `renderLiveVotePanel()` function to:
  - Target `.tvViewport` instead of `#panel` element  
  - Create a `.liveVotePanel` container div
  - Remove any existing panel before rendering new one
  - Append the panel to the TV viewport

### 2. CSS Styles (`styles.css`)  
- Added `.liveVotePanel` class with:
  - Absolute positioning at bottom of TV viewport
  - z-index 14 (above confetti/overlays, below LIVE badge)
  - Max height 60% to prevent covering entire screen
  - Scrollable content with custom scrollbar
  - Pointer events enabled for button interactions

### 3. Responsive Mobile Styles
- **@media (max-width: 768px)**:
  - Increased max-height to 70%
  - Reduced padding and font sizes
  - Stacked vote buttons vertically
  - Adjusted tally bar heights

- **@media (max-width: 559px)**:
  - Further reduced padding and fonts
  - Max height 75% for more visibility

## Benefits
- ✅ Live vote window always inside TV screen area
- ✅ No overlap with roster or sidebar
- ✅ Proper layering with other TV elements
- ✅ Mobile-friendly and responsive
- ✅ Scrollable when content exceeds viewport

## Z-Index Hierarchy
```
liveBadge (15) - LIVE indicator
liveVotePanel (14) - NEW: Vote panel
tvNow (13) - Status text
tvOverlay (12) - Reveals/cards
confetti (11) - Effects
```
