# LV2 Shim - Manual Test Plan

## Overview
This document provides step-by-step instructions to test the enhanced lv2-shim implementation that enables live voting without requiring console snippets.

## Prerequisites
- GitHub Pages deployment at: https://georgi-cole.github.io/bbmobile/
- Desktop or mobile browser (Chrome, Firefox, Safari)
- Game should be started with at least 4 players

## Test Scenarios

### Test 1: Two-Nominee Eviction (Standard)

**Objective**: Verify that the live vote UI appears for a standard 2-nominee eviction and allows voting.

**Steps**:
1. Open GitHub Pages site in browser
2. Start a new game (use Quick Start or configure cast)
3. Use "Advance Phase" button or wait for automatic progression
4. Advance through phases until reaching a live vote phase with 2 nominees
5. **Expected Results**:
   - A voting UI should appear at the bottom of the screen with:
     - Title: "Vote to Evict"
     - Two nominee cards showing names and avatars
     - "Evict" button on each card
     - "Live Votes" feed section (initially empty)
   - UI should be fixed at bottom with dark background and red border
   - UI should be visible and clickable (z-index: 9999)

6. Click on one of the "Evict" buttons
7. **Expected Results**:
   - Button should disable after clicking
   - Button opacity should reduce to 0.5
   - Vote should be submitted (check console for confirmation)
   - Remaining AI votes should appear in the "Live Votes" feed
   - Each vote entry should show format: "PlayerName voted to evict NomineeName"

8. Watch the vote feed populate
9. **Expected Results**:
   - AI votes should appear one by one in the feed
   - New votes should slide in from the left (animation)
   - Feed should show up to 10 most recent votes
   - Feed should auto-scroll to show latest votes

### Test 2: Triple Eviction (Three Nominees)

**Objective**: Verify that the live vote UI works correctly for triple evictions.

**Steps**:
1. Configure game to enable triple eviction (may need to use debug settings)
2. Advance to a triple eviction live vote phase
3. **Expected Results**:
   - Voting UI should appear at bottom with:
     - Title: "Vote to Evict"
     - Three nominee cards displayed horizontally
     - Each card with name and "Evict" button
     - "Live Votes" feed section

4. Click on one nominee's "Evict" button
5. **Expected Results**:
   - All three buttons should disable
   - Vote should be submitted
   - AI votes for all three nominees should appear in feed

### Test 3: Observer Mode (Nominated Player)

**Objective**: Verify that nominated players cannot vote (observer mode).

**Steps**:
1. Start a game and note which player is human-controlled
2. Advance to nomination phase
3. Ensure human player gets nominated
4. Advance to live vote phase
5. **Expected Results**:
   - Voting UI should still appear (if enabled by game logic)
   - OR a message "You are observing this vote" may display
   - If voting UI appears, buttons should be disabled
   - Vote feed should still populate with AI votes

### Test 4: Mobile Responsiveness

**Objective**: Verify that the voting UI works on mobile devices.

**Steps**:
1. Open GitHub Pages site on mobile device (or use browser DevTools mobile emulation)
2. Start game and advance to live vote phase
3. **Expected Results**:
   - UI should be responsive and fit mobile screen
   - Cards should stack appropriately on narrow screens
   - Buttons should be easily tappable (not too small)
   - Vote feed should scroll properly
   - UI should not overlap critical game elements
   - Maximum height should be 70vh on mobile (per CSS)

### Test 5: Vote Feed Functionality

**Objective**: Test the live vote feed updates correctly.

**Steps**:
1. Advance to live vote phase
2. Submit your vote immediately
3. Watch the vote feed populate
4. **Expected Results**:
   - Your vote should NOT appear in the feed (only AI votes shown)
   - AI votes should appear with 200-500ms intervals
   - Each vote entry should show voter name and target name
   - Vote entries should have slide-in animation
   - Feed should be scrollable if more than ~5 votes
   - Older votes should be removed if feed exceeds 10 items

### Test 6: Multiple Rounds

**Objective**: Verify UI cleanup and re-initialization works across multiple evictions.

**Steps**:
1. Complete one live vote phase
2. Advance to next eviction
3. **Expected Results**:
   - Old voting UI should be cleaned up completely
   - New voting UI should appear fresh with new nominees
   - Vote feed should be empty at start
   - No duplicate UIs or overlapping elements

### Test 7: UI Visibility and Positioning

**Objective**: Verify UI is always visible and not obscured.

**Steps**:
1. Advance to live vote phase
2. Try scrolling the page
3. Try clicking on other game elements
4. **Expected Results**:
   - Voting UI should remain fixed at bottom (position: fixed)
   - UI should stay on screen regardless of scrolling
   - UI should have very high z-index (9999) above all other elements
   - Clicking voting UI should work (pointer-events: auto)
   - UI should not be hidden when game panels change

### Test 8: showCtaBar() Method

**Objective**: Verify the new showCtaBar() method works.

**Steps**:
1. Open browser console during live vote phase
2. Type: `window.lv2.hideCtaBar()`
3. Type: `window.lv2.showCtaBar()`
4. **Expected Results**:
   - hideCtaBar() should hide/remove the voting UI
   - showCtaBar() should show the UI again (if it exists)

## Success Criteria

All tests should pass with:
- ✅ Voting UI appears consistently
- ✅ UI is fixed at bottom with high z-index
- ✅ Buttons work and disable after voting
- ✅ Vote feed populates with AI votes
- ✅ Animations work smoothly
- ✅ Mobile responsive design works
- ✅ No console errors related to lv2
- ✅ UI cleans up properly between rounds

## Known Issues

Document any issues found during testing:
- [ ] Issue 1: _______________
- [ ] Issue 2: _______________

## Notes

- The lv2-shim.js file is loaded early in the `<head>` section of index.html
- The shim provides all methods expected by eviction.js
- If EvictionCarousel is available, it takes precedence; otherwise, fallback UI is used
- All styling is inline in JavaScript for portability

## Debugging

If voting UI doesn't appear:
1. Check browser console for errors
2. Verify `window.lv2` is defined: `console.log(window.lv2)`
3. Check if shim was loaded: Look for "[lv2-shim]" log messages
4. Verify nominees are set: `console.log(window.game.eviction?.nominees)`

Console debug commands:
```javascript
// Check lv2 API availability
console.log(window.lv2);

// Manually trigger UI (requires nominees to be set)
window.lv2.createCtaBar();

// Check current state
console.log(window.game.eviction);

// Force cleanup
window.lv2.cleanup();
```
