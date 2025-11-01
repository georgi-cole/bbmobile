# Veto Popup Containment and Selection - Manual Test Guide

## Changes Overview
This PR fixes three issues with veto flows:
1. ✅ Avatar tap should select only (no auto-commit)
2. ✅ Veto replacement animations removed
3. ✅ Veto carousel stays fullscreen (already correct)

## Test Files
Use these test files to manually verify the changes:

### Primary Test Files
- `demo_pov_carousel.html` - Interactive demo of carousel picker
- `test_fullscreen_pov_flows.html` - Full veto ceremony flow tests
- `test_diamond_pov_carousel.html` - Diamond POV specific tests
- `test_veto_ceremony_tv.html` - TV containment tests

## Manual Test Scenarios

### Test 1: Avatar Tap Selection-Only
**File**: `demo_pov_carousel.html`

**Steps**:
1. Open `demo_pov_carousel.html` in browser
2. Click any scenario button (e.g., "Scenario 1: Golden POV Save Selection")
3. Carousel opens with player avatars
4. **Test**: Click/tap directly on the avatar image
5. **Expected**: Nothing happens (no auto-commit, no close)
6. Use arrow buttons to navigate to different players
7. **Test**: Click/tap the avatar again
8. **Expected**: Still nothing happens
9. Click the "Confirm" button
10. **Expected**: Carousel closes and selection is returned

**Pass Criteria**:
- ✅ Avatar tap does NOT auto-commit selection
- ✅ Avatar tap does NOT close carousel
- ✅ Only the Confirm button executes the action
- ✅ Arrow buttons still work for navigation
- ✅ Keyboard Enter/Escape still work (accessibility)

### Test 2: Veto Replacement Animation Removed
**File**: `test_fullscreen_pov_flows.html` or actual game

**Steps**:
1. Start a veto ceremony (Standard or Golden POV)
2. Use the veto to save a nominee
3. Select a replacement nominee
4. **Observe**: After confirming replacement
5. **Expected**: Instant state change OR minimal 200ms fade
6. **Expected**: NO multi-stage animation (no "Current Nominees → POV Used → Replacement Named" sequence)

**Pass Criteria**:
- ✅ No 4-second animated sequence showing old/new nominees
- ✅ No GSAP timeline with stage transitions
- ✅ State change is instant or has minimal fade (<300ms)
- ✅ Nominee badges update immediately on roster

**Old Behavior (REMOVED)**:
- ❌ Multi-stage animation showing risk → safe → new risk
- ❌ Fade transitions between stages
- ❌ Arrow animations between nominee groups
- ❌ 4+ second duration

### Test 3: Diamond POV Animation Removed
**File**: `test_diamond_pov_carousel.html`

**Steps**:
1. Trigger Diamond POV ceremony
2. Select first replacement nominee (use arrow + Confirm)
3. **Test**: Avatar tap should NOT auto-commit (same as Test 1)
4. After first selection confirmed, carousel reopens
5. Select second replacement nominee
6. **Observe**: After confirming second replacement
7. **Expected**: Instant state change, NO badge transfer animation

**Pass Criteria**:
- ✅ Avatar tap selection-only for both picks
- ✅ No animated badge transfer sequence
- ✅ Both nominees updated instantly on roster

### Test 4: Veto Carousel Fullscreen (Already Correct)
**File**: `demo_pov_carousel.html`

**Steps**:
1. Open carousel picker
2. **Observe**: Carousel overlay
3. **Expected**: Fullscreen overlay (position: fixed, covers entire viewport)
4. **Expected**: Dark backdrop (rgba(0,0,0,0.92) with blur)
5. **Expected**: Carousel NOT contained within TV frame

**Pass Criteria**:
- ✅ Carousel is fullscreen (position: fixed)
- ✅ High z-index (100000)
- ✅ Not nested inside #tv or .tv-inner
- ✅ Backdrop covers entire screen

### Test 5: Veto Popup Cards Contained (Already Correct)
**File**: `test_veto_ceremony_tv.html`

**Steps**:
1. Trigger veto ceremony
2. **Observe**: Small popup cards (e.g., "Veto Ceremony", "Saved", etc.)
3. **Expected**: Popup cards appear inside TV frame
4. **Expected**: Cards are centered and fully visible
5. **Expected**: No overflow or cutoff

**Pass Criteria**:
- ✅ Popup cards use `.revealCard.diaryRoomCard` classes
- ✅ Cards appear in TV overlay (`#tvOverlay .tvOverlayContent`)
- ✅ Cards are fully visible on mobile (no cutoff)
- ✅ HOH popup cards still work the same way

## Mobile Testing

### Responsive Test (iPhone/Android)
1. Open demo on mobile device or use browser DevTools mobile emulation
2. Test avatar tap on touchscreen
3. **Expected**: Tap does NOT execute action
4. Test Confirm button on mobile
5. **Expected**: Confirm button works correctly
6. Test arrow buttons on mobile
7. **Expected**: Arrow buttons work correctly

## Regression Testing

### What Should NOT Change
- ✅ HOH nomination ceremony (no changes)
- ✅ Standard nomination ceremony (no changes)
- ✅ Eviction ceremony (no changes)
- ✅ Live vote UI (no changes)
- ✅ Social Maneuvers (no changes)

### Quick Regression Check
1. Run HOH nomination ceremony
2. **Expected**: All animations and interactions work as before
3. **Expected**: No veto-related changes affect HOH

## Browser Compatibility

Test on:
- ✅ Chrome (desktop + mobile)
- ✅ Firefox (desktop + mobile)
- ✅ Safari (desktop + iOS)
- ✅ Edge (desktop)

## Automated Tests

All automated tests pass:
```bash
npm run test:all
# POV Carousel tests: 40/40 passed
```

## Known Issues / Expected Behavior

1. **Keyboard Enter still works**: For accessibility, pressing Enter on the keyboard will still confirm the current selection. This is intentional and different from mouse/touch tap behavior.

2. **Hover effects removed**: The avatar no longer shows hover effects (no scale, no border change). This is intentional to indicate it's not clickable.

3. **Animation removal is permanent**: The badge transfer animations have been completely removed from veto flows. This is a one-way change.

## Rollback Plan

If issues are found:
```bash
git revert 9ac1551
```

This will restore:
- Avatar tap-to-confirm behavior
- Multi-stage replacement animations
- Hover effects on avatars
