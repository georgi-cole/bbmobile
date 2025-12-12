# Live Vote Fix - Test Plan & Regression Check

## Overview
This document describes the manual test plan for verifying the live voting fix on GitHub Pages deployment.

## Problem Summary
- GitHub Pages deployment failed during live voting with errors:
  - `Cannot read properties of undefined (reading 'init')`
  - `global.lv2.updateCtaBar is not a function`
  - 404 errors for livevote CSS/JS assets

## Solution Summary
- Added robust `window.lv2` shim implementation in `js/ui/lv2-shim.js`
- Created stub JS files to prevent 404 errors
- Created minimal CSS files for livevote components
- Added lv2-shim.js to index.html before eviction.js

## Pre-Deployment Testing

### 1. Unit Test (test_lv2_shim.html)
Open `test_lv2_shim.html` in browser and verify:

- [ ] **API Methods Check**
  - Click "Check API Methods" button
  - Verify all required methods show green checkmarks (✓)
  - Required methods:
    - `init`, `initTriple`, `createCtaBar`, `setTurn`
    - `pushVote`, `finish`, `cleanup`
    - `updateCtaBar`, `hideCtaBar`, `hideCtasTriple`
    - `beginResultCardPhase`, `showInlineCard`
    - `enterExternalOverlayMode`

- [ ] **Two-Nominee Vote Test**
  - Click "Start Two-Nominee Vote"
  - Verify vote buttons appear with correct styling
  - Click one of the vote buttons
  - Verify vote callback is triggered
  - Check console log for success message

- [ ] **Triple Eviction Test**
  - Click "Start Triple Eviction Vote"
  - Verify three nominee cards appear
  - Click one of the nominee cards
  - Verify vote callback is triggered
  - Check console log for success message

### 2. Integration Test (Full Game)
Open `index.html` and start a game:

- [ ] **Browser Console Check**
  - Open browser console (F12)
  - Start a new game
  - Let game progress to first eviction
  - Verify NO errors like:
    - `lv2 is undefined`
    - `lv2.init is not a function`
    - `lv2.updateCtaBar is not a function`
    - 404 errors for livevote files

- [ ] **Standard Eviction (2 Nominees)**
  - Progress to first live vote phase
  - Verify vote UI appears (either EvictionCarousel or fallback)
  - If human is voter: verify can click to vote
  - Verify no JavaScript errors in console
  - Verify vote is processed correctly

- [ ] **Triple Eviction (3 Nominees)** *(if game supports)*
  - Set up triple eviction scenario
  - Progress to triple eviction vote
  - Verify triple nominee UI appears
  - Verify can click to vote for one of three nominees
  - Verify no JavaScript errors in console

### 3. GitHub Pages Deployment Test

After deployment to GitHub Pages (https://georgi-cole.github.io/bbmobile/):

- [ ] **Asset Loading**
  - Open browser Network tab (F12 → Network)
  - Visit the deployed site
  - Start a game
  - Progress to eviction
  - Verify ALL assets load with 200 status:
    - `/bbmobile/js/ui/lv2-shim.js` → 200 OK
    - `/bbmobile/css/livevote-choice-card.css` → 200 OK
    - `/bbmobile/css/livevote-voteoverlay.css` → 200 OK
    - `/bbmobile/css/livevote-rollout.css` → 200 OK
    - `/bbmobile/css/livevote-overrides.css` → 200 OK
    - All `js/livevote-*.js` stub files → 200 OK

- [ ] **Functionality**
  - Complete a full game playthrough on GitHub Pages
  - Verify all evictions work without errors
  - Verify can vote during live vote phase
  - Verify game completes to finale

### 4. Browser Compatibility

Test on multiple browsers:

- [ ] **Chrome/Edge** (latest)
  - Open test_lv2_shim.html
  - Run all three tests
  - Verify all pass

- [ ] **Firefox** (latest)
  - Open test_lv2_shim.html
  - Run all three tests
  - Verify all pass

- [ ] **Safari** (if available)
  - Open test_lv2_shim.html
  - Run all three tests
  - Verify all pass

- [ ] **Mobile Browser** (iOS Safari or Chrome Mobile)
  - Open test_lv2_shim.html
  - Run all three tests
  - Verify touch interactions work
  - Verify styling is responsive

## Regression Checks

### 5. Existing Game Flow (No Breaking Changes)

- [ ] **Game Start**
  - Verify intro screen still works
  - Verify can start new game
  - Verify cast selection works

- [ ] **Competitions**
  - Verify HOH competitions work
  - Verify Veto competitions work
  - Verify minigames load and play

- [ ] **Ceremonies**
  - Verify nomination ceremony works
  - Verify veto ceremony works
  - Verify eviction ceremony works

- [ ] **Social Phase**
  - Verify social interactions work
  - Verify AI social scheduler works

- [ ] **Finale**
  - Verify finale sequence works
  - Verify jury voting works
  - Verify winner announcement works

## Expected Behavior

### Success Criteria
✅ No JavaScript errors during live vote phase
✅ All livevote CSS/JS files load without 404 errors
✅ User can click vote button and vote is processed
✅ Game progresses normally through evictions
✅ Fallback UI is visible and clickable (z-index: 100)
✅ All lv2 API methods exist and don't throw errors

### Acceptable Fallback Behavior
- When real livevote modules are not available, the shim provides:
  - Simple button-based vote UI (2 nominees)
  - Card-based vote UI (3 nominees)
  - Basic styling with proper z-index and pointer-events
  - Functional vote callbacks that trigger eviction logic

## Debug Helpers

### Console Commands
```javascript
// Check if lv2 exists
console.log('lv2 available:', !!window.lv2);

// Check all methods
console.log('lv2 methods:', Object.keys(window.lv2));

// Test init (requires nominees)
window.lv2.init({ leftName: 'Alice', rightName: 'Bob', leftId: 1, rightId: 2 });

// Test initTriple
window.lv2.initTriple({
  nominees: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Carol' }
  ],
  onVote: (id) => console.log('Voted for:', id)
});

// Cleanup
window.lv2.cleanup();
```

## Known Issues & Limitations

### Acceptable Limitations
- Fallback UI is simpler than full livevote implementation
- No animated vote reveals (stub)
- No vote rollout animations (stub)
- Basic styling only

### Not Limitations (By Design)
- Real livevote modules in archive are intentionally not used
- Shim provides minimal working implementation
- Stubs prevent 404 errors but don't implement full features

## Rollback Plan

If issues arise, rollback by:
1. Remove `<script defer src="js/ui/lv2-shim.js"></script>` from index.html
2. Revert eviction.js to check for lv2 availability before calling methods
3. Or: Copy real livevote modules from archive to js/ and css/

## Sign-Off

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] GitHub Pages deployment verified
- [ ] No regressions in existing features
- [ ] Mobile testing complete
- [ ] Browser compatibility confirmed

**Tester:** _______________  
**Date:** _______________  
**Notes:** _______________
