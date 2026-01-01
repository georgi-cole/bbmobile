# Jury Vote Card Centering Fix

## Problem
During the jury vote phase of the finale, juror message cards were appearing cut off in the right corner instead of being centered in the viewport.

## Root Cause
The issue was in `js/jury-viz.js` where the `showVoteCard()` function applied inline styles that had conflicting CSS properties:

```javascript
// BEFORE (problematic)
card.style.cssText = `
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10002;
  max-width: min(480px, 90vw);
  width: 100%;              // ❌ CONFLICT: 100% width with fixed centering
  margin: 0 auto;           // ❌ CONFLICT: auto margin with transform centering
  animation: cardFloatIn 0.5s cubic-bezier(0.25, 0.9, 0.25, 1) forwards;
  box-sizing: border-box;
`;
```

The combination of `width: 100%` and `margin: 0 auto` interfered with the `transform: translate(-50%, -50%)` centering technique.

## Solution
Created a dedicated CSS file (`css/jury-vote-card.css`) with explicit positioning rules and removed the conflicting inline styles from JavaScript.

### Changes:

1. **New CSS File: `css/jury-vote-card.css`**
   - Explicit `!important` rules to override any conflicts
   - Proper centering with `width: auto` instead of `width: 100%`
   - No margin conflicts
   - Responsive breakpoints for mobile/tablet/desktop

2. **Updated: `js/jury-viz.js`**
   ```javascript
   // AFTER (fixed)
   const card = document.createElement('div');
   card.className = 'revealCard diaryRoomCard jury-vote-card';
   // Positioning is handled by css/jury-vote-card.css for proper centering
   ```

3. **Updated: `index.html`**
   - Added `<link rel="stylesheet" href="css/jury-vote-card.css">` after `juror-overlay.css`

4. **New Test: `test_jury_vote_card_centering.html`**
   - Comprehensive test scenarios
   - Desktop, mobile, and tablet viewport testing
   - With and without finale overlay

## Key CSS Rules
```css
.jury-vote-card {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  max-width: min(480px, 90vw) !important;
  width: auto !important;          /* ✅ FIXED: auto instead of 100% */
  margin: 0 !important;             /* ✅ FIXED: no auto margins */
  z-index: 10002 !important;
  box-sizing: border-box !important;
}
```

## Testing
- ✅ Desktop (1280x720): Card centered
- ✅ Mobile (375x667): Card centered
- ✅ Tablet (768x1024): Card centered
- ✅ With finale overlay: Card centered
- ✅ Existing tests pass: `test_jury_finale_ui_fixes.html`
- ✅ All test suites pass

## Screenshots
See PR description for before/after screenshots showing the card properly centered on all viewports.

## Files Changed
- `css/jury-vote-card.css` (new)
- `js/jury-viz.js` (modified)
- `index.html` (modified)
- `test_jury_vote_card_centering.html` (new)
